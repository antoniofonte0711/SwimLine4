import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { BOTTONE, BOTTONE_PIENO, ChipRuolo, Salvato, Scheda, Scheletro, Vuoto } from './ui'
import { OpzioniGruppi } from './AdminSquadre'

const nomeDi = (p) => `${p?.nome || ''} ${p?.cognome || ''}`.trim() || 'Senza nome'

// Chi si è registrato ma non ha confermato l'email (il link può non arrivare: Supabase senza un servizio
// email proprio scrive solo ai membri del team). L'admin, se conosce la persona, la conferma da qui.
function EmailDaConfermare({ ricarica }) {
  const [lista, setLista] = useState([])
  const [esito, setEsito] = useState('')
  const carica = () => supabase.rpc('admin_email_da_confermare').then(({ data }) => setLista(data || []))
  useEffect(() => { carica() }, [])

  async function conferma(p) {
    if (!window.confirm(`Confermare l'email di ${nomeDi(p)} (${p.email})? Fallo solo se conosci questa persona.`)) return
    const { error } = await supabase.rpc('admin_conferma_email', { p_persona: p.id })
    setEsito(error ? 'Errore: ' + error.message : `${nomeDi(p)} ora può accedere.`)
    carica()
    ricarica()
  }

  if (!lista.length && !esito) return null
  return (
    <Scheda titolo="Email da confermare" azioni={<Salvato stato={esito} />}
      nota="Si sono registrati ma non hanno aperto il link di conferma (a volte non arriva). Conferma solo chi conosci.">
      {lista.length === 0 && <p className="text-sm text-slate-500">Nessuno in attesa.</p>}
      {lista.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-3 py-3 border-t border-slate-100 first-of-type:border-t-0">
          <span className="flex-1 min-w-[160px]">
            <b className="block">{nomeDi(p)}</b>
            <span className="text-[13px] text-slate-500 break-all">{p.email} · {new Date(p.created_at).toLocaleString('it-IT')}</span>
          </span>
          {p.role && <ChipRuolo ruolo={p.role} />}
          <button type="button" onClick={() => conferma(p)} className={BOTTONE_PIENO}>Conferma email</button>
        </div>
      ))}
    </Scheda>
  )
}

// Account chiusi dai proprietari ("Elimina il mio account"): per 30 giorni si possono ripristinare,
// poi la pulizia notturna li cancella per sempre (o subito, da qui)
function AccountEliminati({ ricarica }) {
  const [lista, setLista] = useState([])
  const [esito, setEsito] = useState('')
  const [lavoro, setLavoro] = useState('')
  const carica = () => supabase.rpc('admin_account_eliminati').then(({ data }) => setLista(data || []))
  useEffect(() => { carica() }, [])

  const giorniRimasti = (p) => Math.max(0, 30 - Math.floor((Date.now() - new Date(p.eliminato_il)) / 86400000))

  async function ripristina(p) {
    if (!window.confirm(`Ripristinare l'account di ${nomeDi(p)}? Torna com'era${p.squadra_nome ? `, nel gruppo ${p.squadra_nome}` : ''}.`)) return
    setLavoro(p.id)
    const { error } = await supabase.rpc('admin_ripristina_account', { p_persona: p.id })
    setLavoro('')
    setEsito(error ? 'Errore: ' + error.message : `${nomeDi(p)} può di nuovo entrare con la sua email e password.`)
    carica()
    ricarica()
  }

  async function cancellaOra(p) {
    if (!window.confirm(`Cancellare PER SEMPRE ${nomeDi(p)} con tutti i suoi dati e documenti? Non si può tornare indietro.`)) return
    setLavoro(p.id)
    const { data, error } = await supabase.functions.invoke('pulizia', { body: { persona: p.id } })
    setLavoro('')
    setEsito(error || data?.errore ? 'Errore: ' + (data?.errore || error.message) : `${nomeDi(p)} è stato cancellato per sempre.`)
    carica()
  }

  if (!lista.length && !esito) return null
  return (
    <Scheda titolo="Account eliminati" azioni={<Salvato stato={esito} />}
      nota="Li hanno chiusi i proprietari. Sono nascosti a tutti e non possono entrare. Ripristinali se è stato uno sbaglio (es. un ragazzo); dopo 30 giorni si cancellano da soli.">
      {lista.length === 0 && <p className="text-sm text-slate-500">Nessun account in attesa di cancellazione.</p>}
      {lista.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-3 py-3 border-t border-slate-100 first-of-type:border-t-0">
          <span className="flex-1 min-w-[160px]">
            <b className="block">{nomeDi(p)}</b>
            <span className="text-[13px] text-slate-500 break-all">
              {p.email}{p.squadra_nome ? ` · era in ${p.squadra_nome}` : ''} · eliminato il {new Date(p.eliminato_il).toLocaleDateString('it-IT')} · si cancella tra {giorniRimasti(p)} giorni
            </span>
          </span>
          <button type="button" onClick={() => ripristina(p)} disabled={lavoro === p.id} className={BOTTONE_PIENO}>Ripristina</button>
          <button type="button" onClick={() => cancellaOra(p)} disabled={lavoro === p.id} className={BOTTONE}>Cancella ora</button>
        </div>
      ))}
    </Scheda>
  )
}

