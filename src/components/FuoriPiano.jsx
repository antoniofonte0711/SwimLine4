import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { dataLocale } from '../lib/lavori'
import { addGiorni } from '../lib/pianoSquadra'
import { km } from '../lib/riepilogo'
import Icona from './Icona'

const CAMPO = 'w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white'
const STATO = {
  in_attesa: ['In attesa del coach', 'bg-amber-100 text-amber-800'],
  accettato: ['Accettato: conta nei tuoi km', 'bg-emerald-100 text-emerald-800'],
  rifiutato: ['Non accettato', 'bg-slate-100 text-slate-600'],
}
const giornoIt = (g) => new Date(g + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

// Atleta, schermata Oggi: "Ho nuotato da solo" per un giorno fuori dal piano del coach (ultimi 30 giorni).
// Il coach riceve una notifica silenziosa e lo accetta o lo rifiuta.
export function ProponiFuoriPiano({ atletaId, giorno }) {
  const [proposte, setProposte] = useState([])
  const [aperto, setAperto] = useState(false)
  const [f, setF] = useState({ metri: '', minuti: '', descrizione: '' })
  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)
  const oggi = dataLocale()
  const valido = giorno <= oggi && giorno >= addGiorni(oggi, -30)

  const carica = useCallback(async () => {
    const { data } = await supabase.from('allenamenti_extra').select('id, metri, minuti, descrizione, stato')
      .eq('atleta_id', atletaId).eq('data', giorno).order('created_at')
    setProposte(data || [])
  }, [atletaId, giorno])
  useEffect(() => { setAperto(false); setErrore(''); carica() }, [carica])

  async function invia(e) {
    e.preventDefault()
    setErrore('')
    const metri = Number(f.metri)
    if (!metri || metri < 100 || metri > 30000) return setErrore('Scrivi quanti metri hai fatto (da 100 a 30.000).')
    setInvio(true)
    const { error } = await supabase.rpc('proponi_allenamento_extra', {
      p_data: giorno, p_metri: metri, p_minuti: Number(f.minuti) || null, p_descrizione: f.descrizione,
    })
    setInvio(false)
    if (error) return setErrore(error.message)
    setF({ metri: '', minuti: '', descrizione: '' })
    setAperto(false)
    carica()
  }

  async function ritira(p) {
    if (!window.confirm('Ritirare la proposta?')) return
    await supabase.from('allenamenti_extra').delete().eq('id', p.id)
    carica()
  }

  if (!valido) return null
  const attiva = proposte.find((p) => p.stato !== 'rifiutato')

  return (
    <section className="bg-white rounded-3xl p-5 mb-3" aria-label="Allenamento fuori piano">
      {proposte.map((p) => (
        <div key={p.id} className="mb-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display font-extrabold text-lg text-abisso">Fuori piano · {km(p.metri)} km</p>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${STATO[p.stato][1]}`}>{STATO[p.stato][0]}</span>
          </div>
          {(p.minuti || p.descrizione) && (
            <p className="text-sm text-slate-600 mt-1">{p.minuti ? `${p.minuti} min` : ''}{p.minuti && p.descrizione ? ' · ' : ''}{p.descrizione}</p>
          )}
          {p.stato === 'in_attesa' && (
            <button type="button" onClick={() => ritira(p)} className="min-h-[44px] text-sm font-bold text-slate-600 underline">Ritira la proposta</button>
          )}
        </div>
      ))}

      {!attiva && !aperto && (
        <button type="button" onClick={() => setAperto(true)}
          className="cliccabile w-full min-h-[48px] rounded-2xl bg-schiuma text-blue-600 font-bold flex items-center justify-center gap-2">
          <Icona nome="onde" className="w-5 h-5" /> Ho nuotato da solo (fuori piano)
        </button>
      )}

      {aperto && (
        <form onSubmit={invia}>
          <p className="font-bold text-abisso">Allenamento fuori piano</p>
          <p className="text-xs text-slate-500 mb-3">Di {giornoIt(giorno)}. Lo vede il coach: se lo accetta, conta nei tuoi km.</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label htmlFor="extra-metri" className="block text-xs text-slate-500 mb-1">Metri fatti</label>
              <input id="extra-metri" type="number" inputMode="numeric" min="100" max="30000" step="50" value={f.metri}
                onChange={(e) => setF({ ...f, metri: e.target.value })} placeholder="Es. 3000" className={CAMPO} required />
            </div>
            <div>
              <label htmlFor="extra-minuti" className="block text-xs text-slate-500 mb-1">Minuti (facoltativo)</label>
              <input id="extra-minuti" type="number" inputMode="numeric" min="5" max="600" value={f.minuti}
                onChange={(e) => setF({ ...f, minuti: e.target.value })} placeholder="Es. 60" className={CAMPO} />
            </div>
          </div>
          <label htmlFor="extra-cosa" className="block text-xs text-slate-500 mb-1">Cosa hai fatto (facoltativo)</label>
          <textarea id="extra-cosa" value={f.descrizione} onChange={(e) => setF({ ...f, descrizione: e.target.value })} rows={3} maxLength={1000}
            placeholder="Es. 10×100 A2, 400 sciolto" className={CAMPO + ' mb-3 resize-none'} />
          {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mb-3">{errore}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setAperto(false); setErrore('') }} className="font-bold text-slate-600 bg-bordo rounded-2xl min-h-[48px]">Annulla</button>
            <button type="submit" disabled={invio} className="font-bold text-white bg-blue-600 rounded-2xl min-h-[48px] disabled:opacity-60">
              {invio ? 'Invio…' : 'Manda al coach'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

// Coach, schermata Oggi: gli allenamenti fuori piano da accettare o rifiutare (si vede solo se ce ne sono)
export function ProposteFuoriPiano({ squadra }) {
  const [lista, setLista] = useState([])
  const [nomi, setNomi] = useState({})
  const [invio, setInvio] = useState('')
  const [esito, setEsito] = useState({})

  const carica = useCallback(async () => {
    const { data } = await supabase.from('allenamenti_extra').select('id, atleta_id, data, metri, minuti, descrizione')
      .eq('squadra_id', squadra.id).eq('stato', 'in_attesa').order('data')
    setLista(data || [])
    const ids = [...new Set((data || []).map((p) => p.atleta_id))]
    if (!ids.length) return
    const { data: p } = await supabase.from('profiles').select('id, nome, cognome').in('id', ids)
    setNomi(Object.fromEntries((p || []).map((x) => [x.id, `${x.nome || ''} ${x.cognome || ''}`.trim()])))
  }, [squadra.id])
  useEffect(() => { carica() }, [carica])

  async function rispondi(p, accetta) {
    setEsito({})
    setInvio(p.id)
    const { error } = await supabase.rpc('rispondi_allenamento_extra', { p_id: p.id, p_accetta: accetta })
    setInvio('')
    if (error) return setEsito({ errore: 'Non sono riuscito a salvare: ' + error.message })
    setEsito({ ok: `${nomi[p.atleta_id] || 'Atleta'}: allenamento ${accetta ? 'accettato' : 'rifiutato'}.` })
    carica()
  }

  if (!lista.length && !esito.ok && !esito.errore) return null
  return (
    <div className="bg-white border border-blue-200 rounded-3xl p-5 shadow-sm mb-3">
      <p className="font-bold mb-1 flex items-center gap-2"><Icona nome="onde" className="w-5 h-5 text-blue-600" />Allenamenti fuori piano{lista.length > 0 && ` (${lista.length})`}</p>
      <p className="text-xs text-slate-500 mb-2">Atleti che hanno nuotato da soli. Se accetti, i metri contano nei loro km.</p>
      {lista.map((p) => (
        <div key={p.id} className="bg-blue-50 rounded-2xl p-3 mb-2">
          <p className="text-sm font-semibold">{nomi[p.atleta_id] || 'Atleta'} · {km(p.metri)} km{p.minuti ? ` · ${p.minuti} min` : ''}</p>
          <p className="text-xs text-slate-500 first-letter:uppercase">{giornoIt(p.data)}</p>
          {p.descrizione && <p className="text-sm text-slate-600 mt-1">{p.descrizione}</p>}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button type="button" onClick={() => rispondi(p, true)} disabled={!!invio}
              className="font-bold text-white bg-blue-600 disabled:opacity-60 rounded-xl min-h-[44px]">{invio === p.id ? '…' : 'Accetta'}</button>
            <button type="button" onClick={() => rispondi(p, false)} disabled={!!invio}
              className="font-bold text-slate-600 bg-white disabled:opacity-60 rounded-xl min-h-[44px]">Rifiuta</button>
          </div>
        </div>
      ))}
      {esito.errore && <p className="text-sm text-white bg-red-600 rounded-lg px-3 py-2 mt-2">{esito.errore}</p>}
      {esito.ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-2">{esito.ok}</p>}
    </div>
  )
}
