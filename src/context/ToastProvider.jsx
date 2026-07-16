import { createContext, useContext, useState, useCallback } from 'react'
import { useTheme } from './ThemeProvider'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const { c } = useTheme()

  const toast = useCallback((msg) => {
    const id = Date.now() + Math.random()
    setToasts((x) => [...x, { id, msg }])
    // 先标记 leaving 播退场动画(200ms),再真正移除
    setTimeout(() => setToasts((x) => x.map((y) => y.id === id ? { ...y, leaving: true } : y)), 3300)
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 3550)
  }, [])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', top: 16, left: 0, right: 0, zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, pointerEvents: 'none', padding: '0 24px',
      }}>
        {toasts.map((x) => (
          <div key={x.id} className="toast" data-leaving={x.leaving ? 'true' : undefined} style={{
            background: c.text, border: `1px solid ${c.text}`, color: c.bg,
            padding: '8px 16px', borderRadius: 999, fontSize: 14,
            boxShadow: '0 4px 16px rgba(0,0,0,.4)',
          }}>
            {x.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
