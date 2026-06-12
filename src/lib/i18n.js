/* 三语字典:EN 默认 / HU / 中
   交易流水与系统提示一律存 key,渲染时查此字典 */

export const T = {
  en: {
    brand: '101 · Members',
    sub: 'Valid at all 5 Budapest locations',
    tiers: { silver: 'Silver', jade: 'Jade', gold: 'Gold' },
    tabs: { card: 'Card', rewards: 'Rewards', stamps: 'Stamps', staff: 'Staff' },
    loading: 'Loading…',
    noMember: 'No membership record for this account.',
    availablePoints: 'Available points',
    showCode: 'Show the QR code at checkout to earn points',
    tierProgress: 'Annual tier points',
    toNext: (n, tier, mult) => `${n} more points to reach ${tier} · earn rate ${mult}×`,
    maxTier: 'Highest tier reached · Gold benefits active',
    recent: 'Recent activity',
    redeemTitle: 'Redeem points',
    vouchers: 'Vouchers to use',
    voucherHint: 'Show this code to staff before it expires',
    ptsBtn: (c) => `${c} pts`,
    stampDesc: (g) => `One stamp per lunch set · collect ${g} for the reward`,
    stampFull: 'Card complete · reward issued',
    challengeDesc: (n) => `Visit ${n} different locations during the campaign`,
    challengeDone: 'Completed',
    storesCount: (a, b) => `${a}/${b} stores`,
    stampsCount: (a, b) => `${a}/${b} stamps`,
    txSignupBonus: 'Signup bonus',
    txStampBonus: 'Stamp card reward',
    txChallenge: 'Three-store challenge completed',
    txSpend: (huf, store) => `Purchase ${huf} HUF · ${store}`,
    txRedeem: (name) => `Redeemed · ${name}`,
    toastRedeemed: (name, code) => `"${name}" redeemed · code ${code}`,
    toastNoPoints: 'Not enough points yet — keep going!',
    login: {
      title: 'Sign in to 101',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign in',
      signUp: 'Create account',
      noAccount: 'No account yet? Create one',
      haveAccount: 'Already a member? Sign in',
      checkEmail: 'Check your inbox to confirm your email, then sign in.',
      signOut: 'Sign out',
    },
    staff: {
      title: 'Record a purchase',
      cardNumber: 'Card number (e.g. 26000128)',
      amount: 'Amount (HUF)',
      store: 'Location',
      lunch: 'Includes a lunch set (adds a stamp)',
      record: 'Record purchase',
      recorded: (p, b) => `+${p} pts · new balance ${b}`,
      upgraded: (tier) => `Member upgraded to ${tier}!`,
      stampDone: 'Stamp card completed — reward issued',
      challengeDone: 'Challenge completed — bonus issued',
      verifyTitle: 'Verify a voucher',
      codePlaceholder: 'RWD-XXXXXX',
      verify: 'Verify',
      verified: 'Voucher verified',
      scan: 'Scan',
      scanCardTitle: 'Scan member QR',
      scanCodeTitle: 'Scan voucher QR',
      scanHint: 'Point the camera at the QR code',
      scanError: 'Camera unavailable — enter the number manually',
      close: 'Close',
    },
  },
  hu: {
    brand: '101 · Törzsvendég',
    sub: 'Mind az 5 budapesti étteremben érvényes',
    tiers: { silver: 'Ezüst', jade: 'Jáde', gold: 'Arany' },
    tabs: { card: 'Kártya', rewards: 'Beváltás', stamps: 'Pecsétek', staff: 'Személyzet' },
    loading: 'Betöltés…',
    noMember: 'Ehhez a fiókhoz nem tartozik tagsági rekord.',
    availablePoints: 'Felhasználható pontok',
    showCode: 'Fizetéskor mutasd a QR-kódot a pontokért',
    tierProgress: 'Éves szintpontok',
    toNext: (n, tier, mult) => `Még ${n} pont a(z) ${tier} szinthez · pontszorzó ${mult}×`,
    maxTier: 'Legmagasabb szint elérve · Arany előnyök aktívak',
    recent: 'Legutóbbi aktivitás',
    redeemTitle: 'Pontbeváltás',
    vouchers: 'Beváltható kuponok',
    voucherHint: 'Mutasd a kódot a személyzetnek, mielőtt lejár',
    ptsBtn: (c) => `${c} pont`,
    stampDesc: (g) => `Minden ebédmenü egy pecsét · ${g} pecsétért jutalom jár`,
    stampFull: 'Kártya betelt · jutalom kiállítva',
    challengeDesc: (n) => `Látogass el ${n} különböző éttermünkbe a kampány alatt`,
    challengeDone: 'Teljesítve',
    storesCount: (a, b) => `${a}/${b} étterem`,
    stampsCount: (a, b) => `${a}/${b} pecsét`,
    txSignupBonus: 'Regisztrációs bónusz',
    txStampBonus: 'Pecsétkártya jutalom',
    txChallenge: 'Három étterem kihívás teljesítve',
    txSpend: (huf, store) => `Vásárlás ${huf} HUF · ${store}`,
    txRedeem: (name) => `Beváltva · ${name}`,
    toastRedeemed: (name, code) => `„${name}” beváltva · kód: ${code}`,
    toastNoPoints: 'Még nincs elég pont — hajrá!',
    login: {
      title: 'Bejelentkezés a 101-be',
      email: 'E-mail',
      password: 'Jelszó',
      signIn: 'Bejelentkezés',
      signUp: 'Fiók létrehozása',
      noAccount: 'Nincs még fiókod? Hozz létre egyet',
      haveAccount: 'Már tag vagy? Jelentkezz be',
      checkEmail: 'Erősítsd meg az e-mail címed a levélben, majd jelentkezz be.',
      signOut: 'Kijelentkezés',
    },
    staff: {
      title: 'Vásárlás rögzítése',
      cardNumber: 'Kártyaszám (pl. 26000128)',
      amount: 'Összeg (HUF)',
      store: 'Étterem',
      lunch: 'Ebédmenüt tartalmaz (pecsétet ad)',
      record: 'Rögzítés',
      recorded: (p, b) => `+${p} pont · új egyenleg: ${b}`,
      upgraded: (tier) => `A tag szintet lépett: ${tier}!`,
      stampDone: 'Pecsétkártya betelt — jutalom kiállítva',
      challengeDone: 'Kihívás teljesítve — bónusz jóváírva',
      verifyTitle: 'Kupon beváltása',
      codePlaceholder: 'RWD-XXXXXX',
      verify: 'Beváltás',
      verified: 'Kupon beváltva',
      scan: 'Beolvasás',
      scanCardTitle: 'Tagsági QR beolvasása',
      scanCodeTitle: 'Kupon QR beolvasása',
      scanHint: 'Irányítsd a kamerát a QR-kódra',
      scanError: 'A kamera nem elérhető — írd be kézzel',
      close: 'Bezárás',
    },
  },
  zh: {
    brand: '101 · 會員',
    sub: '布达佩斯五店通用',
    tiers: { silver: '银卡', jade: '玉卡', gold: '金卡' },
    tabs: { card: '会员卡', rewards: '兑换', stamps: '集章', staff: '店员' },
    loading: '加载中…',
    noMember: '此账号没有会员记录。',
    availablePoints: '可用积分',
    showCode: '结账时出示二维码积分',
    tierProgress: '年度定级积分',
    toNext: (n, tier, mult) => `再积 ${n} 分升级${tier} · 积分加成 ${mult}×`,
    maxTier: '已是最高等级 · 金卡权益生效中',
    recent: '最近动态',
    redeemTitle: '积分兑换',
    vouchers: '待核销券',
    voucherHint: '过期前向店员出示此码',
    ptsBtn: (c) => `${c} 分`,
    stampDesc: (g) => `每购买一次午市套餐盖一章,集满 ${g} 章得奖励`,
    stampFull: '已集满 · 奖励已发放',
    challengeDesc: (n) => `活动期内到访 ${n} 家不同门店`,
    challengeDone: '已完成',
    storesCount: (a, b) => `${a}/${b} 店`,
    stampsCount: (a, b) => `${a}/${b} 章`,
    txSignupBonus: '注册礼',
    txStampBonus: '集章卡奖励',
    txChallenge: '三店巡礼挑战完成',
    txSpend: (huf, store) => `消费 ${huf} HUF · ${store}`,
    txRedeem: (name) => `兑换 · ${name}`,
    toastRedeemed: (name, code) => `已兑换「${name}」· 核销码 ${code}`,
    toastNoPoints: '积分不足,继续加油~',
    login: {
      title: '登录 101 会员',
      email: '邮箱',
      password: '密码',
      signIn: '登录',
      signUp: '注册账号',
      noAccount: '还没有账号?注册一个',
      haveAccount: '已是会员?去登录',
      checkEmail: '请到邮箱完成验证后再登录。',
      signOut: '退出登录',
    },
    staff: {
      title: '录入消费',
      cardNumber: '会员卡号(如 26000128)',
      amount: '消费金额(HUF)',
      store: '门店',
      lunch: '包含午市套餐(触发盖章)',
      record: '确认录入',
      recorded: (p, b) => `+${p} 分 · 新余额 ${b}`,
      upgraded: (tier) => `会员已升级为${tier}!`,
      stampDone: '集章卡集满,奖励已发放',
      challengeDone: '挑战完成,奖励已发放',
      verifyTitle: '核销兑换券',
      codePlaceholder: 'RWD-XXXXXX',
      verify: '核销',
      verified: '核销成功',
      scan: '扫码',
      scanCardTitle: '扫描会员二维码',
      scanCodeTitle: '扫描兑换券二维码',
      scanHint: '将摄像头对准二维码',
      scanError: '无法使用相机 — 请手动输入',
      close: '关闭',
    },
  },
}

