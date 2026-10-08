import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Ruoli possibili: 'atleta' | 'coach' | 'genitore' | 'admin'
// L'admin può anche "vedere come" un altro ruolo (coach, atleta, genitore, ospite):
// cambia solo ciò che compare sullo schermo, i dati e i permessi veri restano quelli del suo account.
const AuthContext = createContext(null)
const CHIAVE_VISTA = 'swimline4:vistaCome'
// L'admin può "entrare" in una squadra qualsiasi: l'app gliela mostra come la vede il suo coach
const CHIAVE_SQUADRA = 'swimline4:squadraGestita'

function leggiSquadraGestita() {
  try {
    return JSON.parse(sessionStorage.getItem(CHIAVE_SQUADRA) || 'null')
  } catch {
    return null
  }
}

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
  const [squadraScelta, setSquadraScelta] = useState(leggiSquadraGestita) // { id, nome } oppure null

  useEffect(() => {
    // Link di un'email scaduto o già usato (Supabase rimanda qui con #error_code=...):
    // invece di una pagina muta si va al login con la spiegazione
    if (/error_code=|error=access_denied/.test(window.location.hash) && window.location.pathname !== '/login') {
      window.location.replace('/login?link=scaduto')
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Link "Password dimenticata" arrivato su un'altra pagina (es. se Supabase usa l'indirizzo principale):
      // si va comunque a scegliere la nuova password
      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/nuova-password') {
        window.location.replace('/nuova-password')
        return
      }
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else {
        setProfile(null)
        cambiaVista('admin')
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- solo all'avvio

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

  function salvaSquadraScelta(s) {
    setSquadraScelta(s)
    try {
      if (s) sessionStorage.setItem(CHIAVE_SQUADRA, JSON.stringify(s))
      else sessionStorage.removeItem(CHIAVE_SQUADRA)
    } catch {
      // ignorato
    }
  }

  function cambiaVista(ruolo) {
    const valore = ruolo === 'admin' ? '' : ruolo
    setVistaCome(valore)
    // Tornando admin si esce anche dalla squadra in cui si era entrati
    if (!valore) salvaSquadraScelta(null)
    try {
      if (valore) sessionStorage.setItem(CHIAVE_VISTA, valore)
      else sessionStorage.removeItem(CHIAVE_VISTA)
    } catch {
      // ignorato
    }
  }

  // Admin: entra in una squadra e la vede come il suo coach
  function entraInSquadra(s) {
    salvaSquadraScelta({ id: s.id, nome: s.nome })
    cambiaVista('coach')
  }

  const adminReale = profile?.role === 'admin'
  const staVedendoCome = adminReale && !!vistaCome
  const ruolo = staVedendoCome ? vistaCome : profile?.role
  const isAdmin = ruolo === 'admin'
  const isCoach = ruolo === 'coach' || isAdmin
  const squadraGestita = adminReale ? squadraScelta : null

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, isAdmin, isCoach, ruolo, adminReale, staVedendoCome, cambiaVista, ricaricaProfilo, squadraGestita, entraInSquadra }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
