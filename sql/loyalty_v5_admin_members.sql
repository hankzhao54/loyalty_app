-- ============================================================
-- loyalty_v5_admin_members.sql —— manager 会员总览 + 异常检测
-- (在 v1/v2 之后执行;依赖 is_manager())
-- 提供一个 manager 专用函数,返回全体会员的积分概况,
-- 并对每位会员做几项异常核对(余额对账、积分构成等)。
-- 不直接放开 members 全表 RLS,数据只经此函数受控返回。
-- 幂等:可重复执行
-- ============================================================

-- 会员总览(仅 manager 可调用)
-- 返回:基本资料 + 余额 + 由流水重算的余额 + 异常标记数组
create or replace function public.admin_member_overview()
returns table (
  member_id        uuid,
  card_number      text,
  display_name     text,
  email            text,
  phone            text,
  birthday         date,
  tier             text,
  preferred_lang   text,
  marketing_optin  boolean,
  joined_at        timestamptz,
  points_balance   integer,       -- 表里缓存的余额
  ledger_balance   integer,       -- 由流水重算的真实余额
  balance_mismatch integer,       -- 两者之差(应为 0)
  lifetime_points  integer,
  tier_points      integer,
  earn_count       integer,       -- 消费笔数
  total_earned     integer,       -- 累计 earn+bonus
  last_activity    timestamptz,   -- 最近一笔流水时间
  pending_vouchers integer,       -- 待核销券数
  anomalies        text[]         -- 异常标记
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_manager() then
    raise exception 'manager only';
  end if;

  return query
  with ledger as (
    select
      pt.member_id,
      coalesce(sum(pt.points), 0)::int as bal,
      coalesce(sum(pt.points) filter (where pt.type in ('earn','bonus')), 0)::int as earned,
      count(*) filter (where pt.type = 'earn')::int as ecount,
      max(pt.created_at) as last_at
    from point_transactions pt
    group by pt.member_id
  ),
  vouchers as (
    select r.member_id, count(*)::int as pending
    from redemptions r
    where r.status = 'pending'
    group by r.member_id
  )
  select
    m.id,
    m.card_number,
    m.display_name,
    m.email,
    m.phone,
    m.birthday,
    m.tier,
    m.preferred_lang,
    m.marketing_optin,
    m.joined_at,
    m.points_balance,
    coalesce(l.bal, 0),
    m.points_balance - coalesce(l.bal, 0),
    m.lifetime_points,
    m.tier_points,
    coalesce(l.ecount, 0),
    coalesce(l.earned, 0),
    l.last_at,
    coalesce(v.pending, 0),
    -- 异常检测
    (
      select array_remove(array[
        -- 1. 缓存余额与流水重算不一致(最该警惕)
        case when m.points_balance <> coalesce(l.bal, 0)
             then 'balance_mismatch' end,
        -- 2. 余额为负(理论不该发生)
        case when m.points_balance < 0 then 'negative_balance' end,
        -- 3. 注册 24 小时内累计获得 > 1000 分(异常快速积分)
        case when m.joined_at > now() - interval '24 hours'
                  and coalesce(l.earned, 0) > 1000
             then 'fast_accrual' end,
        -- 4. lifetime 小于当前余额(不合逻辑,lifetime 只增不减)
        case when m.lifetime_points < m.points_balance
             then 'lifetime_lt_balance' end,
        -- 5. 余额>0 却无任何 earn/bonus 流水(来源可疑)
        case when coalesce(l.earned, 0) = 0 and m.points_balance > 0
             then 'unexplained_balance' end
      ], null)
    )
  from members m
  left join ledger l on l.member_id = m.id
  left join vouchers v on v.member_id = m.id
  order by m.points_balance desc;
end;
$$;

revoke all on function public.admin_member_overview() from public, anon;
grant execute on function public.admin_member_overview() to authenticated;

-- ------------------------------------------------------------
-- 备注:tier_mismatch 这一项较保守(只在定级分为0却仍是高等级时报),
-- 因为年度重置后 tier_points 会归零但 tier 保留,属正常;
-- 如需更严格的核对,可在年度重置外单独跑一次全量校验。
-- ------------------------------------------------------------
