import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import AppShell from '../components/AppShell'
import RisultatiAtleta from '../components/RisultatiAtleta'
import SelettoreData from '../components/SelettoreData'
import { SenzaSquadra } from '../components/PianoCard'
import { dataLocale } from '../lib/lavori'
import { useMiaSquadra } from '../lib/pianoSquadra'

const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'

// Coach: registrazione dei risultati dell'allenamento, un atleta alla volta
export default function RisultatiAllenamento() {
  const [params] = useSearchParams()
  const [giorno, setGiorno] = useState(params.get('data') || dataLocale())
  const { squadra, pronto } = useMiaSquadra()
  const [atleti, setAtleti] = useState([])
  const [atleta, setAtleta] = useState('')
  const [piano, setPiano] = useState(null)

  useEffect(() => {
    if (!squadra) return
    supabase.from('profiles').select('id, nome, cognome').in('role', ['atleta', 'admin']).eq('squadra_id', squadra.id).order('cognome')
      .then(({ data }) => {
        setAtleti(data || [])
        setAtleta((a) => a || data?.[0]?.id || '')
      })
  }, [squadra?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!squadra) return
    let attivo = true
    supabase.from('allenamenti_squadra').select('*').eq('squadra_id', squadra.id).eq('data', giorno).maybeSingle()
      .then(({ data }) => { if (attivo) setPiano(data || null) })
    return () => { attivo = false }
  }, [squadra?.id, giorno]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppShell titolo="Risultati" attiva="funzioni" indietro={`/allenamenti?data=${giorno}`}>
      {!pronto ? <p className="text-center text-gray-400 py-8">Carico…</p>
        : !squadra ? <SenzaSquadra />
        : (
          <>
            <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
              <SelettoreData etichetta="Data dell'allenamento" valore={giorno} onChange={setGiorno} />
              <label className="block text-xs text-gray-500 mt-3 mb-1">Atleta</label>
              <select value={atleta} onChange={(e) => setAtleta(e.target.value)} className={CAMPO}>
                {atleti.length === 0 && <option value="">Nessun atleta nella squadra</option>}
                {atleti.map((a) => <option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}
              </select>
            </div>
            {atleta && <RisultatiAtleta key={atleta + giorno} piano={piano} atletaId={atleta} giorno={giorno} />}
          </>
        )}
    </AppShell>
  )
}
