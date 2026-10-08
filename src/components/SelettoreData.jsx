import { useState } from 'react'
import { createPortal } from 'react-dom'
import { dataLocale, formattaGiorno } from '../lib/lavori'

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const INTEST = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

// Calendario a schermo intero (foglio dal basso): mese navigabile, oggi evidenziato, qualsiasi data
export function CalendarioFoglio({ valore, onScegli, onChiudi }) {
  const base = new Date((valore || dataLocale()) + 'T12:00:00')
  const [anno, setAnno] = useState(base.getFullYear())
  const [mese, setMese] = useState(base.getMonth())
  const oggi = dataLocale()

  const vaiMese = (n) => {
    const d = new Date(anno, mese + n, 1)
    setAnno(d.getFullYear())
    setMese(d.getMonth())
  }
  const vuote = (new Date(anno, mese, 1).getDay() + 6) % 7 // settimana che parte da lunedì
  const giorniMese = new Date(anno, mese + 1, 0).getDate()
  const celle = [...Array(vuote).fill(null), ...Array.from({ length: giorniMese }, (_, i) => i + 1)]
  const iso = (g) => dataLocale(new Date(anno, mese, g, 12))

  // Portale su <body>: il calendario resta sempre al centro dello schermo,
  // anche se la pagina sotto ha margini o spostamenti laterali
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={onChiudi}>
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => vaiMese(-1)} aria-label="Mese precedente" className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 text-xl font-bold">‹</button>
          <p className="font-bold">{MESI[mese]} {anno}</p>
          <button onClick={() => vaiMese(1)} aria-label="Mese successivo" className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 text-xl font-bold">›</button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
          {INTEST.map((l, i) => <span key={i}>{l}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {celle.map((g, i) => {
            if (!g) return <span key={i} />
            const d = iso(g)
            const scelto = d === valore
            return (
              <button key={i} onClick={() => { onScegli(d); onChiudi() }}
                className={`h-10 rounded-full text-sm font-medium ${
                  scelto ? 'bg-blue-600 text-white' : d === oggi ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-700'
                }`}>{g}</button>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={() => { onScegli(oggi); onChiudi() }} className="font-bold text-blue-600 bg-blue-50 rounded-2xl py-3">Oggi</button>
          <button onClick={onChiudi} className="font-bold text-gray-600 bg-gray-100 rounded-2xl py-3">Chiudi</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Sostituisce il vecchio campo data: un pulsante con la data scelta che apre il calendario
export default function SelettoreData({ valore, onChange, etichetta = 'Data' }) {
  const [aperto, setAperto] = useState(false)
  return (
    <>
      <label className="block text-xs text-gray-500 mb-1">{etichetta}</label>
      <button type="button" onClick={() => setAperto(true)}
        className="w-full flex items-center justify-between border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-left">
        <span className="capitalize">{formattaGiorno(valore)}</span>
        <span aria-hidden>📅</span>
      </button>
      {aperto && <CalendarioFoglio valore={valore} onScegli={onChange} onChiudi={() => setAperto(false)} />}
    </>
  )
}
