import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import SchedaProgressi from '../components/SchedaProgressi'
import SceltaFiglio, { useAtletaVisto } from '../components/SceltaFiglio'
import { SenzaSquadra } from '../components/PianoCard'
import { useMiaSquadra } from '../lib/pianoSquadra'

// Coach: tabella degli atleti; la freccia apre la scheda personale (tutti i tempi, filtri, aggiunta tempi)
function ProgressiCoach() {
  const { squadra, pronto } = useMiaSquadra()
  const [atleti, setAtleti] = useState([])
  const [scelto, setScelto] = useState(null)

  useEffect(() => {
    if (!squadra) return
    supabase.from('profiles').select('id, nome, cognome').in('role', ['atleta', 'admin']).eq('squadra_id', squadra.id).order('cognome')
      .then(({ data }) => setAtleti(data || []))
  }, [squadra?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (scelto) {
    return (
      <AppShell titolo={`${scelto.nome} ${scelto.cognome || ''}`} attiva="funzioni">
        <button onClick={() => setScelto(null)} className="text-sm font-semibold text-blue-600 bg-blue-50 rounded-full px-4 py-2 mb-3">← Atleti</button>
        <SchedaProgressi key={scelto.id} atletaId={scelto.id} coach />
      </AppShell>
    )
  }

  return (
    <AppShell titolo="Progressi" attiva="funzioni" indietro="/funzioni">
      {!pronto ? <p className="text-center text-slate-500 py-8">Carico…</p>
        : !squadra ? <SenzaSquadra />
        : (
          <div className="bg-white rounded-3xl p-5 shadow-card">
            <p className="font-bold mb-1">Atleti di {squadra.nome}</p>
            <p className="text-xs text-slate-500 mb-2">Tocca la freccia per aprire la scheda: gare e lavori di quell'atleta, a tua scelta.</p>
            {atleti.length === 0 && <p className="text-sm text-slate-500 py-3">Nessun atleta nella squadra.</p>}
            {atleti.map((a, i) => (
              <div key={a.id} className={`flex items-center justify-between py-3 ${i ? 'border-t border-gray-100' : ''}`}>
                <p className="font-semibold">{a.nome} {a.cognome}</p>
                <button onClick={() => setScelto(a)} aria-label={`Apri scheda di ${a.nome}`} className="text-3xl font-bold text-sky-400 px-2">›</button>
              </div>
            ))}
          </div>
        )}
    </AppShell>
  )
}

// Atleta: i suoi progressi. Genitore: quelli del figlio scelto (sola lettura).
function ProgressiAtleta() {
  const visto = useAtletaVisto()
  return (
    <AppShell titolo={visto.genitore && visto.figlio ? `Progressi di ${visto.figlio.nome}` : 'Progressi'} attiva="funzioni" indietro="/funzioni">
      <SceltaFiglio visto={visto} cosa="i suoi progressi" />
      {visto.atletaId && <SchedaProgressi key={visto.atletaId} atletaId={visto.atletaId} />}
    </AppShell>
  )
}

export default function Progressi() {
  const { ruolo } = useAuth()
  return ruolo === 'coach' ? <ProgressiCoach /> : <ProgressiAtleta />
}
