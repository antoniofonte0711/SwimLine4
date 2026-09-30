import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Ruoli possibili: 'atleta' | 'coach' | 'genitore' | 'admin'
// L'admin può anche "vedere come" un altro ruolo (coach, atleta, genitore, ospite):
// cambia solo ciò che compare sullo schermo, i dati e i permessi veri restano quelli del suo account.
const AuthContext = createContext(null)
const CHIAVE_VISTA = 'swimline4:vistaCome'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [vistaCome, setVistaCome] = useState(() => {
    try {
      return sessionStorage.getItem(CHIAVE_VISTA) || ''
    } catch {
      return ''
    }
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else {
        setProfile(null)
        cambiaVista('admin')
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function ricaricaProfilo() {
    if (user) await loadProfile(user.id)
  }

  function cambiaVista(ruolo) {
    const valore = ruolo === 'admin' ? '' : ruolo
    setVistaCome(valore)
    try {
      if (valore) sessionStorage.setItem(CHIAVE_VISTA, valore)
      else sessionStorage.removeItem(CHIAVE_VISTA)
    } catch {
      // ignorato
    }
  }

  const adminReale = profile?.role === 'admin'
  const staVedendoCome = adminReale && !!vistaCome
  const ruolo = staVedendoCome ? vistaCome : profile?.role
  const isAdmin = ruolo === 'admin'
  const isCoach = ruolo === 'coach' || isAdmin

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, isAdmin, isCoach, ruolo, adminReale, staVedendoCome, cambiaVista, ricaricaProfilo }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
