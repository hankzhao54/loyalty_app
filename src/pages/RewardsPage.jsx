import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageProvider'
import { useToast } from '../context/ToastProvider'
import { fmt } from '../lib/i18n'

const serif = { fontFamily: "Georgia,'Noto Serif SC',serif" }
const panel = { background: '#1f1915', border: '1px solid #32281f', borderRadius: 16, padding: 16 }

export default function RewardsPage({ member, rewards, redemptions, reload }) {
  const { t, lang } = useLang()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function redeem(r) {
    if (member.points_balance < r.points_cost) { toast(t.toastNoPoints); return }
    setBusy(true)
    const { data, error } = await supabase.rpc('redeem_reward', { p_reward_id: r.id })
    if (error) {
      toast(error.message.includes('insufficient') ? t.toastNoPoints : error.message)
    } else {
      toast(t.toastRedeemed(r.name[lang] || r.name.en, data.code))
      await reload()
    }
    setBusy(false)
  }

  const rewardName = (id) => {
    const r = rewards.find((x) => x.id === id)
    return r ? r.name[lang] || r.name.en : ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...panel, display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline' }}>
        <span style={{ color: '#a89c89', fontSize: 13 }}>{t.availablePoints}</span>
        <span style={{ ...serif, fontSize: 28 }}>{fmt(member.points_balance)}</span>
      </div>

      {redemptions.length > 0 && (
        <div style={{ ...panel, border: '1px solid #c9a14f55' }}>
          <div style={{ ...serif, fontSize: 15, marginBottom: 8, color: '#c9a14f' }}>{t.vouchers}</div>
          {redemptions.map((v) => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between',
                                     alignItems: 'center', padding: '8px 0',
                                     borderTop: '1px solid #2b231c', fontSize: 13 }}>
              <div>
                <div>{rewardName(v.reward_id)}</div>
                <div style={{ color: '#a89c89', fontSize: 11 }}>{t.voucherHint}</div>
              </div>
              <span style={{ ...serif, background: '#2b231c', color: '#c9a14f',
                             padding: '4px 8px', borderRadius: 6,
                             letterSpacing: 1, fontSize: 13 }}>
                {v.code}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={panel}>
        <div style={{ ...serif, fontSize: 15, marginBottom: 10 }}>{t.redeemTitle}</div>
        {rewards.map((r) => {
          const ok = member.points_balance >= r.points_cost
          return (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between',
                                     alignItems: 'center', padding: '12px 0',
                                     borderTop: '1px solid #2b231c' }}>
              <div style={{ paddingRight: 12 }}>
                <div style={{ fontSize: 14 }}>{r.name[lang] || r.name.en}</div>
                {r.description && (
                  <div style={{ color: '#a89c89', fontSize: 12 }}>
                    {r.description[lang] || r.description.en}
                  </div>
                )}
              </div>
              <button onClick={() => redeem(r)} disabled={busy} style={{
                background: ok ? '#b8392e' : '#2b231c',
                color: ok ? '#fff' : '#a89c89',
                padding: '6px 12px', borderRadius: 999,
                fontSize: 12, whiteSpace: 'nowrap',
                opacity: busy ? 0.6 : 1,
              }}>
                {t.ptsBtn(r.points_cost)}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
