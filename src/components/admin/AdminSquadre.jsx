import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { PERMESSI_SQUADRA, ricaricaRegole } from '../../lib/regole'
import Icona from '../Icona'
import { BOTTONE_PIENO, ChipRuolo, Gruppo, Interruttore, Interruttori, Numero, Salvato, Scheda, Vuoto } from './ui'

const COLORI = ['#0b4fd9', '#0f6b3f', '#b45309', '#6d28c9', '#c2309f', '#0a1a2f']
const sigla = (nome = '') => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'
const nomeDi = (p) => `${p?.nome || ''} ${p?.cognome || ''}`.trim() || 'Senza nome'

// Tutto quello che serve al pannello sulle squadre, in una volta sola
export function useDatiSquadre() {
  const [dati, setDati] = useState(null)
  const carica = useCallback(async () => {
    const [sq, pr, gf, al, imp] = await Promise.all([
      supabase.from('squadre').select('id, nome, coach_id, created_at').order('created_at'),
      supabase.from('profiles').select('id, nome, cognome, role, squadra_id, created_at'),
      supabase.from('genitori_figli').select('id, genitore_id, atleta_id, stato'),
      supabase.from('allenamenti_squadra').select('squadra_id, pubblicato, data'),
      supabase.from('impostazioni_squadra').select('squadra_id, permessi'),
    ])
    setDati({
      squadre: sq.data || [], persone: pr.data || [], collegamenti: gf.data || [],
      piani: al.data || [], permessi: Object.fromEntries((imp.data || []).map((r) => [r.squadra_id, r.permessi || {}])),
    })
  }, [])
  useEffect(() => { carica() }, [carica])
  return [dati, carica]
}

