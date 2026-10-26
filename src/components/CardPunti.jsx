import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { livelloDi, usePunti } from '../lib/punti'
import Icona from './Icona'

// La linea dei punti dell'atleta: livello, barra verso il prossimo premio, apertura del premio a sorpresa
export default function CardPunti({ dettaglio = true }) {
  const { user, profile } = useAuth()
  const { pronto, tot, premi, config, errore, carica } = usePunti(user, profile)
  const [apertura, setApertura] = useState(null) // { stato: 'apro' | 'ok' | 'errore', testo }

  if (!pronto) return null
  if (!profile?.squadra_id) {
    return <p className="text-xs text-slate-500 bg-white rounded-3xl p-4 mb-3 text-center shadow-card">Entra in una squadra per accumulare punti e vincere premi.</p>
  }
  if (errore) return null

  const soglia = config.soglia_premio
  const livello = livelloDi(tot)
  const dentro = tot % soglia
  const perc = Math.round((dentro / soglia) * 100)
  const daAprire = Math.max(0, Math.floor(tot / soglia) - premi.length)

  async function apri() {
    setApertura({ stato: 'apro' })
    const { data, error } = await supabase.rpc('apri_premio')
    if (error) return setApertura({ stato: 'errore', testo: error.message })
    setApertura({ stato: 'ok', testo: data.premio_nome, grande: data.grande })
    carica()
  }

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
        <p className="text-xs text-slate-500 mt-2">{tot} punti totali · ti mancano {soglia - dentro} punti per un premio a sorpresa</p>
        {daAprire > 0 && (
          <motion.button onClick={apri} whileTap={{ scale: 0.96 }} animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}
            className="w-full mt-4 min-h-[48px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl flex items-center justify-center gap-2">
            <Icona nome="regalo" className="w-5 h-5" />
            Apri il tuo premio{daAprire > 1 ? ` (${daAprire})` : ''}
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {apertura && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/50" onClick={() => apertura.stato !== 'apro' && setApertura(null)}>
            <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              className="w-full max-w-xs bg-white rounded-3xl p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {apertura.stato === 'apro' && (
                <motion.span animate={{ rotate: [0, -12, 12, -12, 12, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-20 h-20 mx-auto rounded-3xl bg-schiuma text-blue-600 flex items-center justify-center">
                  <Icona nome="regalo" className="w-11 h-11" />
                </motion.span>
              )}
              {apertura.stato === 'ok' && (
                <>
                  <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ duration: 0.6 }}
                    className="w-20 h-20 mx-auto mb-3 rounded-3xl bg-blue-600 text-white flex items-center justify-center">
                    <Icona nome={apertura.grande ? 'coppa' : 'regalo'} className="w-11 h-11" />
                  </motion.span>
                  <p className="text-sm text-slate-500">{apertura.grande ? 'PREMIO GRANDE! Hai vinto' : 'Hai vinto'}</p>
                  <p className="text-xl font-extrabold text-blue-600 mt-1">{apertura.testo}</p>
                  <p className="text-xs text-slate-500 mt-3">Mostralo al coach per usarlo.</p>
                </>
              )}
              {apertura.stato === 'errore' && <p className="text-sm text-red-600">{apertura.testo}</p>}
              {apertura.stato !== 'apro' && <button onClick={() => setApertura(null)} className="mt-5 w-full font-bold text-white bg-blue-600 rounded-2xl py-3">Ok</button>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
