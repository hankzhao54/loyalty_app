import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageProvider'
import { useToast } from '../context/ToastProvider'
import { useTheme, FONT } from '../context/ThemeProvider'
import { LangSwitch, ThemeToggle } from '../components/Controls'
import Privacy from './Privacy'

export default function Login() {
  const { t } = useLang()
  const { c } = useTheme()
  const toast = useToast()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  if (showPrivacy) return <Privacy onBack={() => setShowPrivacy(false)} />

  async function submit() {
    if (!email || !password) return
    if (mode === 'signup' && !agree) { toast(t.login.mustAgree, 'error'); return }
    setBusy(true)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) toast(error.message, 'error')
    } else {
      // 强制同意(agree,上面已拦截必选)与营销同意一并经注册元数据
      // 带给后端触发器写入,避免"邮箱验证时无 session → RLS 拦截 → 同意被静默丢弃"
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { marketing_optin: marketing, terms_accepted: agree } },
      })
      if (error) { toast(error.message, 'error'); setBusy(false); return }
      if (!data.session) toast(t.login.checkEmail, 'success')
    }
    setBusy(false)
  }

  const inputStyle = {
    width: '100%', background: c.surface, border: `1px solid ${c.line}`,
    borderRadius: 12, padding: '12px 14px', color: c.text, fontSize: 15, fontFamily: FONT.body,
  }
  const checkRow = { display: 'flex', gap: 8, fontSize: 13, color: c.text, lineHeight: 1.4 }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', padding: 24,
                  background: c.bg, color: c.text, fontFamily: FONT.body }}>
      <div style={{ position: 'absolute', top: 'max(20px, calc(env(safe-area-inset-top) + 8px))',
                    right: 'max(20px, env(safe-area-inset-right))',
                    display: 'flex', gap: 8, alignItems: 'center' }}>
        <LangSwitch />
        <ThemeToggle />
      </div>

      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 44,
                    letterSpacing: '-1px', marginBottom: 4, color: c.accent }}>101</div>
      <div style={{ color: c.muted, fontSize: 13, marginBottom: 28 }}>{t.login.title}</div>

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="email" placeholder={t.login.email} value={email} style={inputStyle}
               autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder={t.login.password} value={password} style={inputStyle}
               autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
               onChange={(e) => setPassword(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && submit()} />

        {mode === 'signup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '4px 0' }}>
            <label style={checkRow}>
              <input type="checkbox" style={{ width: 'auto', marginTop: 2, flexShrink: 0 }}
                     checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>
                {t.login.agreeRequired}{' '}
                <span onClick={(e) => { e.preventDefault(); setShowPrivacy(true) }}
                      style={{ color: c.accent, textDecoration: 'underline' }}>
                  ({t.login.privacyLink})
                </span>
              </span>
            </label>
            <label style={checkRow}>
              <input type="checkbox" style={{ width: 'auto', marginTop: 2, flexShrink: 0 }}
                     checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              <span>{t.login.agreeMarketing}</span>
            </label>
          </div>
        )}

        <button onClick={submit} disabled={busy} style={{
          background: c.accent, color: c.accentInk, padding: '13px 0',
          borderRadius: 14, fontSize: 16, fontFamily: FONT.display, fontWeight: 700,
          opacity: busy ? 0.6 : 1,
        }}>
          {mode === 'signin' ? t.login.signIn : t.login.signUp}
        </button>
        <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                style={{ color: c.accent, fontSize: 13, padding: 8 }}>
          {mode === 'signin' ? t.login.noAccount : t.login.haveAccount}
        </button>
        <button onClick={() => setShowPrivacy(true)}
                style={{ color: c.muted, fontSize: 12, padding: 4 }}>
          {t.login.privacyLink}
        </button>
      </div>
    </div>
  )
}
