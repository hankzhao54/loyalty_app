import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import { useLang } from '../context/LanguageProvider'
import { useTheme, FONT } from '../context/ThemeProvider'
import { fmt } from '../lib/i18n'

export default function TodayStats({ refreshKey }) {
  const { user } = useAuth()
  const { t } = useLang()
  const { c } = useTheme()
  const [s, setS] = useState({ count: 0, points: 0, verified: 0 })

  useEffect(() => {
    if (!user) return
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const iso = start.toISOString()
    ;(async () => {
      const [earn, ver] = await Promise.all([
        supabase.from('point_transactions').select('points')
          .eq('staff_id', user.id).eq('type', 'earn').gte('created_at', iso),
        supabase.from('redemptions').select('id')
          .eq('verified_by', user.id).eq('status', 'verified').gte('verified_at', iso),
      ])
      setS({
        count: (earn.data || []).length,
        points: (earn.data || []).reduce((a, r) => a + r.points, 0),
        verified: (ver.data || []).length,
      })
    })()
  }, [user, refreshKey])

  const cell = (label, val) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 26, color: c.text,
                    letterSpacing: '-0.5px' }}>{val}</div>
      <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{label}</div>
    </div>
  )

  return (
    <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 22,
                  padding: 16, display: 'flex', gap: 8 }}>
      {cell(t.staff.todayOrders, s.count)}
      <div style={{ width: 1, background: c.line }} />
      {cell(t.staff.todayPoints, fmt(s.points))}
      <div style={{ width: 1, background: c.line }} />
      {cell(t.staff.todayVerified, s.verified)}
    </div>
  )
}