// Nuova squadra creata dall'admin: nome (unico) e, se si vuole, il coach scelto tra gli utenti
function NuovaSquadra({ dati, onCreata, onAnnulla }) {
  const [nome, setNome] = useState('')
  const [coach, setCoach] = useState('')
  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)
  // chi allena già una squadra non può allenarne un'altra
  const liberi = dati.persone.filter((p) => !dati.squadre.some((s) => s.coach_id === p.id))
    .sort((a, b) => nomeDi(a).localeCompare(nomeDi(b)))

  async function crea(e) {
    e.preventDefault()
    setErrore('')
    if (!nome.trim()) return setErrore('Scrivi il nome della squadra.')
    setInvio(true)
    const { data, error } = await supabase.rpc('admin_crea_squadra', { p_nome: nome, p_coach: coach || null })
    setInvio(false)
    if (error) return setErrore(error.message)
    onCreata(data)
  }

  return (
    <Scheda titolo="Nuova squadra" nota="Puoi crearne quante vuoi. Il coach si può scegliere anche dopo.">
      <form onSubmit={crea}>
        <label className="block text-sm font-semibold text-slate-600 mb-1" htmlFor="nuova-squadra">Nome della squadra</label>
        <input id="nuova-squadra" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} placeholder="Es. Esordienti A"
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 text-[15px] font-semibold mb-3" />
        <label className="block text-sm font-semibold text-slate-600 mb-1" htmlFor="nuovo-coach">Coach (facoltativo)</label>
        <select id="nuovo-coach" value={coach} onChange={(e) => setCoach(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 text-[15px] font-semibold mb-1">
          <option value="">Nessun coach per ora</option>
          {liberi.map((p) => <option key={p.id} value={p.id}>{nomeDi(p)} ({p.role})</option>)}
        </select>
        <p className="text-xs text-slate-500 mb-3">Chi scegli diventa coach di questa squadra.</p>
        {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mb-3">{errore}</p>}
        <div className="flex gap-2 flex-wrap">
          <button type="submit" disabled={invio} className={BOTTONE_PIENO}>{invio ? 'Creo…' : 'Crea squadra'}</button>
          <button type="button" onClick={onAnnulla} className="min-h-[44px] rounded-xl px-4 text-sm font-extrabold bg-slate-100 text-slate-600">Annulla</button>
        </div>
      </form>
    </Scheda>
  )
}

export function ElencoSquadre({ dati, onApri, ricarica }) {
  const [cerca, setCerca] = useState('')
  const [stat, setStat] = useState(null)
  const [nuova, setNuova] = useState(false)

  useEffect(() => {
    supabase.rpc('admin_statistiche').then(({ data }) => setStat(data || {}))
  }, [])

  const q = cerca.trim().toLowerCase()
  const elenco = (dati?.squadre || []).map((s, i) => {
    const membri = dati.persone.filter((p) => p.squadra_id === s.id)
    const coach = dati.persone.find((p) => p.id === s.coach_id)
    return {
      ...s, colore: COLORI[i % COLORI.length], coach: coach ? nomeDi(coach) : 'Senza coach',
      atleti: membri.filter((p) => ['atleta', 'admin'].includes(p.role)).length,
      genitori: membri.filter((p) => p.role === 'genitore').length,
    }
  }).filter((s) => !q || `${s.nome} ${s.coach}`.toLowerCase().includes(q))

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-[34px] font-extrabold leading-tight">Le squadre</h1>
        <label className="relative flex-1 min-w-[220px] max-w-[340px]">
          <span className="absolute left-3.5 top-3.5 text-slate-500" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          </span>
          <input type="search" value={cerca} onChange={(e) => setCerca(e.target.value)} aria-label="Cerca per squadra o coach"
            placeholder="Cerca per squadra o coach…" className="w-full min-h-[48px] border border-slate-300 rounded-xl pl-11 pr-3 bg-white" />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <Numero tinta="blu" valore={stat?.allenamenti_in_programma} etichetta="Allenamenti in programma" icona={<Icona nome="calendario" />} />
        <Numero tinta="verde" valore={stat?.nuovi_utenti_7gg} etichetta="Nuovi utenti (7 gg)" icona={<Icona nome="gruppo" />} />
        <Numero tinta="arancio" valore={stat?.coach_in_attesa} etichetta="Coach da approvare" icona={<Icona nome="persona" />} />
        <Numero tinta="viola" valore={stat?.accessi_7gg} etichetta="Accessi (7 gg)" icona={<Icona nome="spunta" />} />
      </div>

      {!dati && <p className="text-slate-500 py-6">Carico…</p>}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
        {elenco.map((s) => (
          <button key={s.id} type="button" onClick={() => onApri(s.id)} aria-label={`Entra in ${s.nome}`}
            className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-5 text-left hover:border-blue-200 hover:shadow-lg transition">
            <span className="w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center font-display font-extrabold text-2xl text-white" style={{ background: s.colore }}>
              {sigla(s.nome)}
            </span>
            <span className="min-w-0">
              <span className="block font-display font-extrabold text-[22px] underline underline-offset-4 decoration-2 truncate">{s.nome}</span>
              <span className="block text-sm text-slate-600 mt-1">Coach: {s.coach}</span>
              <span className="block text-sm text-slate-600">{s.atleti} atleti · {s.genitori} genitori</span>
            </span>
            <span className="ml-auto text-sm font-extrabold text-blue-600 whitespace-nowrap">Entra ›</span>
          </button>
        ))}
        <button type="button" onClick={() => setNuova(!nuova)}
          className="min-h-[110px] border-2 border-dashed border-slate-300 rounded-2xl font-extrabold text-slate-600 flex items-center justify-center gap-2">
          + Nuova squadra
        </button>
      </div>
      {nuova && dati && <NuovaSquadra dati={dati} onCreata={(id) => { setNuova(false); ricarica(); onApri(id) }} onAnnulla={() => setNuova(false)} />}
    </>
  )
}

const SCHEDE = [['panoramica', 'Panoramica'], ['persone', 'Persone'], ['permessi', 'Permessi'], ['genitori', 'Genitori e figli']]

