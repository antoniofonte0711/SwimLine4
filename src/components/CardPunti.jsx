import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { livelloDi, usePunti } from '../lib/punti'

// La linea dei punti dell'atleta: livello, barra verso il prossimo premio, apertura del premio a sorpresa
export default function CardPunti({ dettaglio = true }) {
  const { user, profile } = useAuth()
  const { pronto, tot, premi, config, errore, carica } = usePunti(user, profile)
  const [apertura, setApertura] = useState(null) // { stato: 'apro' | 'ok' | 'errore', testo }

  if (!pronto) return null
  if (!profile?.squadra_id) {
    return <p className="text-xs text-slate-500 bg-white rounded-3xl p-4 mb-3 text-center shadow-[0_1px_2px_rgba(10,26,47,0.05)]">Entra in una squadra per accumulare punti e vincere premi.</p>
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
    setApertura({ stato: 'ok', testo: data.premio_nome })
    carica()
  }

  return (
    <>
      <div className="bg-white rounded-3xl p-5 mb-3 shadow-[0_1px_2px_rgba(10,26,47,0.05)]">
        <div className="flex items-center justify-between">
          <p className={`font-bold ${livello.colore}`}>Livello {livello.nome}</p>
          {dettaglio && <Link to="/punti" className="text-xs font-semibold text-blue-600">Movimenti e premi ›</Link>}
        </div>
        <p className="text-3xl font-extrabold mt-1">{dentro}<span className="text-slate-500">/{soglia}</span> <span className="text-sm font-semibold text-slate-500">punti al prossimo premio</span></p>
        <div className="h-3 rounded-full bg-gray-100 overflow-hidden mt-3">
          <motion.div className={`h-full rounded-full ${livello.barra}`} initial={{ width: 0 }} animate={{ width: `${perc}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">{tot} punti totali · ti mancano {soglia - dentro} punti per un premio a sorpresa</p>
        {daAprire > 0 && (
          <motion.button onClick={apri} whileTap={{ scale: 0.96 }} animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}
            className="w-full mt-4 font-bold text-white bg-gradient-to-r from-blue-600 to-sky-500 rounded-2xl py-3.5 shadow-lg shadow-blue-200">
            🎁 Apri il tuo premio{daAprire > 1 ? ` (${daAprire})` : ''}
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {apertura && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/50" onClick={() => apertura.stato !== 'apro' && setApertura(null)}>
            <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              className="w-full max-w-xs bg-white rounded-3xl p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {apertura.stato === 'apro' && <motion.p animate={{ rotate: [0, -12, 12, -12, 12, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-6xl">🎁</motion.p>}
              {apertura.stato === 'ok' && (
                <>
                  <motion.p initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ duration: 0.6 }} className="text-6xl mb-3">🎉</motion.p>
                  <p className="text-sm text-slate-500">Hai vinto</p>
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
