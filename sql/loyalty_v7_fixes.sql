-- ============================================================
-- loyalty_v7_fixes.sql —— 一批 bug 修复(在 v1..v6 之后执行)
-- 修复项:
--   1. redeem_reward:强制 min_tier 等级门槛(后端兜底)
--   2. redeem_reward:兑换时对 reward 行加锁,杜绝库存超卖竞态
--   3. 真正的积分过期:expire_points() 按 FIFO 扣减已过期积分
--   4. GDPR 强制同意落库:members.terms_accepted_at,经注册元数据写入
-- 幂等:可重复执行(create or replace / add column if not exists)
-- ============================================================

-- ------------------------------------------------------------
-- 4. GDPR 同意时间戳字段
-- ------------------------------------------------------------
alter table public.members
  add column if not exists terms_accepted_at timestamptz;

-- 建档触发器:同时写入 marketing_optin(承接 v6)与 terms_accepted_at。
-- 前端 signUp 时通过 options.data 传 { marketing_optin, terms_accepted }。
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.members (auth_user_id, email, card_number, marketing_optin, terms_accepted_at)
  values (
    new.id,
    new.email,
    public.next_card_number(),
    coalesce((new.raw_user_meta_data ->> 'marketing_optin')::boolean, false),
    case when coalesce((new.raw_user_meta_data ->> 'terms_accepted')::boolean, false)
         then now() else null end
  );
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 1 + 2. redeem_reward:加 min_tier 校验 + reward 行锁
--        (整函数重建,基于 rpc_v1 版本)
-- ------------------------------------------------------------
create or replace function public.redeem_reward(p_reward_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_member    members%rowtype;
  v_reward    rewards%rowtype;
  v_ttl       integer;
  v_code      text;
  v_ptx_id    bigint;
  v_exp       timestamptz;
  v_mrank     integer;
  v_rrank     integer;
begin
  select m.* into v_member from members m
  where m.auth_user_id = auth.uid() for update;
  if not found then
    raise exception 'member not found';
  end if;

  -- 关键:对 reward 行加锁,后续的"检查库存 → +1"之间不会被并发插队
  select * into v_reward from rewards
  where id = p_reward_id and active
  for update;
  if not found then
    raise exception 'reward not available';
  end if;

  -- 等级门槛:会员等级必须 >= 奖励 min_tier
  v_mrank := case v_member.tier   when 'gold' then 3 when 'jade' then 2 else 1 end;
  v_rrank := case v_reward.min_tier when 'gold' then 3 when 'jade' then 2 else 1 end;
  if v_mrank < v_rrank then
    raise exception 'tier too low';
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

revoke all on function public.redeem_reward(uuid) from public, anon;
grant execute on function public.redeem_reward(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3. 真正的积分过期(FIFO)
--    背景:earn 流水带 expires_at,但此前从没有任何逻辑真正扣分,
--          "即将过期"只是提醒,积分实际永不过期。
--    做法:每位会员按时间先后(FIFO)把"真实消费(redeem / 负向 adjust)"
--          从最早的正向积分批次里扣掉,剩下的批次里凡 expires_at 已过的,
--          就是该过期的未用积分 → 记一笔 'expire' 负向流水并扣减余额。
--    幂等:每次运行都从零重算"至今应过期总额",减去"已过期总额",
--          只补记差额;重复运行差额为 0,不会重复扣。
--    返回:本次共过期的积分数。
--    上线:建议用 pg_cron 每日跑一次,例如
--          select cron.schedule('expire-points','0 3 * * *','select public.expire_points()');
-- ------------------------------------------------------------
create or replace function public.expire_points()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_total integer := 0;
begin
  with spend as (   -- 每位会员:真实已消费额 + 此前已过期额
    select member_id,
           coalesce(-sum(points) filter (where points < 0 and type <> 'expire'), 0) as consumed,
           coalesce(-sum(points) filter (where type = 'expire'), 0)                 as already_expired
    from point_transactions
    group by member_id
  ),
  lots as (         -- 正向积分批次,按时间累计(FIFO 用)
    select pt.member_id, pt.points, pt.expires_at,
           sum(pt.points) over (partition by pt.member_id
                                order by pt.created_at, pt.id) as cum_end
    from point_transactions pt
    where pt.points > 0
  ),
  surviving as (    -- 每个批次扣掉已消费后的剩余
    select l.member_id, l.expires_at,
           greatest(0, least(l.points, l.cum_end - s.consumed)) as surv
    from lots l join spend s using (member_id)
  ),
  due as (          -- 剩余里 expires_at 已过的部分 = 至今应过期总额
    select member_id,
           coalesce(sum(surv) filter (where expires_at is not null and expires_at < now()), 0) as expired_now
    from surviving
    group by member_id
  ),
  delta as (        -- 应过期 - 已过期 = 本次要补记的差额
    select d.member_id, (d.expired_now - s.already_expired) as amt
    from due d join spend s using (member_id)
    where (d.expired_now - s.already_expired) > 0
  ),
  ins as (
    insert into point_transactions (member_id, type, points, source, note)
    select member_id, 'expire', -amt, 'system', 'points_expired' from delta
    returning 1
  ),
  upd as (
    update members m
    set points_balance = points_balance - d.amt, updated_at = now()
    from delta d
    where m.id = d.member_id
    returning 1
  )
  select coalesce(sum(amt), 0) into v_total from delta;

  return v_total;
end;
$$;

revoke all on function public.expire_points() from public, anon;
-- 仅供后台/定时任务调用,普通登录用户不给
