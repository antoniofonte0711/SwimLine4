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
  tabelle.notifiche = [
    { id: 'n1', destinatario_id: A, tipo: 'record', titolo: 'Nuovo primato!', testo: 'Hai nuotato i 100 SL in gara in 1\'03"20, -0"90 rispetto al record precedente.', link: '/gare', letta: false, created_at: new Date().toISOString() },
    { id: 'n2', destinatario_id: UTENTI.genitore, tipo: 'gara_nuova', titolo: 'Nuova gara in calendario', testo: "Trofeo d'Autunno, ore 09:30, Piscina Comunale.", link: '/gare', letta: false, created_at: new Date().toISOString() },
  ]
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
      tabelle.compagni_squadra = (tabelle.profiles || []).filter((p) => ['atleta', 'admin'].includes(p.role) && p.squadra_id && p.squadra_id === io?.squadra_id)
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
  },
  storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }), upload: async () => ({ error: null }) }) },
  channel: () => ({ on() { return this }, subscribe() { return this } }),
  removeChannel() {},
}
