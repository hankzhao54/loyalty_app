import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageProvider'
import { useToast } from '../context/ToastProvider'
import { fmt } from '../lib/i18n'

const serif = { fontFamily: "Georgia,'Noto Serif SC',serif" }
const panel = { background: '#1f1915', border: '1px solid #32281f', borderRadius: 16, padding: 16 }

const TIER_COLOR = { silver: '#9aa3ad', jade: '#46b08a', gold: '#d4af37' }

export default function MemberOverview() {
  const { t, lang } = useLang()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [anomOnly, setAnomOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('admin_member_overview')
      if (error) toast(error.message)
      else setRows(data || [])
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    let r = rows
    if (anomOnly) r = r.filter((x) => x.anomalies && x.anomalies.length)
    if (q.trim()) {
      const k = q.trim().toLowerCase()
      r = r.filter((x) =>
        (x.card_number || '').toLowerCase().includes(k) ||
        (x.email || '').toLowerCase().includes(k) ||
        (x.phone || '').toLowerCase().includes(k) ||
        (x.display_name || '').toLowerCase().includes(k))
    }
    return r
  }, [rows, q, anomOnly])

  const anomalyCount = rows.filter((x) => x.anomalies && x.anomalies.length).length
  const dateStr = (d) => d ? new Date(d).toLocaleDateString(
    lang === 'zh' ? 'zh-CN' : lang === 'hu' ? 'hu-HU' : 'en-GB') : '—'

  if (loading) return <div style={{ ...panel, color: '#a89c89' }}>{t.loading}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input value={q} onChange={(e) => setQ(e.target.value)}
             placeholder={t.admin.searchMember} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#a89c89' }}>
          {filtered.length} / {rows.length}
        </span>
        <button onClick={() => setAnomOnly(!anomOnly)} style={{
          fontSize: 12, padding: '4px 10px', borderRadius: 999,
          background: anomOnly ? '#b8392e' : '#2b231c',
          color: anomOnly ? '#fff' : (anomalyCount ? '#d98' : '#a89c89'),
        }}>
          {anomOnly ? t.admin.allMembers : `${t.admin.anomaliesOnly}${anomalyCount ? ` (${anomalyCount})` : ''}`}
        </button>
      </div>

      <div style={panel}>
        {filtered.length === 0 && (
          <div style={{ color: '#a89c89', fontSize: 13, textAlign: 'center', padding: 12 }}>
            {t.admin.noResults}
          </div>
        )}
        {filtered.map((m) => {
          const hasAnom = m.anomalies && m.anomalies.length
          const open = expanded === m.member_id
          return (
            <div key={m.member_id} style={{ borderTop: '1px solid #2b231c', padding: '10px 0' }}>
              <div onClick={() => setExpanded(open ? null : m.member_id)}
                   style={{ display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {hasAnom && <span style={{ color: '#e06', fontSize: 14 }}>⚠</span>}
                    <span style={{ color: TIER_COLOR[m.tier] }}>●</span>
                    {m.display_name || m.email || m.card_number}
                  </div>
                  <div style={{ fontSize: 11, color: '#a89c89' }}>
                    {m.card_number} · {dateStr(m.last_activity)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ ...serif, fontSize: 18 }}>{fmt(m.points_balance)}</div>
                  {m.balance_mismatch !== 0 && (
                    <div style={{ fontSize: 10, color: '#e06' }}>
                      {t.admin.mismatchNote}: {fmt(m.ledger_balance)}
                    </div>
                  )}
                </div>
              </div>

              {open && (
                <div style={{ marginTop: 10, paddingLeft: 8, fontSize: 13, color: '#d8cdbb',
                              display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {hasAnom && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      {m.anomalies.map((a) => (
                        <span key={a} style={{ fontSize: 11, color: '#fff', background: '#b8392e',
                                               padding: '2px 8px', borderRadius: 999 }}>
                          {t.admin.anomalyLabels[a] || a}
                        </span>
                      ))}
                    </div>
                  )}
                  <Row label={t.admin.colTier} val={t.tiers[m.tier]} />
                  <Row label={t.admin.colBalance} val={`${fmt(m.points_balance)} (${t.admin.mismatchNote.split('≠')[1]?.trim() || 'ledger'}: ${fmt(m.ledger_balance)})`} />
                  <Row label={t.admin.colLifetime} val={fmt(m.lifetime_points)} />
                  <Row label="Tier points" val={fmt(m.tier_points)} />
                  <Row label={t.admin.colEarned} val={`${fmt(m.total_earned)} (${m.earn_count}×)`} />
                  <Row label="Vouchers" val={fmt(m.pending_vouchers)} />
                  {m.email && <Row label="Email" val={m.email} />}
                  {m.phone && <Row label="Phone" val={m.phone} />}
                  {m.birthday && <Row label="Birthday" val={dateStr(m.birthday)} />}
                  <Row label="Joined" val={dateStr(m.joined_at)} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Row({ label, val }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#a89c89' }}>{label}</span>
      <span>{val}</span>
    </div>
  )
}
