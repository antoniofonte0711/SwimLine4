import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { PERMESSI_SQUADRA, ricaricaRegole } from '../../lib/regole'
import Icona from '../Icona'
import GestioneLavori from '../GestioneLavori'
import { dataLocale } from '../../lib/lavori'
import { BOTTONE_PIENO, ChipRuolo, Gruppo, Interruttore, Interruttori, Numero, plurale, Salvato, Scheda, Scheletro, Vuoto } from './ui'

const COLORI = ['#0b4fd9', '#0f6b3f', '#b45309', '#6d28c9', '#c2309f', '#0a1a2f']
const sigla = (nome = '') => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'
const nomeDi = (p) => `${p?.nome || ''} ${p?.cognome || ''}`.trim() || 'Senza nome'

// Tutto quello che serve al pannello sulle squadre, in una volta sola
export function useDatiSquadre() {
  const [dati, setDati] = useState(null)
  const carica = useCallback(async () => {
    const [sq, pr, gf, al, imp, so] = await Promise.all([
      supabase.from('squadre').select('id, nome, coach_id, societa_id, created_at').order('created_at'),
      // gli account chiusi dai proprietari stanno a parte (Tutti gli utenti › Account eliminati)
      supabase.from('profiles').select('id, nome, cognome, role, squadra_id, created_at').is('eliminato_il', null),
      supabase.from('genitori_figli').select('id, genitore_id, atleta_id, stato'),
      supabase.from('allenamenti_squadra').select('squadra_id, pubblicato, data'),
      supabase.from('impostazioni_squadra').select('squadra_id, permessi'),
      supabase.from('societa').select('id, nome, capo_id').order('nome'),
    ])
    setDati({
      squadre: sq.data || [], persone: pr.data || [], collegamenti: gf.data || [], societa: so.data || [],
      piani: al.data || [], permessi: Object.fromEntries((imp.data || []).map((r) => [r.squadra_id, r.permessi || {}])),
    })
  }, [])
  useEffect(() => { carica() }, [carica])
  return [dati, carica]
}

// <option> di tutti i gruppi, divisi per società (per i menu "sposta in…")
export function OpzioniGruppi({ dati, escludi }) {
  const gruppi = (sid) => dati.squadre.filter((s) => (s.societa_id || null) === sid && s.id !== escludi)
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)
  return (
    <>
      {dati.societa.map((so) => <optgroup key={so.id} label={so.nome}>{gruppi(so.id)}</optgroup>)}
      <optgroup label="Senza società">{gruppi(null)}</optgroup>
    </>
  )
}

// Un solo conteggio degli allenamenti per Dashboard e Società, così i numeri non si contraddicono
export function contaAllenamenti(dati) {
  const pubblicati = dati.piani.filter((p) => p.pubblicato)
  return { pubblicati: pubblicati.length, inProgramma: pubblicati.filter((p) => p.data >= dataLocale()).length }
}

