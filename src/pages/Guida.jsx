import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { RUOLI_GUIDA, guidaPer } from '../lib/guida'

// Guida all'app: ogni tasto spiegato, sezione per sezione, per il proprio ruolo.
// Si apre anche senza accesso (es. dalla registrazione).
export default function Guida() {
  const { profile, ruolo: ruoloApp } = useAuth()
  const navigate = useNavigate()
  const iniziale = RUOLI_GUIDA.some(([k]) => k === ruoloApp) ? ruoloApp : 'atleta'
  const [ruolo, setRuolo] = useState(iniziale)
  const sezioni = guidaPer(ruolo)
  const ruoli = profile?.role === 'admin' ? RUOLI_GUIDA : RUOLI_GUIDA.filter(([k]) => k !== 'admin')

  return (
    <div className="min-h-screen bg-bordo px-4 py-6 pb-16">
      <div className="max-w-2xl mx-auto">
        <button type="button" onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate(profile ? '/dashboard' : '/'))}
          className="inline-flex items-center min-h-[44px] text-sm font-semibold text-blue-600 mb-1">← Indietro</button>
        <h1 className="font-display text-[30px] font-extrabold text-abisso leading-tight">Guida all'app</h1>
        <p className="text-[15px] text-slate-600 mt-1 mb-4">Ogni tasto spiegato in parole semplici. Scegli chi sei e tocca una sezione per aprirla.</p>

        <div role="tablist" aria-label="Chi sei" className="grid grid-flow-col auto-cols-fr gap-1 bg-white rounded-2xl p-1.5 mb-4">
          {ruoli.map(([k, nome]) => (
            <button key={k} type="button" role="tab" aria-selected={ruolo === k} onClick={() => setRuolo(k)}
              className={`min-h-[44px] rounded-xl text-sm font-bold ${ruolo === k ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
              {nome}
            </button>
          ))}
        </div>

        {sezioni.map((s, i) => (
          <details key={s.id} open={i === 0} className="group bg-white rounded-3xl mb-3 overflow-hidden">
            <summary className="list-none cursor-pointer select-none min-h-[56px] px-5 py-4 flex items-center justify-between gap-3">
              <span className="font-display text-lg font-extrabold text-abisso">{s.titolo}</span>
              <span aria-hidden="true" className="text-slate-500 text-xl transition-transform group-open:rotate-90">›</span>
            </summary>
            <div className="px-5 pb-5">
              {s.intro && <p className="text-[15px] text-slate-600 mb-3">{s.intro}</p>}
              <dl>
                {s.passi.map(([tasto, cosa]) => (
                  <div key={tasto} className="py-2.5 border-t border-gray-100 first:border-t-0">
                    <dt className="font-bold text-abisso">{tasto}</dt>
                    <dd className="text-[15px] text-slate-600 mt-0.5">{cosa}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </details>
        ))}

        <p className="text-sm text-slate-500 text-center mt-6">
          Qualcosa non è chiaro? Profilo › Aiuto › Segnala un problema.
        </p>
      </div>
    </div>
  )
}
