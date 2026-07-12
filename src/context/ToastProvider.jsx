import { createContext, useContext, useState, useCallback } from 'react'
import { useTheme } from './ThemeProvider'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const { c } = useTheme()

  const toast = useCallback((msg, type = 'default') => {
    const id = Date.now() + Math.random()
    setToasts((x) => [...x, { id, msg, type }])
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 3500)
  }, [])

  const toneOf = (type) => {
    if (type === 'success') return { background: c.green, border: c.green, color: c.accentInk ?? c.bg, icon: '✓' }
    if (type === 'error') return { background: c.danger, border: c.danger, color: '#fff', icon: '✕' }
    return { background: c.text, border: c.text, color: c.bg, icon: null }
  }

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', top: 16, left: 0, right: 0, zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, pointerEvents: 'none', padding: '0 24px',
      }}>
        {toasts.map((x) => {
          const tone = toneOf(x.type)
          return (
            <div key={x.id} style={{
              background: tone.background, border: `1px solid ${tone.border}`, color: tone.color,
              padding: '8px 16px', borderRadius: 999, fontSize: 14,
              boxShadow: '0 4px 16px rgba(0,0,0,.4)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {tone.icon && <span>{tone.icon}</span>}
              {x.msg}
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
