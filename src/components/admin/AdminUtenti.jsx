import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { BOTTONE, BOTTONE_PIENO, ChipRuolo, Salvato, Scheda, Vuoto } from './ui'

const nomeDi = (p) => `${p?.nome || ''} ${p?.cognome || ''}`.trim() || 'Senza nome'

// Tutti gli account dell'app: ruolo, squadra, accesso al loro posto (per aiutarli)
export function TuttiUtenti({ dati, ricarica, io }) {
  const [cerca, setCerca] = useState('')
  const [ruolo, setRuolo] = useState('tutti')
  const [esito, setEsito] = useState('')
  const [apertura, setApertura] = useState(null)
  const [lavoro, setLavoro] = useState('')

  const squadra = (id) => dati.squadre.find((s) => s.id === id)?.nome || 'Senza squadra'
  const q = cerca.trim().toLowerCase()
  const elenco = dati.persone
    .filter((p) => (ruolo === 'tutti' || p.role === ruolo) && (!q || `${nomeDi(p)} ${squadra(p.squadra_id)}`.toLowerCase().includes(q)))
    .sort((a, b) => nomeDi(a).localeCompare(nomeDi(b)))

  async function cambiaRuolo(p, nuovo) {
    if (nuovo === p.role) return
    if (!window.confirm(`Cambiare ${nomeDi(p)} da ${p.role} a ${nuovo}?`)) return
    const { error } = await supabase.from('profiles').update({ role: nuovo }).eq('id', p.id)
    setEsito(error ? 'Errore: ' + error.message : `${nomeDi(p)} ora è ${nuovo}.`)
    ricarica()
  }

  // Caso estremo: link di accesso monouso per entrare nell'account di qualcuno (resta nel registro)
  async function accediCome(p) {
    if (!window.confirm(`Entrare come ${nomeDi(p)}? L'accesso viene registrato. Il link va aperto in una finestra privata.`)) return
    setLavoro(p.id)
    const { data, error } = await supabase.functions.invoke('accedi-come', { body: { target_id: p.id, redirect_to: window.location.origin } })
    setLavoro('')
    if (error || data?.errore) setApertura({ p, errore: data?.errore || error?.message || 'Errore' })
    else setApertura({ p, link: data.link })
  }

  return (
    <>
      <h1 className="font-display text-[34px] font-extrabold leading-tight">Tutti gli utenti</h1>
      <Scheda nota="Ogni account dell'app, in tutte le squadre." azioni={<Salvato stato={esito} />}>
        <input type="search" value={cerca} onChange={(e) => setCerca(e.target.value)} aria-label="Cerca per nome o squadra"
          placeholder="Cerca per nome o squadra…" className="w-full min-h-[46px] border border-slate-300 rounded-xl px-3.5 bg-slate-50 mb-3" />
        <div className="flex flex-wrap gap-2 mb-2">
          {[['tutti', 'Tutti'], ['atleta', 'Atleti'], ['coach', 'Coach'], ['genitore', 'Genitori'], ['admin', 'Admin']].map(([k, n]) => (
            <button key={k} type="button" onClick={() => setRuolo(k)} aria-pressed={ruolo === k}
              className={`min-h-[40px] rounded-full px-4 text-sm font-bold ${ruolo === k ? 'bg-abisso text-white' : 'bg-slate-100 text-slate-600'}`}>{n}</button>
          ))}
        </div>
        {elenco.length === 0 && <Vuoto titolo="Nessuno trovato" />}
        {elenco.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 py-3 border-t border-slate-100 first-of-type:border-t-0">
            <span aria-hidden="true" className="w-10 h-10 shrink-0 rounded-full bg-abisso text-white font-extrabold flex items-center justify-center">{nomeDi(p)[0]}</span>
            <span className="flex-1 min-w-[140px]">
              <b className="block">{nomeDi(p)}</b>
              <span className="text-[13px] text-slate-500">{squadra(p.squadra_id)}</span>
            </span>
            <ChipRuolo ruolo={p.role} />
            <select aria-label={`Ruolo di ${nomeDi(p)}`} value={p.role} onChange={(e) => cambiaRuolo(p, e.target.value)}
              className="min-h-[40px] border border-slate-300 rounded-xl px-2 text-sm font-semibold bg-white">
              <option value="atleta">Atleta</option><option value="genitore">Genitore</option><option value="coach">Coach</option>
              {p.role === 'coach_in_attesa' && <option value="coach_in_attesa">Coach in attesa</option>}
              <option value="admin">Admin</option>
            </select>
            {p.id !== io && (
              <button type="button" onClick={() => accediCome(p)} disabled={lavoro === p.id} className={BOTTONE}>
                {lavoro === p.id ? '…' : 'Entra al suo posto'}
              </button>
            )}
          </div>
        ))}
      </Scheda>

      {apertura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setApertura(null)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-lg mb-1">Entra come {nomeDi(apertura.p)}</p>
            {apertura.errore ? <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mt-3">{apertura.errore}</p> : (
              <>
                <p className="text-sm text-slate-600 mb-4">Link monouso. Aprilo in una <b>finestra privata</b>: se lo apri qui, esci dal tuo account admin.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => navigator.clipboard.writeText(apertura.link)} className={BOTTONE + ' flex-1'}>Copia link</button>
                  <a href={apertura.link} target="_blank" rel="noreferrer" className={BOTTONE_PIENO + ' flex-1 flex items-center justify-center'}>Apri</a>
                </div>
              </>
            )}
            <button type="button" onClick={() => setApertura(null)} className="w-full text-sm text-slate-500 mt-4">Chiudi</button>
          </div>
        </div>
      )}
    </>
  )
}

