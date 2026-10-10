// Pezzi comuni delle impostazioni (Profilo): sezione, riga con interruttore, scelta tra poche opzioni

export function Sezione({ titolo, nota, children }) {
  return (
    <section className="mb-4">
      <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase px-1 mb-2">{titolo}</h2>
      <div className="bg-white rounded-3xl px-4 divide-y divide-slate-100 shadow-[0_1px_2px_rgba(10,26,47,0.05)]">{children}</div>
      {nota && <p className="text-xs text-slate-500 px-2 mt-2">{nota}</p>}
    </section>
  )
}

export function Riga({ etichetta, descrizione, children }) {
  return (
    <div className="py-3.5 flex items-center justify-between gap-3 min-h-[56px]">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-abisso">{etichetta}</p>
        {descrizione && <p className="text-xs text-slate-500 mt-0.5">{descrizione}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function Interruttore({ acceso, onCambia, etichetta, disabilitato }) {
  return (
    <button type="button" role="switch" aria-checked={acceso} aria-label={etichetta} disabled={disabilitato}
      onClick={() => onCambia(!acceso)}
      className={`relative w-[52px] h-8 rounded-full transition disabled:opacity-40 ${acceso ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${acceso ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export function Scelta({ valore, opzioni, onCambia, etichetta }) {
  return (
    <div role="radiogroup" aria-label={etichetta} className="grid grid-flow-col auto-cols-fr gap-1 bg-bordo rounded-2xl p-1">
      {opzioni.map(([v, nome]) => (
        <button key={v} type="button" role="radio" aria-checked={valore === v} onClick={() => onCambia(v)}
          className={`text-[13px] font-bold rounded-xl py-2 px-2 transition ${valore === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
          {nome}
        </button>
      ))}
    </div>
  )
}

export const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'
