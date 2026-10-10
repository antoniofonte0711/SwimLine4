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
const chi = (() => { try { return localStorage.getItem('mock-utente') || 'admin' } catch { return 'admin' } })()
const utente = { id: UTENTI[chi] || UTENTI.admin, email: 'mock@locale' }

function query(nome) {
  const filtri = []
  let ordine = null, limite = null, modo = 'lista', azione = null, valori = null
  const q = {
    select() { return q }, eq(c, v) { filtri.push((r) => r[c] === v); return q }, neq(c, v) { filtri.push((r) => r[c] !== v); return q },
    in(c, vs) { filtri.push((r) => vs.includes(r[c])); return q }, gte(c, v) { filtri.push((r) => r[c] >= v); return q },
    lte(c, v) { filtri.push((r) => r[c] <= v); return q }, gt(c, v) { filtri.push((r) => r[c] > v); return q }, lt(c, v) { filtri.push((r) => r[c] < v); return q },
    is(c, v) { filtri.push((r) => (r[c] ?? null) === v); return q }, not() { return q }, or() { return q }, ilike() { return q }, range() { return q },
    order(c, o = {}) { ordine = [c, o.ascending !== false]; return q }, limit(n) { limite = n; return q },
    single() { modo = 'uno'; return q }, maybeSingle() { modo = 'forse'; return q },
    insert(v) { azione = 'ins'; valori = v; return q }, upsert(v) { azione = 'ins'; valori = v; return q },
    update(v) { azione = 'upd'; valori = v; return q }, delete() { azione = 'del'; return q },
    then(ok, ko) { return Promise.resolve(esegui()).then(ok, ko) },
  }
  function esegui() {
    const t = (tabelle[nome] ||= [])
    if (azione === 'ins') { const lista = [].concat(valori).map((r) => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...r })); t.push(...lista); return { data: lista, error: null } }
    let righe = t.filter((r) => filtri.every((f) => f(r)))
    if (azione === 'upd') { righe.forEach((r) => Object.assign(r, valori)); return { data: righe, error: null } }
    if (azione === 'del') { tabelle[nome] = t.filter((r) => !righe.includes(r)); return { data: null, error: null } }
    if (ordine) righe = [...righe].sort((a, b) => (a[ordine[0]] > b[ordine[0]] ? 1 : -1) * (ordine[1] ? 1 : -1))
    if (limite) righe = righe.slice(0, limite)
    if (modo !== 'lista') return { data: righe[0] ?? null, error: null }
    return { data: righe, error: null, count: righe.length }
  }
  return q
}

export const supabase = {
  from: query,
  rpc: async () => ({ data: null, error: null }),
  auth: {
    getSession: async () => ({ data: { session: { user: utente } } }),
    getUser: async () => ({ data: { user: utente } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
  },
  storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }), upload: async () => ({ error: null }) }) },
  channel: () => ({ on() { return this }, subscribe() { return this } }),
  removeChannel() {},
}