export function DettaglioSquadra({ dati, ricarica, squadraId, onIndietro }) {
  const { entraInSquadra } = useAuth()
  const navigate = useNavigate()
  const [scheda, setScheda] = useState('permessi')
  const squadra = dati.squadre.find((s) => s.id === squadraId)
  const membri = useMemo(() => dati.persone.filter((p) => p.squadra_id === squadraId)
    .sort((a, b) => ['coach', 'admin', 'atleta', 'genitore'].indexOf(a.role) - ['coach', 'admin', 'atleta', 'genitore'].indexOf(b.role) || nomeDi(a).localeCompare(nomeDi(b))), [dati, squadraId])
  if (!squadra) return <Vuoto titolo="Squadra non trovata" />
  const coach = dati.persone.find((p) => p.id === squadra.coach_id)
  const piani = dati.piani.filter((p) => p.squadra_id === squadraId && p.pubblicato)

  function entraCome() {
    entraInSquadra(squadra)
    navigate('/dashboard')
  }

  return (
    <>
      <div>
        <nav aria-label="Percorso" className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-1">
          <button type="button" onClick={onIndietro} className="text-blue-600">Squadre</button>
          <span aria-hidden="true">›</span><span>{squadra.nome}</span>
        </nav>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display text-[34px] font-extrabold leading-tight">{squadra.nome}</h1>
          <button type="button" onClick={entraCome} className={BOTTONE_PIENO}>Entra nell'app come coach</button>
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
            <Numero valore={piani.filter((p) => p.data >= new Date().toISOString().slice(0, 10)).length} etichetta="In programma" />
          </div>
          <Scheda titolo="Il coach" nota={`${coach ? nomeDi(coach) : 'Nessun coach'} · squadra creata il ${new Date(squadra.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`}>
            <p className="text-sm text-slate-600">Entrando come coach vedi e gestisci la squadra esattamente come la vede lui: allenamenti, presenze, gare, risultati.</p>
          </Scheda>
        </>
      )}
      {scheda === 'persone' && <PersoneSquadra dati={dati} membri={membri} squadra={squadra} ricarica={ricarica} />}
      {scheda === 'permessi' && <PermessiSquadra squadraId={squadraId} iniziali={dati.permessi[squadraId] || {}} ricarica={ricarica} />}
      {scheda === 'genitori' && <GenitoriSquadra dati={dati} membri={membri} ricarica={ricarica} />}
    </>
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
    if (scelti.includes(squadra.coach_id) && azione !== 'ruolo') return setEsito('Errore: il coach della squadra non si sposta da qui.')
    if (azione === 'togli' && !window.confirm(`Togliere ${scelti.length} persone da ${squadra.nome}? I loro tempi restano salvati.`)) return
    const { error } = await supabase.from('profiles').update(patch).in('id', scelti)
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
            <option value="sposta">Sposta in un'altra squadra</option>
            <option value="togli">Togli dalla squadra</option>
          </select>
          {azione === 'ruolo' && (
            <select aria-label="Nuovo ruolo" value={valore} onChange={(e) => setValore(e.target.value)} className="min-h-[44px] rounded-xl px-3 text-abisso font-semibold">
              <option value="">Ruolo…</option><option value="atleta">Atleta</option><option value="genitore">Genitore</option><option value="coach">Coach</option>
            </select>
          )}
          {azione === 'sposta' && (
            <select aria-label="Nuova squadra" value={valore} onChange={(e) => setValore(e.target.value)} className="min-h-[44px] rounded-xl px-3 text-abisso font-semibold">
              <option value="">Squadra…</option>
              {dati.squadre.filter((s) => s.id !== squadra.id).map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          )}
          {azione && <button type="button" onClick={applica} className="min-h-[44px] rounded-xl px-4 font-extrabold bg-white text-blue-600">Applica</button>}
        </div>
      )}
      {membri.length === 0 && <Vuoto titolo="Nessuno in questa squadra" />}
      {membri.map((p) => (
        <label key={p.id} className="flex items-center gap-3 py-3 border-t border-slate-100 first-of-type:border-t-0 cursor-pointer">
          <input type="checkbox" checked={scelti.includes(p.id)} onChange={() => cambia(p.id)} aria-label={`Seleziona ${nomeDi(p)}`} className="w-[22px] h-[22px] accent-blue-600" />
          <span aria-hidden="true" className="w-10 h-10 shrink-0 rounded-full bg-abisso text-white font-extrabold flex items-center justify-center">{nomeDi(p)[0]}</span>
          <span className="flex-1 min-w-0">
            <b className="block truncate">{nomeDi(p)}</b>
            <span className="text-[13px] text-slate-500">{p.id === squadra.coach_id ? 'Coach della squadra' : `Iscritto il ${new Date(p.created_at).toLocaleDateString('it-IT')}`}</span>
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
      {genitori.length === 0 && <Vuoto titolo="Nessun genitore in questa squadra" />}
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

