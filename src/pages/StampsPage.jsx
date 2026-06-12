import { useLang } from '../context/LanguageProvider'

const serif = { fontFamily: "Georgia,'Noto Serif SC',serif" }
const panel = { background: '#1f1915', border: '1px solid #32281f', borderRadius: 16, padding: 16 }
const SEAL_CHARS = ['福', '禄', '壽', '喜', '滿', '豐', '餘', '圓', '吉', '安', '和', '順']

export default function StampsPage({ campaigns, progress, stores }) {
  const { t, lang } = useLang()
  const stamp = campaigns.find((c) => c.kind === 'stamp')
  const challenge = campaigns.find((c) => c.kind === 'challenge')
  const stampProg = stamp ? progress.find((p) => p.campaign_id === stamp.id) : null
  const chalProg = challenge ? progress.find((p) => p.campaign_id === challenge.id) : null
  const visited = new Set(chalProg?.meta?.visited_stores || [])
  const name = (c) => c.name[lang] || c.name.en

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {stamp && (
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ ...serif, fontSize: 15 }}>{name(stamp)}</div>
            <div style={{ fontSize: 12, color: '#a89c89' }}>
              {t.stampsCount(stampProg?.count || 0, stamp.required_count)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#a89c89', marginTop: 4 }}>
            {t.stampDesc(stamp.required_count)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 12, marginTop: 16 }}>
            {Array.from({ length: stamp.required_count }).map((_, i) => {
              const filled = i < (stampProg?.count || 0)
              return (
                <div key={i} style={{
                  aspectRatio: '1', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...(filled
                    ? { background: '#b8392e',
                        transform: `rotate(${(i * 37) % 14 - 7}deg)`,
                        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.25)' }
                    : { border: '2px dashed #3a2f25' }),
                }}>
                  <span style={{ ...serif, fontSize: 20, color: filled ? '#fff' : '#3a2f25' }}>
                    {SEAL_CHARS[i % SEAL_CHARS.length]}
                  </span>
                </div>
              )
            })}
          </div>
          {stampProg?.completed_at && (
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 14, color: '#c9a14f' }}>
              {t.stampFull}
            </div>
          )}
        </div>
      )}

      {challenge && (
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ ...serif, fontSize: 15 }}>{name(challenge)}</div>
            <div style={{ fontSize: 12,
                          color: chalProg?.completed_at ? '#c9a14f' : '#a89c89' }}>
              {chalProg?.completed_at
                ? t.challengeDone
                : t.storesCount(visited.size, challenge.required_count)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#a89c89', marginTop: 4 }}>
            {t.challengeDesc(challenge.required_count)}
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stores.map((s) => {
              const v = visited.has(s.id)
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center',
                                         gap: 8, fontSize: 14 }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    ...(v ? { background: '#46b08a' } : { border: '2px solid #3a2f25' }),
                  }} />
                  <span style={{ color: v ? '#ece4d6' : '#a89c89' }}>{s.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
