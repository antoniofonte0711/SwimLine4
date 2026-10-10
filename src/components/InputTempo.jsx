import { useState } from 'react'
import { normalizzaTempo, tempoValido, ESEMPIO_TEMPO, ERRORE_TEMPO_BREVE } from '../lib/tempo'

const CAMPO = 'w-full border bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2'

// Campo tempo unico per tutta l'app: completa e formatta da solo quando esci dal campo
export default function InputTempo({ value, onChange, etichetta, ariaLabel, vuotoOk = false, extra = '' }) {
  const [errore, setErrore] = useState(false)

  function alUscire() {
    const n = normalizzaTempo(value)
    if (!n && vuotoOk) return setErrore(false)
    if (n !== value) onChange(n)
    setErrore(!tempoValido(n))
  }

  return (
    <div>
      {etichetta && <label className="block text-xs text-slate-500 mb-1">{etichetta}</label>}
      <input value={value || ''} placeholder={ESEMPIO_TEMPO} aria-label={ariaLabel || etichetta}
        inputMode="decimal" autoComplete="off"
        onChange={(e) => { setErrore(false); onChange(e.target.value) }} onBlur={alUscire}
        className={`${CAMPO} ${extra} ${errore ? 'border-red-400 ring-red-200 focus:ring-red-300' : 'border-gray-200 focus:ring-blue-400'}`} />
      {errore && <p className="text-xs text-red-500 mt-1">{ERRORE_TEMPO_BREVE}</p>}
    </div>
  )
}
