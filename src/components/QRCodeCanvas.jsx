import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export default function QRCodeCanvas({ value, size = 96 }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && value) {
      QRCode.toCanvas(ref.current, value, { width: size, margin: 1 })
    }
  }, [value, size])
  return <canvas ref={ref} style={{ borderRadius: 8, display: 'block' }} />
}
