import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

// Il "carrello" della giornata: i lavori aggiunti ma non ancora salvati.
// Resta sul telefono anche se chiudi l'app, così non perdi nulla.
const CarrelloCtx = createContext(null)

// I video scelti non si possono salvare nel telefono come testo: restano in memoria finché l'app è aperta
export const filePerLavoro = new Map()

export function CarrelloProvider({ children }) {
  const { user } = useAuth()
  const chiave = user ? `swimline4:carrello:${user.id}` : null
  const [stato, setStato] = useState({ chiave: null, voci: [] })

  useEffect(() => {
    if (!chiave) {
      setStato({ chiave: null, voci: [] })
      return
    }
    let voci = []
    try {
      voci = JSON.parse(localStorage.getItem(chiave)) || []
    } catch {
      voci = []
    }
    setStato({ chiave, voci })
  }, [chiave])

  useEffect(() => {
    if (!chiave || stato.chiave !== chiave) return
    try {
      localStorage.setItem(chiave, JSON.stringify(stato.voci))
    } catch {
      // memoria piena: si ignora
    }
  }, [chiave, stato])

  const aggiungi = (voce) => setStato((s) => ({ ...s, voci: [...s.voci, voce] }))
  const rimuovi = (id) => {
    filePerLavoro.delete(id)
    setStato((s) => ({ ...s, voci: s.voci.filter((v) => v.id !== id) }))
  }
  const svuota = () => {
    stato.voci.forEach((v) => filePerLavoro.delete(v.id))
    setStato((s) => ({ ...s, voci: [] }))
  }

  return (
    <CarrelloCtx.Provider value={{ voci: stato.voci, aggiungi, rimuovi, svuota }}>
      {children}
    </CarrelloCtx.Provider>
  )
}

export function useCarrello() {
  return useContext(CarrelloCtx)
}
