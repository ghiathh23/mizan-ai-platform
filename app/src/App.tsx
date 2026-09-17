import { FormEvent, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  async function signIn(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
  }

  if (!session) return <main dir="rtl"><h1>ميزان AI</h1><form onSubmit={signIn}><label>البريد الإلكتروني<input value={email} onChange={e => setEmail(e.target.value)} type="email" required /></label><label>كلمة المرور<input value={password} onChange={e => setPassword(e.target.value)} type="password" required /></label><button>تسجيل الدخول</button><p>{message}</p></form></main>

  return <main dir="rtl"><h1>ميزان AI</h1><p>تم تسجيل الدخول: {session.user.email}</p><button onClick={() => supabase.auth.signOut()}>تسجيل الخروج</button><p>سياق المشروع وعمليات القراءة والفوترة ستُربط هنا بعمليات Supabase الحقيقية.</p></main>
}
