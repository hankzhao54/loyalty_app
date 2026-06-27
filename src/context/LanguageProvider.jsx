import { createContext, useContext, useEffect, useState } from 'react'
import { T } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'

const LangCtx = createContext(null)

export function LanguageProvider({ children }) {
  const { user } = useAuth()
  const [lang, setLangState] = useState(() => (['en','hu'].includes(localStorage.getItem('lang')) ? localStorage.getItem('lang') : 'en'))

  // 登录后:本地没选过语言的话,跟随档案里的 preferred_lang
  useEffect(() => {
    if (!user || localStorage.getItem('lang')) return
    supabase
      .from('members')
      .select('preferred_lang')
      .eq('auth_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.preferred_lang === 'hu') setLangState('hu')
      })
  }, [user])

  // 切换语言:localStorage + 写回数据库(双写,供推送/邮件营销使用)
  const setLang = (l) => {
    setLangState(l)
    localStorage.setItem('lang', l)
    if (user) {
      supabase.from('members').update({ preferred_lang: l }).eq('auth_user_id', user.id).then(() => {})
    }
  }

  return (
    <LangCtx.Provider value={{ lang, setLang, t: T[lang] }}>
      {children}
    </LangCtx.Provider>
  )
}

export const useLang = () => useContext(LangCtx)
