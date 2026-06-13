import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageProvider'
import { useToast } from '../context/ToastProvider'
import Privacy from './Privacy'

const serif = { fontFamily: "Georgia,'Noto Serif SC',serif" }

export default function Login() {
  const { t, lang, setLang } = useLang()
  const toast = useToast()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agree, setAgree] = useState(false)        // 必勾:隐私政策
  const [marketing, setMarketing] = useState(false) // 选勾:营销
  const [busy, setBusy] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  if (showPrivacy) return <Privacy onBack={() => setShowPrivacy(false)} />

  async function submit() {
    if (!email || !password) return
    if (mode === 'signup' && !agree) { toast(t.login.mustAgree); return }
    setBusy(true)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) toast(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { toast(error.message); setBusy(false); return }
      // 注册成功:把营销同意写入会员档案(触发器已建好 members 行)
      if (data.user) {
        // 可能存在档案创建的短暂延迟,失败不致命,用户后续可在资料页改
        await supabase.from('members')
          .update({ marketing_optin: marketing })
          .eq('auth_user_id', data.user.id)
      }
      if (!data.session) toast(t.login.checkEmail)
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

        {mode === 'signup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '4px 0' }}>
            <label style={{ display: 'flex', gap: 8, fontSize: 13, color: '#d8cdbb', lineHeight: 1.4 }}>
              <input type="checkbox" style={{ width: 'auto', marginTop: 2, flexShrink: 0 }}
                     checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>
                {t.login.agreeRequired}{' '}
                <span onClick={(e) => { e.preventDefault(); setShowPrivacy(true) }}
                      style={{ color: '#c9a14f', textDecoration: 'underline' }}>
                  ({t.login.privacyLink})
                </span>
              </span>
            </label>
            <label style={{ display: 'flex', gap: 8, fontSize: 13, color: '#d8cdbb', lineHeight: 1.4 }}>
              <input type="checkbox" style={{ width: 'auto', marginTop: 2, flexShrink: 0 }}
                     checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              <span>{t.login.agreeMarketing}</span>
            </label>
          </div>
        )}

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
        <button onClick={() => setShowPrivacy(true)}
                style={{ color: '#6b5f4f', fontSize: 12, padding: 4 }}>
          {t.login.privacyLink}
        </button>
      </div>
    </div>
  )
}
