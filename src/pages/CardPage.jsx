import { useState } from 'react'
import QRCodeCanvas from '../components/QRCodeCanvas'
import QrFullscreen from '../components/QrFullscreen'
import { useLang } from '../context/LanguageProvider'
import { useTheme, FONT, panelStyle } from '../context/ThemeProvider'
import { fmt, txLabel, formatShortCode } from '../lib/i18n'

const TIER_ORDER = ['silver', 'jade', 'gold']
const dateLoc = (lang) => (lang === 'hu' ? 'hu-HU' : 'en-GB')

export default function CardPage({ member, txs, stores, rewards, rewardsAll, config, expiring, expiringDate }) {
  const { t, lang } = useLang()
  const { c } = useTheme()
  const [qrOpen, setQrOpen] = useState(false)
  const thresholds = config.tier_thresholds || { silver: 0, jade: 300, gold: 800 }
  const multipliers = config.tier_multipliers || { silver: 1, jade: 1.1, gold: 1.2 }

  const tierIdx = TIER_ORDER.indexOf(member.tier)
  const nextId = TIER_ORDER[tierIdx + 1] || null
  const curMin = Number(thresholds[member.tier])
  const nextMin = nextId ? Number(thresholds[nextId]) : null
  const pct = nextId
    ? Math.min(100, Math.round(((member.tier_points - curMin) / (nextMin - curMin)) * 100))
    : 100

  const panel = panelStyle(c)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 会员卡 */}
      <div style={{ borderRadius: 28, padding: 22, position: 'relative',
                    overflow: 'hidden', minHeight: 196, background: c.cardBg }}>
        {/* 装饰圆 + 101 水印 */}
        <div style={{ position: 'absolute', left: -40, bottom: -40, width: 150, height: 150,
                      borderRadius: '50%', background: 'rgba(255,255,255,.13)',
                      pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 8, bottom: -10,
                      fontFamily: FONT.display, fontWeight: 700, fontSize: 80,
                      color: 'rgba(255,255,255,.13)', lineHeight: 1,
                      userSelect: 'none', pointerEvents: 'none' }}>101</div>

        <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', position: 'relative' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: c.cardText }}>
              {member.display_name || member.email}
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 12, color: c.cardMuted, marginTop: 3 }}>
              {member.card_number}
            </div>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18,
                          color: c.cardText, letterSpacing: 2, marginTop: 4 }}>
              {formatShortCode(member.card_number)}
            </div>
          </div>
          <span style={{ background: c.badgeBg, color: c.badgeText, fontWeight: 700,
                         padding: '4px 12px', borderRadius: 999, fontSize: 12, flexShrink: 0 }}>
            {t.tiers[member.tier]}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-end', marginTop: 18, position: 'relative' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: c.cardMuted }}>{t.availablePoints}</div>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 48,
                          color: c.cardText, lineHeight: 1.05, letterSpacing: '-1px' }}>
              {fmt(member.points_balance)}
            </div>
            <div style={{ fontSize: 11, color: c.cardMuted, marginTop: 2 }}>{t.showCode}</div>
          </div>
          <div onClick={() => setQrOpen(true)}
               style={{ background: '#fff', borderRadius: 12, padding: 7,
                        cursor: 'pointer', flexShrink: 0 }}>
            <QRCodeCanvas value={member.card_number} size={88} />
          </div>
        </div>
      </div>

      {/* 积分过期提醒 */}
      {expiring > 0 && (
        <div style={{ background: c.surface, border: `1px solid ${c.accent}`,
                      borderRadius: 16, padding: '11px 14px', fontSize: 13, color: c.accent }}>
          ⏳ {t.expiringSoon(expiring, new Date(expiringDate).toLocaleDateString(dateLoc(lang)))}
        </div>
      )}

      {/* 年度定级 */}
      <div style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
          <span style={{ color: c.muted }}>{t.tierProgress}</span>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: c.accent }}>
            {fmt(member.tier_points)}{nextId ? ` / ${fmt(nextMin)}` : ''}
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 8, marginTop: 10,
                      background: c.line, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 8, width: pct + '%',
                        background: c.accent, transition: 'width .5s' }} />
        </div>
        <div style={{ fontSize: 12, color: c.muted, marginTop: 8 }}>
          {nextId
            ? t.toNext(fmt(nextMin - member.tier_points), t.tiers[nextId], multipliers[nextId])
            : t.maxTier}
        </div>
      </div>

      {/* 最近活动 */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: c.text }}>{t.recent}</div>
        <div style={panel}>
          {txs.map((tx, i) => (
            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between',
                                      alignItems: 'center', padding: '11px 0',
                                      borderTop: i === 0 ? 'none' : `1px solid ${c.lineInner}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>
                  {txLabel(tx, t, lang, stores, rewardsAll || rewards)}
                </div>
                <div style={{ fontFamily: FONT.mono, color: c.mutedList, fontSize: 11, marginTop: 2 }}>
                  {new Date(tx.created_at).toLocaleDateString(dateLoc(lang))}
                </div>
              </div>
              <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15,
                             color: tx.points > 0 ? c.green : c.danger, flexShrink: 0 }}>
                {tx.points > 0 ? '+' : ''}{tx.points}
              </span>
            </div>
          ))}
        </div>
      </div>

      {qrOpen && (
        <QrFullscreen cardNumber={member.card_number} onClose={() => setQrOpen(false)} />
      )}
    </div>
  )
}