// Tutti gli account dell'app: nella riga solo chi è; ruolo, gruppo e accesso al suo posto nel pannello "Modifica"
const PER_PAGINA = 25
const RUOLI_NOMI = { atleta: 'Atleta', genitore: 'Genitore', coach: 'Coach', coach_in_attesa: 'Coach in attesa', admin: 'Admin' }
const iniziali = (p) => ((p?.nome?.[0] || '') + (p?.cognome?.[0] || '')).toUpperCase() || nomeDi(p)[0]
// colore fisso per ogni nome, così le righe si distinguono
const coloreDi = (p) => `hsl(${[...nomeDi(p)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)} 55% 38%)`

export function Avatar({ p }) {
  return (
    <span aria-hidden="true" style={{ background: coloreDi(p) }}
      className="w-10 h-10 shrink-0 rounded-full text-white text-sm font-extrabold flex items-center justify-center">{iniziali(p)}</span>
  )
}

export function TuttiUtenti({ dati, ricarica, io }) {
  const [cerca, setCerca] = useState('')
  const [ruolo, setRuolo] = useState('tutti')
  const [pagina, setPagina] = useState(0)
  const [aperto, setAperto] = useState(null) // id della persona nel pannello "Modifica"
  const [annulla, setAnnulla] = useState(null) // { testo, ripristina } per 5 secondi dopo un cambio
  const [esito, setEsito] = useState('')

  useEffect(() => {
    if (!annulla) return
    const t = setTimeout(() => setAnnulla(null), 5000)
    return () => clearTimeout(t)
  }, [annulla])

  const squadra = (id) => {
    const s = dati.squadre.find((x) => x.id === id)
    if (!s) return 'Senza gruppo'
    const so = dati.societa.find((x) => x.id === s.societa_id)
    return so ? `${so.nome} · ${s.nome}` : s.nome
  }
  const q = cerca.trim().toLowerCase()
  const trovati = dati.persone.filter((p) => !q || `${nomeDi(p)} ${squadra(p.squadra_id)}`.toLowerCase().includes(q))
  const quanti = (k) => (k === 'tutti' ? trovati.length : trovati.filter((p) => p.role === k).length)
  const elenco = trovati.filter((p) => ruolo === 'tutti' || p.role === ruolo).sort((a, b) => nomeDi(a).localeCompare(nomeDi(b)))
  const pagine = Math.max(1, Math.ceil(elenco.length / PER_PAGINA))
  const pag = Math.min(pagina, pagine - 1)
  const persona = dati.persone.find((p) => p.id === aperto)

  // salva un cambio già confermato; dopo, per 5 secondi, si può tornare indietro
  async function salva(p, campo, nuovo, tornaIndietro = false) {
    const prima = campo === 'ruolo' ? p.role : p.squadra_id || ''
    const { error } = campo === 'ruolo'
      ? await supabase.rpc('admin_cambia_ruolo', { p_persona: p.id, p_ruolo: nuovo })
      : await supabase.rpc('admin_sposta_persona', { p_persona: p.id, p_squadra: nuovo || null })
    ricarica()
    if (error) return setEsito('Errore: ' + error.message)
    setEsito('')
    const testo = campo === 'ruolo' ? `${nomeDi(p)} ora è ${RUOLI_NOMI[nuovo]}.` : `${nomeDi(p)} ora è in ${nuovo ? squadra(nuovo) : 'nessun gruppo'}.`
    if (tornaIndietro) return setAnnulla({ testo: 'Cambio annullato.' })
    // il coach che lascia il gruppo non torna coach annullando: lo si rimette da Coach e società
    setAnnulla({ testo, ripristina: campo === 'gruppo' || prima !== 'coach_in_attesa' ? () => salva({ ...p, role: nuovo, squadra_id: campo === 'gruppo' ? nuovo : p.squadra_id }, campo, prima, true) : null })
  }

  return (
    <>
      <h1 className="font-display text-[34px] font-extrabold leading-tight">Tutti gli utenti</h1>
      <EmailDaConfermare ricarica={ricarica} />
      <AccountEliminati ricarica={ricarica} />
      <Scheda nota="Ogni account dell'app, in tutte le società e i gruppi. Premi Modifica per cambiare ruolo o gruppo." azioni={<Salvato stato={esito} />}>
        <input type="search" value={cerca} onChange={(e) => { setCerca(e.target.value); setPagina(0) }} aria-label="Cerca per nome, società o gruppo"
          placeholder="Cerca per nome, società o gruppo…" className="w-full min-h-[46px] border border-slate-300 rounded-xl px-3.5 bg-slate-50 mb-3" />
        <div className="flex flex-wrap gap-2 mb-2">
          {[['tutti', 'Tutti'], ['atleta', 'Atleti'], ['coach', 'Coach'], ['genitore', 'Genitori'], ['admin', 'Admin']].map(([k, n]) => (
            <button key={k} type="button" onClick={() => { setRuolo(k); setPagina(0) }} aria-pressed={ruolo === k}
              className={`min-h-[40px] rounded-full px-4 text-sm font-bold ${ruolo === k ? 'bg-abisso text-white' : 'bg-slate-100 text-slate-600'}`}>{n} ({quanti(k)})</button>
          ))}
        </div>
        {elenco.length === 0 && <Vuoto titolo="Nessuno trovato" />}
        {elenco.slice(pag * PER_PAGINA, (pag + 1) * PER_PAGINA).map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-3 border-t border-slate-100 first-of-type:border-t-0">
            <Avatar p={p} />
            <span className="flex-1 min-w-0">
              <b className="block truncate">{nomeDi(p)}{p.id === io ? ' (tu)' : ''}</b>
              <span className="block text-[13px] text-slate-500 truncate">{squadra(p.squadra_id)}</span>
            </span>
            <ChipRuolo ruolo={p.role} />
            <button type="button" onClick={() => setAperto(p.id)} aria-label={`Modifica ${nomeDi(p)}`} className={BOTTONE}>Modifica</button>
          </div>
        ))}
        {pagine > 1 && (
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setPagina(pag - 1)} disabled={pag === 0} className={BOTTONE}>‹ Prima</button>
            <span className="text-sm text-slate-600">Pagina {pag + 1} di {pagine}</span>
            <button type="button" onClick={() => setPagina(pag + 1)} disabled={pag >= pagine - 1} className={BOTTONE}>Dopo ›</button>
          </div>
        )}
      </Scheda>

      {persona && <ModificaUtente p={persona} dati={dati} io={io} squadra={squadra} onSalva={salva} onChiudi={() => setAperto(null)} />}

      {annulla && (
        <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-32px)] max-w-md flex items-center gap-3 bg-abisso text-white rounded-2xl px-4 py-3 shadow-xl">
          <span className="flex-1 text-sm font-semibold">{annulla.testo}</span>
          {annulla.ripristina && (
            <button type="button" onClick={() => { const r = annulla.ripristina; setAnnulla(null); r() }} className="min-h-[40px] rounded-xl px-3 font-extrabold text-sm bg-white text-blue-600">Annulla</button>
          )}
        </div>
      )}
    </>
  )
}

