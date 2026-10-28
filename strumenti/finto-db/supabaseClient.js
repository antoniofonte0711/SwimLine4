// FINTO database in memoria per vedere il layout senza toccare nessun Supabase.
// Dati = copia del backup di produzione dell'8 ottobre. Le scritture restano in memoria.
import dati from 'C:/Users/maipa/Documents/SwimLine4-backup/2026-10-08/dati-produzione.json'

const tabelle = {}
for (const [k, v] of Object.entries(dati)) if (Array.isArray(v)) tabelle[k] = structuredClone(v)
const UTENTI = {
  admin: '66341edd-f376-4474-84e2-f053b48793a5',
  coach: '354b286b-f344-4717-95c4-b698863bd3b2',
  atleta: 'e0c63c5a-989a-4d92-a5d0-11e62e6e1832', // Atleta Uno
  genitore: '4a22335f-d5d6-47a9-9253-f9a9215386d6', // Genitore Uno
}
// Dati inventati per provare genitori, record e gare: Genitore Uno collegato ad Atleta Uno
{
  const A = UTENTI.atleta
  const g = (gg) => { const d = new Date(); d.setDate(d.getDate() + gg); return d.toISOString().slice(0, 10) }
  const t = (s) => `${Math.floor(s / 60)}'${String(Math.floor(s % 60)).padStart(2, '0')}"${String(Math.round((s % 1) * 100)).padStart(2, '0')}`
  tabelle.genitori_figli = [{ id: 'gf1', genitore_id: UTENTI.genitore, atleta_id: A, stato: 'approvato' }]
  tabelle.gare = [65.4, 64.8, 64.1, 63.2].map((s, i) => ({
    id: 'gara' + i, atleta_id: A, nome_gara: 'Trofeo ' + (i + 1), distanza: 100, stile: 'Stile libero', tempo: t(s), data_gara: g(-80 + i * 25), passaggi: [],
  })).concat([{ id: 'gara9', atleta_id: A, nome_gara: "Trofeo d'Autunno", distanza: 100, stile: 'Stile libero', tempo: null, data_gara: g(8), orario: '09:30:00', luogo: 'Piscina Comunale', note: 'Ritrovo 8:45', passaggi: [], ordine: 0 }])
  tabelle.allenamenti = [0, 1, 2].map((i) => ({
    id: 'all' + i, atleta_id: A, tipo_lavoro: 'C1', distanza: 100, ripetizioni: 4, stile: 'Stile libero',
    passaggi: [t(70 - i), t(70.5 - i), t(71 - i), t(71.2 - i)], data_allenamento: g(-12 + i * 4),
  }))
  // società "Test Team" con i suoi gruppi (come vorremmo nel database vero)
  tabelle.societa = [{ id: 'soc1', nome: 'Test Team', capo_id: UTENTI.admin, created_at: g(0) }]
  tabelle.squadre.forEach((s) => { if (s.nome === 'Test Team') s.societa_id = 'soc1' })
  tabelle.squadre.push(
    { id: 'gr-mauri', nome: 'Test team Mauri', coach_id: null, societa_id: 'soc1', created_at: g(0) },
    { id: 'gr-paura', nome: 'Test team Paura', coach_id: null, societa_id: 'soc1', created_at: g(0) },
  )
  // allenamento di oggi della squadra di Atleta Uno (righe del piano vero del 12/10 di Test team Mauri), pubblicato
  const sqA = tabelle.profiles.find((p) => p.id === A)?.squadra_id
  if (sqA) {
    ;(tabelle.allenamenti_squadra ||= []).push({
      id: 'piano-oggi', squadra_id: sqA, coach_id: UTENTI.coach, data: g(0), titolo: null, pubblicato: true, visibilita: 'squadra',
      righe: [
        { tipo_lavoro: 'B1', distanza: 200, ripetizioni: 4, stile: 'Stile libero', note: '', minuti: null, ripartenza: null, ripartenze: null, serie: { id: 's1', giri: 2, recupero: null, minuti: null } },
        { tipo_lavoro: 'B1', distanza: 100, ripetizioni: 2, stile: 'Dorso', note: '', minuti: null, ripartenza: null, ripartenze: null, serie: { id: 's1', giri: 2, recupero: null, minuti: null } },
        { tipo_lavoro: 'C1', distanza: 75, ripetizioni: 4, stile: 'Stile libero', stili: ['', 'Proprio stile', '', 'Proprio stile'], note_rip: ['forte', 'piano', 'forte', 'piano'], note: '', minuti: null, ripartenza: null, ripartenze: null },
        { tipo_lavoro: 'Tecnica', distanza: 50, ripetizioni: 16, stile: 'Misti', note: '', minuti: null, ripartenza: null, ripartenze: null },
        { tipo_lavoro: 'A2', distanza: 400, ripetizioni: 4, stile: 'Stile libero', note: '', minuti: null, ripartenza: '6\'00"', ripartenze: null },
        { tipo_lavoro: 'C3', distanza: 25, ripetizioni: 12, stile: 'Stile libero', note: '', minuti: null, ripartenza: '40"', ripartenze: null },
        // l'atleta sceglie lo stile che ha fatto
        { tipo_lavoro: 'C1', distanza: 100, ripetizioni: 3, stile: 'A scelta', note: '', minuti: null, ripartenza: null, ripartenze: null },
      ],
    })
  }
  // certificato medico di Atleta Uno in scadenza tra 10 giorni (per provare "Da fare" del coach)
  ;(tabelle.atleta_riferimenti ||= []).push({ atleta_id: A, certificato_scadenza: g(10) })
  tabelle.notifiche = [
    { id: 'n1', destinatario_id: A, tipo: 'record', titolo: 'Nuovo primato!', testo: 'Hai nuotato i 100 SL in gara in 1\'03"20, -0"90 rispetto al record precedente.', link: '/gare', letta: false, created_at: new Date().toISOString() },
    { id: 'n2', destinatario_id: UTENTI.genitore, tipo: 'gara_nuova', titolo: 'Nuova gara in calendario', testo: "Trofeo d'Autunno, ore 09:30, Piscina Comunale.", link: '/gare', letta: false, created_at: new Date().toISOString() },
  ]
  // migrazione 43: Atleta Uno con 1240 punti, premi con costo e probabilità, una voce del coach
  if (sqA) {
    tabelle.punti_config = [{ squadra_id: sqA, punti_presenza: 10, punti_risultati: 5, punti_gara: 15, punti_miglioramento: 0, soglia_premio: 1000 }]
    tabelle.punti_movimenti = [{ id: 'pm1', atleta_id: A, squadra_id: sqA, punti: 1240, motivo: 'Presenze di ottobre', riferimento: 'prova', data: g(-1), created_at: new Date().toISOString() }]
    tabelle.premi_catalogo = [
      ['Scegli lo stile del defaticamento', 6, 900], ['Un 50 in meno nel riscaldamento', 6, 950], ['Scegli la tua corsia', 4, 1000],
      ['Tuffi a fine allenamento', 3, 1000], ['Salta un 400', 1, 1000],
    ].map(([nome, peso, costo], i) => ({ id: 'pr' + i, squadra_id: sqA, nome, peso, costo, attivo: true, created_at: g(-5 + i) }))
    tabelle.punti_voci = [{ id: 'v1', squadra_id: sqA, nome: 'Allenamento extra', punti: 20, created_at: g(-2) }]
    tabelle.premi_atleta = []
  }
}

