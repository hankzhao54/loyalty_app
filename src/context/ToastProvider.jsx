import { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg) => {
    const id = Date.now() + Math.random()
    setToasts((x) => [...x, { id, msg }])
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 3500)
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
          <div key={x.id} style={{
            background: '#2b231c', border: '1px solid #c9a14f66', color: '#ece4d6',
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
