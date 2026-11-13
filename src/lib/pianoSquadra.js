import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../context/AuthContext'

import { STILI } from './lavori'
import { difficoltaPiano } from './difficolta'
import { caselleDiRiga, distribuisci, gruppiPerStile, haTratti } from './varianti'

export const TIPI_COACH = ['Riscaldamento', 'Tecnica', 'Gambe', 'Ipossia', 'Sciolto', 'Defaticamento']
// Il coach può anche lasciare che ognuno nuoti il proprio stile (non vale per i lavori inseriti dagli atleti)
export const STILI_COACH = [...STILI, 'Proprio stile']
// "A scelta": il coach lascia decidere all'atleta. L'atleta, scrivendo i tempi, sceglie lo stile che ha fatto
// (uno per tutto il lavoro) e il tempo finisce nella categoria di quello stile. Solo come stile del lavoro intero.
export const A_SCELTA = 'A scelta'
export const STILI_PIANO = [...STILI_COACH, A_SCELTA]
export const aScelta = (r) => r?.stile === A_SCELTA
// Le righe "A scelta" con lo stile scelto dall'atleta (scelte[indice riga]); senza scelta restano "A scelta".
// La scelta è uno stile per tutto il lavoro oppure una lista con lo stile di ogni passaggio ('' = non ancora scelto):
// in quel caso la riga ha uno stile per ripetizione e ogni stile si salva come un lavoro a sé.
// Anche in un lavoro normale l'atleta può dire di aver fatto un altro stile: la lista vale allo stesso modo.
export const conScelte = (righe = [], scelte = {}) => righe.map((r, i) => {
  const s = scelte[i]
  if (!s) return r
  // stili scelti dall'atleta: uno per ogni ripetizione del lavoro (anche nelle serie a giri, dove quelli del coach valgono per giro)
  if (Array.isArray(s)) return { ...r, stili: s.map((x) => x || A_SCELTA), stiliTutti: true }
  return aScelta(r) ? { ...r, stile: s } : r
})
// L'atleta può dire di aver fatto un altro stile (non nelle serie a giri né con le vasche da cronometrare)
export const stileCambiabile = (r) => !!r && !aScelta(r) && !r.serie && !haTratti(r)
// Tempi di un lavoro "A scelta" salvati "per posizione": il tempo del passaggio j sta in passaggi[j]
// (vuoti dove il passaggio è in un altro stile), così con stili diversi nei passaggi si sa dov'era ognuno.
// lunghezza: in un lavoro normale con uno stile cambiato la lista è lunga quanto il lavoro (vuoti in fondo compresi),
// così non si confonde con i tempi salvati per stile (che non superano mai le ripetizioni del loro stile)
export function inPosizione(gruppo, tempi = [], lunghezza = 0) {
  const l = []
  gruppo.reps.forEach((j) => { l[j] = tempi[j] || '' })
  const fuori = Array.from(l, (x) => x || '')
  while (fuori.length && !fuori[fuori.length - 1]) fuori.pop()
  if (!fuori.some(Boolean)) return []
  while (fuori.length < lunghezza) fuori.push('')
  return fuori
}
const posizioniPiene = (e) => (e?.passaggi || []).map((p, j) => (p ? j : -1)).filter((j) => j >= 0)
// I tempi salvati che appartengono a una riga "A scelta" (uno per stile fatto): si prendono quelli di stesso tipo e
// distanza finché i passaggi non si sovrappongono (due righe "A scelta" uguali non si rubano i tempi)
function perPosizione(lista, usati, va, occupate = new Set()) {
  const presi = []
  for (const e of lista) {
    if (usati.has(e.id ?? e) || !va(e)) continue
    const pos = posizioniPiene(e)
    if (pos.some((j) => occupate.has(j))) continue
    presi.push(e)
    usati.add(e.id ?? e)
    pos.forEach((j) => occupate.add(j))
  }
  return presi
}
export const tempiAScelta = (r, lista = [], usati = new Set()) => perPosizione(lista, usati, (e) => tempoDiRigaAScelta(e, r))
// Dai tempi salvati di una riga "A scelta" alla scelta dell'atleta e ai tempi in ordine di passaggio
export function sceltaDaTempi(presi = []) {
  if (!presi.length) return { scelta: undefined, valori: [] }
  const valori = []
  const stili = []
  presi.forEach((e) => (e.passaggi || []).forEach((p, j) => { if (p) { valori[j] = p; stili[j] = e.stile } }))
  const diversi = new Set(presi.map((e) => e.stile)).size > 1
  return { scelta: diversi ? Array.from(stili, (x) => x || '') : presi[0].stile, valori: Array.from(valori, (x) => x || '') }
}
// Un tempo salvato va con una riga "A scelta" se tipo e distanza coincidono, qualunque stile abbia scelto l'atleta
export const tempoDiRigaAScelta = (e, r) =>
  aScelta(r) && STILI.includes(e.stile) && e.tipo_lavoro === r.tipo_lavoro && Number(e.distanza) === Number(r.distanza)
