import { useLang } from '../context/LanguageProvider'
import { useTheme, FONT } from '../context/ThemeProvider'

/* 语言段控件:EN / HU 两段(顾客端不再有中文) */
export function LangSwitch() {
  const { lang, setLang } = useLang()
  const { c } = useTheme()
  return (
    <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden',
                  background: c.surface, border: `1px solid ${c.line}` }}>
      {['en', 'hu'].map((k) => {
        const on = lang === k
        return (
          <button key={k} onClick={() => setLang(k)} style={{
            fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
            padding: '5px 9px', background: on ? c.accent : 'transparent',
            color: on ? c.accentInk : c.muted,
            transition: 'background-color 200ms ease, color 200ms ease, transform 160ms var(--ease-out)',
          }}>{k.toUpperCase()}</button>
        )
      })}
    </div>
  )
}

/* 日夜开关:52×30 pill,22 knob,滑动 + 太阳/月亮 */
export function ThemeToggle() {
  const { dark, setDark, c } = useTheme()
  return (
    <button onClick={() => setDark(!dark)} aria-label="theme"
      style={{ width: 52, height: 30, borderRadius: 999, position: 'relative',
               background: c.surface, border: `1px solid ${c.line}`,
               flexShrink: 0, padding: 0 }}>
      <span style={{
        position: 'absolute', top: 3, left: 3, width: 22, height: 22, borderRadius: '50%',
        background: c.accent, transform: dark ? 'translateX(22px)' : 'translateX(0)',
        transition: 'transform 300ms var(--ease-drawer)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {dark ? (
          // 月牙:用 box-shadow 偏移造缺口
          <span style={{ width: 9, height: 9, borderRadius: '50%',
                         boxShadow: `inset -3px -1px 0 0 ${c.accentInk}` }} />
        ) : (
          // 太阳:实心点
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.accentInk }} />
        )}
      </span>
    </button>
  )
}
