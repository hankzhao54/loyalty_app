import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import { useLang } from '../context/LanguageProvider'
import { fmt } from '../lib/i18n'

const serif = { fontFamily: "Georgia,'Noto Serif SC',serif" }

/* 店员当日统计:今天本人录入的消费笔数、发放积分、核销券数。
   按本地零点起算。manager 看到的也是自己账号经手的;
   全店汇总留待将来后台报表。 */
export default function TodayStats() {
  const { user } = useAuth()
  const { t } = useLang()
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
  }, [user])

  const cell = (label, val) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ ...serif, fontSize: 24 }}>{val}</div>
      <div style={{ fontSize: 11, color: '#a89c89', marginTop: 2 }}>{label}</div>
    </div>
  )

  return (
    <div style={{ background: '#1f1915', border: '1px solid #32281f', borderRadius: 16,
                  padding: 16, display: 'flex', gap: 8 }}>
      {cell(t.staff.todayOrders, s.count)}
      <div style={{ width: 1, background: '#32281f' }} />
      {cell(t.staff.todayPoints, fmt(s.points))}
      <div style={{ width: 1, background: '#32281f' }} />
      {cell(t.staff.todayVerified, s.verified)}
    </div>
  )
}
