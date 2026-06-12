-- ============================================================
-- loyalty_standalone_v1.sql
-- 会员系统数据库迁移 v1 —— 独立 Supabase 项目版
-- 直接在新项目的 SQL Editor 中执行(使用 public schema)
-- 与旧版差异:含 stores 门店表、staff 店员表、注册自动建档触发器
-- ============================================================

-- ------------------------------------------------------------
-- 1. 配置表
-- ------------------------------------------------------------
create table public.config (
  key   text primary key,
  value jsonb not null,
  note  text
);

insert into public.config (key, value, note) values
  ('points_per_huf',         '0.01',                                '每 100 HUF = 1 分'),
  ('points_validity_months', '12',                                  '积分有效期(月)'),
  ('signup_bonus',           '50',                                  '注册礼积分'),
  ('tier_thresholds',        '{"silver":0,"jade":300,"gold":800}',  '年度定级积分门槛'),
  ('tier_multipliers',       '{"silver":1.0,"jade":1.1,"gold":1.2}','等级积分加成'),
  ('redemption_ttl_minutes', '30',                                  '核销码有效分钟数');

-- ------------------------------------------------------------
-- 2. 门店表(独立项目自带一份,与 ordering 项目人工保持同步)
-- ------------------------------------------------------------
create table public.stores (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  address    text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.stores (name) values
  ('101 Bistro'),
  ('101 Tigris'),
  ('101 Neo'),
  ('101 Bao'),
  ('101 Timeout');
-- ↑ 请补充各店 address 字段

-- ------------------------------------------------------------
-- 3. 店员表(核销端权限标记;店员也是 auth 用户)
-- ------------------------------------------------------------
create table public.staff (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  store_id     uuid references public.stores(id),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.staff
    where auth_user_id = auth.uid() and active
  );
$$;

-- ------------------------------------------------------------
-- 4. 会员主表
-- ------------------------------------------------------------
create table public.members (
  id              uuid primary key default gen_random_uuid(),
  auth_user_id    uuid unique references auth.users(id) on delete set null,
  card_number     text unique not null,
  display_name    text,
  phone           text unique,
  email           text,
  birthday        date,
  preferred_lang  text not null default 'en' check (preferred_lang in ('en','hu','zh')),
  tier            text not null default 'silver' check (tier in ('silver','jade','gold')),
  points_balance  integer not null default 0,
  lifetime_points integer not null default 0,
  tier_points     integer not null default 0,
  tier_year       integer not null default extract(year from now()),
  marketing_optin boolean not null default false,
  joined_at       timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_members_phone on public.members (phone);
create index idx_members_card  on public.members (card_number);

create sequence public.card_seq;
create or replace function public.next_card_number()
returns text language sql as $$
  select 'LY-' || extract(year from now())::text || '-' ||
         lpad(nextval('public.card_seq')::text, 6, '0');
$$;

-- ------------------------------------------------------------
-- 5. 积分流水(事件溯源,余额可由此表重算)
-- ------------------------------------------------------------
create table public.point_transactions (
  id          bigint generated always as identity primary key,
  member_id   uuid not null references public.members(id) on delete cascade,
  type        text not null check (type in ('earn','redeem','expire','adjust','bonus')),
  points      integer not null,
  amount_huf  integer,
  store_id    uuid references public.stores(id),
  staff_id    uuid references public.staff(auth_user_id),
  receipt_ref text,
  source      text not null default 'manual'
              check (source in ('pos','manual','receipt_qr','campaign','system')),
  expires_at  timestamptz,
  note        text,
  created_at  timestamptz not null default now()
);

create index idx_ptx_member  on public.point_transactions (member_id, created_at desc);
create index idx_ptx_receipt on public.point_transactions (receipt_ref);

-- 防重复积分:同一小票号只能产生一条 earn
create unique index uq_ptx_receipt_earn
  on public.point_transactions (receipt_ref)
  where type = 'earn' and receipt_ref is not null;

-- ------------------------------------------------------------
-- 6. 奖励目录
-- ------------------------------------------------------------
create table public.rewards (
  id             uuid primary key default gen_random_uuid(),
  name           jsonb not null,
  description    jsonb,
  points_cost    integer not null check (points_cost > 0),
  reward_type    text not null check (reward_type in ('free_item','discount','physical')),
  stock_limit    integer,
  redeemed_count integer not null default 0,
  min_tier       text not null default 'silver' check (min_tier in ('silver','jade','gold')),
  active         boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7. 兑换核销记录
-- ------------------------------------------------------------
create table public.redemptions (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  reward_id   uuid not null references public.rewards(id),
  ptx_id      bigint references public.point_transactions(id),
  code        text unique not null,
  status      text not null default 'pending'
              check (status in ('pending','verified','cancelled','expired')),
  expires_at  timestamptz not null,
  store_id    uuid references public.stores(id),
  verified_by uuid references public.staff(auth_user_id),
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);

create index idx_redemptions_member on public.redemptions (member_id, created_at desc);
create index idx_redemptions_code   on public.redemptions (code) where status = 'pending';

-- ------------------------------------------------------------
-- 8. 活动:集章卡 + 任务挑战(共用结构)
-- ------------------------------------------------------------
create table public.campaigns (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('stamp','challenge')),
  name           jsonb not null,
  description    jsonb,
  required_count integer not null,
  rule           jsonb not null default '{}',
  reward_kind    text not null check (reward_kind in ('points','reward_item')),
  reward_points  integer,
  reward_id      uuid references public.rewards(id),
  starts_at      timestamptz not null default now(),
  ends_at        timestamptz,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table public.member_campaign_progress (
  member_id    uuid not null references public.members(id) on delete cascade,
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  count        integer not null default 0,
  meta         jsonb not null default '{}',
  completed_at timestamptz,
  claimed_at   timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (member_id, campaign_id)
);

-- ------------------------------------------------------------
-- 9. 注册自动建档:auth 注册成功 → 建会员行 + 卡号 + 注册礼 50 分
--    店员账号:先正常注册 auth 用户,再手动插入 staff 表;
--    若不希望店员账号占用会员行,插入 staff 后删除对应 members 行即可。
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_member_id uuid;
  bonus integer := coalesce((select (value #>> '{}')::int from public.config where key = 'signup_bonus'), 0);
begin
  insert into public.members (auth_user_id, email, card_number, points_balance, lifetime_points)
  values (new.id, new.email, public.next_card_number(), bonus, bonus)
  returning id into new_member_id;

  if bonus > 0 then
    insert into public.point_transactions (member_id, type, points, source, note)
    values (new_member_id, 'bonus', bonus, 'system', '注册礼');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 10. RLS
-- ------------------------------------------------------------
alter table public.members                  enable row level security;
alter table public.point_transactions       enable row level security;
alter table public.rewards                  enable row level security;
alter table public.redemptions              enable row level security;
alter table public.campaigns                enable row level security;
alter table public.member_campaign_progress enable row level security;
alter table public.config                   enable row level security;
alter table public.stores                   enable row level security;
alter table public.staff                    enable row level security;

-- 会员:读自己的数据
create policy members_read_own on public.members
  for select using (auth_user_id = auth.uid());
create policy ptx_read_own on public.point_transactions
  for select using (member_id in
    (select id from public.members where auth_user_id = auth.uid()));
create policy redemptions_read_own on public.redemptions
  for select using (member_id in
    (select id from public.members where auth_user_id = auth.uid()));
create policy progress_read_own on public.member_campaign_progress
  for select using (member_id in
    (select id from public.members where auth_user_id = auth.uid()));

-- 会员:可更新自己的非敏感资料(列级权限限定字段,
-- 积分、等级、卡号等字段客户端无法修改)
create policy members_update_own on public.members
  for update using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());
revoke update on public.members from authenticated;
grant update (display_name, phone, birthday, preferred_lang, marketing_optin)
  on public.members to authenticated;

-- 店员:核销端需要读会员、流水与待核销记录
create policy members_read_staff on public.members
  for select using (public.is_staff());
create policy ptx_read_staff on public.point_transactions
  for select using (public.is_staff());
create policy redemptions_read_staff on public.redemptions
  for select using (public.is_staff());

-- 公共目录:登录用户可读
create policy rewards_read_all   on public.rewards   for select using (auth.role() = 'authenticated');
create policy campaigns_read_all on public.campaigns for select using (auth.role() = 'authenticated');
create policy config_read_all    on public.config    for select using (auth.role() = 'authenticated');
create policy stores_read_all    on public.stores    for select using (auth.role() = 'authenticated');
create policy staff_read_self    on public.staff     for select using (auth_user_id = auth.uid());

-- 所有积分发放、扣减、核销等写操作仍只通过 Edge Function
-- (service role)执行,客户端没有任何 insert 权限。

-- ------------------------------------------------------------
-- 11. 种子数据:奖励目录 + 首发活动
-- ------------------------------------------------------------
insert into public.rewards (name, points_cost, reward_type, sort_order) values
  ('{"zh":"饮品一杯","hu":"Egy ital","en":"One drink"}',                    60, 'free_item', 1),
  ('{"zh":"春卷一份","hu":"Tavaszi tekercs","en":"Spring rolls"}',           80, 'free_item', 2),
  ('{"zh":"招牌菜 85 折券","hu":"15% kedvezmény","en":"15% off signature"}',150, 'discount',  3),
  ('{"zh":"烤鸭 1/4 只","hu":"Negyed kacsa","en":"Quarter roast duck"}',   300, 'free_item', 4);

insert into public.campaigns (kind, name, required_count, rule, reward_kind, reward_points, ends_at) values
  ('stamp',
   '{"zh":"午市套餐集章卡","hu":"Ebédmenü pecsétkártya","en":"Lunch set stamp card"}',
   8, '{"category":"lunch_set"}', 'points', 0, now() + interval '6 months'),
  ('challenge',
   '{"zh":"三店巡礼","hu":"Három étterem kihívás","en":"Three-store challenge"}',
   3, '{"distinct_stores":3}', 'points', 100, now() + interval '3 months');
