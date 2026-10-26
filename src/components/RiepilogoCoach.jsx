import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from './AppShell'
import { SenzaSquadra } from './PianoCard'
import { dataLocale, formattaGiorno } from '../lib/lavori'
import { lunediDi } from '../lib/presenze'
import { addGiorni, metriPiano, useMiaSquadra } from '../lib/pianoSquadra'
import { ordinaPersone } from '../lib/persone'

const GG = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']
const SCELTE = [['presente', 'Presente'], ['assente', 'Assente'], ['non_penale', 'Giustificato']]
const SIGLA = { presente: 'P', assente: 'A', non_penale: 'G' }
const COLORE = {
  presente: 'bg-green-600 text-white', assente: 'bg-red-600 text-white',
  non_penale: 'bg-amber-500 text-white', vuoto: 'bg-gray-100 text-slate-500',
}

// Tabella delle presenze della settimana (lunedì-venerdì): toccando una casella sotto compaiono
// i tre pulsanti scritti per esteso (niente tocchi ripetuti da indovinare)
export function Bollettino({ squadra }) {
  const { user } = useAuth()
  const [atleti, setAtleti] = useState([])
  const [stati, setStati] = useState({})
  const [errore, setErrore] = useState('')
  const [casella, setCasella] = useState(null) // { atleta, data } la casella toccata
  const lunedi = lunediDi()
  const giorni = GG.map((_, i) => addGiorni(lunedi, i))

  const carica = useCallback(async () => {
    const { data: a } = await supabase.from('profiles').select('id, nome, cognome').in('role', ['atleta', 'admin'])
      .eq('squadra_id', squadra.id).is('eliminato_il', null).order('cognome')
    setAtleti(ordinaPersone(a))
    const ids = (a || []).map((x) => x.id)
    if (ids.length) {
      const { data: pr } = await supabase.from('presenze').select('atleta_id, data, stato')
        .in('atleta_id', ids).gte('data', giorni[0]).lte('data', giorni[4])
      setStati(Object.fromEntries((pr || []).map((r) => [r.atleta_id + r.data, r.stato])))
    }
  }, [squadra.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { carica() }, [carica])

  // stato null = togli (giorno non segnato)
  async function segna(atletaId, data, prossimo) {
    setErrore('')
    const k = atletaId + data
    const { error } = prossimo
      ? await supabase.from('presenze').upsert({ atleta_id: atletaId, data, stato: prossimo, segnato_da: user.id }, { onConflict: 'atleta_id,data' })
      : await supabase.from('presenze').delete().eq('atleta_id', atletaId).eq('data', data)
    if (error) return setErrore('Non sono riuscito a salvare: ' + error.message)
    setStati({ ...stati, [k]: prossimo || undefined })
    setCasella(null)
  }
  const nomeGiorno = (d) => new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' })

  return (
    <div className="bg-white rounded-3xl p-5 mb-3 shadow-card">
      <p className="font-bold mb-1">Questa settimana</p>
      <p className="text-xs text-slate-500 mb-3">P presente · A assente · G giustificato. Tocca una casella per cambiarla.</p>
      {errore && <p className="text-sm text-white bg-red-600 rounded-lg px-3 py-2 mb-3">{errore}</p>}
      {atleti.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun atleta nella squadra: compaiono quando la scelgono in registrazione.</p>
      ) : (
        <table className="w-full text-xs">
          <thead><tr><th />{GG.map((g, i) => <th key={g} className="pb-2 font-semibold text-slate-500">{g}<br />{Number(giorni[i].slice(8))}</th>)}</tr></thead>
          <tbody>
            {atleti.map((a) => (
              <tr key={a.id}>
                <td className="py-1 pr-2 font-medium">{a.nome} {a.cognome?.charAt(0)}.</td>
                {giorni.map((d) => {
                  const s = stati[a.id + d]
                  return (
                    <td key={d} className="text-center py-1">
                      <button onClick={() => setCasella({ atleta: a, data: d })} aria-label={`${a.nome}, ${nomeGiorno(d)}`}
                        aria-pressed={casella?.atleta.id === a.id && casella?.data === d}
                        className={`w-9 h-9 rounded-lg font-bold ${COLORE[s || 'vuoto']} ${casella?.atleta.id === a.id && casella?.data === d ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}>{s ? SIGLA[s] : '·'}</button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {casella && (
        // fisso sopra la barra in basso: si vede subito, senza scorrere
        <div role="group" aria-label="Cambia presenza"
          className="fixed inset-x-4 mx-auto max-w-sm bottom-[calc(92px+env(safe-area-inset-bottom))] lg:bottom-8 z-40 bg-white rounded-2xl p-3 shadow-flottante border border-linea">
          <p className="text-sm font-bold text-abisso mb-2 first-letter:uppercase">{casella.atleta.nome} {casella.atleta.cognome} · {nomeGiorno(casella.data)}</p>
          <div className="grid grid-cols-3 gap-2">
            {SCELTE.map(([k, nome]) => (
              <button key={k} onClick={() => segna(casella.atleta.id, casella.data, k)}
                className={`min-h-[44px] rounded-xl text-sm font-bold ${stati[casella.atleta.id + casella.data] === k ? COLORE[k] : 'bg-bordo text-slate-600'}`}>
                {nome}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <button onClick={() => segna(casella.atleta.id, casella.data, null)} className="min-h-[40px] px-2 text-sm font-semibold text-red-600">Togli</button>
            <button onClick={() => setCasella(null)} className="min-h-[40px] px-2 text-sm font-semibold text-slate-500">Chiudi</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Riepilogo del coach: chilometri della settimana, presenze, lavori svolti
export default function RiepilogoCoach() {
  const { squadra, pronto } = useMiaSquadra()
  const [piani, setPiani] = useState([])
  const lunedi = lunediDi()
  const oggi = dataLocale()

  useEffect(() => {
    if (!squadra) return
    supabase.from('allenamenti_squadra').select('*').eq('squadra_id', squadra.id)
      .gte('data', addGiorni(oggi, -14)).order('data', { ascending: false })
      .then(({ data }) => setPiani(data || []))
  }, [squadra?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const kmSettimana = piani
    .filter((p) => p.data >= lunedi && p.data <= oggi)
    .reduce((s, p) => s + metriPiano(p.righe), 0) / 1000

  if (!pronto) return <AppShell titolo="La settimana" attiva="funzioni" indietro="/funzioni"><p className="text-center text-slate-500 py-8">Carico…</p></AppShell>
  if (!squadra) return <AppShell titolo="La settimana" attiva="funzioni" indietro="/funzioni"><SenzaSquadra /></AppShell>

  return (
    <AppShell titolo="La settimana" attiva="funzioni" indietro="/funzioni">
      <div className="bg-blue-600 text-white rounded-3xl p-5 mb-3 shadow-lg shadow-blue-200">
        <p className="text-sm text-blue-100">Chilometri di questa settimana</p>
        <p className="text-4xl font-extrabold mt-1">{kmSettimana.toFixed(1).replace('.', ',')} km</p>
        <p className="text-sm text-blue-100">{squadra.nome}</p>
      </div>

      <Bollettino squadra={squadra} />

      <div className="bg-white rounded-3xl p-5 shadow-card">
        <p className="font-bold mb-2">Lavori svolti</p>
        {piani.length === 0 && <p className="text-sm text-slate-500">Nessun allenamento negli ultimi 14 giorni.</p>}
        {piani.map((p, i) => (
          <div key={p.id} className={`flex items-center justify-between py-3 ${i ? 'border-t border-gray-100' : ''}`}>
            <div>
              <p className="text-sm font-semibold capitalize">{formattaGiorno(p.data)}</p>
              <p className="text-xs text-slate-500">{p.titolo || 'Allenamento'} · {(metriPiano(p.righe) / 1000).toFixed(1).replace('.', ',')} km</p>
            </div>
            <Link to={`/allenamenti?data=${p.data}`}
              className="cliccabile inline-flex items-center min-h-[44px] text-xs font-bold px-4 rounded-full bg-blue-50 text-blue-600">
              {!p.pubblicato ? 'Bozza' : p.visibilita === 'coach' ? 'Solo coach' : 'Pubblicato'} ›
            </Link>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
