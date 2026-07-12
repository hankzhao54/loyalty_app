import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageProvider'
import { useToast } from '../context/ToastProvider'
import { fmt } from '../lib/i18n'
import MemberOverview from '../components/MemberOverview'
import { useTheme, FONT, panelStyle } from '../context/ThemeProvider'

const field = { marginBottom: 8 }

const REWARD_TYPES = ['free_item', 'discount', 'physical']

const emptyForm = () => ({
  id: null,
  name_en: '', name_hu: '', name_zh: '',
  desc_en: '', desc_hu: '', desc_zh: '',
  points_cost: '', reward_type: 'free_item',
  min_tier: 'silver', stock_limit: '', active: true, sort_order: 0,
})

/* 管理后台:仅 manager 可见。增删改积分兑换目录。
   读取所有奖励(含下架),区别于顾客端只读 active。 */
export default function AdminPage() {
  const { t, lang } = useLang()
  const { c } = useTheme()
  const toast = useToast()
  const panel = panelStyle(c)
  const inputStyle = { width: '100%', background: c.bg, border: `1px solid ${c.line}`, borderRadius: 10, padding: '10px 12px', color: c.text, fontSize: 15, fontFamily: FONT.body }
  const iconBtn = { width: 32, height: 32, borderRadius: 8, background: c.bg, color: c.accent, fontSize: 14, border: `1px solid ${c.line}` }
  const [view, setView] = useState('rewards')
  const [rewards, setRewards] = useState([])
  const [form, setForm] = useState(emptyForm())
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase.from('rewards').select('*').order('sort_order')
    setRewards(data || [])
  }
  useEffect(() => { load() }, [])

  function startEdit(r) {
    setForm({
      id: r.id,
      name_en: r.name?.en || '', name_hu: r.name?.hu || '', name_zh: r.name?.zh || '',
      desc_en: r.description?.en || '', desc_hu: r.description?.hu || '', desc_zh: r.description?.zh || '',
      points_cost: String(r.points_cost), reward_type: r.reward_type,
      min_tier: r.min_tier, stock_limit: r.stock_limit == null ? '' : String(r.stock_limit),
      active: r.active, sort_order: r.sort_order,
    })
    setEditing(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() { setForm(emptyForm()); setEditing(false) }

  async function save() {
    if (!form.name_en || !form.points_cost) { toast(t.admin.needNameCost); return }
    setBusy(true)
    const payload = {
      name: { en: form.name_en, hu: form.name_hu || form.name_en, zh: form.name_zh || form.name_en },
      description: (form.desc_en || form.desc_hu || form.desc_zh)
        ? { en: form.desc_en, hu: form.desc_hu, zh: form.desc_zh } : null,
      points_cost: parseInt(form.points_cost, 10),
      reward_type: form.reward_type,
      min_tier: form.min_tier,
      stock_limit: form.stock_limit === '' ? null : parseInt(form.stock_limit, 10),
      active: form.active,
      sort_order: Number(form.sort_order) || 0,
    }
    let error
    if (form.id) {
      ({ error } = await supabase.from('rewards').update(payload).eq('id', form.id))
    } else {
      ({ error } = await supabase.from('rewards').insert(payload))
    }
    setBusy(false)
    if (error) { toast(error.message, 'error'); return }
    toast(t.admin.saved, 'success')
    reset(); load()
  }

  async function toggleActive(r) {
    setBusy(true)
    const { error } = await supabase.from('rewards').update({ active: !r.active }).eq('id', r.id)
    setBusy(false)
    if (error) toast(error.message, 'error'); else load()
  }

  async function remove(r) {
    if (!window.confirm(t.admin.confirmDelete)) return
    setBusy(true)
    const { error } = await supabase.from('rewards').delete().eq('id', r.id)
    setBusy(false)
    if (error) {
      // 23503 = 外键冲突:该奖励已被 redemptions 引用,改提示下架
      toast(error.code === '23503' ? t.admin.cannotDelete : error.message, 'error')
    } else { toast(t.admin.deleted, 'success'); load() }
  }

  const inp = (key, ph, opts = {}) => (
    <input value={form[key]} placeholder={ph} style={{ ...inputStyle, ...field }}
           {...opts}
           onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[['rewards', t.admin.tabRewards], ['members', t.admin.tabMembers]].map(([k, label]) => (
          <button key={k} onClick={() => setView(k)} style={{
            flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 14,
            fontFamily: FONT.mono, fontWeight: 700,
            background: view === k ? c.accent : c.bg,
            color: view === k ? c.accentInk : c.muted,
          }}>{label}</button>
        ))}
      </div>

      {view === 'members' && <MemberOverview />}

      {view === 'rewards' && <>
      {/* 编辑表单 */}
      <div style={panel}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
          {editing ? t.admin.editReward : t.admin.newReward}
        </div>

        <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>{t.admin.nameLabel}</div>
        {inp('name_en', 'EN *')}
        {inp('name_hu', 'HU')}
        {inp('name_zh', '中')}

        <div style={{ fontSize: 12, color: c.muted, margin: '8px 0 4px' }}>{t.admin.descLabel}</div>
        {inp('desc_en', 'EN')}
        {inp('desc_hu', 'HU')}
        {inp('desc_zh', '中')}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>{t.admin.cost}</div>
            {inp('points_cost', '60', { inputMode: 'numeric' })}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>{t.admin.stock}</div>
            {inp('stock_limit', '∞', { inputMode: 'numeric' })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>{t.admin.type}</div>
            <select value={form.reward_type} style={inputStyle}
                    onChange={(e) => setForm({ ...form, reward_type: e.target.value })}>
              {REWARD_TYPES.map((rt) => <option key={rt} value={rt}>{t.admin.types[rt]}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>{t.admin.minTier}</div>
            <select value={form.min_tier} style={inputStyle}
                    onChange={(e) => setForm({ ...form, min_tier: e.target.value })}>
              <option value="silver">{t.tiers.silver}</option>
              <option value="jade">{t.tiers.jade}</option>
              <option value="gold">{t.tiers.gold}</option>
            </select>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginTop: 10 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={form.active}
                 onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          {t.admin.activeLabel}
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={save} disabled={busy} style={{
            flex: 1, background: c.accent, color: c.accentInk, padding: '10px 0',
            borderRadius: 10, fontFamily: FONT.display, fontWeight: 700, opacity: busy ? 0.6 : 1,
          }}>
            {editing ? t.admin.update : t.admin.create}
          </button>
          {editing && (
            <button onClick={reset} style={{
              background: c.bg, color: c.muted, padding: '10px 20px', borderRadius: 10,
            }}>{t.admin.cancel}</button>
          )}
        </div>
      </div>

      {/* 现有目录 */}
      <div style={panel}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{t.admin.catalog}</div>
        {rewards.map((r) => (
          <div key={r.id} style={{ padding: '10px 0', borderTop: `1px solid ${c.lineInner}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: r.active ? c.text : c.mutedList }}>
                  {r.name?.[lang] || r.name?.en}
                  {!r.active && <span style={{ fontSize: 11, color: c.mutedList }}> · {t.admin.inactive}</span>}
                </div>
                <div style={{ fontSize: 12, color: c.muted }}>
                  {fmt(r.points_cost)} · {t.admin.types[r.reward_type]}
                  {r.stock_limit != null && ` · ${t.admin.stockLeft(r.stock_limit - r.redeemed_count)}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => toggleActive(r)} disabled={busy} title={t.admin.toggle}
                        aria-label={t.admin.toggle} style={iconBtn}>{r.active ? '◉' : '○'}</button>
                <button onClick={() => startEdit(r)} title={t.admin.edit}
                        aria-label={t.admin.edit} style={iconBtn}>✎</button>
                <button onClick={() => remove(r)} disabled={busy} title={t.admin.delete}
                        aria-label={t.admin.delete} style={{ ...iconBtn, color: c.accent }}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      </>}
    </div>
  )
}

