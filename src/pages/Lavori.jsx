import AppShell from '../components/AppShell'
import GestioneLavori from '../components/GestioneLavori'
import { useAuth } from '../context/AuthContext'
import { useTipiLavoro } from '../lib/useTipiLavoro'

// Il coach sceglie i lavori della sua squadra (A2, B1… e quelli che usa lui) e ne aggiunge di nuovi
export default function Lavori() {
  const { adminReale, staVedendoCome } = useAuth()
  const { squadraId } = useTipiLavoro()
  const admin = adminReale && !staVedendoCome

  return (
    <AppShell titolo="Tipi di lavoro" attiva="funzioni" indietro="/funzioni">
      {squadraId || admin ? (
        <GestioneLavori squadraId={squadraId} admin={admin} />
      ) : (
        <div className="bg-white rounded-3xl p-5 shadow-card text-slate-600">
          Prima crea la tua squadra (dal Profilo): poi qui scegli i tipi di lavoro che usate.
        </div>
      )}
    </AppShell>
  )
}
