import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { dataLocale } from '../lib/lavori'
import RiepilogoCoach from '../components/RiepilogoCoach'
import { CardSettimana, useRecap } from '../components/RecapAtleta'
import { lunediDi, riepilogoPresenze } from '../lib/presenze'
import { addGiorni } from '../lib/pianoSquadra'
import { useFigli, useFiglioScelto } from '../lib/famiglia'

const intervallo = (lun) => {
  const fmt = (d, mese) => new Date(d + 'T12:00:00').toLocaleDateString('it-IT', mese ? { day: 'numeric', month: 'long' } : { day: 'numeric' })
  const dom = addGiorni(lun, 6)
  return `${fmt(lun, lun.slice(5, 7) !== dom.slice(5, 7))} – ${fmt(dom, true)}`
}

// La tua settimana: com'è andata, sfogliando anche le settimane passate.
// Il genitore vede quella del figlio scelto.
function RiepilogoAtleta() {
  const { user, profile, ruolo } = useAuth()
  const genitore = ruolo === 'genitore'
  const { approvati, pronto } = useFigli()
  const [figlio, scegliFiglio] = useFiglioScelto(approvati)
  const atletaId = genitore ? figlio?.atleta_id : user.id

  const questaSettimana = lunediDi()
  const [lunedi, setLunedi] = useState(questaSettimana)
  const recap = useRecap(atletaId, profile?.squadra_id, lunedi, addGiorni(lunedi, 6))
  const [presenze4, setPresenze4] = useState([])

  useEffect(() => {
    if (!atletaId) return
    const da = new Date()
    da.setDate(da.getDate() - 27)
    supabase.from('presenze').select('data, stato').eq('atleta_id', atletaId).gte('data', dataLocale(da))
      .then(({ data }) => setPresenze4(data || []))
  }, [atletaId])
  const ultime4 = riepilogoPresenze(presenze4)

  if (genitore && pronto && !figlio) {
    return (
      <AppShell titolo="Riepilogo" attiva="riepilogo">
        <div className="bg-white rounded-3xl p-6 text-center">
          <p className="font-display text-xl font-extrabold mb-1">Collega tuo figlio</p>
          <p className="text-sm text-slate-500 mb-4">Qui vedrai com'è andata la sua settimana.</p>
          <Link to="/profilo" className="inline-block font-bold text-white bg-blue-600 rounded-2xl px-5 py-3">Vai al Profilo</Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell titolo={genitore && figlio ? `Settimana di ${figlio.nome}` : 'La settimana'} attiva="riepilogo">
      {genitore && approvati.length > 1 && (
        <div className="flex gap-2 mb-3 overflow-x-auto" role="tablist" aria-label="Figlio">
          {approvati.map((f) => (
            <button key={f.atleta_id} role="tab" aria-selected={f.atleta_id === figlio?.atleta_id} onClick={() => scegliFiglio(f.atleta_id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${f.atleta_id === figlio?.atleta_id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
              {f.nome}
            </button>
          ))}
        </div>
      )}

      <nav aria-label="Settimana" className="bg-white rounded-3xl p-2 mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setLunedi(addGiorni(lunedi, -7))} aria-label="Settimana precedente"
          className="w-11 h-11 rounded-full text-slate-500 text-xl font-bold hover:bg-bordo">‹</button>
        <div className="text-center">
          <p className="font-bold text-abisso">{lunedi === questaSettimana ? 'Questa settimana' : intervallo(lunedi)}</p>
          {lunedi === questaSettimana && <p className="text-xs text-slate-500">{intervallo(lunedi)}</p>}
        </div>
        <button type="button" onClick={() => setLunedi(addGiorni(lunedi, 7))} disabled={lunedi >= questaSettimana} aria-label="Settimana successiva"
          className="w-11 h-11 rounded-full text-slate-500 text-xl font-bold hover:bg-bordo disabled:opacity-30">›</button>
      </nav>

      <CardSettimana recap={recap} nome={genitore ? figlio?.nome : null} />

      <div className="bg-blue-600 text-white rounded-3xl p-5 mb-3">
        <p className="text-sm text-blue-100">Presenze agli allenamenti · ultime 4 settimane</p>
        <p className="font-display text-4xl font-extrabold mt-1">{ultime4.percentuale === null ? '—' : `${ultime4.percentuale}%`}</p>
        {ultime4.percentuale === null && <p className="text-xs text-blue-100 mt-2">Le presenze le segna il coach: appariranno qui.</p>}
      </div>
    </AppShell>
  )
}

export default function Riepilogo() {
  const { ruolo } = useAuth()
  return ruolo === 'coach' ? <RiepilogoCoach /> : <RiepilogoAtleta />
}
