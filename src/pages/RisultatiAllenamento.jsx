import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import AppShell from '../components/AppShell'
import RisultatiAtleta from '../components/RisultatiAtleta'
import SelettoreData from '../components/SelettoreData'
import { SenzaSquadra } from '../components/PianoCard'
import { dataLocale } from '../lib/lavori'
import { useMiaSquadra } from '../lib/pianoSquadra'
import { ordinaPersone } from '../lib/persone'

const CAMPO = 'w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white'

// Coach: registrazione dei risultati dell'allenamento, un atleta alla volta
export default function RisultatiAllenamento() {
  const [params] = useSearchParams()
  const [giorno, setGiorno] = useState(params.get('data') || dataLocale())
  const { squadra, pronto } = useMiaSquadra()
  const [atleti, setAtleti] = useState([])
  const [atleta, setAtleta] = useState('')
  const [piano, setPiano] = useState(null)
  const [presenze, setPresenze] = useState([]) // presenze segnate per quel giorno

  useEffect(() => {
    if (!squadra) return
    supabase.from('profiles').select('id, nome, cognome').in('role', ['atleta', 'admin']).eq('squadra_id', squadra.id).order('cognome')
      .then(({ data }) => {
        const ord = ordinaPersone(data)
        setAtleti(ord)
        setAtleta((a) => a || ord[0]?.id || '')
      })
  }, [squadra?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!squadra) return
    let attivo = true
    supabase.from('presenze').select('atleta_id, stato').eq('data', giorno)
      .then(({ data }) => { if (attivo) setPresenze(data || []) })
    supabase.from('allenamenti_squadra').select('*').eq('squadra_id', squadra.id).eq('data', giorno).maybeSingle()
      .then(({ data }) => { if (attivo) setPiano(data || null) })
    return () => { attivo = false }
  }, [squadra?.id, giorno]) // eslint-disable-line react-hooks/exhaustive-deps

  // Con le presenze segnate si scrivono i tempi solo dei presenti; senza presenze segnate si vedono tutti
  const segnati = new Set(presenze.map((x) => x.atleta_id))
  const haPresenze = atleti.some((a) => segnati.has(a.id))
  const presenti = new Set(presenze.filter((x) => x.stato === 'presente').map((x) => x.atleta_id))
  const visibili = haPresenze ? atleti.filter((a) => presenti.has(a.id)) : atleti
  const scelto = visibili.some((a) => a.id === atleta) ? atleta : visibili[0]?.id || ''

  return (
    <AppShell titolo="Risultati" attiva="funzioni" indietro={`/allenamenti?data=${giorno}`}>
      {!pronto ? <p className="text-center text-slate-500 py-8">Carico…</p>
        : !squadra ? <SenzaSquadra />
        : (
          <>
            <div className="bg-white rounded-3xl p-5 mb-3 shadow-card">
              <SelettoreData etichetta="Data dell'allenamento" valore={giorno} onChange={setGiorno} />
              <label className="block text-xs text-slate-500 mt-3 mb-1">Atleta</label>
              <select value={scelto} onChange={(e) => setAtleta(e.target.value)} className={CAMPO}>
                {visibili.length === 0 && <option value="">{atleti.length ? 'Nessun atleta presente' : 'Nessun atleta nella squadra'}</option>}
                {visibili.map((a) => <option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}
              </select>
            </div>
            {haPresenze && <p className="text-xs text-slate-500 mb-2 px-1">Si vedono solo i presenti ({visibili.length} su {atleti.length}).</p>}
            {scelto && <RisultatiAtleta key={scelto + giorno} piano={piano} atletaId={scelto} giorno={giorno} />}
          </>
        )}
    </AppShell>
  )
}