const stessoTipoDistanza = (e, r) => STILI.includes(e.stile) && e.tipo_lavoro === r.tipo_lavoro && Number(e.distanza) === Number(r.distanza)

// I tempi salvati di un atleta abbinati alle righe del piano come le vede lui (proprio stile già risolto).
// Per ogni riga: { esatti: [tempo | null per ogni stile della riga], posizionali: [tempi salvati per passaggio] }.
// Quando l'atleta cambia stile in un lavoro, tutti i tempi di quel lavoro si salvano per passaggio e lunghi quanto il
// lavoro: più lunghi di quanti ne ha il loro stile nel lavoro, così si riconoscono e non si confondono con quelli
// di un altro lavoro uguale dello stesso giorno.
const lunghezza = (e) => (e.passaggi || []).length
export function abbinaTempiAtleta(righe = [], lista = []) {
  const usati = new Set()
  const fuori = righe.map(() => ({ esatti: [], posizionali: [] }))
  const caselle = righe.map((r) => caselleDiRiga(r).length)
  const gruppiDi = righe.map((r) => gruppiPerStile(r))
  const quanti = (i, stile) => gruppiDi[i].find((g) => g.stile === stile)?.reps.length || 0
  // 1) lavori in cui l'atleta ha cambiato stile
  righe.forEach((r, i) => {
    if (!stileCambiabile(r)) return
    fuori[i].posizionali = perPosizione(lista, usati, (e) => stessoTipoDistanza(e, r)
      && lunghezza(e) === caselle[i] && lunghezza(e) > quanti(i, e.stile))
  })
  // 2) tempi nello stile scritto dal coach (salvati per stile)
  ordineAbbinamento(righe).forEach((i) => {
    const r = righe[i]
    if (aScelta(r)) return
    const gruppi = gruppiDi[i]
    const cambiato = fuori[i].posizionali.length > 0
    fuori[i].esatti = gruppi.map((g) => {
      const t = lista.find((e) => !usati.has(e.id) && chiaveRisultato(e) === chiaveRisultato({ ...r, stile: g.stile, distanza: g.distanza })
        // (lungo quanto il lavoro e più del suo stile = salvato per passaggio: non è un tempo per stile)
        && (cambiato ? lunghezza(e) === caselle[i] : gruppi.length === 1 || lunghezza(e) <= g.reps.length || lunghezza(e) !== caselle[i]))
      if (t) usati.add(t.id)
      return t || null
    })
  })
  // 3) lavori "A scelta"
  righe.forEach((r, i) => { if (aScelta(r)) fuori[i].posizionali = tempiAScelta(r, lista, usati) })
  return fuori
}
// Una riga letta dai tempi abbinati: i tempi in ordine di passaggio e, se l'atleta ha fatto stili diversi da quelli
// del coach (o è un "A scelta"), la scelta: uno stile o la lista dello stile di ogni passaggio. scelta undefined = nessuna.
export function letturaRiga(r, { esatti = [], posizionali = [] } = {}) {
  if (aScelta(r)) return sceltaDaTempi(posizionali)
  const valori = distribuisci(gruppiPerStile(r), esatti.map((t) => t?.passaggi || []))
  posizionali.forEach((e) => (e.passaggi || []).forEach((p, j) => { if (p) valori[j] = p }))
  const pieni = Array.from(valori, (x) => x || '')
  if (!posizionali.length) return { scelta: undefined, valori: pieni }
  const stili = caselleDiRiga(r).map((c) => (STILI.includes(c.stile) ? c.stile : ''))
  posizionali.forEach((e) => (e.passaggi || []).forEach((p, j) => { if (p && j < stili.length) stili[j] = e.stile }))
  return { scelta: stili, valori: pieni }
}
export const RIGA_VUOTA = { tipo_lavoro: 'A2', distanza: 100, ripetizioni: 4, stile: 'Stile libero', note: '', minuti: '', ripartenza: '' }

