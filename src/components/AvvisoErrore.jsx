import { useEffect, useState } from 'react'
import { ascoltaErrori } from '../lib/erroriRete'

const TESTI = {
  rete: 'Sei offline o la connessione è lenta: alcuni dati potrebbero mancare.',
  server: 'Non riesco a caricare alcuni dati.',
}

// Fascia in alto quando una lettura dal database non riesce
export default function AvvisoErrore() {
  const [tipo, setTipo] = useState(null)

  useEffect(() => {
    const via = ascoltaErrori(setTipo)
    // Tornata la rete l'avviso di rete non serve più
    const online = () => setTipo((t) => (t === 'rete' ? null : t))
    window.addEventListener('online', online)
    return () => { via(); window.removeEventListener('online', online) }
  }, [])

  if (!tipo) return null
  // Offline l'app funziona lo stesso (tempi in coda): avviso giallo, non rosso
  const colore = tipo === 'rete' ? 'bg-amber-400 text-black' : 'bg-red-600 text-white'
  return (
    <div role="alert"
      className={`fixed top-0 inset-x-0 z-[60] ${colore} text-sm px-4 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)] flex items-center justify-between gap-3 shadow-lg`}>
      <span>{TESTI[tipo]}</span>
      <span className="flex items-center gap-2 shrink-0">
        <button type="button" onClick={() => window.location.reload()}
          className="font-bold bg-white text-black rounded-full px-3 py-1">Riprova</button>
        <button type="button" onClick={() => setTipo(null)} aria-label="Chiudi avviso"
          className="text-xl leading-none px-1">×</button>
      </span>
    </div>
  )
}
