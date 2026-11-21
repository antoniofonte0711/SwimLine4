import { NOMI_FONTE } from '../../lib/analisiVideo/analisi'

const tempo = (s) => {
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1).replace('.', ',')}`
}
const num = (v, d = 1) => `${v.toFixed(d).replace('.', ',')}`

// Risultati: tratto della vasca capito dal video, media, da dove viene la distanza, punti dubbi, scarica video
export function PannelloRisultati({ analisi, onCorreggi, onScarica, scaricando, onNuova, onChiudi, esportabile, onRivedi }) {
  const { serie, scala, tratto } = analisi
  const rie = serie?.riepilogo
  const dubbi = serie?.puntiDubbi || []
  const avvisi = analisi.avvisi || []
  return (
    <div className="bg-abisso/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] text-white max-h-[65vh] overflow-y-auto">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-display font-extrabold text-lg">Risultati</p>
        <button type="button" onClick={onChiudi} className="h-10 px-4 rounded-full bg-white/15 text-sm font-bold">Chiudi</button>
      </div>

      {rie && rie.media !== null && (
        <div className="bg-white/10 rounded-campo px-3 py-2.5 mb-2">
          {tratto && (
            <p className="text-sm">Dal metro <b>{num(tratto.da)}</b> al metro <b>{num(tratto.a)}</b> della vasca</p>
          )}
          <p className="text-sm">
            <b>{num(rie.distanza)} m</b> in <b>{num(rie.tempo)} s</b> · velocità media <b className="text-base">{num(rie.media, 2)} m/s</b>
          </p>
        </div>
      )}
      {scala && <p className="text-[13px] text-white/70 mb-1">Distanze: {NOMI_FONTE[scala.fonte]}</p>}
      {avvisi.map((a) => <p key={a} className="text-[13px] text-amber-200 mb-1">{a}</p>)}

      <p className="text-xs font-bold uppercase tracking-wider text-white/60 mt-2 mb-1">
        Punti dubbi {dubbi.length ? `(${dubbi.length})` : ''}
      </p>
      {!dubbi.length && <p className="text-sm text-white/70 mb-2">Nessuno: il nuotatore è stato seguito con sicurezza per tutto il tratto.</p>}
      <div className="flex flex-col gap-1.5 mb-3">
        {dubbi.map((d) => (
          <div key={d.da} className="flex items-center gap-2 bg-white/10 rounded-campo px-3 py-2">
            <span className="flex-1 text-sm"><b>{tempo(d.da)}–{tempo(d.a)}</b> · {d.motivo}</span>
            <button type="button" onClick={() => onCorreggi(d)} className="h-9 px-3 rounded-full bg-white text-abisso text-sm font-bold">Correggi</button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onRivedi} className="h-11 px-4 rounded-full bg-white text-abisso text-sm font-bold">Rivedi il video</button>
        {esportabile && (
          <button type="button" onClick={onScarica} disabled={scaricando !== null}
            className="h-11 px-4 rounded-full bg-blue-500 text-sm font-bold disabled:opacity-60">
            {scaricando !== null ? `Creo il video… ${Math.round(scaricando * 100)}%` : 'Scarica video con i dati'}
          </button>
        )}
        <button type="button" onClick={onNuova} className="h-11 px-4 rounded-full bg-white/15 text-sm font-bold">Nuova analisi</button>
      </div>
    </div>
  )
}
