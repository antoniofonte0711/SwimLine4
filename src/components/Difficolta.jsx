import { useState } from 'react'
import { difficoltaPiano, formattaVoto } from '../lib/difficolta'
import { useRegole } from '../lib/regole'

// Colori delle zone sulla barra (dentro il riquadro blu l'aerobico diventa bianco per staccare)
const COLORE_GRUPPO = { recupero: '#7cc4f5', aerobico: '#0b4fd9', soglia: '#e8711a', lattacido: '#c42b20', velocita: '#c2309f' }

// Difficoltà calcolata dal piano: voto, dieci tacche e la barra di dove va la fatica.
// suBlu: versione per il riquadro blu dell'allenamento del giorno
export default function Difficolta({ righe, suBlu = false }) {
  const [aperto, setAperto] = useState(false)
  const { puo } = useRegole()
  const d = difficoltaPiano(righe)
  if (!d || !puo('difficolta')) return null
  const colore = (g) => (suBlu && g.id === 'aerobico' ? '#ffffff' : COLORE_GRUPPO[g.id])
  const tenue = suBlu ? 'text-blue-100' : 'text-slate-500'
  return (
    <button type="button" onClick={() => setAperto(!aperto)} aria-expanded={aperto}
      className={`w-full text-left rounded-[20px] p-3.5 mb-2 ${suBlu ? 'bg-[rgba(4,26,77,0.32)] text-white' : 'bg-bordo text-abisso'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-[13px] font-semibold ${tenue}`}>Difficoltà</span>
        <span className="font-display text-[22px] font-extrabold">
          {formattaVoto(d.voto)}
          <span className={`font-sans text-[13px] font-semibold tracking-normal ${tenue}`}> /10 · {d.livello.nome}</span>
        </span>
      </div>
      <div className="grid grid-cols-10 gap-1 mt-2.5" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`h-2 rounded overflow-hidden ${suBlu ? 'bg-white/20' : 'bg-slate-200'}`}>
            <span className={`block h-full ${suBlu ? 'bg-white' : 'bg-abisso'}`} style={{ width: `${Math.min(1, Math.max(0, d.voto - i)) * 100}%` }} />
          </span>
        ))}
      </div>
      <div className="flex gap-[3px] h-1.5 mt-3 rounded overflow-hidden" aria-hidden="true">
        {d.gruppi.map((g) => <span key={g.id} style={{ width: `${g.quota * 100}%`, background: colore(g) }} />)}
      </div>
      {aperto ? (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-[13px]">
            {d.gruppi.map((g) => (
              <span key={g.id} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: colore(g) }} />
                {g.nome}<b className="ml-auto">{Math.round(g.quota * 100)}%</b>
              </span>
            ))}
          </div>
          <p className={`text-xs mt-2.5 ${tenue}`}>Calcolata dai metri di ogni lavoro e dalla sua zona (A2 il più leggero, C2 il più pesante).</p>
        </>
      ) : (
        <p className={`text-xs mt-2 ${tenue}`}>Tocca per vedere dove va la fatica</p>
      )}
    </button>
  )
}
