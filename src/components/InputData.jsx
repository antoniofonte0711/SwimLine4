import { useState } from 'react'
import { dataDaScritta, formattaDataScritta, scrittaDaData } from '../lib/dataScritta'

// Data scritta a mano (GG/MM/AAAA), senza calendario: si scrivono solo i numeri, le barre arrivano da sole.
// valore e onChange usano il formato del database ('AAAA-MM-GG'; '' finché la data non è completa e vera).
export default function InputData({ id, valore, onChange, className = '', required = false, autoComplete = 'bday' }) {
  const [testo, setTesto] = useState(() => scrittaDaData(valore))

  function cambia(e) {
    const nuovo = formattaDataScritta(e.target.value)
    setTesto(nuovo)
    onChange(dataDaScritta(nuovo) || '', nuovo)
  }

  return (
    <input id={id} type="text" inputMode="numeric" autoComplete={autoComplete} placeholder="GG/MM/AAAA" maxLength={10}
      value={testo} onChange={cambia} required={required} className={className}
      aria-describedby={id ? `${id}-aiuto` : undefined} />
  )
}
