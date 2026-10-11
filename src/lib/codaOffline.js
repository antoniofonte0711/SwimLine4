import { useEffect, useState } from 'react'

// Salva sul telefono i tempi inseriti senza connessione e li invia appena torna la rete.

function leggi(chiave) {
  try {
    return JSON.parse(localStorage.getItem(chiave)) || []
  } catch {
    return []
  }
}

function scrivi(chiave, valore) {
  try {
    localStorage.setItem(chiave, JSON.stringify(valore))
  } catch {
    // memoria piena o non disponibile: si ignora
  }
}

const chiaveCoda = (tabella) => `swimline4:coda:${tabella}`
const chiaveCache = (tabella, userId) => `swimline4:cache:${tabella}:${userId}`

export function leggiCoda(tabella, userId) {
  return leggi(chiaveCoda(tabella)).filter((r) => r.atleta_id === userId)
}

export function aggiungiInCoda(tabella, record) {
  scrivi(chiaveCoda(tabella), [...leggi(chiaveCoda(tabella)), record])
}

export function rimuoviDaCoda(tabella, id) {
  scrivi(chiaveCoda(tabella), leggi(chiaveCoda(tabella)).filter((r) => r.id !== id))
}

// Invia i tempi in attesa. Restituisce quanti ne ha inviati.
// Un invio alla volta per tabella (pagina e menu possono chiederlo insieme); alla fine si tolgono
// solo quelli inviati, rileggendo la coda: un tempo aggiunto nel frattempo non si perde.
const inCorso = new Map()
export function sincronizza(supabase, tabella, userId) {
  const chiave = `${tabella}:${userId}`
  if (!inCorso.has(chiave)) {
    inCorso.set(chiave, invia(supabase, tabella, userId).finally(() => inCorso.delete(chiave)))
  }
  return inCorso.get(chiave)
}

async function invia(supabase, tabella, userId) {
  const miei = leggi(chiaveCoda(tabella)).filter((r) => r.atleta_id === userId)
  if (miei.length === 0) return 0
  const inviati = new Set()
  for (const record of miei) {
    const { error } = await supabase.from(tabella).insert(record)
    // 23505 = già presente (inviato in un tentativo precedente): va bene
    if (!error || error.code === '23505') inviati.add(record.id)
  }
  scrivi(chiaveCoda(tabella), leggi(chiaveCoda(tabella)).filter((r) => !inviati.has(r.id)))
  return inviati.size
}

// Copia dell'ultimo elenco scaricato, per vederlo anche offline
export function salvaCache(tabella, userId, dati) {
  scrivi(chiaveCache(tabella, userId), dati)
}

export function leggiCache(tabella, userId) {
  return leggi(chiaveCache(tabella, userId))
}

// All'uscita dall'account si tolgono le copie offline (telefono condiviso); la coda dei dati
// non ancora inviati resta, così nessuno perde quello che ha scritto senza rete
export function svuotaCache() {
  try {
    const chiavi = []
    for (let i = 0; i < localStorage.length; i++) chiavi.push(localStorage.key(i))
    chiavi.filter((k) => k?.startsWith('swimline4:cache:')).forEach((k) => localStorage.removeItem(k))
  } catch { /* localStorage non disponibile */ }
}

export function erroreDiRete(error) {
  return !navigator.onLine || /fetch|network|failed/i.test(error?.message || '')
}

// In qualsiasi pagina: appena c'è rete parte l'invio dei tempi e delle gare rimasti sul telefono
// (prima partivano solo aprendo Storico o Gare, e il coach poteva non vederli per giorni)
export function useInvioAutomatico(supabase, userId) {
  const online = useOnline()
  useEffect(() => {
    if (!online || !userId) return
    sincronizza(supabase, 'allenamenti', userId)
    sincronizza(supabase, 'gare', userId)
  }, [supabase, online, userId])
}

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const su = () => setOnline(true)
    const giu = () => setOnline(false)
    window.addEventListener('online', su)
    window.addEventListener('offline', giu)
    return () => {
      window.removeEventListener('online', su)
      window.removeEventListener('offline', giu)
    }
  }, [])
  return online
}