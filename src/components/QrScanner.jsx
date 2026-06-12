import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { useLang } from '../context/LanguageProvider'

/* 全屏扫码层:打开后置摄像头,扫到结果回调 onScan(text) 并自动关闭。
   失败(无相机/拒绝权限)时显示提示,让店员退回手动输入。 */
export default function QrScanner({ title, onScan, onClose }) {
  const { t } = useLang()
  const elId = useRef('qr-' + Math.random().toString(36).slice(2, 8))
  const scannerRef = useRef(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let active = true
    const scanner = new Html5Qrcode(elId.current, { verbose: false })
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decoded) => {
          if (!active) return
          active = false
          scanner.stop().then(() => scanner.clear()).catch(() => {})
          onScan(decoded)
        },
        () => {} // 每帧未识别的回调,忽略
      )
      .catch(() => { if (active) setErr(true) })

    return () => {
      active = false
      const s = scannerRef.current
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {})
      }
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.92)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ color: '#ece4d6', fontSize: 16, marginBottom: 16,
                    fontFamily: "Georgia,'Noto Serif SC',serif" }}>{title}</div>

      {!err ? (
        <>
          <div id={elId.current} style={{ width: 260, maxWidth: '80vw',
                                          borderRadius: 12, overflow: 'hidden' }} />
          <div style={{ color: '#a89c89', fontSize: 13, marginTop: 14 }}>{t.staff.scanHint}</div>
        </>
      ) : (
        <div style={{ color: '#d98', fontSize: 14, textAlign: 'center', maxWidth: 280 }}>
          {t.staff.scanError}
        </div>
      )}

      <button onClick={onClose} style={{
        marginTop: 28, background: '#2b231c', color: '#ece4d6',
        padding: '10px 28px', borderRadius: 999, fontSize: 15,
      }}>
        {t.staff.close}
      </button>
    </div>
  )
}