export const fmt = (n) => (n ?? 0).toLocaleString('hu-HU')

/* 流水文案:数据库只存 key,这里按当前语言渲染 */
export function txLabel(tx, t, lang, stores, rewards) {
  if (tx.type === 'earn') {
    const store = stores.find((s) => s.id === tx.store_id)
    return t.txSpend(fmt(tx.amount_huf), store ? store.name : '')
  }
  if (tx.note === 'signup_bonus') return t.txSignupBonus
  if (tx.note === 'stamp_complete') return t.txStampBonus
  if (tx.note === 'challenge_complete') return t.txChallenge
  if (tx.note && tx.note.startsWith('redeem:')) {
    const r = rewards.find((x) => x.id === tx.note.slice(7))
    return t.txRedeem(r ? r.name[lang] || r.name.en : '')
  }
  return tx.note || tx.type
}

/* ---- 卡号短码互转 ----
   全卡号: LY-2026-000128 (数据库存储,被多表引用,不改)
   短码:   26000128       (年份后两位 + 6 位序号,店员手输/顾客口报)
   显示时分组为 "26 000128" 更易读 */
export function toShortCode(cardNumber) {
  if (!cardNumber) return ''
  const m = cardNumber.match(/LY-(\d{2})(\d{2})-(\d{6})/)
  return m ? m[2] + m[3] : cardNumber // 26 + 000128
}

export function formatShortCode(cardNumber) {
  const s = toShortCode(cardNumber)
  return s.length === 8 ? `${s.slice(0, 2)} ${s.slice(2)}` : s // "26 000128"
}

/* 店员输入的短码 -> 全卡号(用于查库)。
   接受 8 位(26000128)或带空格(26 000128);
   也兼容店员直接输/扫到完整 LY- 卡号。 */
export function expandShortCode(input) {
  const raw = (input || '').trim().toUpperCase().replace(/\s+/g, '')
  const full = raw.match(/LY-\d{4}-\d{6}/)
  if (full) return full[0]
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 8) {
    return `LY-20${digits.slice(0, 2)}-${digits.slice(2)}`
  }
  return raw // 交给后端报"未找到",避免静默猜测
}
