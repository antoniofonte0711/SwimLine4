import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { STILI_PROPRI } from '../lib/pianoSquadra'

// L'atleta in squadra senza "proprio stile" lo sceglie prima di entrare nell'app (migrazione 41):
// i lavori "Proprio stile" del coach finiscono poi nella categoria del suo stile.
const DESCRIZIONE = { Dorso: 'sulla schiena', Rana: 'gambe a rana', Farfalla: 'delfino' }

export const deveSceglierePs = (profile) => profile?.role === 'atleta' && !!profile.squadra_id && !profile.proprio_stile

export default function SceltaProprioStile() {
  const { user, ricaricaProfilo } = useAuth()
  const [scelto, setScelto] = useState('')
  const [errore, setErrore] = useState('')
  const [salvo, setSalvo] = useState(false)

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
    <main className="min-h-screen bg-bordo flex items-center justify-center p-4">
      <section className="w-full max-w-md bg-white rounded-3xl shadow-card p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Un'ultima cosa</p>
        <h1 className="font-display text-[28px] font-extrabold leading-tight text-abisso mt-1">Qual è il tuo proprio stile?</h1>
        <p className="text-sm text-slate-500 mt-2">
          Quando il coach scrive un lavoro in <b>PS</b> (proprio stile), i tuoi tempi finiranno nella categoria di questo stile:
          progressi e record restano giusti. Potrai cambiarlo dal Profilo.
        </p>
        <div className="grid gap-2 mt-5" role="radiogroup" aria-label="Il tuo proprio stile">
          {STILI_PROPRI.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={scelto === s} onClick={() => setScelto(s)}
              className={`cliccabile min-h-[56px] rounded-2xl px-4 text-left border-2 transition-colors ${
                scelto === s ? 'border-blue-600 bg-schiuma' : 'border-linea bg-white hover:border-blue-200'}`}>
              <span className="font-bold text-abisso">{s}</span>
              <span className="text-sm text-slate-500"> · {DESCRIZIONE[s]}</span>
            </button>
          ))}
        </div>
        {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mt-3">{errore}</p>}
        <button type="button" onClick={conferma} disabled={!scelto || salvo}
          className="cliccabile w-full min-h-[52px] mt-5 rounded-2xl font-bold text-white bg-blue-600 disabled:opacity-40">
          {salvo ? 'Salvo…' : 'Conferma'}
        </button>
      </section>
    </main>
  )
}
