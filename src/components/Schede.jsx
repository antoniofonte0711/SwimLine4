// Schede in alto nelle pagine (es. "Aggiungi lavoro" / "Storico"): un tocco, niente menu a tendina
export default function Schede({ valore, opzioni, onCambia, etichetta = 'Sezioni' }) {
  return (
    <div role="tablist" aria-label={etichetta} className="grid grid-flow-col auto-cols-fr gap-1 bg-white rounded-2xl p-1.5 mb-3 shadow-[0_1px_2px_rgba(10,26,47,0.05)]">
      {opzioni.map((o) => (
        <button key={o} type="button" role="tab" aria-selected={valore === o} onClick={() => onCambia(o)}
          className={`min-h-[44px] rounded-xl px-3 text-[15px] font-bold transition ${valore === o ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}
