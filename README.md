# 101 · Members — 会员系统顾客端 + 店员端 (v1)

Vite + React + Supabase。三语(EN 默认 / HU / 中),与 recipe app、order-app 同一技术栈。

## 启动步骤

1. **数据库**(在新 Supabase 项目 SQL Editor 按顺序执行,已执行过的跳过):
   - `sql/loyalty_standalone_v1.sql` — 建表、RLS、注册触发器、种子数据
   - `sql/loyalty_rpc_v1.sql` — 业务函数:record_purchase / redeem_reward / verify_redemption
2. **环境变量**:复制 `.env.example` 为 `.env`,填入项目的 URL 与 anon key(Settings → API)
3. **依赖与运行**:`npm install` 然后 `npm run dev`
4. **Auth 设置**(Dashboard → Authentication):
   - 测试阶段可在 Sign In / Up 里关闭 "Confirm email",注册即登录,省去收邮件
   - 上线前重新打开,并在 URL Configuration 里设置 Site URL 为 Vercel 域名

## 开通店员账号

店员先正常注册一个账号,然后在 SQL Editor 执行:

```sql
insert into staff (auth_user_id, display_name, store_id)
select id, '店员姓名', (select id from stores where name = '101 Bistro')
from auth.users where email = 'staff@example.com';
```

店员登录后底部会多出 Staff 标签:录入消费(卡号 + 金额 + 门店 + 是否午市套餐)、核销兑换码。
若不想店员账号占用会员行:`delete from members where auth_user_id = (select id from auth.users where email = 'staff@example.com');`

## 端到端验证流程

1. 注册顾客账号 → 自动获得卡号与 50 分注册礼
2. 用店员账号在 Staff 页录入一笔消费(卡号填顾客的)→ 顾客端刷新可见积分、定级进度、盖章
3. 顾客在 Rewards 页兑换 → 得到 RWD- 核销码
4. 店员在 Staff 页输码核销 → 券消失

## 约定与待办

- 流水 `note` 只存 key(signup_bonus / stamp_complete / challenge_complete / redeem:<uuid>),前端按语言渲染
- 年度定级重置(每年 1 月 1 日 tier_points 归零并重算等级)v1 未做,可用 pg_cron 或年初手动跑一句 UPDATE
- PWA(vite-plugin-pwa)、摄像头扫码(html5-qrcode)、POS webhook 留给第二阶段
- 集章卡满额奖励目前种子里是 0 分占位,正式上线前建一条 "免费午市套餐" reward 并把 campaign 的 reward_kind 改为 reward_item
