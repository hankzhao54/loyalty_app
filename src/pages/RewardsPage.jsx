import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageProvider'
import { useToast } from '../context/ToastProvider'
import { useTheme, FONT } from '../context/ThemeProvider'
import { fmt } from '../lib/i18n'

const nm = (obj, lang) => obj ? (obj[lang] || obj.en) : ''
const TIER_RANK = { silver: 1, jade: 2, gold: 3 }
const inStock = (r) => r.stock_limit == null || r.redeemed_count < r.stock_limit
const tierOk = (member, r) => TIER_RANK[member.tier] >= TIER_RANK[r.min_tier]

export default function RewardsPage({ member, rewards, rewardsAll = [], redemptions, reload }) {
  const { t, lang } = useLang()
  const { c } = useTheme()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function redeem(r) {
    if (member.points_balance < r.points_cost) { toast(t.toastNoPoints); return }
    if (!tierOk(member, r)) { toast(t.toastTierLocked(t.tiers[r.min_tier])); return }
    if (!inStock(r)) { toast(t.toastSoldOut); return }
    setBusy(true)
    const { data, error } = await supabase.rpc('redeem_reward', { p_reward_id: r.id })
    if (error) {
      const msg = error.message || ''
      toast(
        msg.includes('insufficient') ? t.toastNoPoints
          : msg.includes('tier too low') ? t.toastTierLocked(t.tiers[r.min_tier])
          : msg.includes('out of stock') ? t.toastSoldOut
          : msg
      )
    } else { toast(t.toastRedeemed(nm(r.name, lang), data.code)); await reload() }
    setBusy(false)
  }

  // 券名解析用全量奖励表(含已下架),回退到 active 目录
  const nameSource = rewardsAll.length ? rewardsAll : rewards

  const panel = { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 22, padding: 18 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 余额条 */}
      <div style={{ ...panel, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: c.muted, fontSize: 13 }}>{t.availablePoints}</span>
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: c.accent,
                       letterSpacing: '-0.5px' }}>{fmt(member.points_balance)}</span>
      </div>

      {/* 待核销券 */}
      {redemptions.length > 0 && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: c.text }}>{t.vouchers}</div>
          <div style={{ ...panel, borderColor: c.accent }}>
            {redemptions.map((v, i) => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between',
                                       alignItems: 'center', padding: '11px 0',
                                       borderTop: i === 0 ? 'none' : `1px solid ${c.lineInner}` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{nm(nameSource.find((x) => x.id === v.reward_id)?.name, lang)}</div>
                  <div style={{ color: c.muted, fontSize: 11, marginTop: 2 }}>{t.voucherHint}</div>
                </div>
                <span style={{ fontFamily: FONT.mono, fontWeight: 700, background: c.accent,
                               color: c.accentInk, padding: '5px 10px', borderRadius: 8,
                               fontSize: 13, flexShrink: 0 }}>
                  {v.code}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 兑换目录 */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: c.text }}>{t.redeemTitle}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rewards.map((r) => {
            const stock = inStock(r)
            const tier = tierOk(member, r)
            const affordable = member.points_balance >= r.points_cost
            const ok = affordable && stock && tier
            // 锁定原因(优先级:等级 > 售罄 > 积分不足)
            const lockNote = !tier ? t.lockTier(t.tiers[r.min_tier])
              : !stock ? t.lockSoldOut
              : null
            return (
              <div key={r.id} style={{ ...panel, display: 'flex', justifyContent: 'space-between',
                                       alignItems: 'center', gap: 12, opacity: (!stock || !tier) ? 0.6 : 1 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{nm(r.name, lang)}</div>
                  {r.description && (
                    <div style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{nm(r.description, lang)}</div>
                  )}
                  {lockNote && (
                    <div style={{ color: c.danger, fontSize: 11, marginTop: 3 }}>{lockNote}</div>
                  )}
                </div>
                <button onClick={() => redeem(r)} disabled={busy || !ok} style={{
                  background: ok ? c.accent : c.line,
                  color: ok ? c.accentInk : c.muted,
                  padding: '8px 16px', borderRadius: 999, flexShrink: 0,
                  fontFamily: FONT.display, fontWeight: 700, fontSize: 13,
                  whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1,
                }}>
                  {t.ptsBtn(r.points_cost)}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