// Ripartenze da mostrare per una riga: se il coach le ha personalizzate, una per ripetizione
// (le caselle vuote usano la ripartenza generale), altrimenti solo quella generale. [] se non ce n'è nessuna.
export function ripartenzeDiRiga(r) {
  const n = Math.max(1, Number(r.ripetizioni) || 1)
  const lista = Array.isArray(r.ripartenze) ? r.ripartenze.slice(0, n) : []
  if (!lista.some(Boolean)) return r.ripartenza ? [r.ripartenza] : []
  return Array.from({ length: n }, (_, k) => lista[k] || r.ripartenza || '–')
}

export { haVarianti, ripetizioniDiRiga, riassuntoVarianti } from './varianti'

// Serie a giri: righe consecutive con lo stesso serie.id si ripetono in sequenza per serie.giri volte
// (es. 3 giri di 400-300-200). Su ogni riga "ripetizioni" è il totale (per giro × giri), così metri
// e risultati restano come per le righe normali; il passaggio k del giro g sta in posizione g × perGiro + k.
export const giriSerie = (r) => (r?.serie ? Math.max(1, Number(r.serie.giri) || 1) : 1)
export const perGiro = (r) => Math.max(1, Math.round((Number(r.ripetizioni) || 1) / giriSerie(r)))

// Collega una riga del piano ai tempi già registrati di un atleta (senza le ripetizioni,
// così i tempi restano agganciati anche se il coach cambia il numero di giri)
export const chiaveRisultato = (r) => [r.tipo_lavoro, Number(r.distanza), r.stile].join('|')

// Il "proprio stile" di ogni atleta (migrazione 41): i lavori "Proprio stile" del coach si salvano in questo stile
export const STILI_PROPRI = ['Dorso', 'Rana', 'Farfalla']
const PS = 'Proprio stile'
// Le righe del piano viste da un atleta: "Proprio stile" diventa il suo stile (se l'ha scelto)
export function conProprioStile(righe = [], stile) {
  if (!stile) return righe
  return righe.map((r) => (r.stile !== PS && !r.stili?.includes(PS) ? r : {
    ...r,
    stile: r.stile === PS ? stile : r.stile,
    ...(r.stili ? { stili: r.stili.map((s) => (s === PS ? stile : s)) } : {}),
  }))
}
// Un tempo salvato va con una riga "Proprio stile" anche se è nella categoria dello stile dell'atleta
const stessoLavoro = (e, r) => chiaveRisultato(e) === chiaveRisultato(r)
  || (r.stile === PS && STILI_PROPRI.includes(e.stile) && chiaveRisultato({ ...e, stile: PS }) === chiaveRisultato(r))
  || tempoDiRigaAScelta(e, r)

// Il coach ha cambiato lo stile di un lavoro? (stile del lavoro o stile di qualche ripetizione)
const stiliDi = (r) => Array.from({ length: perGiro(r) }, (_, j) => r.stili?.[j] || r.stile)
export function stileCambiato(prima, dopo) {
  if (prima.stile !== dopo.stile) return true
  const a = stiliDi(prima)
  const b = stiliDi(dopo)
  return a.slice(0, Math.min(a.length, b.length)).some((s, j) => s !== b[j])
}
// Un tempo salvato va con un gruppo (uno stile) di una riga del piano?
const stessoGruppo = (e, r, g) => e.tipo_lavoro === r.tipo_lavoro && Number(e.distanza) === Number(g.distanza)
  && (e.stile === g.stile || (g.stile === PS && STILI_PROPRI.includes(e.stile)))
