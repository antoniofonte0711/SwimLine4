import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useCarrello, filePerLavoro } from '../context/CarrelloContext'
import { aggiungiInCoda, erroreDiRete } from '../lib/codaOffline'

// Il carrello della giornata: qui vedi tutto quello che hai aggiunto e salvi in un colpo solo
export default function CarrelloCard({ giorno, onSalvato }) {
  const { user } = useAuth()
  const { voci, rimuovi, sposta, svuota } = useCarrello()
  const [errore, setErrore] = useState('')
  const [messaggio, setMessaggio] = useState('')
  const [salvando, setSalvando] = useState(false)
  const n = voci.length

  async function salva() {
    setErrore('')
    setMessaggio('')
    const haVideo = voci.some((v) => filePerLavoro.get(v.id))
    if (haVideo && !navigator.onLine) {
      setErrore('Sei offline: togli i video dal carrello oppure riprova con la connessione.')
      return
    }

    setSalvando(true)
    const righe = []
    const righeVideo = []

    for (const v of voci) {
      let video_url = null
      const file = filePerLavoro.get(v.id)
      if (file) {
        const percorso = `${user.id}/${Date.now()}_${file.name}`
        const { error } = await supabase.storage.from('video-allenamenti').upload(percorso, file)
        if (error) {
          setErrore('Caricamento del video non riuscito. Nulla è stato salvato, riprova.')
          setSalvando(false)
          return
        }
        video_url = supabase.storage.from('video-allenamenti').getPublicUrl(percorso).data.publicUrl
        righeVideo.push({
          atleta_id: user.id,
          tipo: 'allenamento',
          riferimento_id: v.id,
          data: giorno,
          commento: `${v.tipo_lavoro} ${v.ripetizioni}×${v.distanza} m ${v.stile}`,
          video_url,
          nome_file: file.name,
        })
      }
      righe.push({
        id: v.id,
        atleta_id: user.id,
        tipo_lavoro: v.tipo_lavoro,
        distanza: v.distanza,
        ripetizioni: v.ripetizioni,
        stile: v.stile,
        passaggi: v.passaggi,
        data_allenamento: giorno,
        video_url,
        created_at: new Date().toISOString(),
      })
    }

    let inCoda = !navigator.onLine
    if (!inCoda) {
      const { error } = await supabase.from('allenamenti').insert(righe)
      if (error) {
        if (erroreDiRete(error)) inCoda = true
        else {
          setErrore('Non sono riuscito a salvare: ' + error.message)
          setSalvando(false)
          return
        }
      }
    }
    if (inCoda) righe.forEach((r) => aggiungiInCoda('allenamenti', r))
    else if (righeVideo.length) await supabase.from('video').insert(righeVideo)

    svuota()
    setSalvando(false)
    setMessaggio(inCoda ? 'Salvato sul telefono: parte appena torna la connessione.' : 'Giornata salvata nello storico.')
    onSalvato?.()
  }

  return (
    <div className={`bg-white rounded-3xl p-5 mb-3 shadow-sm border-2 ${n ? 'border-blue-500' : 'border-gray-100'}`}>
      <p className="text-sm text-slate-500 mb-2">Il tuo carrello di oggi</p>

      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-slate-500'}`}>
          {n}
        </div>
        <div>
          <p className="font-bold text-sm">
            {n === 0 ? 'Nessun lavoro ancora' : n === 1 ? '1 lavoro aggiunto oggi' : `${n} lavori aggiunti oggi`}
          </p>
          <p className="text-xs text-slate-500">
            {n === 0 ? 'Aggiungine uno qui sopra' : 'Puoi aggiungerne altri, poi salvi tutto insieme'}
          </p>
        </div>
      </div>

      <AnimatePresence initial={false}>
      {voci.map((v, idx) => (
        <motion.div key={v.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
          className="flex items-start justify-between gap-2 border-t border-gray-100 py-3 text-sm">
          <div>
            <p className="font-semibold">{v.tipo_lavoro} · {v.ripetizioni}×{v.distanza} m {v.stile} {v.conVideo && '🎥'}</p>
            {v.passaggi.length > 0 && <p className="text-xs text-slate-500">{v.passaggi.map((p) => p || '–').join(' · ')}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => sposta(v.id, -1)} disabled={idx === 0} aria-label="Sposta su" className="w-8 h-8 rounded-full bg-gray-100 text-slate-600 font-bold disabled:opacity-30">↑</button>
            <button onClick={() => sposta(v.id, 1)} disabled={idx === voci.length - 1} aria-label="Sposta giù" className="w-8 h-8 rounded-full bg-gray-100 text-slate-600 font-bold disabled:opacity-30">↓</button>
            <button onClick={() => rimuovi(v.id)} aria-label="Rimuovi" className="text-slate-500 hover:text-red-500 text-xl leading-none px-1">×</button>
          </div>
        </motion.div>
      ))}
      </AnimatePresence>

      {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mt-2">{errore}</p>}
      {messaggio && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-2">{messaggio}</p>}

      {n > 0 && (
        <button onClick={salva} disabled={salvando}
          className="w-full mt-3 bg-blue-600 text-white font-bold rounded-2xl py-3.5 hover:bg-blue-700 active:scale-[0.98] transition shadow-lg shadow-blue-200 disabled:opacity-60">
          {salvando ? 'Salvataggio...' : 'Ho finito, salva la giornata'}
        </button>
      )}
    </div>
  )
}
