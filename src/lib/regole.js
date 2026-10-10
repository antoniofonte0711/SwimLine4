import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../context/AuthContext'

// Interruttori del Pannello di controllo (admin). Valori salvati nel database:
// impostazioni_app (per tutta l'app) e impostazioni_squadra (per ogni squadra).
// Chi manca nel database vale il suo "base".

export const FUNZIONI_APP = [
  ['push', 'Notifiche sul telefono', true],
  ['orgoglio', 'Vista Orgoglio genitori', true],
  ['punti', 'Punti e premi', true],
  ['difficolta', 'Difficoltà automatica', true],
  ['scuro', 'Tema scuro', true],
  ['vasca', 'Modalità In vasca', true],
  ['video', 'Video (in arrivo)', false],
  ['archivio', 'Archivio gare (in arrivo)', false],
]

export const NOTIFICHE_APP = [
  ['allenamento', 'Nuovo allenamento', true],
  ['record', 'Nuovo record personale', true],
  ['gare', 'Gara nuova, cambiata o cancellata', true],
  ['genitori', 'Richieste dei genitori', true],
  ['incoraggiamenti', 'Cuori e Bravo', true],
]

export const PERMESSI_SQUADRA = [
  ['Il coach può', 'Cosa può fare il coach di questa squadra.', [
    ['c_pubblica', 'Pubblicare allenamenti', true], ['c_presenze', 'Segnare le presenze', true],
    ['c_gare', 'Assegnare le gare', true], ['c_persone', 'Aggiungere e togliere persone', true],
    ['c_punti', 'Gestire punti e premi', true]]],
  ['L’atleta può', 'Cosa vede e fa un atleta della squadra.', [
    ['a_tempi', 'Registrare i propri tempi', true], ['a_gare', 'Inserire le proprie gare', true],
    ['a_compagni', 'Vedere le gare dei compagni', true], ['a_record', 'Vedere i record della squadra', true],
    ['a_punti', 'Accumulare punti e premi', true], ['a_vasca', 'Usare la modalità In vasca', true]]],
  ['Il genitore può', 'Solo sui figli che lo hanno approvato.', [
    ['g_orgoglio', 'Vedere i progressi del figlio', true], ['g_allenamento', 'Vedere l’allenamento del giorno', true],
    ['g_avvisi', 'Ricevere avvisi di record e gare', true], ['g_cuori', 'Mandare cuori e Bravo', true]]],
  ['Permessi speciali', 'Blocchi per tutta la squadra.', [
    ['s_iscrizioni', 'Blocca nuove iscrizioni', false], ['s_genitori', 'Blocca nuovi collegamenti genitori', false],
    ['s_sola', 'Sola lettura (stagione chiusa)', false]]],
]

const base = Object.fromEntries([
  ...FUNZIONI_APP, ...NOTIFICHE_APP.map(([k, n, v]) => ['n_' + k, n, v]),
  ...PERMESSI_SQUADRA.flatMap(([, , voci]) => voci),
].map(([k, , v]) => [k, v]))

// Con la stagione chiusa nessuno inserisce o cambia dati
const SCRITTURA = ['c_pubblica', 'c_presenze', 'c_gare', 'c_persone', 'c_punti', 'a_tempi', 'a_gare']

// valori: { funzioni: {...}, notifiche: {...}, squadra: {...} } come arrivano dal database
export function creaPuo(valori = {}) {
  const v = (k) => {
    if (k.startsWith('n_')) return valori.notifiche?.[k.slice(2)] ?? base[k]
    if (/^[cags]_/.test(k)) return valori.squadra?.[k] ?? base[k]
    return valori.funzioni?.[k] ?? base[k]
  }
  return (k) => {
    if (SCRITTURA.includes(k) && v('s_sola')) return false
    if (['a_punti', 'c_punti'].includes(k) && !v('punti')) return false
    if (k === 'a_vasca' && !v('vasca')) return false
    if (k === 'g_orgoglio' && !v('orgoglio')) return false
    return v(k) !== false
  }
}

// Cache condivisa: si legge una volta, si ricarica dopo un salvataggio dal Pannello
let cache = { chiave: null, promessa: null }
const ascoltatori = new Set()
export function ricaricaRegole() {
  cache = { chiave: null, promessa: null }
  ascoltatori.forEach((f) => f())
}

async function leggi(squadraId) {
  const [{ data: app }, { data: sq }] = await Promise.all([
    supabase.from('impostazioni_app').select('chiave, valore'),
    squadraId ? supabase.from('impostazioni_squadra').select('permessi').eq('squadra_id', squadraId).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const m = Object.fromEntries((app || []).map((r) => [r.chiave, r.valore]))
  return { funzioni: m.funzioni || {}, notifiche: m.notifiche || {}, squadra: sq?.permessi || {} }
}

// Regole per chi sta usando l'app (squadra sua, o quella in cui l'admin è entrato).
// L'admin vero (non in "vedi come") può sempre tutto, tranne le funzioni spente per l'app intera.
export function useRegole() {
  const { profile, squadraGestita, adminReale, staVedendoCome } = useAuth()
  const squadraId = squadraGestita?.id || profile?.squadra_id || null
  const [valori, setValori] = useState(null)
  const [giro, setGiro] = useState(0)

  useEffect(() => {
    const f = () => setGiro((g) => g + 1)
    ascoltatori.add(f)
    return () => ascoltatori.delete(f)
  }, [])

  useEffect(() => {
    let attivo = true
    if (cache.chiave !== squadraId || !cache.promessa) cache = { chiave: squadraId, promessa: leggi(squadraId).catch(() => ({})) }
    cache.promessa.then((x) => { if (attivo) setValori(x) })
    return () => { attivo = false }
  }, [squadraId, giro])

  const puoBase = creaPuo(valori || {})
  // l'admin ignora i permessi di squadra, ma non le funzioni spente per tutta l'app
  const puoApp = creaPuo({ funzioni: valori?.funzioni, notifiche: valori?.notifiche })
  const tutto = adminReale && !staVedendoCome && !squadraGestita
  return {
    pronto: valori !== null,
    puo: (k) => (tutto ? puoApp(k) : puoBase(k)),
  }
}

// Sezioni del menu Funzioni legate a un interruttore
export function percorsoAttivo(percorso, ruolo, puo) {
  const per = {
    '/allenamenti': ruolo === 'atleta' ? 'a_tempi' : null,
    '/record': ruolo === 'atleta' ? 'a_record' : null,
    '/punti': ruolo === 'coach' ? 'c_punti' : 'a_punti',
    '/presenze': 'c_presenze',
    '/impostazioni': 'c_persone',
    '/video': 'video',
    '/archivio': 'archivio',
  }[percorso]
  return !per || puo(per)
}