// Pannello "Modifica utente": ogni cambio va confermato; per farlo admin bisogna scrivere il suo nome
function ModificaUtente({ p, dati, io, squadra, onSalva, onChiudi }) {
  const [attesa, setAttesa] = useState(null) // { campo, nuovo }
  const [scritto, setScritto] = useState('')
  const [lavoro, setLavoro] = useState(false)
  const [apertura, setApertura] = useState(null)
  const allena = dati.squadre.find((s) => s.coach_id === p.id)
  const sonoIo = p.id === io

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onChiudi() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onChiudi])

  const scegli = (campo, nuovo) => {
    if (nuovo === (campo === 'ruolo' ? p.role : p.squadra_id || '')) return setAttesa(null)
    setScritto('')
    setAttesa({ campo, nuovo })
  }

  let domanda = ''
  if (attesa?.campo === 'ruolo') {
    const gruppo = p.squadra_id ? squadra(p.squadra_id) : null
    domanda = {
      admin: `${nomeDi(p)} diventa Admin: potrà vedere e cambiare tutto, in tutte le società.`,
      coach: `${nomeDi(p)} diventa Coach${gruppo ? ` in ${gruppo}` : ''}. Per gestire un gruppo va scelto come coach del gruppo (Società e gruppi › Coach e società).`,
      atleta: `${nomeDi(p)} diventa Atleta.`, genitore: `${nomeDi(p)} diventa Genitore.`,
    }[attesa.nuovo]
  } else if (attesa) {
    domanda = `Spostare ${nomeDi(p)} in ${attesa.nuovo ? squadra(attesa.nuovo) : 'nessun gruppo'}?` + (allena ? ` È il coach di ${allena.nome}: quel gruppo resterà senza coach.` : '')
  }
  const serveNome = attesa?.campo === 'ruolo' && attesa.nuovo === 'admin'
  const nomeGiusto = scritto.trim().toLowerCase() === nomeDi(p).toLowerCase()

  async function conferma() {
    setLavoro(true)
    await onSalva(p, attesa.campo, attesa.nuovo)
    setLavoro(false)
    setAttesa(null)
  }

  // Caso estremo: link di accesso monouso per entrare nell'account di qualcuno (resta nel registro)
  async function accediCome() {
    if (!window.confirm(`Entrare come ${nomeDi(p)}? L'accesso viene registrato. Il link va aperto in una finestra privata.`)) return
    setLavoro(true)
    const { data, error } = await supabase.functions.invoke('accedi-come', { body: { target_id: p.id, redirect_to: window.location.origin } })
    setLavoro(false)
    setApertura(error || data?.errore ? { errore: data?.errore || error?.message || 'Errore' } : { link: data.link })
  }

  const campo = 'mt-1 w-full min-h-[46px] border border-slate-300 rounded-xl px-3 text-[15px] font-semibold bg-white disabled:bg-slate-100'
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" onClick={onChiudi}>
      <div role="dialog" aria-modal="true" aria-labelledby="titolo-modifica"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <Avatar p={p} />
          <span className="flex-1 min-w-0">
            <b id="titolo-modifica" className="block text-lg truncate">{nomeDi(p)}</b>
            <span className="text-[13px] text-slate-500">{squadra(p.squadra_id)}{allena ? ` · coach di ${allena.nome}` : ''}</span>
          </span>
          <ChipRuolo ruolo={p.role} />
        </div>

        <label className="block text-sm font-semibold text-slate-600 mb-3">Gruppo
          <select value={attesa?.campo === 'gruppo' ? attesa.nuovo : p.squadra_id || ''} onChange={(e) => scegli('gruppo', e.target.value)} disabled={lavoro} className={campo}>
            <option value="">Senza gruppo</option>
            <OpzioniGruppi dati={dati} />
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-600 mb-1">Ruolo
          <select value={attesa?.campo === 'ruolo' ? attesa.nuovo : p.role} onChange={(e) => scegli('ruolo', e.target.value)} disabled={lavoro || sonoIo} className={campo}>
            <option value="atleta">Atleta</option><option value="genitore">Genitore</option><option value="coach">Coach</option>
            {p.role === 'coach_in_attesa' && <option value="coach_in_attesa">Coach in attesa</option>}
            <option value="admin">Admin</option>
          </select>
        </label>
        {sonoIo && <p className="text-xs text-slate-500">Il tuo ruolo lo può cambiare solo un altro admin.</p>}

        {attesa && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">{domanda}</p>
            {serveNome && (
              <label className="block text-sm text-amber-900 mt-3">Per confermare scrivi <b>{nomeDi(p)}</b>
                <input value={scritto} onChange={(e) => setScritto(e.target.value)} autoComplete="off"
                  className="mt-1 w-full min-h-[44px] border border-amber-300 rounded-xl px-3 bg-white" />
              </label>
            )}
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={() => setAttesa(null)} className="flex-1 min-h-[44px] rounded-xl px-4 text-sm font-extrabold bg-white text-slate-600 border border-slate-300">Annulla</button>
              <button type="button" onClick={conferma} disabled={lavoro || (serveNome && !nomeGiusto)} className={BOTTONE_PIENO + ' flex-1'}>
                {lavoro ? 'Salvo…' : attesa.campo === 'ruolo' ? 'Cambia ruolo' : 'Sposta'}
              </button>
            </div>
          </div>
        )}

        {!sonoIo && !attesa && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            {!apertura && (
              <button type="button" onClick={accediCome} disabled={lavoro} className={BOTTONE + ' w-full'}>{lavoro ? '…' : 'Entra al suo posto'}</button>
            )}
            {apertura?.errore && <p className="text-sm text-white bg-red-600 rounded-lg px-3 py-2">{apertura.errore}</p>}
            {apertura?.link && (
              <>
                <p className="text-sm text-slate-600 mb-3">Link monouso. Aprilo in una <b>finestra privata</b>: se lo apri qui, esci dal tuo account admin.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => navigator.clipboard.writeText(apertura.link)} className={BOTTONE + ' flex-1'}>Copia link</button>
                  <a href={apertura.link} target="_blank" rel="noreferrer" className={BOTTONE_PIENO + ' flex-1 flex items-center justify-center'}>Apri</a>
                </div>
              </>
            )}
          </div>
        )}
        <button type="button" onClick={onChiudi} className="w-full min-h-[44px] text-sm font-bold text-slate-500 mt-3">Chiudi</button>
      </div>
    </div>
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
    setEsito(accetta ? `${chi} ora è coach del gruppo "${data}".` : `${chi} è stato rifiutato come coach.`)
    carica()
    ricarica()
  }

  return (
    <>
      <h1 className="font-display text-[34px] font-extrabold leading-tight">Coach da approvare</h1>
      <Scheda nota="Approvando nasce il loro gruppo e diventano coach con tutti i permessi su di esso. La loro email vale come confermata anche se il link non è arrivato." azioni={<Salvato stato={esito} />}>
        {lista === null && <Scheletro righe={2} />}
        {lista?.length === 0 && <Vuoto titolo="Nessun coach in attesa">Chi si registra come coach compare qui.</Vuoto>}
        {lista?.map((c) => (
          <div key={c.id} className="py-3 border-t border-slate-100 first:border-t-0">
            <b>{nomeDi(c)}</b> <span className="text-sm text-slate-500">· {c.email}</span>
            <p className="text-xs text-slate-500 mb-2">Registrato il {new Date(c.created_at).toLocaleString('it-IT')}</p>
            <label className="block text-xs text-slate-500 mb-1" htmlFor={'sq' + c.id}>Nome del gruppo</label>
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

// Accessi al posto di altri + cambi di ruolo, gruppo e coach, dal più recente
export function RegistroAccessi({ dati }) {
  const [voci, setVoci] = useState(null)
  useEffect(() => {
    Promise.all([
      supabase.from('accessi_admin').select('id, admin_id, target_id, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('registro_modifiche').select('id, admin_id, persona_id, cosa, da, a, created_at').order('created_at', { ascending: false }).limit(50),
    ]).then(([ac, mo]) => setVoci([
      ...(ac.data || []).map((a) => ({ ...a, cosa: 'accesso', persona_id: a.target_id })),
      ...(mo.data || []),
    ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 80)))
  }, [])
  const nome = (id) => { const p = dati.persone.find((x) => x.id === id); return p ? nomeDi(p) : 'account eliminato' }
  const frase = (v) => ({
    accesso: <> è entrato come <b>{nome(v.persona_id)}</b></>,
    ruolo: <> ha cambiato il ruolo di <b>{nome(v.persona_id)}</b>: {RUOLI_NOMI[v.da] || v.da} → <b>{RUOLI_NOMI[v.a] || v.a}</b></>,
    gruppo: <> ha spostato <b>{nome(v.persona_id)}</b>: {v.da || 'senza gruppo'} → <b>{v.a || 'senza gruppo'}</b></>,
    coach: v.a
      ? <> ha messo <b>{nome(v.persona_id)}</b> coach di <b>{v.a}</b></>
      : <> ha tolto <b>{nome(v.persona_id)}</b> da coach di <b>{v.da}</b></>,
  })[v.cosa]
  return (
    <>
      <h1 className="font-display text-[34px] font-extrabold leading-tight">Registro accessi</h1>
      <Scheda nota="Resta scritto qui ogni volta che un admin entra nell'account di qualcuno, o cambia ruolo, gruppo o coach a qualcuno.">
        {voci === null && <Scheletro righe={5} />}
        {voci?.length === 0 && <Vuoto titolo="Niente da registrare, per ora" />}
        {voci?.map((v) => (
          <p key={v.cosa + v.id} className="text-sm py-2.5 border-t border-slate-100 first:border-t-0">
            <span className="text-slate-500">{new Date(v.created_at).toLocaleString('it-IT')}</span> · <b>{nome(v.admin_id)}</b>{frase(v)}
          </p>
        ))}
      </Scheda>
    </>
  )
}
