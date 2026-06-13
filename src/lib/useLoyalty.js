import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

/* 一次拉齐会员页所需数据;任何写操作完成后调用 reload() */
export function useLoyalty(user) {
  const [data, setData] = useState({
    member: null, txs: [], stores: [], rewards: [], redemptions: [],
    campaigns: [], progress: [], config: {}, isStaff: false, isManager: false,
    expiring: 0, expiringDate: null, ready: false,
  })

  const reload = useCallback(async () => {
    if (!user) return
    const [m, st, rw, cf, sf] = await Promise.all([
      supabase.from('members').select('*').eq('auth_user_id', user.id).maybeSingle(),
      supabase.from('stores').select('*').eq('active', true).order('name'),
      supabase.from('rewards').select('*').eq('active', true).order('sort_order'),
      supabase.from('config').select('*'),
      supabase.from('staff').select('auth_user_id, role').eq('auth_user_id', user.id).maybeSingle(),
    ])

    const member = m.data
    let txs = [], redemptions = [], campaigns = [], progress = []
    let expiring = 0, expiringDate = null
    if (member) {
      const [t1, r1, c1, p1] = await Promise.all([
        supabase.from('point_transactions').select('*')
          .eq('member_id', member.id).order('created_at', { ascending: false }).limit(15),
        supabase.from('redemptions').select('*')
          .eq('member_id', member.id).eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('campaigns').select('*').eq('active', true),
        supabase.from('member_campaign_progress').select('*').eq('member_id', member.id),
      ])
      txs = t1.data || []
      redemptions = r1.data || []
      campaigns = c1.data || []
      progress = p1.data || []

      // 60 天内即将过期的 earn 积分合计(给会员卡提醒用)
      const soon = new Date(Date.now() + 60 * 86400000).toISOString()
      const { data: exp } = await supabase
        .from('point_transactions')
        .select('points, expires_at')
        .eq('member_id', member.id)
        .eq('type', 'earn')
        .not('expires_at', 'is', null)
        .lte('expires_at', soon)
        .gt('expires_at', new Date().toISOString())
      expiring = (exp || []).reduce((sum, r) => sum + r.points, 0)
      expiringDate = (exp || []).map(r => r.expires_at).sort()[0] || null
    }

    const config = Object.fromEntries((cf.data || []).map((r) => [r.key, r.value]))
    setData({
      member, txs, stores: st.data || [], rewards: rw.data || [],
      redemptions, campaigns, progress, config, isStaff: !!sf.data,
      isManager: sf.data?.role === 'manager', expiring, expiringDate, ready: true,
    })
  }, [user])

  useEffect(() => { reload() }, [reload])
  return { ...data, reload }
}
