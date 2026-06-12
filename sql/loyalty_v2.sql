-- ============================================================
-- loyalty_v2.sql —— 规则与权限升级(在 v1 两个脚本之后执行)
-- 变更点:
--  1. staff 增加 role 字段(staff / manager),manager 才能管理奖励目录
--  2. 集章卡:每次消费盖一章(去掉"午市套餐"限制)
--  3. 巡礼挑战:三店 → 五店,奖励改为实物兑换券("礼物")
--  4. record_purchase 升级:盖章不再依赖 p_lunch;挑战支持发实物券
--  5. 新增 manager 对 rewards 的增删改 RLS,供后台使用
-- 幂等:可重复执行
-- ============================================================

-- ------------------------------------------------------------
-- 1. staff 角色字段
-- ------------------------------------------------------------
alter table public.staff
  add column if not exists role text not null default 'staff'
  check (role in ('staff', 'manager'));

-- 判断当前用户是否 manager
create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff
    where auth_user_id = auth.uid() and active and role = 'manager'
  );
$$;

-- ------------------------------------------------------------
-- 2. 集章卡:每次消费一章。把现有 stamp 活动的 rule 清空
--    (rule 不再含 category 限制;留空对象表示"任意消费")
-- ------------------------------------------------------------
update public.campaigns
set rule = '{}'::jsonb
where kind = 'stamp';

-- 文案改为"每次消费"版本(三语),如已自定义可跳过
update public.campaigns
set name = '{"en":"Dining stamp card","hu":"Törzsvendég pecsétkártya","zh":"用餐集章卡"}'::jsonb
where kind = 'stamp';

-- ------------------------------------------------------------
-- 3. 五店巡礼礼物:先建实物奖励,再把挑战指向它
-- ------------------------------------------------------------
-- 3a. 建礼物奖励(若不存在)。points_cost 设很高且 active=false,
--     使其不出现在普通积分兑换列表里,仅作为挑战奖励载体。
insert into public.rewards (name, description, points_cost, reward_type, active, sort_order)
select
  '{"en":"Five-store tour gift","hu":"Ötéttermes túra ajándék","zh":"五店巡礼礼物"}'::jsonb,
  '{"en":"Reward for visiting all 5 locations","hu":"Jutalom mind az 5 étterem felkereséséért","zh":"集齐五家门店的奖励"}'::jsonb,
  999999, 'free_item', false, 999
where not exists (
  select 1 from public.rewards where name->>'en' = 'Five-store tour gift'
);

-- 3b. 把巡礼挑战改成五店 + 指向礼物券
update public.campaigns
set required_count = 5,
    rule = '{"distinct_stores":5}'::jsonb,
    reward_kind = 'reward_item',
    reward_points = null,
    reward_id = (select id from public.rewards where name->>'en' = 'Five-store tour gift' limit 1),
    name = '{"en":"Five-store tour","hu":"Ötéttermes túra","zh":"五店巡礼"}'::jsonb,
    description = '{"en":"Visit all 5 locations to earn a gift","hu":"Keresd fel mind az 5 éttermet egy ajándékért","zh":"集齐五家门店得礼物"}'::jsonb
where kind = 'challenge';

-- ------------------------------------------------------------
-- 4. record_purchase 升级
--    - 集章:任何消费都盖章(不再读 p_lunch 的品类含义)
--    - 为兼容旧前端,保留 p_lunch 参数但忽略其值
--    - 挑战:支持 reward_item(发实物券)
-- ------------------------------------------------------------
create or replace function public.record_purchase(
  p_card_number text,
  p_amount_huf  integer,
  p_store_id    uuid,
  p_lunch       boolean default false,   -- 兼容旧前端,已忽略
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

  -- 集章:每次消费都盖一章
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

  -- 巡礼挑战:记录到访门店,满足 distinct_stores 即发奖(支持实物券)
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
-- 5. manager 管理 rewards 的 RLS(后台增删改)
--    读策略 v1 已有(rewards_read_all);这里加写策略。
-- ------------------------------------------------------------
drop policy if exists rewards_insert_mgr on public.rewards;
drop policy if exists rewards_update_mgr on public.rewards;
drop policy if exists rewards_delete_mgr on public.rewards;

create policy rewards_insert_mgr on public.rewards
  for insert with check (public.is_manager());
create policy rewards_update_mgr on public.rewards
  for update using (public.is_manager()) with check (public.is_manager());
create policy rewards_delete_mgr on public.rewards
  for delete using (public.is_manager());

-- manager 还需要能在后台看到所有奖励(含下架的);
-- v1 的 rewards_read_all 只读 active,这里补一条 manager 读全部。
drop policy if exists rewards_read_mgr on public.rewards;
create policy rewards_read_mgr on public.rewards
  for select using (public.is_manager());

grant insert, update, delete on public.rewards to authenticated;

-- ------------------------------------------------------------
-- 6. 把已有的店员升级为 manager(按需改邮箱)
-- ------------------------------------------------------------
-- update public.staff set role = 'manager'
-- where auth_user_id = (select id from auth.users where email = 'you@example.com');
