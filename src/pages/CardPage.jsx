import QRCodeCanvas from '../components/QRCodeCanvas'
import { useLang } from '../context/LanguageProvider'
import { fmt, txLabel, formatShortCode } from '../lib/i18n'

const serif = { fontFamily: "Georgia,'Noto Serif SC',serif" }
const panel = { background: '#1f1915', border: '1px solid #32281f', borderRadius: 16, padding: 16 }

const TIER_STYLE = {
  silver: { grad: 'linear-gradient(135deg,#454c56 0%,#8d97a3 60%,#6b7480 100%)', chip: '#9aa3ad' },
  jade:   { grad: 'linear-gradient(135deg,#0e3f30 0%,#2e8b6b 60%,#1b5e47 100%)', chip: '#46b08a' },
  gold:   { grad: 'linear-gradient(135deg,#6e5418 0%,#d4af37 55%,#9a7b2d 100%)', chip: '#d4af37' },
}
const TIER_ORDER = ['silver', 'jade', 'gold']

export default function CardPage({ member, txs, stores, rewards, config }) {
  const { t, lang } = useLang()
  const thresholds = config.tier_thresholds || { silver: 0, jade: 300, gold: 800 }
  const multipliers = config.tier_multipliers || { silver: 1, jade: 1.1, gold: 1.2 }

  const tierIdx = TIER_ORDER.indexOf(member.tier)
  const nextId = TIER_ORDER[tierIdx + 1] || null
  const curMin = Number(thresholds[member.tier])
  const nextMin = nextId ? Number(thresholds[nextId]) : null
  const pct = nextId
    ? Math.min(100, Math.round(((member.tier_points - curMin) / (nextMin - curMin)) * 100))
    : 100
  const style = TIER_STYLE[member.tier]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ borderRadius: 16, padding: 20, position: 'relative',
                    overflow: 'hidden', minHeight: 190, background: style.grad }}>
        <div style={{ ...serif, position: 'absolute', right: -16, bottom: -32,
                      fontSize: 110, fontStyle: 'italic',
                      color: 'rgba(255,255,255,.08)', lineHeight: 1,
                      userSelect: 'none', pointerEvents: 'none' }}>101</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ ...serif, fontSize: 19, color: '#fff' }}>
              {member.display_name || member.email}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', letterSpacing: 1, marginTop: 2 }}>
              {member.card_number}
            </div>
            <div style={{ ...serif, fontSize: 17, color: '#fff', letterSpacing: 3, marginTop: 4 }}>
              {formatShortCode(member.card_number)}
            </div>
          </div>
          <span style={{ ...serif, background: 'rgba(0,0,0,.35)', color: '#fff',
                         padding: '4px 12px', borderRadius: 999, fontSize: 12, letterSpacing: 1.5 }}>
            {t.tiers[member.tier]}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-end', marginTop: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>{t.availablePoints}</div>
            <div style={{ ...serif, fontSize: 40, color: '#fff', lineHeight: 1.1 }}>
              {fmt(member.points_balance)}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 10, padding: 4 }}>
            <QRCodeCanvas value={member.card_number} size={88} />
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.65)', marginTop: 6 }}>{t.showCode}</div>
      </div>

      <div style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: '#a89c89' }}>{t.tierProgress}</span>
          <span style={serif}>{fmt(member.tier_points)}{nextId ? ` / ${fmt(nextMin)}` : ''}</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, marginTop: 8,
                      background: '#2b231c', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 999, width: pct + '%',
                        background: nextId ? TIER_STYLE[nextId].chip : '#c9a14f',
                        transition: 'width .5s' }} />
        </div>
        <div style={{ fontSize: 12, color: '#a89c89', marginTop: 8 }}>
          {nextId
            ? t.toNext(fmt(nextMin - member.tier_points), t.tiers[nextId], multipliers[nextId])
            : t.maxTier}
        </div>
      </div>

      <div style={panel}>
        <div style={{ ...serif, fontSize: 15, marginBottom: 10 }}>{t.recent}</div>
        {txs.map((tx) => (
          <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', padding: '8px 0',
                                    borderTop: '1px solid #2b231c', fontSize: 13 }}>
            <div>
              <div>{txLabel(tx, t, lang, stores, rewards)}</div>
              <div style={{ color: '#a89c89', fontSize: 11 }}>
                {new Date(tx.created_at).toLocaleDateString(
                  lang === 'zh' ? 'zh-CN' : lang === 'hu' ? 'hu-HU' : 'en-GB')}
              </div>
            </div>
            <span style={{ ...serif, color: tx.points > 0 ? '#7fbf9a' : '#b8392e' }}>
              {tx.points > 0 ? '+' : ''}{tx.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
