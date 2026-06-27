import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthProvider'
import { LanguageProvider, useLang } from './context/LanguageProvider'
import { ToastProvider } from './context/ToastProvider'
import { ThemeProvider, useTheme, FONT } from './context/ThemeProvider'
import { LangSwitch, ThemeToggle } from './components/Controls'
import { useLoyalty } from './lib/useLoyalty'
import Login from './pages/Login'
import CardPage from './pages/CardPage'
import RewardsPage from './pages/RewardsPage'
import StampsPage from './pages/StampsPage'
import StaffPage from './pages/StaffPage'
import AdminPage from './pages/AdminPage'

// 底部导航标签固定英文(设计稿规范)
const NAV_LABEL = { card: 'Card', rewards: 'Rewards', stamps: 'Stamps', staff: 'Staff', admin: 'Admin' }

function Shell() {
  const { user, loading, signOut } = useAuth()
  const { t } = useLang()
  const { c } = useTheme()
  const data = useLoyalty(user)
  const [tab, setTab] = useState('card')

  if (loading) return <Center>{'…'}</Center>
  if (!user) return <Login />
  if (!data.ready) return <Center>{t.loading}</Center>

  const memberTabs = data.member ? ['card', 'rewards', 'stamps'] : []
  const staffTabs = data.isStaff ? ['staff'] : []
  const adminTabs = data.isManager ? ['admin'] : []
  const tabs = [...memberTabs, ...staffTabs, ...adminTabs]
  const active = tabs.includes(tab) ? tab : tabs[0]

  if (tabs.length === 0) return (
    <Center>
      <div>{t.noMember}</div>
      <button onClick={signOut} style={{ color: c.accent, marginTop: 12 }}>
        {t.login.signOut}
      </button>
    </Center>
  )

  return (
    <div style={{ maxWidth: 448, margin: '0 auto', minHeight: '100vh',
                  display: 'flex', flexDirection: 'column',
                  background: c.bg, color: c.text, fontFamily: FONT.body,
                  transition: 'background-color .35s ease, color .35s ease' }}>
      <header style={{
        paddingTop: 'max(22px, calc(env(safe-area-inset-top) + 10px))',
        paddingLeft: 'max(22px, env(safe-area-inset-left))',
        paddingRight: 'max(22px, env(safe-area-inset-right))',
        paddingBottom: 10, display: 'flex',
        justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 700,
                        letterSpacing: '-0.5px', color: c.text }}>{t.brand}</div>
          <div style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{t.sub}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <LangSwitch />
          <ThemeToggle />
          <button onClick={signOut} title={t.login.signOut}
                  style={{ color: c.muted, fontSize: 14, padding: '4px 4px' }}>⎋</button>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto',
        paddingLeft: 'max(22px, env(safe-area-inset-left))',
        paddingRight: 'max(22px, env(safe-area-inset-right))',
        paddingTop: 6, paddingBottom: 90 }}>
        {active === 'card'    && <CardPage {...data} />}
        {active === 'rewards' && <RewardsPage {...data} />}
        {active === 'stamps'  && <StampsPage {...data} />}
        {active === 'staff'   && <StaffPage {...data} />}
        {active === 'admin'   && <AdminPage />}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                    width: '100%', maxWidth: 448, height: 74, display: 'flex',
                    background: c.navBg, backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderTop: `1px solid ${c.line}`,
                    paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
                    paddingLeft: 'env(safe-area-inset-left)',
                    paddingRight: 'env(safe-area-inset-right)' }}>
        {tabs.map((k) => {
          const on = active === k
          return (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, fontFamily: FONT.mono, fontSize: 12,
              fontWeight: on ? 700 : 400,
              color: on ? c.text : c.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingBottom: on ? 3 : 5, paddingTop: 5,
              borderBottom: on ? `2px solid ${c.accent}` : '2px solid transparent',
            }}>
              {NAV_LABEL[k]}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function Center({ children }) {
  const { c } = useTheme()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: c.bg, color: c.muted, padding: 24, textAlign: 'center',
                  fontFamily: FONT.body }}>
      {children}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <ToastProvider>
            <Shell />
          </ToastProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