const chi = (() => { try { return localStorage.getItem('mock-utente') || 'admin' } catch { return 'admin' } })()
const utente = { id: UTENTI[chi] || UTENTI.admin, email: 'mock@locale' }

function query(nome) {
  const filtri = []
  let ordine = null, limite = null, modo = 'lista', azione = null, valori = null, conflitto = ['id']
  const q = {
    select() { return q }, eq(c, v) { filtri.push((r) => r[c] === v); return q }, neq(c, v) { filtri.push((r) => r[c] !== v); return q },
    in(c, vs) { filtri.push((r) => vs.includes(r[c])); return q }, gte(c, v) { filtri.push((r) => r[c] >= v); return q },
    lte(c, v) { filtri.push((r) => r[c] <= v); return q }, gt(c, v) { filtri.push((r) => r[c] > v); return q }, lt(c, v) { filtri.push((r) => r[c] < v); return q },
    is(c, v) { filtri.push((r) => (r[c] ?? null) === v); return q }, not() { return q }, or() { return q }, ilike() { return q }, range() { return q },
    order(c, o = {}) { ordine = [c, o.ascending !== false]; return q }, limit(n) { limite = n; return q },
    single() { modo = 'uno'; return q }, maybeSingle() { modo = 'forse'; return q },
    insert(v) { azione = 'ins'; valori = v; return q }, upsert(v, o = {}) { azione = 'ups'; valori = v; conflitto = (o.onConflict || 'id').split(','); return q },
    update(v) { azione = 'upd'; valori = v; return q }, delete() { azione = 'del'; return q },
    then(ok, ko) { return Promise.resolve(esegui()).then(ok, ko) },
  }
  function esegui() {
    // la vista compagni_squadra: atleti della mia squadra
    if (nome === 'compagni_squadra') {
      const io = (tabelle.profiles || []).find((p) => p.id === utente.id)
      // come la vista vera: la categoria sì, la data di nascita no
      tabelle.compagni_squadra = (tabelle.profiles || []).filter((p) => ['atleta', 'admin'].includes(p.role) && p.squadra_id && p.squadra_id === io?.squadra_id)
        .map(({ data_nascita, ...p }) => ({ ...p, categoria: data_nascita ? 'Ragazzi o Juniores' : null }))
    }
    const t = (tabelle[nome] ||= [])
    if (azione === 'ups') {
      ;[].concat(valori).forEach((r) => {
        const c = t.find((x) => conflitto.every((k) => x[k] === r[k]))
        if (c) Object.assign(c, r)
        else t.push({ id: crypto.randomUUID(), ...r })
      })
      return { data: null, error: null }
    }
    if (azione === 'ins') { const lista = [].concat(valori).map((r) => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...r })); t.push(...lista); return { data: lista, error: null } }
    let righe = t.filter((r) => filtri.every((f) => f(r)))
    if (azione === 'upd') { righe.forEach((r) => Object.assign(r, valori)); return { data: righe, error: null } }
    if (azione === 'del') { tabelle[nome] = t.filter((r) => !righe.includes(r)); return { data: null, error: null } }
    if (ordine) righe = [...righe].sort((a, b) => (a[ordine[0]] > b[ordine[0]] ? 1 : -1) * (ordine[1] ? 1 : -1))
    if (limite) righe = righe.slice(0, limite)
    righe = structuredClone(righe) // come il vero Supabase: ogni lettura dà oggetti nuovi
    if (modo !== 'lista') return { data: righe[0] ?? null, error: null }
    return { data: righe, error: null, count: righe.length }
  }
  return q
}

