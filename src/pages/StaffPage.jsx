import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageProvider'
import { useToast } from '../context/ToastProvider'
import QrScanner from '../components/QrScanner'
import TodayStats from '../components/TodayStats'
import { expandShortCode } from '../lib/i18n'

const serif = { fontFamily: "Georgia,'Noto Serif SC',serif" }
const panel = { background: '#1f1915', border: '1px solid #32281f', borderRadius: 16, padding: 16 }
const scanBtn = {
  background: '#2b231c', color: '#c9a14f', padding: '0 16px',
  borderRadius: 10, whiteSpace: 'nowrap', fontSize: 13,
  border: '1px solid #c9a14f55',
}

/* 店员页 v2:扫码或手输录入消费 + 扫码或手输核销兑换券
   会员码编码的是卡号(LY-...),核销码是 RWD-... */
export default function StaffPage({ stores, reload }) {
  const { t } = useLang()
  const toast = useToast()
  const [card, setCard] = useState('')
  const [amount, setAmount] = useState('')
  const [storeId, setStoreId] = useState(stores[0]?.id || '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [scan, setScan] = useState(null) // 'card' | 'code' | null
  const [result, setResult] = useState(null) // 录入成功结果卡片

  async function record() {
    if (!card || !amount || !storeId) return
    setBusy(true)
    const { data, error } = await supabase.rpc('record_purchase', {
      p_card_number: expandShortCode(card),
      p_amount_huf: parseInt(amount, 10),
      p_store_id: storeId,
      p_lunch: false,
    })
    if (error) toast(error.message)
    else {
      setResult(data)
      setAmount(''); setCard('')
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

  // 扫到的会员码可能是纯卡号,也可能将来带前缀,这里做个宽松提取
  function handleScan(text) {
    const val = (text || '').trim()
    if (scan === 'card') {
      const m = val.match(/LY-\d{4}-\d{6}/i)
      setCard(m ? m[0].toUpperCase() : val)
    } else if (scan === 'code') {
      const m = val.match(/RWD-[A-Z0-9]{6}/i)
      setCode(m ? m[0].toUpperCase() : val.toUpperCase())
    }
    setScan(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TodayStats />
      {result && (
        <div style={{ ...panel, border: '1px solid #7fbf9a55', background: '#16201a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...serif, fontSize: 15, color: '#7fbf9a' }}>✓ {t.staff.resultTitle}</span>
            <button onClick={() => setResult(null)}
                    style={{ color: '#a89c89', fontSize: 13 }}>{t.staff.dismiss}</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
            <span style={{ ...serif, fontSize: 34, color: '#7fbf9a' }}>+{result.points_earned}</span>
            <span style={{ fontSize: 13, color: '#a89c89' }}>{t.staff.resultEarned}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 14 }}>
            <span style={{ color: '#a89c89' }}>{t.staff.resultBalance}</span>
            <span style={serif}>{result.new_balance}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 14 }}>
            <span style={{ color: '#a89c89' }}>{t.staff.resultTier}</span>
            <span style={serif}>
              {t.tiers[result.tier_after]}
              {result.tier_upgraded && <span style={{ color: '#c9a14f' }}> · {t.staff.resultUpgrade}</span>}
            </span>
          </div>
          {(result.stamp_completed || result.challenge_completed) && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {result.stamp_completed && (
                <span style={{ fontSize: 12, color: '#c9a14f', background: '#2b231c',
                               padding: '4px 10px', borderRadius: 999 }}>{t.staff.resultStampDone}</span>
              )}
              {result.challenge_completed && (
                <span style={{ fontSize: 12, color: '#c9a14f', background: '#2b231c',
                               padding: '4px 10px', borderRadius: 999 }}>{t.staff.resultChallenge}</span>
              )}
            </div>
          )}
        </div>
      )}
      {/* 录入消费 */}
      <div style={panel}>
        <div style={{ ...serif, fontSize: 15, marginBottom: 12 }}>{t.staff.title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder={t.staff.cardNumber} value={card}
                   onChange={(e) => setCard(e.target.value)} />
            <button onClick={() => setScan('card')} style={scanBtn}>⊞ {t.staff.scan}</button>
          </div>
          <input placeholder={t.staff.amount} value={amount} inputMode="numeric"
                 onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={record} disabled={busy} style={{
            background: '#b8392e', color: '#fff', padding: '12px 0',
            borderRadius: 12, ...serif, fontSize: 15, opacity: busy ? 0.6 : 1,
          }}>
            {t.staff.record}
          </button>
        </div>
      </div>

      {/* 核销兑换券 */}
      <div style={panel}>
        <div style={{ ...serif, fontSize: 15, marginBottom: 12 }}>{t.staff.verifyTitle}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder={t.staff.codePlaceholder} value={code}
                 onChange={(e) => setCode(e.target.value)} />
          <button onClick={() => setScan('code')} style={scanBtn}>⊞ {t.staff.scan}</button>
          <button onClick={verify} disabled={busy} style={{
            background: '#c9a14f', color: '#171210', padding: '0 18px',
            borderRadius: 10, ...serif, whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1,
          }}>
            {t.staff.verify}
          </button>
        </div>
      </div>

      {scan && (
        <QrScanner
          title={scan === 'card' ? t.staff.scanCardTitle : t.staff.scanCodeTitle}
          onScan={handleScan}
          onClose={() => setScan(null)}
        />
      )}
    </div>
  )
}
