import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthProvider'
import { LanguageProvider, useLang } from './context/LanguageProvider'
import { ToastProvider } from './context/ToastProvider'
import { useLoyalty } from './lib/useLoyalty'
import Login from './pages/Login'
import CardPage from './pages/CardPage'
import RewardsPage from './pages/RewardsPage'
import StampsPage from './pages/StampsPage'
import StaffPage from './pages/StaffPage'
import AdminPage from './pages/AdminPage'

const serif = { fontFamily: "Georgia,'Noto Serif SC',serif" }

function Shell() {
  const { user, loading, signOut } = useAuth()
  const { t, lang, setLang } = useLang()
  const data = useLoyalty(user)
  const [tab, setTab] = useState('card')

  if (loading) return <Center>{'…'}</Center>
  if (!user) return <Login />
  if (!data.ready) return <Center>{t.loading}</Center>

  // 店员账号被删除会员行后,只显示店员页
  const memberTabs = data.member ? ['card', 'rewards', 'stamps'] : []
  const staffTabs = data.isStaff ? ['staff'] : []
  const adminTabs = data.isManager ? ['admin'] : []
  const tabs = [...memberTabs, ...staffTabs, ...adminTabs]
  const active = tabs.includes(tab) ? tab : tabs[0]

  if (tabs.length === 0) return (
    <Center>
      <div>{t.noMember}</div>
      <button onClick={signOut} style={{ color: '#c9a14f', marginTop: 12 }}>
        {t.login.signOut}
      </button>
    </Center>
  )

  return (
    <div style={{ maxWidth: 448, margin: '0 auto', minHeight: '100%',
                  display: 'flex', flexDirection: 'column', background: '#171210' }}>
      <header style={{ padding: '24px 20px 12px', display: 'flex',
                       justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ ...serif, fontSize: 20, letterSpacing: 1.5 }}>{t.brand}</div>
          <div style={{ color: '#a89c89', fontSize: 12, marginTop: 2 }}>{t.sub}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[['en', 'EN'], ['hu', 'HU'], ['zh', '中']].map(([k, label]) => (
            <button key={k} onClick={() => setLang(k)} style={{
              padding: '4px 8px', borderRadius: 6, fontSize: 12,
              background: lang === k ? '#c9a14f' : '#2b231c',
              color: lang === k ? '#171210' : '#a89c89',
            }}>{label}</button>
          ))}
          <button onClick={signOut} title={t.login.signOut}
                  style={{ color: '#a89c89', fontSize: 12, padding: '4px 6px' }}>⎋</button>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '0 20px 110px' }}>
        {active === 'card'    && <CardPage {...data} />}
        {active === 'rewards' && <RewardsPage {...data} />}
        {active === 'stamps'  && <StampsPage {...data} />}
        {active === 'staff'   && <StaffPage {...data} />}
        {active === 'admin'   && <AdminPage />}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                    width: '100%', maxWidth: 448, display: 'flex',
                    background: '#1c1612', borderTop: '1px solid #2b231c',
                    paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {tabs.map((k) => (
          <button key={k} onClick={() => setTab(k)} style={{
            ...serif, flex: 1, padding: '16px 0', fontSize: 14, letterSpacing: 2,
            color: active === k ? '#c9a14f' : '#a89c89',
            borderTop: active === k ? '2px solid #c9a14f' : '2px solid transparent',
          }}>
            {t.tabs[k]}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Center({ children }) {
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#a89c89', padding: 24, textAlign: 'center' }}>
      {children}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}