// Nuova società o modifica di una esistente: nome e capo (uno solo)
function FormSocieta({ dati, societa, onFatto, onAnnulla }) {
  const [nome, setNome] = useState(societa?.nome || '')
  const [capo, setCapo] = useState(societa?.capo_id || '')
  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)
  const persone = [...dati.persone].filter((p) => p.role !== 'genitore').sort((a, b) => nomeDi(a).localeCompare(nomeDi(b)))

  async function salva(e) {
    e.preventDefault()
    setErrore('')
    if (!nome.trim()) return setErrore('Scrivi il nome della società.')
    setInvio(true)
    const { error } = await supabase.rpc('admin_salva_societa', { p_id: societa?.id || null, p_nome: nome, p_capo: capo || null })
    setInvio(false)
    if (error) return setErrore(error.message)
    onFatto()
  }

  async function elimina() {
    if (!window.confirm(`Eliminare la società ${societa.nome}? I suoi gruppi restano com'erano, senza società.`)) return
    const { error } = await supabase.rpc('admin_elimina_societa', { p_id: societa.id })
    if (error) return setErrore(error.message)
    onFatto()
  }

  return (
    <Scheda titolo={societa ? `Modifica ${societa.nome}` : 'Nuova società'} nota="Una società raccoglie più gruppi. Ha un solo capo.">
      <form onSubmit={salva}>
        <label className="block text-sm font-semibold text-slate-600 mb-1" htmlFor="nome-societa">Nome della società</label>
        <input id="nome-societa" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} placeholder="Es. C.S.D.C"
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 text-[15px] font-semibold mb-3" />
        <label className="block text-sm font-semibold text-slate-600 mb-1" htmlFor="capo-societa">Capo della società</label>
        <select id="capo-societa" value={capo} onChange={(e) => setCapo(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 text-[15px] font-semibold mb-3">
          <option value="">Nessun capo per ora</option>
          {persone.map((p) => <option key={p.id} value={p.id}>{nomeDi(p)} ({p.role})</option>)}
        </select>
        {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mb-3">{errore}</p>}
        <div className="flex gap-2 flex-wrap">
          <button type="submit" disabled={invio} className={BOTTONE_PIENO}>{invio ? 'Salvo…' : societa ? 'Salva' : 'Crea società'}</button>
          <button type="button" onClick={onAnnulla} className="min-h-[44px] rounded-xl px-4 text-sm font-extrabold bg-slate-100 text-slate-600">Annulla</button>
          {societa && <button type="button" onClick={elimina} className="min-h-[44px] rounded-xl px-4 text-sm font-extrabold text-red-700 ml-auto">Elimina società</button>}
        </div>
      </form>
    </Scheda>
  )
}

// Nuovo gruppo creato dall'admin: nome (unico), la società e, se si vuole, il coach scelto tra gli utenti
function NuovaSquadra({ dati, societaId, onCreata, onAnnulla }) {
  const [nome, setNome] = useState('')
  const [coach, setCoach] = useState('')
  const [societa, setSocieta] = useState(societaId || '')
  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)
  // chi allena già una squadra non può allenarne un'altra
  const liberi = dati.persone.filter((p) => !dati.squadre.some((s) => s.coach_id === p.id))
    .sort((a, b) => nomeDi(a).localeCompare(nomeDi(b)))

  async function crea(e) {
    e.preventDefault()
    setErrore('')
    if (!nome.trim()) return setErrore('Scrivi il nome del gruppo.')
    setInvio(true)
    const { data, error } = await supabase.rpc('admin_crea_squadra', { p_nome: nome, p_coach: coach || null })
    if (!error && societa) await supabase.rpc('admin_gruppo_societa', { p_squadra: data, p_societa: societa })
    setInvio(false)
    if (error) return setErrore(error.message)
    onCreata(data)
  }

  return (
    <Scheda titolo="Nuovo gruppo" nota="Puoi crearne quanti vuoi. Il coach si può scegliere anche dopo.">
      <form onSubmit={crea}>
        <label className="block text-sm font-semibold text-slate-600 mb-1" htmlFor="nuova-squadra">Nome del gruppo</label>
        <input id="nuova-squadra" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} placeholder="Es. Test Team Esordienti"
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 text-[15px] font-semibold mb-3" />
        <label className="block text-sm font-semibold text-slate-600 mb-1" htmlFor="nuova-societa">Società</label>
        <select id="nuova-societa" value={societa} onChange={(e) => setSocieta(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 text-[15px] font-semibold mb-3">
          <option value="">Nessuna società</option>
          {dati.societa.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <label className="block text-sm font-semibold text-slate-600 mb-1" htmlFor="nuovo-coach">Coach (facoltativo)</label>
        <select id="nuovo-coach" value={coach} onChange={(e) => setCoach(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 text-[15px] font-semibold mb-1">
          <option value="">Nessun coach per ora</option>
          {liberi.map((p) => <option key={p.id} value={p.id}>{nomeDi(p)} ({p.role})</option>)}
        </select>
        <p className="text-xs text-slate-500 mb-3">Chi scegli diventa coach di questo gruppo.</p>
        {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mb-3">{errore}</p>}
        <div className="flex gap-2 flex-wrap">
          <button type="submit" disabled={invio} className={BOTTONE_PIENO}>{invio ? 'Creo…' : 'Crea gruppo'}</button>
          <button type="button" onClick={onAnnulla} className="min-h-[44px] rounded-xl px-4 text-sm font-extrabold bg-slate-100 text-slate-600">Annulla</button>
        </div>
      </form>
    </Scheda>
  )
}

export function ElencoSquadre({ dati, onApri, ricarica }) {
  const [cerca, setCerca] = useState('')
  const [stat, setStat] = useState(null)
  // modulo aperto: { tipo: 'gruppo', societa } | { tipo: 'societa', societa }
  const [modulo, setModulo] = useState(null)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    supabase.rpc('admin_statistiche').then(({ data }) => setStat(data || {}))
  }, [])

  const q = cerca.trim().toLowerCase()
  const nomeSocieta = (id) => dati?.societa.find((s) => s.id === id)?.nome || ''
  const elenco = (dati?.squadre || []).map((s, i) => {
    const membri = dati.persone.filter((p) => p.squadra_id === s.id)
    const coach = dati.persone.find((p) => p.id === s.coach_id)
    return {
      ...s, colore: COLORI[i % COLORI.length], coach: coach ? nomeDi(coach) : 'Senza coach',
      atleti: membri.filter((p) => ['atleta', 'admin'].includes(p.role)).length,
      genitori: membri.filter((p) => p.role === 'genitore').length,
    }
  }).filter((s) => !q || `${s.nome} ${s.coach} ${nomeSocieta(s.societa_id)}`.toLowerCase().includes(q))

  async function aggiungiGruppo(societaId, squadraId) {
    if (!squadraId) return
    setErrore('')
    const gruppo = dati.squadre.find((s) => s.id === squadraId)
    if (!societaId && !window.confirm(`Far uscire ${gruppo?.nome} da ${nomeSocieta(gruppo?.societa_id)}? Il gruppo resta com'è, senza società.`)) return
    const { error } = await supabase.rpc('admin_gruppo_societa', { p_squadra: squadraId, p_societa: societaId })
    if (error) return setErrore(error.message)
    ricarica()
  }

  async function eliminaGruppo(s) {
    setErrore('')
    if (s.atleti + s.genitori > 0 || dati.persone.some((p) => p.squadra_id === s.id)) {
      return setErrore(`${s.nome} ha ancora persone dentro: spostale o toglile prima di eliminarlo.`)
    }
    if (!window.confirm(`Eliminare il gruppo ${s.nome}? Si cancellano anche i suoi allenamenti e le sue impostazioni. Non si può annullare.`)) return
    const { error } = await supabase.rpc('admin_elimina_squadra', { p_squadra: s.id })
    if (error) return setErrore(error.message)
    ricarica()
  }

  async function eliminaSocieta(so) {
    setErrore('')
    if (!window.confirm(`Eliminare la società ${so.nome}? I suoi gruppi restano com'erano, senza società.`)) return
    const { error } = await supabase.rpc('admin_elimina_societa', { p_id: so.id })
    if (error) return setErrore(error.message)
    ricarica()
  }

  const chiudi = () => { setModulo(null); ricarica() }
  const sezioni = [...(dati?.societa || []).map((so) => ({ so, gruppi: elenco.filter((s) => s.societa_id === so.id) })),
    { so: null, gruppi: elenco.filter((s) => !s.societa_id) }]
    .filter(({ so, gruppi }) => gruppi.length || (so && (!q || so.nome.toLowerCase().includes(q))))

  const scheda = (s) => (
    <div key={s.id} className="flex flex-col gap-1">
    <button type="button" onClick={() => onApri(s.id)} aria-label={`Entra in ${s.nome}`}
      className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-5 text-left hover:border-blue-200 hover:shadow-lg transition">
      <span className="w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center font-display font-extrabold text-2xl text-white" style={{ background: s.colore }}>
        {sigla(s.nome)}
      </span>
      <span className="min-w-0">
        <span className="block font-display font-extrabold text-[22px] underline underline-offset-4 decoration-2 truncate">{s.nome}</span>
        <span className="block text-sm text-slate-600 mt-1">Coach: {s.coach}</span>
        <span className="block text-sm text-slate-600">{plurale(s.atleti, 'atleta', 'atleti')} · {plurale(s.genitori, 'genitore', 'genitori')}</span>
      </span>
      <span className="ml-auto text-sm font-extrabold text-blue-600 whitespace-nowrap">Entra ›</span>
    </button>
    <button type="button" onClick={() => eliminaGruppo(s)} aria-label={`Elimina il gruppo ${s.nome}`}
      className="self-end min-h-[36px] px-2 text-xs font-extrabold text-red-700">Elimina gruppo</button>
    </div>
  )

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-[34px] font-extrabold leading-tight">Società e gruppi</h1>
        <label className="relative flex-1 min-w-[220px] max-w-[340px]">
          <span className="absolute left-3.5 top-3.5 text-slate-500" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          </span>
          <input type="search" value={cerca} onChange={(e) => setCerca(e.target.value)} aria-label="Cerca per società, gruppo o coach"
            placeholder="Cerca per società, gruppo o coach…" className="w-full min-h-[48px] border border-slate-300 rounded-xl pl-11 pr-3 bg-white" />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <Numero tinta="blu" valore={dati ? contaAllenamenti(dati).inProgramma : null} etichetta="Allenamenti in programma"
          spiega={dati ? `Pubblicati, da oggi in poi · ${contaAllenamenti(dati).pubblicati} in totale` : null} icona={<Icona nome="calendario" />} />
        <Numero tinta="verde" valore={stat?.nuovi_utenti_7gg} etichetta="Nuovi utenti (7 gg)" spiega="Iscritti negli ultimi 7 giorni" icona={<Icona nome="gruppo" />} />
        <Numero tinta="arancio" valore={stat?.coach_in_attesa} etichetta="Coach da approvare" spiega="Si sono iscritti come coach" icona={<Icona nome="persona" />} />
        <Numero tinta="viola" valore={stat?.accessi_7gg} etichetta="Accessi (7 gg)" spiega="Persone entrate negli ultimi 7 giorni" icona={<Icona nome="spunta" />} />
      </div>

      {!dati && <Scheletro schede={3} righe={0} />}
      {dati && (
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setModulo({ tipo: 'societa', societa: null })} className={BOTTONE_PIENO}>+ Nuova società</button>
          <button type="button" onClick={() => setModulo({ tipo: 'gruppo', societa: null })}
            className="min-h-[44px] rounded-xl px-4 text-sm font-extrabold bg-white border border-slate-300 text-abisso">+ Nuovo gruppo</button>
        </div>
      )}
      {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2">{errore}</p>}
      {modulo?.tipo === 'societa' && dati && <FormSocieta key={modulo.societa?.id || 'nuova'} dati={dati} societa={modulo.societa} onFatto={chiudi} onAnnulla={() => setModulo(null)} />}
      {modulo?.tipo === 'gruppo' && dati && (
        <NuovaSquadra key={modulo.societa || 'nessuna'} dati={dati} societaId={modulo.societa}
          onCreata={(id) => { setModulo(null); ricarica(); onApri(id) }} onAnnulla={() => setModulo(null)} />
      )}

      {sezioni.map(({ so, gruppi }) => {
        const capo = so && dati.persone.find((p) => p.id === so.capo_id)
        const liberi = so ? dati.squadre.filter((s) => !s.societa_id) : []
        return (
          <section key={so?.id || 'senza'} aria-label={so ? `Società ${so.nome}` : 'Gruppi senza società'} className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3 flex-wrap border-b border-slate-200 pb-2">
              <div>
                <h2 className="font-display text-[24px] font-extrabold leading-tight">{so ? so.nome : 'Senza società'}</h2>
                <p className="text-sm text-slate-600">
                  {so ? `Capo: ${capo ? nomeDi(capo) : 'nessuno'} · ` : ''}{plurale(gruppi.length, 'gruppo', 'gruppi')}
                </p>
              </div>
              {so && (
                <div className="flex gap-2 flex-wrap items-center">
                  {liberi.length > 0 && (
                    <select aria-label={`Aggiungi un gruppo a ${so.nome}`} value="" onChange={(e) => aggiungiGruppo(so.id, e.target.value)}
                      className="min-h-[40px] border border-slate-300 rounded-xl px-2 text-sm font-semibold bg-white">
                      <option value="">Aggiungi un gruppo esistente…</option>
                      {liberi.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  )}
                  {gruppi.length > 0 && (
                    <select aria-label={`Fai uscire un gruppo da ${so.nome}`} value="" onChange={(e) => aggiungiGruppo(null, e.target.value)}
                      className="min-h-[40px] border border-slate-300 rounded-xl px-2 text-sm font-semibold bg-white">
                      <option value="">Fai uscire un gruppo…</option>
                      {gruppi.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  )}
                  <button type="button" onClick={() => setModulo({ tipo: 'gruppo', societa: so.id })} className="min-h-[40px] rounded-xl px-3 text-sm font-extrabold bg-schiuma text-blue-600">+ Gruppo</button>
                  <button type="button" onClick={() => setModulo({ tipo: 'societa', societa: so })} className="min-h-[40px] rounded-xl px-3 text-sm font-extrabold bg-slate-100 text-slate-600">Modifica</button>
                  <button type="button" onClick={() => eliminaSocieta(so)} className="min-h-[40px] rounded-xl px-3 text-sm font-extrabold text-red-700 bg-red-50">Elimina</button>
                </div>
              )}
            </div>
            {gruppi.length === 0 && <p className="text-sm text-slate-500">Nessun gruppo ancora. Aggiungine uno esistente o creane uno nuovo.</p>}
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">{gruppi.map(scheda)}</div>
          </section>
        )
      })}
    </>
  )
}

const SCHEDE = [['panoramica', 'Panoramica'], ['persone', 'Persone'], ['permessi', 'Permessi'], ['lavori', 'Lavori'], ['genitori', 'Genitori e figli']]

export function DettaglioSquadra({ dati, ricarica, squadraId, onIndietro }) {
  const { entraInSquadra } = useAuth()
  const navigate = useNavigate()
  const [scheda, setScheda] = useState('permessi')
  const squadra = dati.squadre.find((s) => s.id === squadraId)
  const membri = useMemo(() => dati.persone.filter((p) => p.squadra_id === squadraId)
    .sort((a, b) => ['coach', 'admin', 'atleta', 'genitore'].indexOf(a.role) - ['coach', 'admin', 'atleta', 'genitore'].indexOf(b.role) || nomeDi(a).localeCompare(nomeDi(b))), [dati, squadraId])
  if (!squadra) return <Vuoto titolo="Gruppo non trovato" />
  const coach = dati.persone.find((p) => p.id === squadra.coach_id)
  const societa = dati.societa.find((s) => s.id === squadra.societa_id)
  const piani = dati.piani.filter((p) => p.squadra_id === squadraId && p.pubblicato)

  function entraCome() {
    entraInSquadra(squadra)
    navigate('/dashboard')
  }

  async function elimina() {
    if (membri.length > 0) return window.alert(`${squadra.nome} ha ancora ${membri.length} persone dentro: spostale o toglile dalla scheda Persone prima di eliminarlo.`)
    if (!window.confirm(`Eliminare il gruppo ${squadra.nome}? Si cancellano anche i suoi allenamenti e le sue impostazioni. Non si può annullare.`)) return
    const { error } = await supabase.rpc('admin_elimina_squadra', { p_squadra: squadra.id })
    if (error) return window.alert(error.message)
    ricarica()
    onIndietro()
  }

  return (
    <>
      <div>
        <nav aria-label="Percorso" className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-1">
          <button type="button" onClick={onIndietro} className="text-blue-600">Società e gruppi</button>
          {societa && <><span aria-hidden="true">›</span><span>{societa.nome}</span></>}
          <span aria-hidden="true">›</span><span>{squadra.nome}</span>
        </nav>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display text-[34px] font-extrabold leading-tight">{squadra.nome}</h1>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={elimina} className="min-h-[44px] rounded-xl px-4 text-sm font-extrabold text-red-700 bg-red-50">Elimina gruppo</button>
            <button type="button" onClick={entraCome} className={BOTTONE_PIENO}>Entra nell'app come coach</button>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Sezioni della squadra" className="flex flex-wrap gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5">
        {SCHEDE.map(([id, nome]) => (
          <button key={id} type="button" role="tab" aria-selected={scheda === id} onClick={() => setScheda(id)}
            className={`min-h-[42px] rounded-xl px-4 text-[15px] font-bold ${scheda === id ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
            {nome}
          </button>
        ))}
      </div>

      {scheda === 'panoramica' && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
            <Numero valore={membri.filter((p) => ['atleta', 'admin'].includes(p.role)).length} etichetta="Atleti" />
            <Numero valore={membri.filter((p) => p.role === 'genitore').length} etichetta="Genitori" />
            <Numero valore={piani.length} etichetta="Allenamenti pubblicati" />
            <Numero valore={piani.filter((p) => p.data >= dataLocale()).length} etichetta="In programma" />
          </div>
          <CoachESocieta dati={dati} squadra={squadra} coach={coach} ricarica={ricarica} />
        </>
      )}
      {scheda === 'persone' && <PersoneSquadra dati={dati} membri={membri} squadra={squadra} ricarica={ricarica} />}
      {scheda === 'permessi' && <PermessiSquadra squadraId={squadraId} iniziali={dati.permessi[squadraId] || {}} ricarica={ricarica} />}
      {scheda === 'lavori' && <GestioneLavori squadraId={squadraId} admin />}
      {scheda === 'genitori' &&<GenitoriSquadra dati={dati} membri={membri} ricarica={ricarica} />}
    </>
  )
}

// Nome, coach del gruppo e società a cui appartiene: si cambiano da qui
function CoachESocieta({ dati, squadra, coach, ricarica }) {
  const [esito, setEsito] = useState('')
  const [nome, setNome] = useState(squadra.nome)
  useEffect(() => setNome(squadra.nome), [squadra.nome])

  async function rinomina(e) {
    e.preventDefault()
    if (!nome.trim() || nome.trim() === squadra.nome) return setNome(squadra.nome)
    const { error } = await supabase.rpc('admin_rinomina_squadra', { p_squadra: squadra.id, p_nome: nome })
    setEsito(error ? 'Errore: ' + error.message : 'Salvato')
    if (error) setNome(squadra.nome)
    ricarica()
  }
  const persone = dati.persone.filter((p) => p.role !== 'genitore').sort((a, b) => nomeDi(a).localeCompare(nomeDi(b)))
  const allena = (id) => dati.squadre.find((s) => s.coach_id === id && s.id !== squadra.id)

  async function cambiaCoach(id) {
    const nuovo = dati.persone.find((p) => p.id === id)
    const altro = id && allena(id)
    const domanda = !id ? `Togliere il coach da ${squadra.nome}?`
      : `${nomeDi(nuovo)} diventa coach di ${squadra.nome} ed entra nel gruppo.` + (altro ? ` ${altro.nome} resterà senza coach.` : '')
    if (!window.confirm(domanda)) return
    const { error } = await supabase.rpc('admin_imposta_coach', { p_squadra: squadra.id, p_coach: id || null })
    setEsito(error ? 'Errore: ' + error.message : 'Salvato')
    ricarica()
  }

  async function cambiaSocieta(id) {
    const { error } = await supabase.rpc('admin_gruppo_societa', { p_squadra: squadra.id, p_societa: id || null })
    setEsito(error ? 'Errore: ' + error.message : 'Salvato')
    ricarica()
  }

  const campo = 'w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 text-[15px] font-semibold'
  return (
    <Scheda titolo="Nome, coach e società" azioni={<Salvato stato={esito} />}
      nota={`Gruppo creato il ${new Date(squadra.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}. Entrando come coach lo vedi esattamente come lo vede lui.`}>
      <form onSubmit={rinomina} className="mb-3">
        <label className="block text-sm font-semibold text-slate-600" htmlFor="nome-gruppo">Nome del gruppo</label>
        <div className="flex gap-2 mt-1">
          <input id="nome-gruppo" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} className={campo} />
          <button type="submit" disabled={!nome.trim() || nome.trim() === squadra.nome}
            className="shrink-0 min-h-[46px] rounded-2xl px-4 font-bold text-white bg-blue-600 disabled:opacity-40">Cambia nome</button>
        </div>
      </form>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-600">Coach del gruppo
          <select value={coach?.id || ''} onChange={(e) => cambiaCoach(e.target.value)} className={campo + ' mt-1'}>
            <option value="">Nessun coach</option>
            {persone.map((p) => <option key={p.id} value={p.id}>{nomeDi(p)}{allena(p.id) ? ` (allena ${allena(p.id).nome})` : ''}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-600">Società
          <select value={squadra.societa_id || ''} onChange={(e) => cambiaSocieta(e.target.value)} className={campo + ' mt-1'}>
            <option value="">Nessuna società</option>
            {dati.societa.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </label>
      </div>
    </Scheda>
  )
}

function PersoneSquadra({ dati, membri, squadra, ricarica }) {
  const [scelti, setScelti] = useState([])
  const [azione, setAzione] = useState('')
  const [valore, setValore] = useState('')
  const [esito, setEsito] = useState('')

  const cambia = (id) => setScelti((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  async function applica() {
    if (!scelti.length) return
    let patch
    if (azione === 'ruolo') patch = { role: valore }
    else if (azione === 'sposta') patch = { squadra_id: valore }
    else if (azione === 'togli') patch = { squadra_id: null }
    if (!patch || (azione !== 'togli' && !valore)) return setEsito('Errore: scegli cosa mettere.')
    if (scelti.includes(squadra.coach_id) && azione !== 'ruolo'
      && !window.confirm(`Tra le persone scelte c'è il coach: ${squadra.nome} resterà senza coach. Continuare?`)) return
    if (azione === 'togli' && !window.confirm(`Togliere ${scelti.length} persone da ${squadra.nome}? I loro tempi restano salvati.`)) return
    if (azione === 'ruolo' && !window.confirm(`Cambiare il ruolo di ${scelti.length === 1 ? 'questa persona' : `${scelti.length} persone`} in ${valore}?`)) return
    // una per una, con le funzioni che lasciano traccia nel Registro accessi;
    // se c'è il coach, il gruppo che allenava resta senza coach
    let error
    for (const id of scelti) {
      ;({ error } = azione === 'ruolo'
        ? await supabase.rpc('admin_cambia_ruolo', { p_persona: id, p_ruolo: valore })
        : await supabase.rpc('admin_sposta_persona', { p_persona: id, p_squadra: patch.squadra_id }))
      if (error) break
    }
    if (error) return setEsito('Errore: ' + error.message)
    setEsito(`Fatto su ${scelti.length} ${scelti.length === 1 ? 'persona' : 'persone'}.`)
    setScelti([])
    setAzione('')
    setValore('')
    ricarica()
  }

  return (
    <Scheda titolo={`Persone in ${squadra.nome}`} nota="Spunta una o più persone e scegli cosa fare." azioni={<Salvato stato={esito} />}>
      {scelti.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-abisso text-white rounded-2xl p-2.5 pl-4 mb-2">
          <span className="font-bold flex-1 min-w-[120px]">{scelti.length} {scelti.length === 1 ? 'selezionata' : 'selezionate'}</span>
          <label className="sr-only" htmlFor="azione">Cosa fare</label>
          <select id="azione" value={azione} onChange={(e) => { setAzione(e.target.value); setValore('') }} className="min-h-[44px] rounded-xl px-3 text-abisso font-semibold">
            <option value="">Cosa fare?</option>
            <option value="ruolo">Cambia ruolo</option>
            <option value="sposta">Sposta in un altro gruppo</option>
            <option value="togli">Togli dal gruppo</option>
          </select>
          {azione === 'ruolo' && (
            <select aria-label="Nuovo ruolo" value={valore} onChange={(e) => setValore(e.target.value)} className="min-h-[44px] rounded-xl px-3 text-abisso font-semibold">
              <option value="">Ruolo…</option><option value="atleta">Atleta</option><option value="genitore">Genitore</option><option value="coach">Coach</option>
            </select>
          )}
          {azione === 'sposta' && (
            <select aria-label="Nuovo gruppo" value={valore} onChange={(e) => setValore(e.target.value)} className="min-h-[44px] rounded-xl px-3 text-abisso font-semibold">
              <option value="">Gruppo…</option>
              <OpzioniGruppi dati={dati} escludi={squadra.id} />
            </select>
          )}
          {azione && <button type="button" onClick={applica} className="min-h-[44px] rounded-xl px-4 font-extrabold bg-white text-blue-600">Applica</button>}
        </div>
      )}
      {membri.length === 0 && <Vuoto titolo="Nessuno in questo gruppo" />}
      {membri.map((p) => (
        <label key={p.id} className="flex items-center gap-3 py-3 border-t border-slate-100 first-of-type:border-t-0 cursor-pointer">
          <input type="checkbox" checked={scelti.includes(p.id)} onChange={() => cambia(p.id)} aria-label={`Seleziona ${nomeDi(p)}`} className="w-[22px] h-[22px] accent-blue-600" />
          <span aria-hidden="true" className="w-10 h-10 shrink-0 rounded-full bg-abisso text-white font-extrabold flex items-center justify-center">{nomeDi(p)[0]}</span>
          <span className="flex-1 min-w-0">
            <b className="block truncate">{nomeDi(p)}</b>
            <span className="text-[13px] text-slate-500">{p.id === squadra.coach_id ? 'Coach del gruppo' : `Iscritto il ${new Date(p.created_at).toLocaleDateString('it-IT')}`}</span>
          </span>
          <ChipRuolo ruolo={p.role} />
        </label>
      ))}
    </Scheda>
  )
}

function PermessiSquadra({ squadraId, iniziali, ricarica }) {
  const [permessi, setPermessi] = useState(iniziali)
  const [stato, setStato] = useState('')
  const valore = (k, base) => permessi[k] ?? base

  async function cambia(k, acceso) {
    const nuovi = { ...permessi, [k]: acceso }
    setPermessi(nuovi)
    setStato('Salvo…')
    const { error } = await supabase.from('impostazioni_squadra')
      .upsert({ squadra_id: squadraId, permessi: nuovi, aggiornato: new Date().toISOString() }, { onConflict: 'squadra_id' })
    if (error) {
      setPermessi(permessi)
      return setStato('Errore: ' + error.message)
    }
    setStato('Salvato')
    ricaricaRegole()
    ricarica()
  }

  return (
    <>
      <div className="flex justify-end -mb-2"><Salvato stato={stato} /></div>
      {PERMESSI_SQUADRA.map(([titolo, nota, voci]) => (
        <Gruppo key={titolo} titolo={titolo} nota={nota}>
          <Interruttori>
            {voci.map(([k, nome, base]) => (
              <Interruttore key={k} etichetta={nome} acceso={valore(k, base)} onCambia={(v) => cambia(k, v)} />
            ))}
          </Interruttori>
        </Gruppo>
      ))}
    </>
  )
}

function GenitoriSquadra({ dati, membri, ricarica }) {
  const genitori = membri.filter((p) => p.role === 'genitore')
  const nome = (id) => nomeDi(dati.persone.find((p) => p.id === id))
  const STATO = { approvato: 'collegato', in_attesa: 'in attesa che approvi', rifiutato: 'non approvato' }

  async function scollega(c) {
    if (!window.confirm(`Scollegare ${nome(c.genitore_id)} da ${nome(c.atleta_id)}?`)) return
    await supabase.from('genitori_figli').delete().eq('id', c.id)
    ricarica()
  }

  return (
    <Scheda titolo="Genitori e figli" nota="Il collegamento lo chiede il genitore e lo approva l'atleta. Da qui puoi toglierlo.">
      {genitori.length === 0 && <Vuoto titolo="Nessun genitore in questo gruppo" />}
      {genitori.map((g) => {
        const suoi = dati.collegamenti.filter((c) => c.genitore_id === g.id)
        return (
          <div key={g.id} className="py-3 border-t border-slate-100 first:border-t-0">
            <b className="block">{nomeDi(g)}</b>
            {suoi.length === 0 && <span className="text-[13px] text-slate-500">Non ancora collegato a nessun figlio</span>}
            {suoi.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 mt-1.5">
                <span className="text-sm text-slate-600">→ {nome(c.atleta_id)} · {STATO[c.stato]}</span>
                <button type="button" onClick={() => scollega(c)} className="text-xs font-bold text-slate-500">Scollega</button>
              </div>
            ))}
          </div>
        )
      })}
    </Scheda>
  )
}

