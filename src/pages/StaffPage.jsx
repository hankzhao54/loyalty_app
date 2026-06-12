import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageProvider'
import { useToast } from '../context/ToastProvider'

const serif = { fontFamily: "Georgia,'Noto Serif SC',serif" }
const panel = { background: '#1f1915', border: '1px solid #32281f', borderRadius: 16, padding: 16 }

/* 店员页 v1:手动录入消费(过渡期)+ 核销兑换券
   将来摄像头扫码用 html5-qrcode 或 BarcodeDetector 接到这两个表单 */
export default function StaffPage({ stores, reload }) {
  const { t } = useLang()
  const toast = useToast()
  const [card, setCard] = useState('')
  const [amount, setAmount] = useState('')
  const [storeId, setStoreId] = useState(stores[0]?.id || '')
  const [lunch, setLunch] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function record() {
    if (!card || !amount || !storeId) return
    setBusy(true)
    const { data, error } = await supabase.rpc('record_purchase', {
      p_card_number: card.trim(),
      p_amount_huf: parseInt(amount, 10),
      p_store_id: storeId,
      p_lunch: lunch,
    })
    if (error) toast(error.message)
    else {
      toast(t.staff.recorded(data.points_earned, data.new_balance))
      if (data.tier_upgraded) toast(t.staff.upgraded(t.tiers[data.tier_after]))
      if (data.stamp_completed) toast(t.staff.stampDone)
      if (data.challenge_completed) toast(t.staff.challengeDone)
      setAmount(''); setLunch(false)
      await reload()
    }
    setBusy(false)
  }

  async function verify() {
    if (!code || !storeId) return
    setBusy(true)
    const { error } = await supabase.rpc('verify_redemption', {
      p_code: code.trim().toUpperCase(),
      p_store_id: storeId,
    })
    if (error) toast(error.message)
    else { toast(t.staff.verified); setCode(''); await reload() }
    setBusy(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={panel}>
        <div style={{ ...serif, fontSize: 15, marginBottom: 12 }}>{t.staff.title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input placeholder={t.staff.cardNumber} value={card}
                 onChange={(e) => setCard(e.target.value)} />
          <input placeholder={t.staff.amount} value={amount} inputMode="numeric"
                 onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={lunch}
                   onChange={(e) => setLunch(e.target.checked)} />
            {t.staff.lunch}
          </label>
          <button onClick={record} disabled={busy} style={{
            background: '#b8392e', color: '#fff', padding: '12px 0',
            borderRadius: 12, ...serif, fontSize: 15, opacity: busy ? 0.6 : 1,
          }}>
            {t.staff.record}
          </button>
        </div>
      </div>

      <div style={panel}>
        <div style={{ ...serif, fontSize: 15, marginBottom: 12 }}>{t.staff.verifyTitle}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder={t.staff.codePlaceholder} value={code}
                 onChange={(e) => setCode(e.target.value)} />
          <button onClick={verify} disabled={busy} style={{
            background: '#c9a14f', color: '#171210', padding: '0 20px',
            borderRadius: 10, ...serif, whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1,
          }}>
            {t.staff.verify}
          </button>
        </div>
      </div>
    </div>
  )
}
