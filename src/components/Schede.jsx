// Schede in alto nelle pagine (es. "Aggiungi lavoro" / "Storico"): un tocco, niente menu a tendina
export default function Schede({ valore, opzioni, onCambia, etichetta = 'Sezioni' }) {
  return (
    // con 3 o più schede la larghezza segue il testo (le parole lunghe non escono dal bordo sul telefono)
    <div role="tablist" aria-label={etichetta} className={`grid grid-flow-col gap-1 bg-white rounded-2xl p-1.5 mb-3 shadow-card ${opzioni.length > 2 ? 'auto-cols-auto' : 'auto-cols-fr'}`}>
      {opzioni.map((o) => (
        <button key={o} type="button" role="tab" aria-selected={valore === o} onClick={() => onCambia(o)}
          className={`min-h-[44px] rounded-xl font-bold transition ${opzioni.length > 2 ? 'px-2 text-[14px]' : 'px-3 text-[15px]'} ${valore === o ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}
