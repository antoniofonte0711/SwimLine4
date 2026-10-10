// Pezzi grafici del Pannello di controllo (stile "OAK": gruppi con linguetta, interruttori a pillola, numeri grandi)

export function Gruppo({ titolo, nota, children }) {
  return (
    <fieldset className="relative border border-slate-200 rounded-2xl bg-white px-5 pt-9 pb-4 mt-5 min-w-0">
      <legend className="absolute -top-[18px] left-4 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-extrabold text-[15px] text-abisso">
        {titolo}
      </legend>
      {nota && <p className="text-[13px] text-slate-500 mb-2">{nota}</p>}
      {children}
    </fieldset>
  )
}

export function Interruttori({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-1">{children}</div>
}

export function Interruttore({ etichetta, acceso, onCambia, disabilitato }) {
  return (
    <button type="button" role="switch" aria-checked={acceso} disabled={disabilitato} onClick={() => onCambia(!acceso)}
      className="flex items-center gap-3.5 min-h-[52px] text-left text-[15px] text-abisso disabled:opacity-50">
      <span aria-hidden="true" className={`relative w-12 h-7 shrink-0 rounded-full transition ${acceso ? 'bg-blue-600' : 'bg-slate-300'}`}>
        <span className={`absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full bg-white shadow transition-transform ${acceso ? 'translate-x-5' : ''}`} />
      </span>
      {etichetta}
    </button>
  )
}

const TINTE = {
  blu: 'bg-schiuma text-blue-600', verde: 'bg-emerald-50 text-emerald-700',
  arancio: 'bg-amber-50 text-amber-700', viola: 'bg-violet-50 text-violet-700',
}

export function Numero({ valore, etichetta, tinta = 'blu', icona }) {
  return (
    <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-4">
      {icona && <span className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${TINTE[tinta]}`}>{icona}</span>}
      <div>
        <b className="block font-display text-[28px] leading-none text-abisso">{valore ?? '–'}</b>
        <span className="text-sm text-slate-600">{etichetta}</span>
      </div>
    </div>
  )
}

export function Scheda({ titolo, nota, children, azioni }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5">
      {(titolo || azioni) && (
        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
          {titolo && <h2 className="font-bold text-lg text-abisso">{titolo}</h2>}
          {azioni}
        </div>
      )}
      {nota && <p className="text-sm text-slate-500 mb-3">{nota}</p>}
      {children}
    </section>
  )
}

export function Vuoto({ titolo, children }) {
  return (
    <div className="text-center py-8 px-3 text-slate-500">
      <b className="block font-display text-xl text-abisso mb-1">{titolo}</b>
      {children}
    </div>
  )
}

const RUOLI = {
  admin: ['Admin', 'bg-abisso text-white'], coach: ['Coach', 'bg-schiuma text-blue-600'],
  coach_in_attesa: ['Coach in attesa', 'bg-amber-50 text-amber-800'],
  atleta: ['Atleta', 'bg-emerald-50 text-emerald-700'], genitore: ['Genitore', 'bg-orange-50 text-orange-800'],
}
export function ChipRuolo({ ruolo }) {
  const [nome, classe] = RUOLI[ruolo] || [ruolo, 'bg-slate-100 text-slate-600']
  return <span className={`text-xs font-extrabold rounded-full px-2.5 py-1 whitespace-nowrap ${classe}`}>{nome}</span>
}

export const BOTTONE = 'min-h-[44px] rounded-xl px-4 text-sm font-extrabold bg-schiuma text-blue-600 active:scale-[0.98] transition disabled:opacity-50'
export const BOTTONE_PIENO = 'min-h-[44px] rounded-xl px-4 text-sm font-extrabold bg-blue-600 text-white active:scale-[0.98] transition disabled:opacity-50'

export function Salvato({ stato }) {
  if (!stato) return null
  const errore = stato.startsWith('Errore')
  return (
    <span role="status" className={`inline-flex items-center gap-1.5 text-[13px] font-bold rounded-full px-3 py-1.5 ${errore ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
      {stato}
    </span>
  )
}
