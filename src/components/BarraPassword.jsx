import { useEffect, useState } from 'react'
import { LIVELLI, forzaPassword } from '../lib/forzaPassword'
import { volteRubata } from '../lib/passwordRubata'

// Barra sotto il campo password: si riempie mentre scrivi (da "Troppo corta" a "Ottima") e,
// appena ci sono 8 caratteri, controlla da sola se la password è tra quelle rubate in altri siti
// (stesso controllo gratuito del salvataggio: dal telefono escono solo i primi 5 caratteri dell'impronta).
export default function BarraPassword({ password }) {
  const [rubata, setRubata] = useState({ per: '', volte: 0 })
  const livello = forzaPassword(password)

  useEffect(() => {
    if (password.length < 8) return
    let attivo = true
    // si aspetta che smetta di scrivere, così non parte un controllo a ogni lettera
    const t = setTimeout(async () => {
      const volte = await volteRubata(password)
      if (attivo) setRubata({ per: password, volte })
    }, 600)
    return () => { attivo = false; clearTimeout(t) }
  }, [password])

  if (!password) return null
  const eRubata = rubata.per === password && rubata.volte > 0
  const [etichetta, colore] = eRubata ? ['Rubata: scegline un\'altra', 'bg-red-600'] : LIVELLI[livello]
  const pieni = eRubata ? 4 : Math.max(1, livello)

  return (
    <div className="-mt-2 mb-4" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= pieni ? colore : 'bg-slate-200'}`} />
        ))}
      </div>
      <p className={`text-xs font-semibold mt-1 ${eRubata || livello < 2 ? 'text-red-700' : livello === 2 ? 'text-amber-800' : 'text-emerald-700'}`}>
        Sicurezza: {etichetta}
        {eRubata && <span className="block font-normal text-red-700">Questa password compare tra quelle rubate in altri siti: chi la conosce potrebbe entrare nel tuo account.</span>}
        {!eRubata && livello > 0 && livello < 3 && <span className="font-normal text-slate-500"> · più lunga, con maiuscole, numeri o simboli è meglio</span>}
      </p>
    </div>
  )
}
