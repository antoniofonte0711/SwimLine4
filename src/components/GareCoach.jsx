import { useCallback, useEffect, useMemo, useState } from 'react'
import { Reorder, AnimatePresence, useDragControls } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import AppShell from './AppShell'
import InputTempo from './InputTempo'
import SelettoreData from './SelettoreData'
import { SenzaSquadra } from './PianoCard'
import { STILI, dataLocale } from '../lib/lavori'
import {
  normalizzaTempo, tempoValido, tempoInSecondi, secondiInTempo,
  passaggiCoerenti, tempoPlausibile, erroreTempoImpossibile, ERRORE_TEMPO_BREVE,
} from '../lib/tempo'
import { useMiaSquadra } from '../lib/pianoSquadra'

const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'
const CARD = 'bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm'
const DISTANZE = ['25', '50', '100', '200', '400', '800', '1500']
const MSG_MIGRAZIONE = 'Manca una colonna nel database: esegui migrazione_fase10_punti_gare.sql su Supabase.'
const nuovaGara = (x = {}) => ({ distanza: '100', stile: 'Stile libero', ...x, _id: crypto.randomUUID() })

const dataIt = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT') : '')
const nomeGara = (g) => `${g.distanza} m ${g.stile}`

// Differenza rispetto al tempo di iscrizione: negativo = migliorato (verde)
function differenza(iscr, finale) {
  const a = tempoInSecondi(iscr)
  const b = tempoInSecondi(finale)
  if (a === null || b === null) return null
  const diff = Math.round((b - a) * 100) / 100
  if (diff === 0) return { testo: '=', classe: 'text-gray-500 bg-gray-100' }
  const testo = (diff < 0 ? '-' : '+') + secondiInTempo(Math.abs(diff))
  return { testo, classe: diff < 0 ? 'text-green-700 bg-green-100' : 'text-red-600 bg-red-100' }
}

