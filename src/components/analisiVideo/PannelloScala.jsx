import { useState } from 'react'
import { nomeMetodo, riferimentiVasca } from '../../lib/analisiVideo/calibrazione'
import { COLORI_LATO } from '../../lib/analisiVideo/disegnoScala'

const NOMI_AFFIDABILITA = {
  alta: ['Scala affidabile', 'bg-green-600'],
  media: ['Scala da controllare', 'bg-amber-500'],
  bassa: ['Scala poco precisa', 'bg-red-600'],
}
export const statoScala = (ris) => (ris?.ok ? NOMI_AFFIDABILITA[ris.affidabilita] : null)

const metri = (v) => `${v.toFixed(2).replace('.', ',')} m`

// Pannello in basso mentre si imposta la scala
export function PannelloScala({ ris, nPunti, vasca, onVasca, onAnnullaUltimo, onCancellaTutto, onFatto }) {
  const stato = statoScala(ris)
  return (
    <div className="bg-abisso/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] text-white">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="font-display font-extrabold text-lg">Scala in metri</p>
        <div className="flex gap-1" role="group" aria-label="Lunghezza della vasca">
          {[25, 50].map((v) => (
            <button key={v} type="button" onClick={() => onVasca(v)} aria-pressed={vasca === v}
              className={`h-9 px-3 rounded-full text-sm font-bold ${vasca === v ? 'bg-white text-abisso' : 'bg-white/15'}`}>
              {v} m
            </button>
          ))}
        </div>
      </div>
      <p className="text-[13px] text-white/75 mb-2">
        Tocca sul video i punti di cui sai la distanza dalla parete, sempre dalla stessa parete: dove cambia colore la corsia,
        sulle <b>due file di galleggianti</b> ai lati del nuotatore. Minimo 3, meglio 6 o più. Trascina un punto per correggerlo.
      </p>

      <div className="min-h-[44px] mb-2" role="status">
        {!nPunti && <p className="text-sm text-white/60">Nessun punto ancora.</p>}
        {nPunti > 0 && ris && !ris.ok && <p className="text-sm font-semibold text-amber-300">{ris.errore}</p>}
        {stato && (
          <>
            <p className="text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={`${stato[1]} rounded-full px-2.5 py-0.5 font-bold text-[13px]`}>{stato[0]}</span>
              <span className="text-white/80">{nomeMetodo(ris.metodo)}</span>
              {ris.rms !== null && <span className="text-white/60">· errore medio {metri(ris.rms)}</span>}
            </p>
            {ris.avvisi[0] && <p className="text-[13px] text-amber-200 mt-1">{ris.avvisi[0]}</p>}
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onAnnullaUltimo} disabled={!nPunti}
          className="h-11 px-4 rounded-full bg-white/15 text-sm font-bold disabled:opacity-40">Annulla ultimo</button>
        <button type="button" onClick={onCancellaTutto} disabled={!nPunti}
          className="h-11 px-4 rounded-full bg-white/15 text-sm font-bold disabled:opacity-40">Cancella</button>
        <span className="flex-1" />
        <button type="button" onClick={onFatto}
          className="h-11 px-5 rounded-full bg-blue-500 text-sm font-bold">
          {ris?.ok ? 'Fatto' : 'Esci'}
        </button>
      </div>
    </div>
  )
}

const leggiNumero = (t) => {
  const v = Number(String(t).trim().replace(',', '.'))
  return t !== '' && Number.isFinite(v) && v >= 0 && v <= 100 ? v : null
}

// Foglio che chiede la distanza (e il lato) di un punto appena toccato o da modificare
export function FoglioDistanza({ numero, iniziale, vasca, onConferma, onElimina, onAnnulla }) {
  const [lato, setLato] = useState(iniziale.lato ? 1 : 0)
  const [altro, setAltro] = useState(Number.isFinite(iniziale.d) ? String(iniziale.d).replace('.', ',') : '')
  const valore = leggiNumero(altro)
  return (
    <div className="absolute inset-0 z-10 flex items-end justify-center bg-black/40" onClick={onAnnulla}>
      <div className="w-full max-w-md bg-white text-abisso rounded-t-card p-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-flottante"
        onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Distanza del punto ${numero}`}>
        <p className="font-bold mb-2">Punto {numero}: a quanti metri dalla parete?</p>
        <div className="flex gap-2 mb-3" role="group" aria-label="Fila di galleggianti">
          {[0, 1].map((l) => (
            <button key={l} type="button" onClick={() => setLato(l)} aria-pressed={lato === l}
              className={`flex-1 h-11 rounded-campo text-sm font-bold border-2 flex items-center justify-center gap-2 ${lato === l ? 'border-abisso' : 'border-linea text-slate-500'}`}>
              <span className="w-3 h-3 rounded-full" style={{ background: COLORI_LATO[l] }} />
              Fila {l + 1}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {riferimentiVasca(vasca).map((d) => (
            <button key={d} type="button" onClick={() => onConferma({ d, lato })}
              className={`h-11 rounded-campo text-sm font-bold ${iniziale.d === d ? 'bg-blue-600 text-white' : 'bg-schiuma text-blue-700'}`}>
              {d} m
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
          <input type="text" inputMode="decimal" placeholder="Altra distanza (m)" value={altro}
            onChange={(e) => setAltro(e.target.value)} aria-label="Altra distanza in metri"
            className="flex-1 min-w-0 h-11 rounded-campo border border-linea px-3" />
          <button type="button" disabled={valore === null} onClick={() => onConferma({ d: valore, lato })}
            className="h-11 px-4 rounded-campo bg-blue-600 text-white font-bold disabled:opacity-40">OK</button>
        </div>
        <div className="flex gap-2">
          {onElimina && <button type="button" onClick={onElimina} className="h-11 px-4 rounded-campo text-stato-errore font-bold">Elimina punto</button>}
          <span className="flex-1" />
          <button type="button" onClick={onAnnulla} className="h-11 px-4 rounded-campo font-bold text-slate-500">Annulla</button>
        </div>
      </div>
    </div>
  )
}
