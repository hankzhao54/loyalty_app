-- ============================================================
-- loyalty_v6_signup_marketing_optin.sql
-- 注册时的营销同意(marketing_optin)改为由注册元数据带入,
-- 在建档触发器里一次写好。
-- 动机:原来前端在 signUp 之后再 update members.marketing_optin,
--       但该更新受 RLS 限制(auth_user_id = auth.uid())。一旦开启
--       邮箱验证,signUp 不返回 session → auth.uid() 为空 → 匹配 0 行,
--       用户勾选的营销同意被静默丢弃且无报错。
-- 变更:handle_new_user 读取 raw_user_meta_data->>'marketing_optin'。
-- 幂等:可重复执行(create or replace)。
-- 前端配套:supabase.auth.signUp({ options: { data: { marketing_optin } } })
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.members (auth_user_id, email, card_number, marketing_optin)
  values (
    new.id,
    new.email,
    public.next_card_number(),
    coalesce((new.raw_user_meta_data ->> 'marketing_optin')::boolean, false)
  );
  return new;
end;
$$;
