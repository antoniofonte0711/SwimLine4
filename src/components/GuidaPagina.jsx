import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { guidaPagina } from '../lib/guida'

// Il "?" in alto: la guida della pagina in cui sei, per il tuo ruolo, in un foglio sopra la pagina
export default function GuidaPagina({ onChiudi }) {
  const { pathname } = useLocation()
  const { ruolo } = useAuth()
  const schede = guidaPagina(pathname, ruolo)
  const chiudi = useRef(null)

  useEffect(() => {
    chiudi.current?.focus()
    const tasto = (e) => { if (e.key === 'Escape') onChiudi() }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  }, [onChiudi])

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40" onClick={onChiudi}>
      <div role="dialog" aria-modal="true" aria-labelledby="titolo-guida"
        className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Come si usa</p>
            <h2 id="titolo-guida" className="font-display text-2xl font-extrabold text-abisso">{schede[0].titolo}</h2>
          </div>
          <button ref={chiudi} type="button" onClick={onChiudi} aria-label="Chiudi la guida"
            className="w-11 h-11 shrink-0 -mr-2 rounded-full text-slate-500 hover:bg-bordo flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        {schede.map((s, i) => (
          <section key={s.id} className={i ? 'mt-5' : ''}>
            {i > 0 && <h3 className="font-display text-lg font-extrabold text-abisso mb-1">{s.titolo}</h3>}
            {s.intro && <p className="text-[15px] text-slate-600 mb-2">{s.intro}</p>}
            <dl>
              {s.passi.map(([tasto, cosa]) => (
                <div key={tasto} className="py-2.5 border-t border-gray-100 first:border-t-0">
                  <dt className="font-bold text-abisso">{tasto}</dt>
                  <dd className="text-[15px] text-slate-600 mt-0.5">{cosa}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <Link to="/guida" onClick={onChiudi}
          className="mt-4 flex items-center justify-center min-h-[48px] font-bold text-blue-600 bg-schiuma rounded-2xl">
          Apri la guida completa
        </Link>
      </div>
    </div>
  )
}
