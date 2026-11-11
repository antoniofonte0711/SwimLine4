import { useState } from 'react'
import { SETTIMANA, riassuntoGiorni, salvaGiorni } from '../lib/giorni'

const SCELTE = [['si', 'Sì'], ['avolte', 'A volte'], ['no', 'No']]
const COLORE = { si: 'bg-blue-600 text-white', avolte: 'bg-sky-100 text-sky-800 ring-1 ring-sky-300', no: 'bg-slate-200 text-slate-600' }

// Calendario, solo coach: in quali giorni si allena la squadra. "A volte" = giorno non fisso (es. alcuni sabati).
export default function GiorniAllenamento({ squadra, giorni }) {
  const [aperto, setAperto] = useState(false)
  const [bozza, setBozza] = useState(giorni)
  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)

  const apri = () => { setBozza(giorni); setErrore(''); setAperto(true) }
  const scegli = (n, v) => setBozza((b) => {
    const x = { ...b }
    if (v === 'no') delete x[n]
    else x[n] = v
    return x
  })
  const nessunFisso = !Object.values(bozza).includes('si')

  async function salva() {
    setInvio(true)
    const e = await salvaGiorni(squadra.id, bozza)
    setInvio(false)
    if (e) return setErrore(e)
    setAperto(false)
  }

  return (
    <div className="bg-white rounded-3xl p-5 mb-3 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">Giorni di allenamento</p>
          <p className="text-xs text-slate-500">{riassuntoGiorni(aperto ? bozza : giorni)}</p>
        </div>
        {!aperto && (
          <button onClick={apri} className="cliccabile shrink-0 min-h-[44px] text-sm font-bold px-4 rounded-full bg-blue-50 text-blue-600">Cambia</button>
        )}
      </div>

      {aperto && (
        <>
          <p className="text-xs text-slate-500 mt-3 mb-1">
            "A volte" è per i giorni non fissi (per esempio il sabato solo in alcune settimane): li trovi nelle presenze, ma se non li segni non contano.
          </p>
          <ul>
            {SETTIMANA.map(([n, , lungo]) => {
              const v = bozza[n] || 'no'
              return (
                <li key={n} className="flex items-center justify-between gap-2 py-2 border-t border-slate-100 first:border-t-0">
                  <span className="font-semibold text-abisso capitalize">{lungo}</span>
                  <div className="grid grid-cols-3 gap-1.5 w-[210px] shrink-0" role="group" aria-label={`Allenamento il ${lungo}`}>
                    {SCELTE.map(([k, t]) => (
                      <button key={k} type="button" onClick={() => scegli(n, k)} aria-pressed={v === k}
                        className={`min-h-[40px] text-xs font-bold rounded-xl transition active:scale-95 ${v === k ? COLORE[k] : 'bg-gray-100 text-slate-500'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
          {nessunFisso && <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mt-2">Scegli almeno un giorno fisso ("Sì").</p>}
          {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-lg px-3 py-2 mt-2">{errore}</p>}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setAperto(false)} className="cliccabile flex-1 min-h-[48px] text-sm font-bold rounded-2xl bg-gray-100 text-slate-600">Annulla</button>
            <button onClick={salva} disabled={invio || nessunFisso}
              className="cliccabile flex-1 min-h-[48px] text-sm font-bold rounded-2xl bg-blue-600 text-white disabled:opacity-50">
              {invio ? 'Salvo…' : 'Salva'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
