import { useEffect } from 'react'
import QRCodeCanvas from './QRCodeCanvas'
import { useLang } from '../context/LanguageProvider'
import { formatShortCode } from '../lib/i18n'

/* 全屏会员码:白底、大二维码、短码大字。
   打开时尝试用 Wake Lock 防止熄屏;部分浏览器还支持
   临时提亮(无标准 API,这里靠白底 + 最大尺寸保证可扫)。 */
export default function QrFullscreen({ cardNumber, onClose }) {
  const { t } = useLang()

  useEffect(() => {
    let lock = null
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then((l) => { lock = l }).catch(() => {})
    }
    return () => { if (lock) lock.release().catch(() => {}) }
  }, [])

  const size = Math.min(
    typeof window !== 'undefined' ? window.innerWidth - 80 : 280, 340
  )

  return (
    <div onClick={onClose} className="modal-enter" style={{
      position: 'fixed', inset: 0, zIndex: 70, background: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 24, padding: 24, cursor: 'pointer',
    }}>
      <div style={{ background: '#fff', padding: 12, borderRadius: 16 }}>
        <QRCodeCanvas value={cardNumber} size={size} />
      </div>
      <div style={{ fontFamily: "Georgia,'Noto Serif SC',serif",
                    fontSize: 26, letterSpacing: 4, color: '#171210' }}>
        {formatShortCode(cardNumber)}
      </div>
      <div style={{ fontSize: 13, color: '#888' }}>{t.tapToClose}</div>
    </div>
  )
}
