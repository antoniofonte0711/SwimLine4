import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../context/AuthContext'

// Collegamenti genitore → figlio. Il genitore sceglie i figli dall'elenco della squadra, l'atleta approva.
// stato: 'in_attesa' | 'approvato' | 'rifiutato'

const CHIAVE_FIGLIO = 'swimline4:figlioScelto'

// Genitore: i suoi collegamenti, con il nome dell'atleta (preso dall'elenco della squadra)
export function useFigli() {
  const { user } = useAuth()
  const [figli, setFigli] = useState([])
  const [pronto, setPronto] = useState(false)

  const carica = useCallback(async () => {
    if (!user) return
    const [{ data: link }, { data: squadra }] = await Promise.all([
      supabase.from('genitori_figli').select('id, atleta_id, stato').eq('genitore_id', user.id),
      supabase.from('compagni_squadra').select('id, nome, cognome'),
    ])
    const nomi = Object.fromEntries((squadra || []).map((a) => [a.id, a]))
    setFigli((link || []).map((l) => ({ ...l, nome: nomi[l.atleta_id]?.nome || 'Atleta', cognome: nomi[l.atleta_id]?.cognome || '' })))
    setPronto(true)
  }, [user])

  useEffect(() => { carica() }, [carica])
  return { figli, approvati: figli.filter((f) => f.stato === 'approvato'), pronto, ricarica: carica }
}

// Quale figlio sta guardando il genitore (se ne ha più di uno), ricordato su questo telefono
export function useFiglioScelto(approvati) {
  const [scelto, setScelto] = useState(() => {
    try { return localStorage.getItem(CHIAVE_FIGLIO) || '' } catch { return '' }
  })
  const valido = approvati.find((f) => f.atleta_id === scelto) || approvati[0] || null
  const scegli = (id) => {
    setScelto(id)
    try { localStorage.setItem(CHIAVE_FIGLIO, id) } catch { /* non disponibile */ }
  }
  return [valido, scegli]
}

// Atleta: genitori che hanno chiesto di seguirlo
export function useGenitori() {
  const { user } = useAuth()
  const [richieste, setRichieste] = useState([])

  const carica = useCallback(async () => {
    if (!user) return
    const { data: link } = await supabase.from('genitori_figli').select('id, genitore_id, stato, created_at')
      .eq('atleta_id', user.id).order('created_at', { ascending: false })
    const ids = (link || []).map((l) => l.genitore_id)
    const { data: p } = ids.length ? await supabase.from('profiles').select('id, nome, cognome').in('id', ids) : { data: [] }
    const nomi = Object.fromEntries((p || []).map((x) => [x.id, x]))
    setRichieste((link || []).map((l) => ({ ...l, nome: nomi[l.genitore_id]?.nome || 'Genitore', cognome: nomi[l.genitore_id]?.cognome || '' })))
  }, [user])

  useEffect(() => { carica() }, [carica])
  return { richieste, ricarica: carica }
}
