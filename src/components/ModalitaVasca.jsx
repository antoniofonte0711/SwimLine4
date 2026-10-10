import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { coloreLavoro } from '../lib/lavori'
import { blocchiPiano, perGiro, ripartenzeDiRiga } from '../lib/pianoSquadra'
import { siglaLavoro } from './PianoCard'
import { usePreferenze } from '../lib/preferenze'

const BREVE = { 'Stile libero': 'SL', 'Proprio stile': 'PS' }
const stile = (s) => BREVE[s] || s
const NOMI = { Riscaldamento: 'Riscaldamento', Tecnica: 'Tecnica', Sciolto: 'Sciolto', Defaticamento: 'Defaticamento', Gambe: 'Gambe', Ipossia: 'Ipossia' }

// Un passo per ogni riga o serie a giri dell'allenamento
function passi(righe) {
  return blocchiPiano(righe).map((b) => {
    if (b.serie) {
      const rr = b.righe.map(({ riga }) => riga)
      return {
        titolo: 'Serie a giri', set: `${b.serie.giri} giri`, det: rr.map((x) => `${perGiro(x) > 1 ? perGiro(x) + '×' : ''}${x.distanza} ${stile(x.stile)}`).join(' + '),
        tipo: rr[0].tipo_lavoro, giri: rr, recupero: b.serie.recupero, nota: [...new Set(rr.map((x) => x.note).filter(Boolean))].join(' · '),
        metri: rr.reduce((s, x) => s + x.distanza * x.ripetizioni, 0),
      }
    }
    const x = b.riga
    return {
      titolo: NOMI[x.tipo_lavoro] || 'Lavoro', set: `${x.ripetizioni > 1 ? x.ripetizioni + '×' : ''}${x.distanza}`, det: x.stile,
      tipo: x.tipo_lavoro, rip: ripartenzeDiRiga(x).join(' · '), nota: x.note, metri: x.distanza * x.ripetizioni,
    }
  })
}

// Allenamento a schermo intero, da guardare a bordo vasca: un lavoro alla volta, testo grande, bottoni grandi
export default function ModalitaVasca({ righe, onChiudi }) {
  const lista = passi(righe)
  const [i, setI] = useState(0)
  const [pref] = usePreferenze()
  // "Fatto" fa vibrare il telefono (se il telefono lo permette e se non è stato spento in Profilo)
  const avanti = () => {
    if (pref.vibrazione) navigator.vibrate?.(40)
    setI(i + 1)
  }
  // Lo schermo resta acceso mentre si nuota (se il telefono lo permette e se non è stato spento in Profilo)
  useEffect(() => {
    let blocco
    if (pref.schermoAcceso) navigator.wakeLock?.request('screen').then((b) => { blocco = b }).catch(() => {})
    document.body.style.overflow = 'hidden'
    return () => { blocco?.release?.(); document.body.style.overflow = '' }
  }, [pref.schermoAcceso])

  const fatti = lista.slice(0, i).reduce((s, p) => s + p.metri, 0)
  const km = (m) => (m / 1000).toFixed(1).replace('.', ',')

  if (i >= lista.length) {
    return (
      <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center text-center p-6 gap-2">
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase">Allenamento finito</p>
        <p className="font-display text-[64px] font-extrabold leading-none">{km(fatti)}<span className="text-2xl"> km</span></p>
        <p className="text-slate-500 max-w-xs">Fatto! Se hai preso i tempi, inseriscili adesso: valgono 5 punti risultati.</p>
        <div className="flex flex-col gap-2 w-full max-w-xs mt-3">
          <Link to="/allenamenti" className="h-14 rounded-[18px] bg-blue-600 text-white font-display font-extrabold text-lg flex items-center justify-center">Registra i tempi</Link>
          <button onClick={onChiudi} className="h-14 rounded-[18px] bg-schiuma text-blue-600 font-display font-extrabold text-lg">Torna a Oggi</button>
        </div>
      </div>
    )
  }

  const p = lista[i]
  const dopo = lista[i + 1]
  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" role="dialog" aria-modal="true" aria-label="Allenamento in vasca">
      <div className="max-w-md w-full mx-auto flex flex-col flex-1 min-h-0">
        <div className="p-4 grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2">
          <button onClick={onChiudi} aria-label="Chiudi" className="w-12 h-12 rounded-2xl bg-bordo flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          <div className="text-center">
            <p className="text-[13px] font-bold text-slate-500">{i + 1} di {lista.length}</p>
            <div className="h-1.5 rounded-full bg-slate-200 mt-1.5 overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{ width: `${(i + 1) / lista.length * 100}%` }} /></div>
          </div>
          <span className="w-12 h-12 rounded-2xl bg-bordo font-display font-extrabold text-sm flex items-center justify-center" aria-label="Chilometri fatti">{km(fatti)}k</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pt-4 flex flex-col">
          <p className="text-[15px] font-extrabold tracking-[0.1em] text-blue-600 uppercase">{p.titolo}</p>
          <p className="font-display text-[clamp(72px,26vw,112px)] font-extrabold leading-[0.9] tracking-[-0.06em] mt-3">{p.set}</p>
          <div className="flex items-center gap-3 mt-3 flex-wrap text-2xl font-bold">
            <span>{p.det}</span>
            <span className={`text-lg font-extrabold rounded-[10px] px-3 py-1 ${coloreLavoro(p.tipo)}`}>{siglaLavoro(p.tipo)}</span>
          </div>
          {p.giri && (
            <div className="mt-5 flex flex-col gap-2">
              {p.giri.map((x, k) => (
                <div key={k} className="flex justify-between text-[19px] font-bold bg-bordo rounded-2xl px-3.5 py-3">
                  <span>{perGiro(x) > 1 ? perGiro(x) + '×' : ''}{x.distanza} {stile(x.stile)}</span><span>{x.ripartenza ? '@ ' + x.ripartenza : ''}</span>
                </div>
              ))}
              {p.recupero && <div className="flex justify-between text-[19px] font-bold bg-bordo rounded-2xl px-3.5 py-3"><span>Recupero tra i giri</span><span>{p.recupero}</span></div>}
            </div>
          )}
          {p.rip && (
            <div className="mt-6 bg-bordo rounded-3xl px-4 py-3.5 flex justify-between items-center">
              <span className="font-bold text-slate-600">Ripartenza</span>
              <b className="font-display text-4xl">{p.rip}</b>
            </div>
          )}
          {p.nota && <p className="mt-4 text-[19px] font-semibold leading-snug text-corsia">{p.nota}</p>}
          <div className="mt-auto py-4 border-t border-slate-200 flex justify-between gap-3 text-slate-500">
            <span>Dopo</span><b className="text-abisso text-right">{dopo ? `${dopo.set} ${dopo.det}` : 'Fine allenamento'}</b>
          </div>
        </div>

        <div className="px-4 pb-5 grid grid-cols-[76px_minmax(0,1fr)] gap-2.5">
          <button onClick={() => setI(Math.max(0, i - 1))} disabled={!i} aria-label="Lavoro precedente"
            className="h-[84px] rounded-[26px] bg-schiuma text-blue-600 flex items-center justify-center disabled:opacity-40">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button onClick={avanti} className="h-[84px] rounded-[26px] bg-blue-600 text-white font-display text-[26px] font-extrabold flex items-center justify-center gap-3">
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            {dopo ? 'Fatto' : 'Finito!'}
          </button>
        </div>
      </div>
    </div>
  )
}
