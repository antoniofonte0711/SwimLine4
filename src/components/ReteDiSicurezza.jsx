import { Component } from 'react'
import { registraErrore } from '../lib/registroErrori'
import { Marchio } from './Logo'

// Se una pagina va in errore, invece dello schermo bianco: un messaggio chiaro e due tasti.
// L'errore arriva all'admin da solo.
export default class ReteDiSicurezza extends Component {
  state = { errore: false }

  static getDerivedStateFromError() {
    return { errore: true }
  }

  componentDidCatch(error, info) {
    registraErrore(error, info?.componentStack?.slice(0, 1500) || '')
  }

  render() {
    if (!this.state.errore) return this.props.children
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center p-6 bg-[#0a3fbf]">
        <div className="bg-white rounded-[28px] p-7 max-w-sm w-full text-center shadow-[0_24px_60px_rgba(4,26,77,0.35)]">
          <p className="font-display text-lg font-extrabold text-abisso flex items-center justify-center gap-2">
            <Marchio className="w-8 h-8" /><span>Swim<span className="font-semibold text-blue-500">Line4</span></span>
          </p>
          <p className="font-display text-2xl font-extrabold text-abisso mt-3 mb-2">Ops, un tuffo andato male!</p>
          <p className="text-[15px] text-slate-600 mb-5">
            Questa pagina ha avuto un problema. L'abbiamo già segnalato: non hai perso i dati salvati.
          </p>
          <button type="button" onClick={() => window.location.reload()}
            className="w-full min-h-[48px] rounded-2xl bg-blue-600 text-white font-bold mb-2">Ricarica la pagina</button>
          <a href="/dashboard" className="flex items-center justify-center w-full min-h-[48px] rounded-2xl bg-schiuma text-blue-600 font-bold">
            Torna a Oggi
          </a>
        </div>
      </div>
    )
  }
}