// Per ogni atleta, tutti i tempi salvati di ogni riga (uno per stile della riga): { atleta: [[tempi della riga]] }
export function tempiPerRiga(righe = [], registrati = []) {
  const perAtleta = {}
  registrati.forEach((e) => (perAtleta[e.atleta_id] ||= []).push(e))
  return Object.fromEntries(Object.entries(perAtleta).map(([atleta, lista]) => {
    const usati = new Set()
    const fuori = []
    ordineAbbinamento(righe).forEach((i) => {
      const r = righe[i]
      if (aScelta(r)) { fuori[i] = tempiAScelta(r, lista, usati); return }
      fuori[i] = gruppiPerStile(r).map((g) => {
        const t = lista.find((e) => !usati.has(e.id ?? e) && stessoGruppo(e, r, g))
        if (t) usati.add(t.id ?? t)
        return t
      }).filter(Boolean)
    })
    return [atleta, Array.from({ length: righe.length }, (_, i) => fuori[i] || [])]
  }))
}
// Tempi che non valgono più dopo che il coach ha cambiato lo stile di una riga: restano solo se prima e dopo
// il lavoro ha un solo stile e il tempo va ancora bene (es. da "Proprio stile" a Dorso per chi fa dorso),
// oppure se il lavoro diventa "A scelta" (vale qualunque stile) e prima aveva un solo stile
export function tempiDaTogliere(prima, dopo, tempi = []) {
  if (!stileCambiato(prima, dopo)) return []
  // un "A scelta" con stili diversi nei passaggi ha i tempi per posizione: non si possono rimettere in un altro lavoro
  const unoPrima = gruppiPerStile(prima).length === 1 && !(aScelta(prima) && tempi.length > 1)
  if (aScelta(dopo)) return unoPrima ? [] : tempi
  const gruppiDopo = gruppiPerStile(dopo)
  if (!unoPrima || gruppiDopo.length !== 1) return tempi
  return tempi.filter((e) => !stessoGruppo(e, dopo, gruppiDopo[0]))
}

// Ordine in cui abbinare le righe ai tempi: prima quelle con lo stile fissato, poi le "A scelta"
// (così una riga "A scelta" non si prende il tempo di un lavoro normale con stesso tipo e distanza)
export const ordineAbbinamento = (righe = []) =>
  [...righe.keys()].sort((a, b) => Number(aScelta(righe[a])) - Number(aScelta(righe[b])) || a - b)

// Per ogni atleta, i tempi registrati abbinati alle righe del piano in ordine: { atleta: [riga registrata | undefined] }
export function abbinaTempi(righe = [], registrati = []) {
  const perAtleta = {}
  registrati.forEach((e) => (perAtleta[e.atleta_id] ||= []).push(e))
  return Object.fromEntries(Object.entries(perAtleta).map(([atleta, lista]) => {
    const usati = new Set()
    const fuori = []
    ordineAbbinamento(righe).forEach((i) => {
      const trovata = lista.find((e) => !usati.has(e) && stessoLavoro(e, righe[i]))
      if (trovata) usati.add(trovata)
      fuori[i] = trovata
    })
    return [atleta, Array.from({ length: righe.length }, (_, i) => fuori[i])]
  }))
}

// Raggruppa le righe del piano in blocchi: { riga, indice } oppure { serie, righe: [{ riga, indice }] }
export function blocchiPiano(righe = []) {
  const blocchi = []
  righe.forEach((riga, indice) => {
    const ultimo = blocchi[blocchi.length - 1]
    if (riga.serie && ultimo?.serie?.id === riga.serie.id) ultimo.righe.push({ riga, indice })
    else if (riga.serie) blocchi.push({ serie: riga.serie, righe: [{ riga, indice }] })
    else blocchi.push({ riga, indice })
  })
  return blocchi
}

// Minuti totali di un piano (somma del tempo stimato dal coach per ogni riga o serie; quelle senza tempo non contano)
export const minutiPiano = (righe = []) =>
  blocchiPiano(righe).reduce((s, b) => s + (Number(b.serie ? b.serie.minuti : b.riga.minuti) || 0), 0)

