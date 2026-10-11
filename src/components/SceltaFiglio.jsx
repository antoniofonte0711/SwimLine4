import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFigli, useFiglioScelto } from '../lib/famiglia'

// Di chi sono i dati da mostrare: l'atleta vede i suoi, il genitore quelli del figlio scelto (sola lettura).
export function useAtletaVisto() {
  const { user, ruolo } = useAuth()
  const genitore = ruolo === 'genitore'
  const { approvati, pronto } = useFigli()
  const [figlio, scegli] = useFiglioScelto(approvati)
  return {
    genitore,
    atletaId: genitore ? figlio?.atleta_id || null : user.id,
    figlio,
    approvati,
    pronto: !genitore || pronto,
    scegli,
  }
}

// Per il genitore: avviso se non ha figli collegati, oppure le schede per scegliere quale figlio guardare
export default function SceltaFiglio({ visto, cosa }) {
  const { genitore, figlio, approvati, pronto, scegli } = visto
  if (!genitore || !pronto) return null
  if (!figlio) {
    return (
      <div className="bg-white rounded-3xl p-6 text-center mb-3">
        <p className="font-bold text-abisso mb-1">Nessun figlio collegato</p>
        <p className="text-sm text-slate-500 mb-4">Collega tuo figlio dal Profilo per vedere {cosa}.</p>
        <Link to="/profilo" className="inline-block font-bold text-white bg-blue-600 rounded-2xl px-5 py-3">Vai al Profilo</Link>
      </div>
    )
  }
  if (approvati.length < 2) return null
  return (
    <div className="flex gap-2 mb-3 overflow-x-auto" role="tablist" aria-label="Figlio">
      {approvati.map((f) => (
        <button key={f.atleta_id} role="tab" aria-selected={f.atleta_id === figlio.atleta_id} onClick={() => scegli(f.atleta_id)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${f.atleta_id === figlio.atleta_id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
          {f.nome}
        </button>
      ))}
    </div>
  )
}
