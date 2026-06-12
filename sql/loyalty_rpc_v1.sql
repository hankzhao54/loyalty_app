-- ============================================================
-- loyalty_rpc_v1.sql —— 业务函数层(在 loyalty_standalone_v1 之后执行)
-- 三个 RPC,均为 security definer(绕过 RLS,内部自行鉴权):
--   record_purchase   店员录入消费 → 积分/定级/盖章/挑战 一条龙
--   redeem_reward     会员用积分兑换 → 生成核销码
--   verify_redemption 店员核销
-- ============================================================

-- 工具:按年度定级积分计算等级
create or replace function public.compute_tier(p_tier_points integer)
returns text language sql stable as $$
  select case
    when p_tier_points >= ((select value->>'gold' from public.config where key='tier_thresholds'))::int then 'gold'
    when p_tier_points >= ((select value->>'jade' from public.config where key='tier_thresholds'))::int then 'jade'
    else 'silver'
  end;
$$;

-- 工具:生成核销码
create or replace function public.gen_voucher_code()
returns text language sql volatile as $$
  select 'RWD-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$;

-- ------------------------------------------------------------
-- 1. record_purchase:店员录入一笔消费(过渡期入口;
--    将来 POS webhook 的 Edge Function 也复用同样的内部逻辑)
-- ------------------------------------------------------------
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
  v_visited    jsonb;
  v_stamp_done boolean := false;
  v_chal_done  boolean := false;
begin
  if not public.is_staff() then
    raise exception 'staff only';
  end if;
  if p_amount_huf is null or p_amount_huf <= 0 then
    raise exception 'invalid amount';
  end if;

  select * into v_member from members
  where card_number = p_card_number for update;
  if not found then
    raise exception 'member not found: %', p_card_number;
  end if;

  select (value #>> '{}')::numeric into v_ppl  from config where key = 'points_per_huf';
  select (value ->> v_member.tier)::numeric into v_mult from config where key = 'tier_multipliers';
  select (value #>> '{}')::int into v_validity from config where key = 'points_validity_months';

  v_base := floor(p_amount_huf * v_ppl);
  v_pts  := floor(v_base * v_mult);
  v_old_tier := v_member.tier;
  v_new_tier := public.compute_tier(v_member.tier_points + v_base);

  insert into point_transactions
    (member_id, type, points, amount_huf, store_id, staff_id, receipt_ref, source, expires_at)
  values
    (v_member.id, 'earn', v_pts, p_amount_huf, p_store_id, auth.uid(), p_receipt_ref,
     'manual', now() + make_interval(months => v_validity));

  update members set
    points_balance  = points_balance + v_pts,
    lifetime_points = lifetime_points + v_pts,
    tier_points     = tier_points + v_base,
    tier            = v_new_tier,
    updated_at      = now()
  where id = v_member.id;

  -- 集章卡:有进行中的 stamp 活动且本单含午市套餐
  if p_lunch then
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
        update member_campaign_progress
        set completed_at = coalesce(completed_at, now())
        where member_id = v_member.id and campaign_id = v_stamp.id
          and completed_at is null;
        if found then
          v_stamp_done := true;
          if v_stamp.reward_kind = 'points' and coalesce(v_stamp.reward_points, 0) > 0 then
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
  end if;

  -- 多店挑战:记录到访门店,满足 distinct_stores 即发奖
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
      update member_campaign_progress
      set completed_at = now()
      where member_id = v_member.id and campaign_id = v_chal.id
        and completed_at is null;
      if found then
        v_chal_done := true;
        if v_chal.reward_kind = 'points' and coalesce(v_chal.reward_points, 0) > 0 then
          insert into point_transactions (member_id, type, points, source, note)
          values (v_member.id, 'bonus', v_chal.reward_points, 'campaign', 'challenge_complete');
          update members set points_balance = points_balance + v_chal.reward_points,
                             lifetime_points = lifetime_points + v_chal.reward_points
          where id = v_member.id;
        end if;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'points_earned',      v_pts,
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

-- ------------------------------------------------------------
-- 2. redeem_reward:会员积分兑换 → 扣分 + 生成核销码
-- ------------------------------------------------------------
create or replace function public.redeem_reward(p_reward_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_member members%rowtype;
  v_reward rewards%rowtype;
  v_ttl    integer;
  v_code   text;
  v_ptx_id bigint;
  v_exp    timestamptz;
begin
  select m.* into v_member from members m
  where m.auth_user_id = auth.uid() for update;
  if not found then
    raise exception 'member not found';
  end if;

  select * into v_reward from rewards where id = p_reward_id and active;
  if not found then
    raise exception 'reward not available';
  end if;
  if v_reward.stock_limit is not null and v_reward.redeemed_count >= v_reward.stock_limit then
    raise exception 'reward out of stock';
  end if;
  if v_member.points_balance < v_reward.points_cost then
    raise exception 'insufficient points';
  end if;

  select (value #>> '{}')::int into v_ttl from config where key = 'redemption_ttl_minutes';
  v_code := public.gen_voucher_code();
  v_exp  := now() + make_interval(mins => coalesce(v_ttl, 30));

  insert into point_transactions (member_id, type, points, source, note)
  values (v_member.id, 'redeem', -v_reward.points_cost, 'system', 'redeem:' || v_reward.id)
  returning id into v_ptx_id;

  update members set points_balance = points_balance - v_reward.points_cost,
                     updated_at = now()
  where id = v_member.id;

  update rewards set redeemed_count = redeemed_count + 1 where id = v_reward.id;

  insert into redemptions (member_id, reward_id, ptx_id, code, status, expires_at)
  values (v_member.id, v_reward.id, v_ptx_id, v_code, 'pending', v_exp);

  return jsonb_build_object(
    'code', v_code,
    'expires_at', v_exp,
    'new_balance', v_member.points_balance - v_reward.points_cost
  );
end;
$$;

-- ------------------------------------------------------------
-- 3. verify_redemption:店员扫码/输码核销
-- ------------------------------------------------------------
create or replace function public.verify_redemption(p_code text, p_store_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_red redemptions%rowtype;
begin
  if not public.is_staff() then
    raise exception 'staff only';
  end if;

  select * into v_red from redemptions where code = p_code for update;
  if not found then
    raise exception 'code not found';
  end if;
  if v_red.status <> 'pending' then
    raise exception 'voucher already %', v_red.status;
  end if;
  if v_red.expires_at < now() then
    update redemptions set status = 'expired' where id = v_red.id;
    raise exception 'voucher expired';
  end if;

  update redemptions set
    status = 'verified', store_id = p_store_id,
    verified_by = auth.uid(), verified_at = now()
  where id = v_red.id;

  return jsonb_build_object('ok', true, 'reward_id', v_red.reward_id);
end;
$$;

-- ------------------------------------------------------------
-- 权限:只允许登录用户调用,匿名一律不行
-- ------------------------------------------------------------
revoke all on function public.record_purchase(text, integer, uuid, boolean, text) from public, anon;
revoke all on function public.redeem_reward(uuid) from public, anon;
revoke all on function public.verify_redemption(text, uuid) from public, anon;
grant execute on function public.record_purchase(text, integer, uuid, boolean, text) to authenticated;
grant execute on function public.redeem_reward(uuid) to authenticated;
grant execute on function public.verify_redemption(text, uuid) to authenticated;
