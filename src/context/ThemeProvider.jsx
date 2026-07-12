import { createContext, useContext, useEffect, useState } from 'react'

/* 双主题 token 系统(来自 Claude Design handoff)
   light = 番茄红(白天默认) / dark = 暖金深色(夜晚)
   所有页面通过 useTheme().c 读取颜色,切换主题即整体换肤。 */

const LIGHT = {
  bg: '#FBF7F2',
  text: '#1A1614',
  muted: '#9a8f88',
  mutedList: '#b0a69e',
  surface: '#FFFFFF',
  line: '#f0e9e2',
  lineInner: '#f2ece5',
  accent: '#FF5630',
  accentInk: '#FFFFFF',
  cardBg: '#FF5630',
  cardText: '#FFFFFF',
  cardMuted: '#ffd9ce',
  badgeBg: '#FFFFFF',
  badgeText: '#FF5630',
  green: '#1FA463',
  danger: '#d9544e',
  qrInk: '#1A1614',
  navBg: 'rgba(251,247,242,0.82)',
}

const DARK = {
  bg: '#171210',
  text: '#F2EBE0',
  muted: '#a08f80',
  mutedList: '#a08f80',
  surface: '#211915',
  line: '#2e231d',
  lineInner: '#2e231d',
  accent: '#E8A85C',
  accentInk: '#2a1409',
  cardBg: 'linear-gradient(140deg,#F0C778 0%,#D99A4E 55%,#C77E3A 100%)',
  cardText: '#2a1409',
  cardMuted: '#6b3a1d',
  badgeBg: '#2a1409',
  badgeText: '#F0C778',
  green: '#7BD389',
  danger: '#e0726b',
  qrInk: '#2a1409',
  navBg: 'rgba(23,18,16,0.82)',
}

const ThemeCtx = createContext(null)

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    // 同步给 body,保证 overscroll 区域也是主题色
    document.body.style.backgroundColor = dark ? DARK.bg : LIGHT.bg
    document.body.style.color = dark ? DARK.text : LIGHT.text
  }, [dark])

  const c = dark ? DARK : LIGHT
  return (
    <ThemeCtx.Provider value={{ dark, setDark, c }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => useContext(ThemeCtx)

// 各页面反复重复的卡片容器样式,统一到一处以免视觉逐渐漂移
export const panelStyle = (c, padding = 18) => ({
  background: c.surface, border: `1px solid ${c.line}`, borderRadius: 22, padding,
})

/* 字体常量:Space Grotesk(标题/数字)、Outfit(正文)、Space Mono(ID/日期/代码) */
export const FONT = {
  display: "'Space Grotesk', system-ui, sans-serif",
  body: "'Outfit', 'Noto Sans SC', system-ui, sans-serif",
  mono: "'Space Mono', monospace",
}
