import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from './AppShell'
import { SenzaSquadra } from './PianoCard'
import { dataLocale, formattaGiorno } from '../lib/lavori'
import { lunediDi } from '../lib/presenze'
import { addGiorni, metriPiano, useMiaSquadra } from '../lib/pianoSquadra'

const GG = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']
const CICLO = [null, 'presente', 'assente', 'non_penale']
const SIGLA = { presente: 'P', assente: 'A', non_penale: 'F' }
const COLORE = {
  presente: 'bg-green-600 text-white', assente: 'bg-red-600 text-white',
  non_penale: 'bg-amber-500 text-white', vuoto: 'bg-gray-100 text-gray-400',
}

// Dashboard del coach: bollettino presenze, chilometri della settimana, lavori svolti
export default function RiepilogoCoach() {
  const { user } = useAuth()
  const { squadra, pronto } = useMiaSquadra()
  const [atleti, setAtleti] = useState([])
  const [stati, setStati] = useState({})
  const [piani, setPiani] = useState([])
  const [errore, setErrore] = useState('')
  const lunedi = lunediDi()
  const giorni = GG.map((_, i) => addGiorni(lunedi, i))
  const oggi = dataLocale()

  const carica = useCallback(async () => {
    if (!squadra) return
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from('profiles').select('id, nome, cognome').in('role', ['atleta', 'admin']).eq('squadra_id', squadra.id).order('cognome'),
      sups(),
    ])
    function sups() {
      return supabase.from('allenamenti_squadra').select('*').eq('squadra_id', squadra.id)
        .gte('data', addGiorni(oggi, -14)).order('data', { ascending: false })
    }
    setAtleti(a || [])
    setPiani(p || [])
    const ids = (a || []).map((x) => x.id)
    if (ids.length) {
      const { data: pr } = await supabase.from('presenze').select('atleta_id, data, stato')
        .in('atleta_id', ids).gte('data', giorni[0]).lte('data', giorni[4])
      setStati(Object.fromEntries((pr || []).map((r) => [r.atleta_id + r.data, r.stato])))
    }
  }, [squadra?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { carica() }, [carica])

  async function tocca(atletaId, data) {
    setErrore('')
    const k = atletaId + data
    const prossimo = CICLO[(CICLO.indexOf(stati[k] || null) + 1) % CICLO.length]
    const { error } = prossimo
      ? await supabase.from('presenze').upsert({ atleta_id: atletaId, data, stato: prossimo, segnato_da: user.id }, { onConflict: 'atleta_id,data' })
      : await supabase.from('presenze').delete().eq('atleta_id', atletaId).eq('data', data)
    if (error) return setErrore('Non sono riuscito a salvare: ' + error.message)
    setStati({ ...stati, [k]: prossimo || undefined })
  }

  const kmSettimana = piani
    .filter((p) => p.data >= giorni[0] && p.data <= oggi)
    .reduce((s, p) => s + metriPiano(p.righe), 0) / 1000

  if (!pronto) return <AppShell titolo="Dashboard" attiva="riepilogo"><p className="text-center text-gray-400 py-8">Carico…</p></AppShell>
  if (!squadra) return <AppShell titolo="Dashboard" attiva="riepilogo"><SenzaSquadra /></AppShell>

  return (
    <AppShell titolo="Dashboard" attiva="riepilogo">
      <div className="bg-blue-600 text-white rounded-3xl p-5 mb-3 shadow-lg shadow-blue-200">
        <p className="text-sm text-blue-100">Chilometri di questa settimana</p>
        <p className="text-4xl font-extrabold mt-1">{kmSettimana.toFixed(1).replace('.', ',')} km</p>
        <p className="text-sm text-blue-100">{squadra.nome}</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <p className="font-bold mb-1">Bollettino giorni</p>
        <p className="text-xs text-gray-400 mb-3">Tocca per cambiare: P presente · A assente · F festa (non penale)</p>
        {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}
        {atleti.length === 0 ? (
          <p className="text-sm text-gray-400">Nessun atleta nella squadra: compaiono quando la scelgono in registrazione.</p>
        ) : (
          <table className="w-full text-xs">
            <thead><tr><th />{GG.map((g, i) => <th key={g} className="pb-2 font-semibold text-gray-500">{g}<br />{Number(giorni[i].slice(8))}</th>)}</tr></thead>
            <tbody>
              {atleti.map((a) => (
                <tr key={a.id}>
                  <td className="py-1 pr-2 font-medium">{a.nome} {a.cognome?.charAt(0)}.</td>
                  {giorni.map((d) => {
                    const s = stati[a.id + d]
                    return (
                      <td key={d} className="text-center py-1">
                        <button onClick={() => tocca(a.id, d)}
                          className={`w-8 h-8 rounded-lg font-bold ${COLORE[s || 'vuoto']}`}>{s ? SIGLA[s] : '·'}</button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
        <p className="font-bold mb-2">Lavori svolti</p>
        {piani.length === 0 && <p className="text-sm text-gray-400">Nessun allenamento negli ultimi 14 giorni.</p>}
        {piani.map((p, i) => (
          <div key={p.id} className={`flex items-center justify-between py-3 ${i ? 'border-t border-gray-100' : ''}`}>
            <div>
              <p className="text-sm font-semibold capitalize">{formattaGiorno(p.data)}</p>
              <p className="text-xs text-gray-400">{p.titolo || 'Allenamento'} · {(metriPiano(p.righe) / 1000).toFixed(1).replace('.', ',')} km</p>
            </div>
            <Link to={`/allenamenti?data=${p.data}`}
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 active:scale-95">
              {!p.pubblicato ? 'Bozza' : p.visibilita === 'coach' ? 'Solo coach' : 'Pubblicato'} ›
            </Link>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
