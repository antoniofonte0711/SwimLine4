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
export async function sincronizza(supabase, tabella, userId) {
  const tutti = leggi(chiaveCoda(tabella))
  const miei = tutti.filter((r) => r.atleta_id === userId)
  const altri = tutti.filter((r) => r.atleta_id !== userId)
  if (miei.length === 0) return 0

  const rimasti = []
  let inviati = 0
  for (const record of miei) {
    const { error } = await supabase.from(tabella).insert(record)
    // 23505 = già presente (inviato in un tentativo precedente): va bene
    if (!error || error.code === '23505') inviati++
    else rimasti.push(record)
  }
  scrivi(chiaveCoda(tabella), [...altri, ...rimasti])
  return inviati
}

// Copia dell'ultimo elenco scaricato, per vederlo anche offline
export function salvaCache(tabella, userId, dati) {
  scrivi(chiaveCache(tabella, userId), dati)
}

export function leggiCache(tabella, userId) {
  return leggi(chiaveCache(tabella, userId))
}

export function erroreDiRete(error) {
  return !navigator.onLine || /fetch|network|failed/i.test(error?.message || '')
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