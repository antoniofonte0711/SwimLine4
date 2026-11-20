import { STILI } from '../../lib/analisiVideo/serie'
import { NOMI_FONTE } from '../../lib/analisiVideo/analisi'
import { statoScala } from './PannelloScala'

const Chip = ({ attivo, onClick, children, label }) => (
  <button type="button" onClick={onClick} aria-pressed={attivo} aria-label={label}
    className={`h-10 px-3 rounded-full text-sm font-bold ${attivo ? 'bg-white text-abisso' : 'bg-white/15'}`}>
    {children}
  </button>
)

const tempo = (s) => {
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1).replace('.', ',')}`
}

// Preparazione: camera, stile, tratto, scala. Poi il coach tocca il nuotatore sul video.
export function PannelloAnalisi({ opzioni, onOpzioni, tInizio, durata, scala, onScala, onAnnulla }) {
  const st = statoScala(scala)
  const tratti = [[null, 'Fino alla fine'], [10, '10 s'], [30, '30 s'], [60, '1 min']]
  return (
    <div className="bg-abisso/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] text-white max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-display font-extrabold text-lg">Analisi velocità</p>
        <button type="button" onClick={onAnnulla} className="h-10 px-4 rounded-full bg-white/15 text-sm font-bold">Annulla</button>
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-1">Camera</p>
      <div className="flex gap-2 mb-3" role="group" aria-label="Camera">
        <Chip attivo={opzioni.camera === 'ferma'} onClick={() => onOpzioni({ camera: 'ferma' })}>Ferma</Chip>
        <Chip attivo={opzioni.camera === 'movimento'} onClick={() => onOpzioni({ camera: 'movimento' })}>In movimento</Chip>
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-1">Stile</p>
      <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Stile">
        {STILI.map(([k, n]) => <Chip key={k} attivo={opzioni.stile === k} onClick={() => onOpzioni({ stile: k })}>{n}</Chip>)}
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-1">Tratto da analizzare (da {tempo(tInizio)})</p>
      <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Durata del tratto">
        {tratti.filter(([d]) => d === null || d < durata - tInizio).map(([d, n]) => (
          <Chip key={n} attivo={opzioni.durata === d} onClick={() => onOpzioni({ durata: d })}>{n}</Chip>
        ))}
      </div>

      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[13px] text-white/80">
          <b>Scala:</b>{' '}
          {st ? <span>{st[0].toLowerCase()} (toccata sul video)</span>
            : opzioni.camera === 'movimento'
              ? 'la cerco dai cambi di colore dei galleggianti (5 m, 15 m…). Se non li trovo, dovrai impostarla.'
              : 'non impostata: con la camera ferma serve (o la cerco dai cambi di colore dei galleggianti).'}
        </p>
        <button type="button" onClick={onScala} className="shrink-0 h-10 px-3 rounded-full bg-white/15 text-sm font-bold">
          {st ? 'Modifica' : 'Imposta'}
        </button>
      </div>

      <p className="rounded-campo bg-blue-500 text-white font-bold text-center px-3 py-3">
        Ora tocca sul video il nuotatore da seguire
      </p>
      <p className="text-[12px] text-white/60 mt-2">
        L'analisi parte da questo fotogramma: se vuoi un altro punto di partenza, annulla, sposta il video e riapri.
      </p>
    </div>
  )
}

const metri = (v, d = 1) => `${v.toFixed(d).replace('.', ',')}`

// Risultati: riepilogo per il controllo, avvisi, punti dubbi da correggere, scarica video
export function PannelloRisultati({ analisi, onCorreggi, onScarica, scaricando, onNuova, onChiudi, esportabile, onSegna, onTogliCronometro }) {
  const { serie, scala } = analisi
  const rie = serie?.riepilogo
  const dubbi = serie?.puntiDubbi || []
  const cron = analisi.cronometro || {}
  const esitoCron = serie?.cronometro
  // con il cronometro valido l'avviso "scala non trovata" non serve più
  const avvisi = (analisi.avvisi || []).filter((a) => !(esitoCron?.ok && a.startsWith('Scala non trovata')))
  return (
    <div className="bg-abisso/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] text-white max-h-[65vh] overflow-y-auto">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-display font-extrabold text-lg">Risultati</p>
        <button type="button" onClick={onChiudi} className="h-10 px-4 rounded-full bg-white/15 text-sm font-bold">Chiudi</button>
      </div>

      {rie && rie.media !== null && (
        <p className="text-sm mb-1">
          Distanza misurata <b>{metri(rie.distanza)} m</b> in <b>{metri(rie.tempo)} s</b> · media <b>{metri(rie.media, 2)} m/s</b>
        </p>
      )}
      {esitoCron?.ok ? (
        <p className="text-[13px] text-white/70 mb-1">
          Scala: dal cronometro (esatta tra i due momenti)
          {Number.isFinite(esitoCron.erroreScala) && scala
            ? ` · la scala ${NOMI_FONTE[scala.fonte]} ${Math.abs(esitoCron.erroreScala) < 0.03 ? 'tornava (scarto sotto il 3%)' : `sbagliava del ${Math.round(Math.abs(esitoCron.erroreScala) * 100)}%`}`
            : ''}
        </p>
      ) : scala && (
        <p className="text-[13px] text-white/70 mb-1">
          Scala: {NOMI_FONTE[scala.fonte]} · affidabilità {scala.qualita}{scala.disaccordo ? ' (le due strategie non vanno d\'accordo: controlla la scala)' : ''}
        </p>
      )}

      {/* Cronometro: la media esatta da due momenti a distanza nota */}
      <div className="bg-white/10 rounded-campo px-3 py-2.5 my-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold">Cronometro</p>
          {(cron.a || cron.b) && (
            <button type="button" onClick={onTogliCronometro} className="text-[13px] underline text-white/70">Togli</button>
          )}
        </div>
        {esitoCron?.ok ? (
          <p className="text-sm mt-0.5">
            {metri(esitoCron.distanza, 0)} m in {metri(esitoCron.tempo, 2)} s · media <b>{metri(esitoCron.media, 2)} m/s</b>
          </p>
        ) : (
          <p className="text-[12px] text-white/70 mt-0.5">
            Per una media esatta segna due momenti in cui il nuotatore passa due distanze note (es. la testa sul cambio di colore dei 5 m e su quello dei 20 m).
          </p>
        )}
        {esitoCron && !esitoCron.ok && <p className="text-[13px] text-amber-200 mt-1">{esitoCron.motivo}</p>}
        <div className="flex flex-wrap gap-2 mt-2">
          {[['a', 'Primo momento'], ['b', 'Secondo momento']].map(([k, nome]) => (
            <button key={k} type="button" onClick={() => onSegna(k)}
              className={`h-9 px-3 rounded-full text-sm font-bold ${cron[k] ? 'bg-white/15' : 'bg-white text-abisso'}`}>
              {cron[k] ? `${nome}: ${metri(cron[k].d, 0)} m a ${tempo(cron[k].t)}` : `Segna ${nome.toLowerCase()}`}
            </button>
          ))}
        </div>
      </div>
      {avvisi?.map((a) => <p key={a} className="text-[13px] text-amber-200 mb-1">{a}</p>)}

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
