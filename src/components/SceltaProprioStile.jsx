import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { STILI_PROPRI } from '../lib/pianoSquadra'
import Icona from './Icona'

// L'atleta in squadra senza "proprio stile" lo sceglie appena entra (migrazione 41): finestra al centro sopra l'app,
// come quella dell'attesa del coach, ma non si chiude finché non ha scelto.
// I lavori "Proprio stile" del coach finiscono poi nella categoria del suo stile.
const DESCRIZIONE = { Dorso: 'sulla schiena', Rana: 'gambe a rana', Farfalla: 'delfino' }

export const deveSceglierePs = (profile) => profile?.role === 'atleta' && !!profile.squadra_id && !profile.proprio_stile

export default function SceltaProprioStile() {
  const { user, ricaricaProfilo } = useAuth()
  const [scelto, setScelto] = useState('')
  const [errore, setErrore] = useState('')
  const [salvo, setSalvo] = useState(false)
  const primo = useRef(null)

  useEffect(() => { primo.current?.focus() }, [])

  async function conferma() {
    setErrore('')
    setSalvo(true)
    const { error } = await supabase.rpc('imposta_proprio_stile', { p_persona: user.id, p_stile: scelto })
    if (error) {
      setSalvo(false)
      return setErrore('Non sono riuscito a salvare: ' + error.message)
    }
    await ricaricaProfilo()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-abisso/60 backdrop-blur-[2px]">
      <div role="dialog" aria-modal="true" aria-labelledby="ps-titolo"
        className="w-full max-w-sm bg-white rounded-[28px] p-6 text-center shadow-[0_24px_60px_rgba(4,26,77,0.35)]">
        <span className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-schiuma text-blue-600 flex items-center justify-center">
          <Icona nome="onde" className="w-7 h-7" />
        </span>
        <h2 id="ps-titolo" className="font-display text-[22px] font-extrabold text-abisso leading-tight">
          Qual è il tuo proprio stile?
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          Quando il coach scrive un lavoro in <b className="text-abisso">PS</b>, i tuoi tempi vanno nella categoria di questo stile.
        </p>
        <div className="grid gap-2 mt-4 text-left" role="radiogroup" aria-label="Il tuo proprio stile">
          {STILI_PROPRI.map((s, i) => (
            <button key={s} ref={i === 0 ? primo : null} type="button" role="radio" aria-checked={scelto === s} onClick={() => setScelto(s)}
              className={`min-h-[52px] rounded-2xl px-4 border-2 flex items-center justify-between gap-2 transition-colors ${
                scelto === s ? 'border-blue-600 bg-schiuma' : 'border-linea bg-white'}`}>
              <span><b className="text-abisso">{s}</b> <span className="text-sm text-slate-500">· {DESCRIZIONE[s]}</span></span>
              <span aria-hidden="true" className={`w-5 h-5 rounded-full border-2 shrink-0 ${scelto === s ? 'border-blue-600 bg-blue-600 shadow-[inset_0_0_0_3px_white]' : 'border-linea'}`} />
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">Potrai cambiarlo quando vuoi dal Profilo.</p>
        {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mt-3">{errore}</p>}
        <button type="button" onClick={conferma} disabled={!scelto || salvo}
          className="w-full min-h-[52px] mt-4 bg-blue-600 text-white font-display font-extrabold text-lg rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-40">
          {salvo ? 'Salvo…' : 'Conferma'}
        </button>
      </div>
    </div>
  )
}