function Differenziale({ iscr, finale }) {
  const d = differenza(iscr, finale)
  if (!d) return null
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${d.classe}`}>{d.testo}</span>
}

// Parziali calcolati: tu scrivi i passaggi (tempo totale a ogni tappa), il resto lo calcola l'app
function calcolaParziali(passaggi, finale, passo, distanza) {
  const punti = [{ m: 0, sec: 0 }]
  passaggi.forEach((p, i) => {
    const sec = tempoInSecondi(normalizzaTempo(p))
    if (sec !== null) punti.push({ m: (i + 1) * passo, sec })
  })
  const fin = tempoInSecondi(normalizzaTempo(finale))
  if (fin !== null) punti.push({ m: distanza, sec: fin })
  const out = []
  for (let i = 1; i < punti.length; i++) {
    const diff = Math.round((punti[i].sec - punti[i - 1].sec) * 100) / 100
    if (diff <= 0) return [] // dati incoerenti: li segnala già la validazione al salvataggio
    out.push({ da: punti[i - 1].m, a: punti[i].m, sec: diff })
  }
  return out
}

function Parziali({ passaggi, finale, passo, distanza }) {
  const lista = calcolaParziali(passaggi, finale, passo, distanza)
  if (lista.length < 2) return null
  return (
    <div className="mt-3 bg-blue-50 rounded-2xl px-4 py-3">
      <p className="text-xs font-bold text-blue-700 mb-1">Parziali calcolati</p>
      {lista.map((x) => (
        <div key={x.da} className="flex justify-between text-sm py-0.5">
          <span className="text-gray-600">{x.da}–{x.a} m</span>
          <b className="text-blue-700">{secondiInTempo(x.sec)}</b>
        </div>
      ))}
    </div>
  )
}

// Scheda di un atleta in una gara già assegnata: tempo effettivo + passaggi
function SchedaRisultato({ g, onSalvato }) {
  const d = Number(g.distanza)
  const passo = d <= 50 ? 25 : 50
  const nPassaggi = Math.max(0, Math.ceil(d / passo) - 1)
  const [aperta, setAperta] = useState(false)
  const [tempo, setTempo] = useState(g.tempo || '')
  const [passaggi, setPassaggi] = useState(g.passaggi || [])
  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)

  async function salva() {
    setErrore('')
    const t = normalizzaTempo(tempo)
    if (!tempoValido(t)) return setErrore(ERRORE_TEMPO_BREVE)
    if (!tempoPlausibile(t, d)) return setErrore(erroreTempoImpossibile(d))
    const p = []
    for (let i = 0; i < nPassaggi; i++) {
      const x = normalizzaTempo(passaggi[i])
      if (!x) continue
      if (!tempoValido(x)) return setErrore(`Passaggio ai ${(i + 1) * passo} m: ${ERRORE_TEMPO_BREVE}`)
      if (!tempoPlausibile(x, (i + 1) * passo)) return setErrore(`Passaggio ai ${(i + 1) * passo} m: ${erroreTempoImpossibile((i + 1) * passo)}`)
      p.push(x)
    }
    const incoerente = passaggiCoerenti(p, t)
    if (incoerente) return setErrore(incoerente)
    setInvio(true)
    const { error } = await supabase.from('gare').update({ tempo: t, passaggi: p }).eq('id', g.id)
    setInvio(false)
    if (error) return setErrore('Non sono riuscito a salvare: ' + error.message)
    setAperta(false)
    onSalvato()
  }

  return (
    <div className="py-3 border-t border-gray-100 first:border-t-0">
      <button onClick={() => setAperta(!aperta)} className="w-full flex items-center justify-between gap-2 text-left">
        <span className="min-w-0">
          <span className="font-semibold block truncate">{g.atleta?.nome} {g.atleta?.cognome}</span>
          <span className="text-xs text-gray-400">
            {g.tempo_iscrizione ? `Iscrizione ${g.tempo_iscrizione}` : 'Senza tempo di iscrizione'}
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {g.tempo
            ? <><b className="text-blue-600">{g.tempo}</b><Differenziale iscr={g.tempo_iscrizione} finale={g.tempo} /></>
            : <span className="text-xs font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">Da inserire</span>}
        </span>
      </button>

      {aperta && (
        <div className="mt-3">
          <InputTempo etichetta="Tempo effettivo" value={tempo} onChange={setTempo} />
          {tempo && g.tempo_iscrizione && (
            <p className="text-sm text-gray-500 mt-2">Rispetto all'iscrizione: <Differenziale iscr={g.tempo_iscrizione} finale={normalizzaTempo(tempo)} /></p>
          )}
          {nPassaggi > 0 && (
            <>
              <p className="text-sm text-gray-500 mt-3 mb-2">Scrivi il passaggio (tempo totale a quel punto): i parziali li calcolo io</p>
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: nPassaggi }, (_, i) => (
                  <InputTempo key={i} etichetta={`Ai ${(i + 1) * passo} m`} vuotoOk value={passaggi[i] || ''}
                    onChange={(v) => { const n = [...passaggi]; n[i] = v; setPassaggi(n) }} />
                ))}
              </div>
              <Parziali passaggi={passaggi} finale={tempo} passo={passo} distanza={d} />
            </>
          )}
          {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mt-3">{errore}</p>}
          <button onClick={salva} disabled={invio}
            className="w-full mt-3 font-bold text-white bg-blue-600 disabled:bg-gray-300 rounded-2xl py-3">
            {invio ? 'Salvo…' : 'Salva risultato'}
          </button>
        </div>
      )}
    </div>
  )
}

// Una gara del programma del trofeo: si trascina dalla maniglia ⠿ o con le frecce
function RigaGara({ g, i, totale, cambia, sposta, togli }) {
  const controlli = useDragControls()
  return (
    <Reorder.Item as="div" value={g} dragListener={false} dragControls={controlli}
      initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      whileDrag={{ scale: 1.03, boxShadow: '0 18px 40px rgba(37,99,235,0.25)', zIndex: 20 }}
      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
      className="relative bg-gray-50 border border-gray-100 rounded-2xl p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div onPointerDown={(e) => controlli.start(e)} style={{ touchAction: 'none' }}
          className="flex items-center gap-2 cursor-grab active:cursor-grabbing select-none text-gray-400 text-sm font-semibold">
          <span className="text-xl leading-none">⠿</span> Gara {i + 1}
        </div>
        <div className="flex gap-2">
          <button onClick={() => sposta(i, -1)} disabled={i === 0} aria-label="Sposta su"
            className="w-8 h-8 rounded-full bg-white text-gray-600 font-bold disabled:opacity-30 active:scale-90 transition">↑</button>
          <button onClick={() => sposta(i, 1)} disabled={i === totale - 1} aria-label="Sposta giù"
            className="w-8 h-8 rounded-full bg-white text-gray-600 font-bold disabled:opacity-30 active:scale-90 transition">↓</button>
          {totale > 1 && <button onClick={() => togli(i)} aria-label="Togli gara" className="w-8 h-8 rounded-full bg-white text-red-500 font-bold active:scale-90 transition">×</button>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <select value={g.distanza} onChange={(e) => cambia(i, { distanza: e.target.value })} className={CAMPO}>
          {DISTANZE.map((x) => <option key={x} value={x}>{x} m</option>)}
        </select>
        <select value={g.stile} onChange={(e) => cambia(i, { stile: e.target.value })} className={CAMPO}>
          {STILI.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
    </Reorder.Item>
  )
}

// Gare del coach: assegna la gara a più atleti, poi inserisci i risultati
export default function GareCoach() {
  const { squadra, pronto } = useMiaSquadra()
  const [modo, setModo] = useState('nuova')
  const [atleti, setAtleti] = useState([])
  const [gare, setGare] = useState([])

  // nuova gara
  const [nome, setNome] = useState('')
  const [data, setData] = useState(dataLocale())
  const [orario, setOrario] = useState('')
  const [programma, setProgramma] = useState(() => [nuovaGara()]) // gare del trofeo, in ordine
  const [righe, setRighe] = useState({}) // { idAtleta: { incluso, iscr } }
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  const [invio, setInvio] = useState(false)

  // risultati
  const [trofeo, setTrofeo] = useState('')
  const [garaSel, setGaraSel] = useState('')

  const caricaGare = useCallback(async (elenco) => {
    const ids = elenco.map((a) => a.id)
    if (!ids.length) return setGare([])
    const { data: g } = await supabase.from('gare').select('*').in('atleta_id', ids)
      .order('data_gara', { ascending: false }).limit(300)
    setGare((g || []).map((r) => ({ ...r, atleta: elenco.find((a) => a.id === r.atleta_id) })))
  }, [])

  useEffect(() => {
    if (!squadra) return
    supabase.from('profiles').select('id, nome, cognome').in('role', ['atleta', 'admin']).eq('squadra_id', squadra.id).order('cognome')
      .then(({ data: a }) => { setAtleti(a || []); caricaGare(a || []) })
  }, [squadra?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cambiaGara = (i, patch) => setProgramma(programma.map((g, k) => (k === i ? { ...g, ...patch } : g)))
  const spostaGara = (i, verso) => {
    const j = i + verso
    if (j < 0 || j >= programma.length) return
    const c = [...programma]
    ;[c[i], c[j]] = [c[j], c[i]]
    setProgramma(c)
  }
  const riga = (id) => righe[id] || { incluso: false, iscr: '' }
  const cambia = (id, patch) => setRighe((r) => ({ ...r, [id]: { ...(r[id] || { incluso: false, iscr: '' }), ...patch } }))
  const nSelezionati = atleti.filter((a) => riga(a.id).incluso).length
  const tuttiSelezionati = atleti.length > 0 && nSelezionati === atleti.length

  function selezionaTutti() {
    const nuovo = {}
    atleti.forEach((a) => { nuovo[a.id] = { ...riga(a.id), incluso: !tuttiSelezionati } })
    setRighe(nuovo)
  }

  async function salva() {
    setErrore('')
    setOk('')
    if (!nome.trim()) return setErrore('Scrivi il nome della gara.')
    const scelti = atleti.filter((a) => riga(a.id).incluso)
    if (!scelti.length) return setErrore('Seleziona almeno un atleta.')
    const records = []
    for (const a of scelti) {
      const iscr = normalizzaTempo(riga(a.id).iscr)
      if (iscr && !tempoValido(iscr)) return setErrore(`${a.nome}, tempo di iscrizione: ${ERRORE_TEMPO_BREVE}`)
      if (iscr && !tempoPlausibile(iscr, programma[0]?.distanza)) return setErrore(`${a.nome}, tempo di iscrizione: ${erroreTempoImpossibile(programma[0].distanza)}`)
      // il tempo di iscrizione vale per la prima gara del programma
      programma.forEach((g, k) => {
        records.push({
          atleta_id: a.id, nome_gara: nome.trim(), distanza: Number(g.distanza), stile: g.stile,
          data_gara: data, orario: orario || null, tempo: null, passaggi: [], ordine: k,
          ...(iscr && k === 0 ? { tempo_iscrizione: iscr } : {}),
        })
      })
    }
    setInvio(true)
    const { error } = await supabase.from('gare').insert(records)
    setInvio(false)
    if (error) {
      return setErrore(/tempo_iscrizione|orario|ordine|null value/.test(error.message)
        ? MSG_MIGRAZIONE : 'Non sono riuscito a salvare: ' + error.message)
    }
    setOk(`Gara assegnata a ${records.length} atleta/i. I tempi si inseriscono da "Risultati".`)
    setRighe({})
    caricaGare(atleti)
  }

  // trofei = gruppi per nome + data; gare specifiche = distanza + stile dentro il trofeo
  const trofei = useMemo(() => {
    const m = new Map()
    gare.forEach((g) => { const k = `${g.nome_gara}||${g.data_gara}`; if (!m.has(k)) m.set(k, { k, nome: g.nome_gara, data: g.data_gara }) })
    return [...m.values()]
  }, [gare])
  const delTrofeo = gare.filter((g) => `${g.nome_gara}||${g.data_gara}` === trofeo)
    .sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0))
  const gareDelTrofeo = [...new Set(delTrofeo.map(nomeGara))]
  const risultati = delTrofeo.filter((g) => !garaSel || nomeGara(g) === garaSel)

  async function eliminaGara() {
    if (!risultati.length) return
    if (!window.confirm(`Eliminare ${garaSel || 'tutte le gare'} del trofeo per ${risultati.length} atleta/i?`)) return
    const { error } = await supabase.from('gare').delete().in('id', risultati.map((g) => g.id))
    if (error) return window.alert('Non sono riuscito a eliminare: ' + error.message)
    setGaraSel('')
    caricaGare(atleti)
  }

  return (
    <AppShell titolo="Gare" attiva="funzioni" indietro="/funzioni">
      {!pronto ? <p className="text-center text-gray-400 py-8">Carico…</p>
        : !squadra ? <SenzaSquadra />
        : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[['nuova', '+ Nuova gara'], ['risultati', 'Risultati']].map(([k, n]) => (
                <button key={k} onClick={() => setModo(k)}
                  className={`rounded-xl py-2.5 text-sm font-semibold ${modo === k ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{n}</button>
              ))}
            </div>

            {modo === 'nuova' ? (
              <>
                <div className={CARD}>
                  <label className="block text-xs text-gray-500 mb-1">Nome gara / trofeo</label>
                  <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Trofeo d'Autunno" className={CAMPO + ' mb-3'} />
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <SelettoreData etichetta="Data" valore={data} onChange={setData} />
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Orario</label>
                      <input type="time" value={orario} onChange={(e) => setOrario(e.target.value)} className={CAMPO} />
                    </div>
                  </div>
                  <p className="text-sm font-bold mb-2">Gare del trofeo</p>
                  <Reorder.Group as="div" axis="y" values={programma} onReorder={setProgramma}>
                    <AnimatePresence initial={false}>
                      {programma.map((g, i) => (
                        <RigaGara key={g._id} g={g} i={i} totale={programma.length} cambia={cambiaGara} sposta={spostaGara}
                          togli={(k) => setProgramma(programma.filter((_, n) => n !== k))} />
                      ))}
                    </AnimatePresence>
                  </Reorder.Group>
                  <button onClick={() => setProgramma([...programma, nuovaGara()])}
                    className="w-full text-blue-600 font-bold bg-blue-50 rounded-2xl py-2.5 text-sm active:scale-[0.98] transition">+ Aggiungi gara al trofeo</button>
                </div>

                <div className={CARD}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold">A chi assegni la gara?</p>
                    {atleti.length > 0 && (
                      <button onClick={selezionaTutti} className="text-xs font-bold text-blue-600">
                        {tuttiSelezionati ? 'Deseleziona tutti' : 'Seleziona tutti'}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">Tocca gli atleti. Il tempo di iscrizione è facoltativo; il risultato lo scrivi dopo la gara.</p>
                  {atleti.length === 0 && <p className="text-sm text-gray-400 py-3">Nessun atleta nella squadra.</p>}
                  {atleti.map((a, i) => {
                    const r = riga(a.id)
                    return (
                      <div key={a.id} className={`py-3 ${i ? 'border-t border-gray-100' : ''}`}>
                        <button onClick={() => cambia(a.id, { incluso: !r.incluso })} className="w-full flex items-center justify-between text-left">
                          <span className="font-semibold">{a.nome} {a.cognome}</span>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${r.incluso ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {r.incluso ? '✓ Inclusa' : 'Assegna'}
                          </span>
                        </button>
                        {r.incluso && (
                          <div className="mt-3">
                            <InputTempo etichetta="Tempo di iscrizione" value={r.iscr} vuotoOk onChange={(v) => cambia(a.id, { iscr: v })} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}
                {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{ok}</p>}
                <button onClick={salva} disabled={invio} className="w-full font-bold text-white bg-blue-600 disabled:bg-gray-300 rounded-2xl py-3.5">
                  {invio ? 'Salvo…' : `Assegna gara${nSelezionati ? ` a ${nSelezionati}` : ''}`}
                </button>
              </>
            ) : (
              <>
                <div className={CARD}>
                  <label className="block text-xs text-gray-500 mb-1">Trofeo</label>
                  <select value={trofeo} onChange={(e) => { setTrofeo(e.target.value); setGaraSel('') }} className={CAMPO + ' mb-3'}>
                    <option value="">Scegli il trofeo…</option>
                    {trofei.map((t) => <option key={t.k} value={t.k}>{t.nome} · {dataIt(t.data)}</option>)}
                  </select>
                  {trofeo && (
                    <>
                      <label className="block text-xs text-gray-500 mb-1">Gara</label>
                      <select value={garaSel} onChange={(e) => setGaraSel(e.target.value)} className={CAMPO}>
                        <option value="">Tutte le gare del trofeo</option>
                        {gareDelTrofeo.map((n) => <option key={n}>{n}</option>)}
                      </select>
                    </>
                  )}
                </div>

                {trofei.length === 0 && <p className="text-center text-gray-400 py-8">Nessuna gara assegnata ancora 🏆</p>}
                {trofeo && (
                  <div className={CARD}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold">{garaSel || 'Tutte le gare'}</p>
                      <button onClick={eliminaGara} aria-label="Elimina" className="text-red-500 text-lg">🗑</button>
                    </div>
                    {risultati[0]?.orario && <p className="text-xs text-gray-400 mb-1">Orario {risultati[0].orario.slice(0, 5)}</p>}
                    {risultati.map((g) => (
                      <div key={g.id}>
                        {!garaSel && <p className="text-xs font-bold text-gray-400 mt-2">{nomeGara(g)}</p>}
                        <SchedaRisultato g={g} onSalvato={() => caricaGare(atleti)} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
    </AppShell>
  )
}

