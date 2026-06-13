import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageProvider'
import { useToast } from '../context/ToastProvider'

const serif = { fontFamily: "Georgia,'Noto Serif SC',serif" }

export default function Login() {
  const { t, lang, setLang } = useLang()
  const toast = useToast()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!email || !password) return
    setBusy(true)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) toast(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) toast(error.message)
      else if (!data.session) toast(t.login.checkEmail) // 开了邮箱验证时
    }
    setBusy(false)
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'absolute', top: 'max(20px, calc(env(safe-area-inset-top) + 8px))',
                    right: 'max(20px, env(safe-area-inset-right))', display: 'flex', gap: 4 }}>
        {[['en', 'EN'], ['hu', 'HU'], ['zh', '中']].map(([k, label]) => (
          <button key={k} onClick={() => setLang(k)} style={{
            padding: '4px 8px', borderRadius: 6, fontSize: 12,
            background: lang === k ? '#c9a14f' : '#2b231c',
            color: lang === k ? '#171210' : '#a89c89',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ ...serif, fontSize: 36, letterSpacing: 2, marginBottom: 4 }}>101</div>
      <div style={{ color: '#a89c89', fontSize: 13, marginBottom: 28 }}>{t.login.title}</div>

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="email" placeholder={t.login.email} value={email}
               autoComplete="email"
               onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder={t.login.password} value={password}
               autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
               onChange={(e) => setPassword(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <button onClick={submit} disabled={busy} style={{
          background: '#b8392e', color: '#fff', padding: '12px 0',
          borderRadius: 12, fontSize: 16, ...serif, letterSpacing: 1,
          opacity: busy ? 0.6 : 1,
        }}>
          {mode === 'signin' ? t.login.signIn : t.login.signUp}
        </button>
        <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                style={{ color: '#c9a14f', fontSize: 13, padding: 8 }}>
          {mode === 'signin' ? t.login.noAccount : t.login.haveAccount}
        </button>
      </div>
    </div>
  )
}
