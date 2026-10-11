import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Errori capitati sui telefoni degli utenti, arrivati da soli (src/lib/registroErrori.js)
function ErroriApp() {
  const [lista, setLista] = useState(null)
  const [nomi, setNomi] = useState({})
  const [aperto, setAperto] = useState(null)

  async function carica() {
    const { data } = await supabase.from('errori_app').select('*').order('ultima_volta', { ascending: false }).limit(50)
    setLista(data || [])
    const ids = [...new Set((data || []).map((e) => e.utente_id).filter(Boolean))]
    if (!ids.length) return
    const { data: p } = await supabase.from('profiles').select('id, nome, cognome, role').in('id', ids)
    setNomi(Object.fromEntries((p || []).map((x) => [x.id, `${x.nome || ''} ${x.cognome || ''} (${x.role})`.trim()])))
  }
  useEffect(() => { carica() }, [])

  async function togli(ids) {
    await supabase.from('errori_app').delete().in('id', ids)
    carica()
  }

  return (
    <div className="border border-gray-200 rounded-2xl p-4 mb-6">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-bold mb-1">Errori dell'app{lista?.length > 0 && ` (${lista.length})`}</h2>
        {lista?.length > 0 && (
          <button type="button" onClick={() => window.confirm('Togliere tutti gli errori dalla lista?') && togli(lista.map((e) => e.id))}
            className="text-sm font-bold text-slate-600 px-2 min-h-[36px]">Svuota</button>
        )}
      </div>
      <p className="text-sm text-slate-600 mb-3">Arrivano da soli quando l'app va in errore sul telefono di qualcuno. Si tengono 60 giorni.</p>
      {lista === null && <p className="text-sm text-slate-500">Carico…</p>}
      {lista?.length === 0 && <p className="text-sm text-slate-500">Nessun errore: tutto bene.</p>}
      {lista?.map((e) => (
        <div key={e.id} className="bg-gray-50 rounded-xl p-3 mb-2">
          <p className="text-xs text-slate-500 mb-1">
            {new Date(e.ultima_volta).toLocaleString('it-IT')} · {e.pagina || '?'} · {e.utente_id ? nomi[e.utente_id] || 'utente' : 'non entrato'}
            {e.volte > 1 && <b className="text-red-700"> · {e.volte} volte</b>} · v{e.versione}
          </p>
          <p className="font-semibold break-words mb-1">{e.messaggio}</p>
          {aperto === e.id && <pre className="text-[11px] text-slate-600 whitespace-pre-wrap break-all mb-2">{e.dettagli}{'\n'}{e.dispositivo}</pre>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setAperto(aperto === e.id ? null : e.id)} className="text-sm font-bold text-blue-600 min-h-[36px]">
              {aperto === e.id ? 'Nascondi dettagli' : 'Dettagli'}
            </button>
            <button type="button" onClick={() => togli([e.id])} className="text-sm font-bold text-slate-600 min-h-[36px]">Risolto</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Pannello admin: problemi segnalati dagli utenti (Profilo → Aiuto → Segnala un problema) ed errori automatici
export default function SegnalazioniAdmin() {
  const [lista, setLista] = useState([])
  const [nomi, setNomi] = useState({})

  async function carica() {
    const { data } = await supabase.from('segnalazioni').select('id, autore_id, testo, dispositivo, created_at')
      .order('created_at', { ascending: false }).limit(50)
    setLista(data || [])
    const ids = [...new Set((data || []).map((s) => s.autore_id).filter(Boolean))]
    if (!ids.length) return
    const { data: p } = await supabase.from('profiles').select('id, nome, cognome, role').in('id', ids)
    setNomi(Object.fromEntries((p || []).map((x) => [x.id, `${x.nome || ''} ${x.cognome || ''} (${x.role})`.trim()])))
  }

  useEffect(() => { carica() }, [])

  async function risolta(id) {
    await supabase.from('segnalazioni').delete().eq('id', id)
    carica()
  }

  return (
    <>
    <div className="border border-gray-200 rounded-2xl p-4 mb-6">
      <h2 className="font-bold mb-1">Segnalazioni{lista.length > 0 && ` (${lista.length})`}</h2>
      <p className="text-sm text-slate-600 mb-3">Problemi scritti dagli utenti dal loro Profilo. Quando l'hai sistemato, segnalo come risolto.</p>
      {lista.length === 0 && <p className="text-sm text-slate-500">Nessuna segnalazione.</p>}
      {lista.map((s) => (
        <div key={s.id} className="bg-gray-50 rounded-xl p-3 mb-2">
          <p className="text-xs text-slate-500 mb-1">
            {nomi[s.autore_id] || 'Account eliminato'} · {new Date(s.created_at).toLocaleString('it-IT')}
          </p>
          <p className="whitespace-pre-wrap mb-2">{s.testo}</p>
          {s.dispositivo && <p className="text-[11px] text-slate-500 mb-2 break-all">{s.dispositivo}</p>}
          <button onClick={() => risolta(s.id)} className="text-sm font-bold text-blue-600 min-h-[36px]">Risolto, togli dalla lista</button>
        </div>
      ))}
    </div>
    <ErroriApp />
    </>
  )
}
