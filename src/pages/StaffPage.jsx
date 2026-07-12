import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageProvider'
import { useToast } from '../context/ToastProvider'
import { useTheme, FONT, panelStyle } from '../context/ThemeProvider'
import QrScanner from '../components/QrScanner'
import TodayStats from '../components/TodayStats'
import { expandShortCode } from '../lib/i18n'

export default function StaffPage({ stores }) {
  const { t } = useLang()
  const { c } = useTheme()
  const toast = useToast()
  const [card, setCard] = useState('')
  const [amount, setAmount] = useState('')
  const [storeId, setStoreId] = useState(stores[0]?.id || '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [scan, setScan] = useState(null)
  const [result, setResult] = useState(null)
  const [statsKey, setStatsKey] = useState(0)

  const panel = panelStyle(c)
  const inputStyle = {
    flex: 1, background: c.bg, border: `1px solid ${c.line}`, borderRadius: 12,
    padding: '11px 13px', color: c.text, fontSize: 15, fontFamily: FONT.body,
  }
  const scanBtn = {
    background: c.bg, color: c.accent, padding: '0 16px', borderRadius: 12,
    whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600,
    border: `1px solid ${c.accent}`,
  }

  async function record() {
    if (!card || !amount || !storeId) return
    setBusy(true)
    const { data, error } = await supabase.rpc('record_purchase', {
      p_card_number: expandShortCode(card),
      p_amount_huf: parseInt(amount, 10),
      p_store_id: storeId,
      p_lunch: false,
    })
    if (error) toast(error.message, 'error')
    else { setResult(data); setAmount(''); setCard(''); setStatsKey((k) => k + 1) }
    setBusy(false)
  }

  async function verify() {
    if (!code || !storeId) return
    setBusy(true)
    const { error } = await supabase.rpc('verify_redemption', {
      p_code: code.trim().toUpperCase(), p_store_id: storeId,
    })
    if (error) toast(error.message, 'error')
    else { toast(t.staff.verified, 'success'); setCode(''); setStatsKey((k) => k + 1) }
    setBusy(false)
  }

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

  const pill = { fontSize: 12, fontWeight: 600, color: c.accentInk, background: c.accent,
                 padding: '4px 10px', borderRadius: 999 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TodayStats refreshKey={statsKey} />

      {/* 录入结果卡片 */}
      {result && (
        <div style={{ ...panel, borderColor: c.green }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: c.green }}>✓ {t.staff.resultTitle}</span>
            <button onClick={() => setResult(null)} style={{ color: c.muted, fontSize: 13 }}>{t.staff.dismiss}</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 36, color: c.green,
                           letterSpacing: '-1px' }}>+{result.points_earned}</span>
            <span style={{ fontSize: 13, color: c.muted }}>{t.staff.resultEarned}</span>
            {result.signup_bonus > 0 && (
              <span style={{ fontSize: 12, color: c.accent }}>
                (+{result.signup_bonus} {t.staff.resultSignup})
              </span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 14 }}>
            <span style={{ color: c.muted }}>{t.staff.resultBalance}</span>
            <span style={{ fontFamily: FONT.display, fontWeight: 700 }}>{result.new_balance}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 14 }}>
            <span style={{ color: c.muted }}>{t.staff.resultTier}</span>
            <span style={{ fontWeight: 600 }}>
              {t.tiers[result.tier_after]}
              {result.tier_upgraded && <span style={{ color: c.accent }}> · {t.staff.resultUpgrade}</span>}
            </span>
          </div>
          {(result.stamp_completed || result.challenge_completed) && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {result.stamp_completed && <span style={pill}>{t.staff.resultStampDone}</span>}
              {result.challenge_completed && <span style={pill}>{t.staff.resultChallenge}</span>}
            </div>
          )}
        </div>
      )}

      {/* 录入消费 */}
      <div style={panel}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{t.staff.title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={inputStyle} placeholder={t.staff.cardNumber} value={card}
                   onChange={(e) => setCard(e.target.value)} />
            <button onClick={() => setScan('card')} style={scanBtn}>⊞ {t.staff.scan}</button>
          </div>
          <input style={inputStyle} placeholder={t.staff.amount} value={amount} inputMode="numeric"
                 onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}
                  style={{ ...inputStyle, flex: 'none', width: '100%' }}>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={record} disabled={busy} style={{
            background: c.accent, color: c.accentInk, padding: '13px 0',
            borderRadius: 14, fontFamily: FONT.display, fontWeight: 700, fontSize: 15,
            opacity: busy ? 0.6 : 1,
          }}>
            {t.staff.record}
          </button>
        </div>
      </div>

      {/* 核销 */}
      <div style={panel}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{t.staff.verifyTitle}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={inputStyle} placeholder={t.staff.codePlaceholder} value={code}
                 onChange={(e) => setCode(e.target.value)} />
          <button onClick={() => setScan('code')} style={scanBtn}>⊞ {t.staff.scan}</button>
          <button onClick={verify} disabled={busy} style={{
            background: c.text, color: c.bg, padding: '0 18px', borderRadius: 12,
            fontFamily: FONT.display, fontWeight: 700, whiteSpace: 'nowrap',
            opacity: busy ? 0.6 : 1,
          }}>
            {t.staff.verify}
          </button>
        </div>
      </div>

      {scan && (
        <QrScanner
          title={scan === 'card' ? t.staff.scanCardTitle : t.staff.scanCodeTitle}
          onScan={handleScan} onClose={() => setScan(null)} />
      )}
    </div>
  )
}
