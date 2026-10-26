import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { livelloDi, usePunti } from '../lib/punti'
import Icona from './Icona'

// La linea dei punti dell'atleta: livello, barra verso il prossimo premio, scelta tra 3 premi
export default function CardPunti({ dettaglio = true }) {
  const { user, profile } = useAuth()
  const { pronto, tot, saldo, proposte, config, errore, carica } = usePunti(user, profile)
  // finestra: { stato: 'carico' | 'scegli' | 'ok' | 'errore', opzioni, testo, costo }
  const [finestra, setFinestra] = useState(null)

  if (!pronto) return null
  if (!profile?.squadra_id) {
    return <p className="text-xs text-slate-500 bg-white rounded-3xl p-4 mb-3 text-center shadow-card">Entra in una squadra per accumulare punti e vincere premi.</p>
  }
  if (errore) return null

  const soglia = config.soglia_premio
  const livello = livelloDi(tot)
  const dentro = Math.min(saldo, soglia)
  const perc = Math.round((dentro / soglia) * 100)
  const puoiScegliere = saldo >= soglia || !!proposte

  async function apri() {
    if (proposte) return setFinestra({ stato: 'scegli', opzioni: proposte })
    setFinestra({ stato: 'carico' })
    const { data, error } = await supabase.rpc('proponi_premi')
    if (error) return setFinestra({ stato: 'errore', testo: error.message })
    setFinestra({ stato: 'scegli', opzioni: data })
    carica()
  }

  async function scegli(o) {
    setFinestra((f) => ({ ...f, stato: 'carico' }))
    const { error } = await supabase.rpc('scegli_premio', { p_premio: o.id })
    if (error) return setFinestra({ stato: 'errore', testo: error.message })
    setFinestra({ stato: 'ok', testo: o.nome, costo: o.costo })
    carica()
  }

  const chiudi = () => finestra?.stato !== 'carico' && setFinestra(null)

  return (
    <>
      <div className="bg-white rounded-3xl p-5 mb-3 shadow-card">
        <div className="flex items-center justify-between">
          <p className="font-bold text-abisso flex items-center gap-2">
            <Icona nome="stella" className="w-5 h-5 text-blue-600" />
            Livello {livello.nome}
          </p>
          {dettaglio && <Link to="/punti" className="inline-flex items-center min-h-[44px] -my-2 -mr-3 px-3 rounded-2xl text-xs font-semibold text-blue-600 transition active:scale-[0.97] active:bg-schiuma [@media(hover:hover)]:hover:bg-schiuma">Movimenti e premi ›</Link>}
        </div>
        <p className="font-display text-3xl font-extrabold mt-1">{dentro}<span className="text-slate-500">/{soglia}</span> <span className="font-sans text-sm font-semibold text-slate-500 tracking-normal">punti al prossimo premio</span></p>
        <div className="h-3 rounded-full bg-schiuma overflow-hidden mt-3">
          <motion.div className="h-full rounded-full bg-blue-600" initial={{ width: 0 }} animate={{ width: `${perc}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {tot} punti totali · {puoiScegliere ? `hai ${saldo} punti da spendere` : `ti mancano ${soglia - dentro} punti per scegliere un premio`}
        </p>
        {puoiScegliere && (
          <motion.button onClick={apri} whileTap={{ scale: 0.96 }} animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}
            className="w-full mt-4 min-h-[48px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl flex items-center justify-center gap-2">
            <Icona nome="regalo" className="w-5 h-5" />
            Scegli il tuo premio
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {finestra && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-5 bg-black/50" onClick={chiudi}>
            <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              role="dialog" aria-modal="true" aria-label="Scegli il tuo premio"
              className="w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {finestra.stato === 'carico' && (
                <motion.span animate={{ rotate: [0, -12, 12, -12, 12, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-20 h-20 mx-auto rounded-3xl bg-schiuma text-blue-600 flex items-center justify-center">
                  <Icona nome="regalo" className="w-11 h-11" />
                </motion.span>
              )}
              {finestra.stato === 'scegli' && (
                <>
                  <p className="font-display text-2xl font-extrabold">Scegli il tuo premio</p>
                  <p className="text-sm text-slate-500 mt-1 mb-4">Hai {saldo} punti. Ne prendi uno: i punti che avanzano restano tuoi.</p>
                  <ul className="flex flex-col gap-2.5">
                    {finestra.opzioni.map((o, i) => (
                      <motion.li key={o.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 * i }}>
                        <button type="button" onClick={() => scegli(o)} disabled={o.costo > saldo}
                          className="w-full flex items-center gap-3 text-left rounded-2xl border-2 border-slate-200 p-3.5 transition active:scale-[0.98] hover:border-blue-500 disabled:opacity-40">
                          <span className="w-11 h-11 shrink-0 rounded-2xl bg-schiuma text-blue-600 flex items-center justify-center"><Icona nome="regalo" className="w-6 h-6" /></span>
                          <span className="flex-1 min-w-0 font-bold text-abisso">{o.nome}</span>
                          <span className="shrink-0 text-right">
                            <b className="block font-display text-lg text-amber-600 leading-none">{o.costo}</b>
                            <span className="text-[11px] text-slate-500">punti</span>
                          </span>
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                  <button onClick={() => setFinestra(null)} className="mt-4 min-h-[44px] w-full font-bold text-slate-600 bg-slate-100 rounded-2xl">Ci penso dopo</button>
                </>
              )}
              {finestra.stato === 'ok' && (
                <>
                  <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ duration: 0.6 }}
                    className="w-20 h-20 mx-auto mb-3 rounded-3xl bg-blue-600 text-white flex items-center justify-center">
                    <Icona nome="regalo" className="w-11 h-11" />
                  </motion.span>
                  <p className="text-sm text-slate-500">Hai scelto</p>
                  <p className="text-xl font-extrabold text-blue-600 mt-1">{finestra.testo}</p>
                  <p className="text-xs text-slate-500 mt-3">−{finestra.costo} punti. Mostralo al coach per usarlo.</p>
                </>
              )}
              {finestra.stato === 'errore' && <p className="text-sm text-red-600">{finestra.testo}</p>}
              {(finestra.stato === 'ok' || finestra.stato === 'errore') && <button onClick={() => setFinestra(null)} className="mt-5 w-full font-bold text-white bg-blue-600 rounded-2xl py-3">Ok</button>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
