import { useLang } from '../context/LanguageProvider'
import { useTheme, FONT } from '../context/ThemeProvider'

const nm = (obj, lang) => obj ? (obj[lang] || obj.en) : ''

export default function StampsPage({ campaigns, progress, stores }) {
  const { t, lang } = useLang()
  const { c } = useTheme()
  const stamp = campaigns.find((x) => x.kind === 'stamp')
  const challenge = campaigns.find((x) => x.kind === 'challenge')
  const stampProg = stamp ? progress.find((p) => p.campaign_id === stamp.id) : null
  const chalProg = challenge ? progress.find((p) => p.campaign_id === challenge.id) : null
  const visited = new Set(chalProg?.meta?.visited_stores || [])

  const panel = { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 22, padding: 18 }
  const count = stampProg?.count || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 集章卡 */}
      {stamp && (
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{nm(stamp.name, lang)}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 13, color: c.accent, fontWeight: 700 }}>
              {t.stampsCount(count, stamp.required_count)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>
            {t.stampDesc(stamp.required_count)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 18 }}>
            {Array.from({ length: stamp.required_count }).map((_, i) => {
              const filled = i < count
              return (
                <div key={i} style={{
                  aspectRatio: '1', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FONT.display, fontWeight: 700, fontSize: 18,
                  ...(filled
                    ? { background: c.accent, color: c.accentInk }
                    : { border: `2px dashed ${c.line}`, color: c.muted }),
                }}>
                  {filled ? '✓' : i + 1}
                </div>
              )
            })}
          </div>
          {stampProg?.completed_at && (
            <div style={{ marginTop: 14, textAlign: 'center', fontSize: 14,
                          fontWeight: 700, color: c.green }}>
              {t.stampFull}
            </div>
          )}
        </div>
      )}

      {/* 五店巡礼 */}
      {challenge && (
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{nm(challenge.name, lang)}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 700,
                          color: chalProg?.completed_at ? c.green : c.muted }}>
              {chalProg?.completed_at ? t.challengeDone : t.storesCount(visited.size, challenge.required_count)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>
            {t.challengeDesc(challenge.required_count)}
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stores.map((s) => {
              const v = visited.has(s.id)
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    ...(v ? { background: c.green, color: '#fff' } : { border: `2px solid ${c.line}` }),
                  }}>{v ? '✓' : ''}</span>
                  <span style={{ color: v ? c.text : c.muted, fontWeight: v ? 600 : 400 }}>{s.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