// Coach registrati che aspettano: approvando nasce la loro squadra
export function CoachDaApprovare({ ricarica }) {
  const [lista, setLista] = useState(null)
  const [nomi, setNomi] = useState({})
  const [esito, setEsito] = useState('')
  const [lavoro, setLavoro] = useState('')

  async function carica() {
    const { data } = await supabase.rpc('coach_da_approvare')
    setLista(data || [])
    setNomi(Object.fromEntries((data || []).map((c) => [c.id, c.nome_squadra || ''])))
  }
  useEffect(() => { carica() }, [])

  async function decidi(c, accetta) {
    const chi = nomeDi(c) || c.email
    if (!accetta && !window.confirm(`Rifiutare ${chi} come coach? Resterà nell'app come atleta.`)) return
    setLavoro(c.id)
    const { data, error } = await supabase.rpc('approva_coach', { p_persona: c.id, p_accetta: accetta, p_nome_squadra: nomi[c.id] || null })
    setLavoro('')
    if (error) return setEsito('Errore: ' + error.message)
    setEsito(accetta ? `${chi} ora è coach della squadra "${data}".` : `${chi} è stato rifiutato come coach.`)
    carica()
    ricarica()
  }

  return (
    <>
      <h1 className="font-display text-[34px] font-extrabold leading-tight">Coach da approvare</h1>
      <Scheda nota="Approvando nasce la loro squadra e diventano coach con tutti i permessi su di essa." azioni={<Salvato stato={esito} />}>
        {lista === null && <p className="text-slate-500">Carico…</p>}
        {lista?.length === 0 && <Vuoto titolo="Nessun coach in attesa">Chi si registra come coach compare qui.</Vuoto>}
        {lista?.map((c) => (
          <div key={c.id} className="py-3 border-t border-slate-100 first:border-t-0">
            <b>{nomeDi(c)}</b> <span className="text-sm text-slate-500">· {c.email}</span>
            <p className="text-xs text-slate-500 mb-2">Registrato il {new Date(c.created_at).toLocaleString('it-IT')}</p>
            <label className="block text-xs text-slate-500 mb-1" htmlFor={'sq' + c.id}>Nome della squadra</label>
            <input id={'sq' + c.id} value={nomi[c.id] || ''} onChange={(e) => setNomi({ ...nomi, [c.id]: e.target.value })}
              placeholder={`Squadra di ${c.nome || 'nuovo coach'}`} className="w-full min-h-[44px] border border-slate-300 rounded-xl px-3 mb-2" />
            <div className="flex gap-2">
              <button type="button" onClick={() => decidi(c, true)} disabled={lavoro === c.id} className={BOTTONE_PIENO + ' flex-1'}>Approva</button>
              <button type="button" onClick={() => decidi(c, false)} disabled={lavoro === c.id} className={BOTTONE + ' flex-1'}>Rifiuta</button>
            </div>
          </div>
        ))}
      </Scheda>
    </>
  )
}

export function RegistroAccessi({ dati }) {
  const [accessi, setAccessi] = useState(null)
  useEffect(() => {
    supabase.from('accessi_admin').select('id, admin_id, target_id, created_at').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setAccessi(data || []))
  }, [])
  const nome = (id) => { const p = dati.persone.find((x) => x.id === id); return p ? nomeDi(p) : 'account eliminato' }
  return (
    <>
      <h1 className="font-display text-[34px] font-extrabold leading-tight">Registro accessi</h1>
      <Scheda nota="Ogni volta che un admin entra nell'account di qualcuno per aiutarlo, resta scritto qui.">
        {accessi === null && <p className="text-slate-500">Carico…</p>}
        {accessi?.length === 0 && <Vuoto titolo="Nessun accesso registrato" />}
        {accessi?.map((a) => (
          <p key={a.id} className="text-sm py-2.5 border-t border-slate-100 first:border-t-0">
            <span className="text-slate-500">{new Date(a.created_at).toLocaleString('it-IT')}</span> · <b>{nome(a.admin_id)}</b> è entrato come <b>{nome(a.target_id)}</b>
          </p>
        ))}
      </Scheda>
    </>
  )
}