// Funzioni del database usate dal Profilo: imitate in memoria
const RPC = {
  admin_statistiche() { return { nuovi_utenti_7gg: 0, accessi_7gg: 3, coach_in_attesa: 0, allenamenti_in_programma: 0, segnalazioni: 0 } },
  coach_da_approvare() { return [] },
  admin_crea_squadra({ p_nome, p_coach }) {
    const id = crypto.randomUUID()
    tabelle.squadre.push({ id, nome: p_nome.trim(), coach_id: p_coach, created_at: new Date().toISOString() })
    const p = tabelle.profiles.find((x) => x.id === p_coach)
    if (p) Object.assign(p, { squadra_id: id, role: p.role === 'admin' ? 'admin' : 'coach' })
    return id
  },
  aggiorna_mio_profilo({ p_nome, p_cognome, p_tempi_visibili }) {
    const p = (tabelle.profiles || []).find((r) => r.id === utente.id)
    if (p) Object.assign(p, { nome: p_nome.trim(), cognome: p_cognome?.trim() || null }, p_tempi_visibili == null ? {} : { tempi_visibili: p_tempi_visibili })
  },
  // migrazione 30
  mie_richieste() {
    return (tabelle.richieste_squadra || []).filter((r) => r.persona_id === utente.id && r.stato === 'in_attesa')
      .map((r) => ({ ...r, squadra_nome: tabelle.squadre.find((s) => s.id === r.squadra_id)?.nome, coach_nome: 'Coach Prova' }))
  },
  chiedi_di_entrare({ p_nome }) {
    const s = tabelle.squadre.find((x) => x.nome.toLowerCase() === p_nome.trim().toLowerCase())
    if (!s) return null
    ;(tabelle.richieste_squadra ||= []).push({ id: crypto.randomUUID(), squadra_id: s.id, persona_id: utente.id, tipo: 'domanda', stato: 'in_attesa', created_at: new Date().toISOString() })
    return s.nome
  },
  annulla_mia_domanda({ p_richiesta }) { tabelle.richieste_squadra = (tabelle.richieste_squadra || []).filter((r) => r.id !== p_richiesta) },
  domande_squadra() { return [] },
  silenzia_notifiche({ p_ore }) {
    const p = tabelle.profiles.find((r) => r.id === utente.id)
    const fino = p_ore == null ? null : p_ore < 0 ? '2999-12-31T00:00:00Z' : new Date(Date.now() + p_ore * 3600000).toISOString()
    if (p) p.notifiche_silenzio_fino = fino
    return fino
  },
  imposta_sesso({ p_persona, p_sesso }) { const p = tabelle.profiles.find((r) => r.id === p_persona); if (p) p.sesso = p_sesso },
  proponi_allenamento_extra({ p_data, p_metri, p_minuti, p_descrizione }) {
    const io = tabelle.profiles.find((r) => r.id === utente.id)
    const id = crypto.randomUUID()
    ;(tabelle.allenamenti_extra ||= []).push({ id, atleta_id: utente.id, squadra_id: io?.squadra_id, data: p_data, metri: p_metri, minuti: p_minuti, descrizione: p_descrizione, stato: 'in_attesa', created_at: new Date().toISOString() })
    return id
  },
  rispondi_allenamento_extra({ p_id, p_accetta }) {
    const e = (tabelle.allenamenti_extra || []).find((r) => r.id === p_id)
    if (e) e.stato = p_accetta ? 'accettato' : 'rifiutato'
  },
  admin_account_eliminati() { return [] },
  // migrazione 43: premi a scelta (estrazione semplificata: i primi 3 premi attivi a caso)
  proponi_premi() {
    const io = tabelle.profiles.find((r) => r.id === utente.id)
    const gia = (tabelle.premi_proposte ||= []).find((r) => r.atleta_id === utente.id)
    if (gia) return gia.opzioni
    const opzioni = (tabelle.premi_catalogo || []).filter((p) => p.squadra_id === io?.squadra_id && p.attivo)
      .sort(() => Math.random() - 0.5).slice(0, 3).map((p) => ({ id: p.id, nome: p.nome, costo: p.costo || 1000 }))
    tabelle.premi_proposte.push({ atleta_id: utente.id, squadra_id: io?.squadra_id, opzioni })
    return opzioni
  },
  scegli_premio({ p_premio }) {
    const prop = (tabelle.premi_proposte || []).find((r) => r.atleta_id === utente.id)
    const o = prop?.opzioni.find((x) => x.id === p_premio)
    const r = { id: crypto.randomUUID(), atleta_id: utente.id, squadra_id: prop.squadra_id, premio_nome: o.nome, costo: o.costo, usato: false, ottenuto_il: new Date().toISOString() }
    ;(tabelle.premi_atleta ||= []).push(r)
    tabelle.premi_proposte = tabelle.premi_proposte.filter((x) => x !== prop)
    return r
  },
  admin_elimina_squadra({ p_squadra }) { tabelle.squadre = tabelle.squadre.filter((s) => s.id !== p_squadra) },
  // migrazione 41: proprio stile
  imposta_proprio_stile({ p_persona, p_stile }) {
    const p = tabelle.profiles.find((x) => x.id === p_persona)
    if (p) p.proprio_stile = p_stile
    ;(tabelle.allenamenti || []).forEach((a) => { if (a.atleta_id === p_persona && a.stile === 'Proprio stile') a.stile = p_stile })
  },
  // migrazione 40: copia della forma dei dati veri del 25/10 (tutto a zero, poi 1 e 2 persone negli ultimi 5 minuti)
  admin_in_diretta({ p_minuti }) {
    const ora = Math.floor(Date.now() / 60000) * 60000
    const coda = [[UTENTI.coach], [UTENTI.coach], [UTENTI.coach, UTENTI.admin], [UTENTI.coach, UTENTI.admin], [UTENTI.coach, UTENTI.admin]]
    return Array.from({ length: p_minuti }, (_, i) => {
      const persone = coda[i - (p_minuti - coda.length)] || []
      return { minuto: new Date(ora - (p_minuti - 1 - i) * 60000).toISOString(), utenti: persone.length, persone }
    })
  },
  // migrazione 31: società e gruppi
  admin_salva_societa({ p_id, p_nome, p_capo }) {
    const t = (tabelle.societa ||= [])
    if (p_id) { Object.assign(t.find((s) => s.id === p_id), { nome: p_nome.trim(), capo_id: p_capo }); return p_id }
    const id = crypto.randomUUID()
    t.push({ id, nome: p_nome.trim(), capo_id: p_capo, created_at: new Date().toISOString() })
    return id
  },
  admin_elimina_societa({ p_id }) {
    tabelle.squadre.forEach((s) => { if (s.societa_id === p_id) s.societa_id = null })
    tabelle.societa = (tabelle.societa || []).filter((s) => s.id !== p_id)
  },
  admin_gruppo_societa({ p_squadra, p_societa }) { const s = tabelle.squadre.find((x) => x.id === p_squadra); if (s) s.societa_id = p_societa },
  admin_rinomina_squadra({ p_squadra, p_nome }) { const s = tabelle.squadre.find((x) => x.id === p_squadra); if (s) s.nome = p_nome.trim() },
  admin_sposta_persona({ p_persona, p_squadra }) {
    tabelle.squadre.forEach((s) => { if (s.coach_id === p_persona && s.id !== p_squadra) s.coach_id = null })
    const p = tabelle.profiles.find((x) => x.id === p_persona); if (p) p.squadra_id = p_squadra
  },
  admin_cambia_ruolo({ p_persona, p_ruolo }) { const p = tabelle.profiles.find((x) => x.id === p_persona); if (p) p.role = p_ruolo },
  admin_imposta_coach({ p_squadra, p_coach }) {
    if (p_coach) {
      tabelle.squadre.forEach((s) => { if (s.coach_id === p_coach && s.id !== p_squadra) s.coach_id = null })
      const p = tabelle.profiles.find((x) => x.id === p_coach)
      if (p) Object.assign(p, { squadra_id: p_squadra, role: ['admin', 'coach'].includes(p.role) ? p.role : 'coach' })
    }
    const s = tabelle.squadre.find((x) => x.id === p_squadra); if (s) s.coach_id = p_coach
  },
}

export const supabase = {
  from: query,
  rpc: async (nome, args) => ({ data: RPC[nome]?.(args) ?? null, error: null }),
  functions: { invoke: async () => ({ data: { publicKey: null }, error: { message: 'finto-db: niente funzioni' } }) },
  auth: {
    // mock-utente = 'nessuno': nessuno è entrato (per vedere la schermata d'ingresso)
    getSession: async () => ({ data: { session: chi === 'nessuno' ? null : { user: utente } } }),
    getUser: async () => ({ data: { user: utente } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
    updateUser: async () => ({ data: { user: utente }, error: null }),
    // registrazione e codici dell'email: il codice giusto è 123456
    signUp: async () => ({ data: { user: utente, session: null }, error: null }),
    signInWithPassword: async () => ({ data: { session: { user: utente } }, error: null }),
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    resend: async () => ({ data: {}, error: null }),
    verifyOtp: async ({ token }) => (token === '123456'
      ? { data: { session: { user: utente } }, error: null }
      : { data: {}, error: { code: 'otp_expired', message: 'Token has expired or is invalid' } }),
  },
  storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }), upload: async () => ({ error: null }) }) },
  channel: () => ({ on() { return this }, subscribe() { return this } }),
  removeChannel() {},
}