// Metri totali di un piano (distanza × ripetizioni di ogni riga)
export const metriPiano = (righe = []) =>
  righe.reduce((s, r) => s + (Number(r.distanza) || 0) * (Number(r.ripetizioni) || 1), 0)

export const addGiorni = (s, n) => {
  const d = new Date(s + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// Lunedì e domenica della settimana di un giorno ('2026-10-08' -> ['2026-10-05', '2026-10-11'])
export function settimanaDi(giorno) {
  const d = new Date(giorno + 'T12:00:00')
  const lun = addGiorni(giorno, -((d.getDay() + 6) % 7))
  return [lun, addGiorni(lun, 6)]
}

// Allenamenti pubblicati della squadra nella settimana del giorno scelto:
// { voti: { data: difficoltà }, metri: totale della settimana, giorni: numero di allenamenti }
// Con atletaId anche fatti (metri dei giorni in cui l'atleta era presente) e presenti (quanti di quei giorni)
const VUOTO = { voti: {}, metri: 0, giorni: 0, fatti: 0, presenti: 0 }
// versione (facoltativa): cambiandola si ricarica (es. dopo che il coach ha pubblicato)
export function useSettimanaSquadra(squadraId, giorno, atletaId, versione) {
  const [dati, setDati] = useState(VUOTO)
  const [lun, dom] = settimanaDi(giorno)
  useEffect(() => {
    let attivo = true
    if (!squadraId) return setDati(VUOTO)
    Promise.all([
      supabase.from('allenamenti_squadra').select('data, righe').eq('squadra_id', squadraId).eq('pubblicato', true)
        .gte('data', lun).lte('data', dom),
      atletaId
        ? supabase.from('presenze').select('data, stato').eq('atleta_id', atletaId).gte('data', lun).lte('data', dom)
        : Promise.resolve({ data: [] }),
      // allenamenti fuori piano accettati dal coach: contano nei km fatti
      atletaId
        ? supabase.from('allenamenti_extra').select('metri').eq('atleta_id', atletaId).eq('stato', 'accettato').gte('data', lun).lte('data', dom)
        : Promise.resolve({ data: [] }),
    ]).then(([{ data }, { data: presenze }, { data: extra }]) => {
      if (!attivo) return
      const presente = new Set((presenze || []).filter((p) => p.stato === 'presente').map((p) => p.data))
      const voti = {}
      let metri = 0, presenti = 0
      let fatti = (extra || []).reduce((s, e) => s + (Number(e.metri) || 0), 0)
      ;(data || []).forEach((a) => {
        const d = difficoltaPiano(a.righe || [])
        if (!d) return
        voti[a.data] = d.voto
        metri += d.metri
        if (presente.has(a.data)) { fatti += d.metri; presenti += 1 }
      })
      setDati({ voti, metri, giorni: Object.keys(voti).length, fatti, presenti })
    })
    return () => { attivo = false }
  }, [squadraId, lun, dom, atletaId, versione])
  return dati
}

// Squadra del coach (o, per l'admin, quella in cui è entrato; altrimenti la sua squadra)
export function useMiaSquadra() {
  const { user, profile, squadraGestita } = useAuth()
  const [squadra, setSquadra] = useState(null)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    let attivo = true
    async function carica() {
      if (squadraGestita) {
        // ricarico il nome dal database: potrebbe essere cambiato dopo l'ingresso
        const { data } = await supabase.from('squadre').select('id, nome, coach_id').eq('id', squadraGestita.id).limit(1)
        if (!attivo) return
        setSquadra(data?.[0] || squadraGestita)
        setPronto(true)
        return
      }
      let { data } = await supabase.from('squadre').select('id, nome, coach_id').eq('coach_id', user.id).limit(1)
      if (!data?.length && profile?.squadra_id) {
        ;({ data } = await supabase.from('squadre').select('id, nome, coach_id').eq('id', profile.squadra_id).limit(1))
      }
      if (!attivo) return
      setSquadra(data?.[0] || null)
      setPronto(true)
    }
    carica()
    return () => { attivo = false }
  }, [user.id, profile?.squadra_id, squadraGestita?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return { squadra, pronto }
}
