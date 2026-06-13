-- ============================================================
-- loyalty_v4_signup_on_first_purchase.sql
-- 注册礼改为"首次到店消费后自动发放"(在 v1/v2 之后执行)
-- 动机:邮箱暂不验证,改此机制可杜绝假账号刷注册礼 —
--       必须真实消费一次才拿得到。
-- 变更:
--   1. handle_new_user:只建会员档案,不再发注册礼
--   2. record_purchase:检测到该会员第一笔 earn 时,连带发注册礼
--   3. members 增加 signup_bonus_granted 标记,避免重复发放
-- 幂等:可重复执行
-- ============================================================

-- 1. 标记字段:注册礼是否已发
alter table public.members
  add column if not exists signup_bonus_granted boolean not null default false;

-- 已有老会员(之前注册即得过 50 分的)标记为已发,避免再补发
update public.members
set signup_bonus_granted = true
where exists (
  select 1 from public.point_transactions
  where member_id = members.id and note = 'signup_bonus'
);

-- 2. 注册触发器:只建档,不发分
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.members (auth_user_id, email, card_number)
  values (new.id, new.email, public.next_card_number());
  return new;
end;
$$;

-- 3. record_purchase:在原有逻辑基础上,首次消费补发注册礼。
--    这里重建完整函数(基于 v2 版本 + 首单注册礼)。
create or replace function public.record_purchase(
  p_card_number text,
  p_amount_huf  integer,
  p_store_id    uuid,
  p_lunch       boolean default false,
  p_receipt_ref text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_member     members%rowtype;
  v_ppl        numeric;
  v_mult       numeric;
  v_validity   integer;
  v_base       integer;
  v_pts        integer;
  v_old_tier   text;
  v_new_tier   text;
  v_stamp      campaigns%rowtype;
  v_chal       campaigns%rowtype;
  v_count      integer;
  v_stamp_done boolean := false;
  v_chal_done  boolean := false;
  v_signup     integer := 0;   -- 本次补发的注册礼
begin
  if not public.is_staff() then
    raise exception 'staff only';
  end if;
  if p_amount_huf is null or p_amount_huf <= 0 then
    raise exception 'invalid amount';
  end if;

  select * into v_member from members where card_number = p_card_number for update;
  if not found then
    raise exception 'member not found: %', p_card_number;
  end if;

  select (value #>> '{}')::numeric into v_ppl  from config where key = 'points_per_huf';
  select (value ->> v_member.tier)::numeric into v_mult from config where key = 'tier_multipliers';
  select (value #>> '{}')::int into v_validity from config where key = 'points_validity_months';

  v_base := floor(p_amount_huf * v_ppl);
  v_pts  := floor(v_base * v_mult);
  v_old_tier := v_member.tier;

  -- 首次消费补发注册礼(若尚未发过)
  if not v_member.signup_bonus_granted then
    select (value #>> '{}')::int into v_signup from config where key = 'signup_bonus';
    v_signup := coalesce(v_signup, 0);
  end if;

  -- 定级积分含本次基础分;注册礼计入余额但不计定级(保持与原设计一致:bonus 不进 tier_points)
  v_new_tier := public.compute_tier(v_member.tier_points + v_base);

  -- 消费积分流水
  insert into point_transactions
    (member_id, type, points, amount_huf, store_id, staff_id, receipt_ref, source, expires_at)
  values
    (v_member.id, 'earn', v_pts, p_amount_huf, p_store_id, auth.uid(), p_receipt_ref,
     'manual', now() + make_interval(months => v_validity));

  -- 注册礼流水 + 标记
  if v_signup > 0 then
    insert into point_transactions (member_id, type, points, source, note)
    values (v_member.id, 'bonus', v_signup, 'system', 'signup_bonus');
  end if;

  update members set
    points_balance  = points_balance + v_pts + v_signup,
    lifetime_points = lifetime_points + v_pts + v_signup,
    tier_points     = tier_points + v_base,
    tier            = v_new_tier,
    signup_bonus_granted = true,
    updated_at      = now()
  where id = v_member.id;

  -- 集章:每次消费一章
  select * into v_stamp from campaigns
  where kind = 'stamp' and active
    and starts_at <= now() and (ends_at is null or ends_at > now())
  order by created_at limit 1;

  if found then
    insert into member_campaign_progress (member_id, campaign_id, count)
    values (v_member.id, v_stamp.id, 1)
    on conflict (member_id, campaign_id)
    do update set count = member_campaign_progress.count + 1, updated_at = now()
    returning count into v_count;

    if v_count >= v_stamp.required_count then
      update member_campaign_progress set completed_at = coalesce(completed_at, now())
      where member_id = v_member.id and campaign_id = v_stamp.id and completed_at is null;
      if found then
        v_stamp_done := true;
        if v_stamp.reward_kind = 'points' and coalesce(v_stamp.reward_points,0) > 0 then
          insert into point_transactions (member_id, type, points, source, note)
          values (v_member.id, 'bonus', v_stamp.reward_points, 'campaign', 'stamp_complete');
          update members set points_balance = points_balance + v_stamp.reward_points,
                             lifetime_points = lifetime_points + v_stamp.reward_points
          where id = v_member.id;
        elsif v_stamp.reward_kind = 'reward_item' and v_stamp.reward_id is not null then
          insert into redemptions (member_id, reward_id, code, status, expires_at)
          values (v_member.id, v_stamp.reward_id, public.gen_voucher_code(),
                  'pending', now() + interval '30 days');
        end if;
      end if;
    end if;
  end if;

  -- 巡礼挑战
  select * into v_chal from campaigns
  where kind = 'challenge' and active
    and starts_at <= now() and (ends_at is null or ends_at > now())
    and rule ? 'distinct_stores'
  order by created_at limit 1;

  if found then
    insert into member_campaign_progress (member_id, campaign_id, count, meta)
    values (v_member.id, v_chal.id, 1,
            jsonb_build_object('visited_stores', jsonb_build_array(p_store_id)))
    on conflict (member_id, campaign_id) do update set
      meta = case
        when member_campaign_progress.meta->'visited_stores' ? p_store_id::text
          then member_campaign_progress.meta
        else jsonb_set(member_campaign_progress.meta, '{visited_stores}',
             (member_campaign_progress.meta->'visited_stores') || to_jsonb(p_store_id::text))
      end,
      count = jsonb_array_length(
        case
          when member_campaign_progress.meta->'visited_stores' ? p_store_id::text
            then member_campaign_progress.meta->'visited_stores'
          else (member_campaign_progress.meta->'visited_stores') || to_jsonb(p_store_id::text)
        end),
      updated_at = now()
    returning count into v_count;

    if v_count >= v_chal.required_count then
      update member_campaign_progress set completed_at = now()
      where member_id = v_member.id and campaign_id = v_chal.id and completed_at is null;
      if found then
        v_chal_done := true;
        if v_chal.reward_kind = 'points' and coalesce(v_chal.reward_points,0) > 0 then
          insert into point_transactions (member_id, type, points, source, note)
          values (v_member.id, 'bonus', v_chal.reward_points, 'campaign', 'challenge_complete');
          update members set points_balance = points_balance + v_chal.reward_points,
                             lifetime_points = lifetime_points + v_chal.reward_points
          where id = v_member.id;
        elsif v_chal.reward_kind = 'reward_item' and v_chal.reward_id is not null then
          insert into redemptions (member_id, reward_id, code, status, expires_at)
          values (v_member.id, v_chal.reward_id, public.gen_voucher_code(),
                  'pending', now() + interval '30 days');
        end if;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'points_earned',      v_pts,
    'signup_bonus',       v_signup,
    'multiplier',         v_mult,
    'new_balance',        (select points_balance from members where id = v_member.id),
    'tier_before',        v_old_tier,
    'tier_after',         v_new_tier,
    'tier_upgraded',      v_new_tier <> v_old_tier,
    'stamp_completed',    v_stamp_done,
    'challenge_completed',v_chal_done
  );
end;
$$;
