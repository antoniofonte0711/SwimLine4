import { supabase } from '../lib/supabaseClient'
import { useGenitori } from '../lib/famiglia'
import { Sezione } from './Impostazione'

// Atleta: richieste dei genitori da approvare (soloInAttesa: card in Oggi) e genitori collegati (Profilo)
export default function GenitoriAtleta({ soloInAttesa = false }) {
  const { richieste, ricarica } = useGenitori()

  async function rispondi(r, accetta) {
    const { error } = await supabase.rpc('rispondi_genitore', { p_id: r.id, p_accetta: accetta })
    if (error) return window.alert('Non sono riuscito a rispondere: ' + error.message)
    ricarica()
  }

  async function scollega(r) {
    if (!window.confirm(`${r.nome} non vedrà più i tuoi progressi. Continuare?`)) return
    await supabase.from('genitori_figli').delete().eq('id', r.id)
    ricarica()
  }

  const inAttesa = richieste.filter((r) => r.stato === 'in_attesa')
  const collegati = richieste.filter((r) => r.stato === 'approvato')

  const Richiesta = ({ r }) => (
    <div className="py-3">
      <p className="text-[15px] text-abisso"><b>{r.nome} {r.cognome}</b> vuole seguire i tuoi progressi (tempi, gare, presenze).</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button onClick={() => rispondi(r, false)} className="font-bold text-slate-600 bg-bordo rounded-2xl py-3">Rifiuta</button>
        <button onClick={() => rispondi(r, true)} className="font-bold text-white bg-blue-600 rounded-2xl py-3">Approva</button>
      </div>
    </div>
  )

  if (soloInAttesa) {
    if (!inAttesa.length) return null
    return (
      <div className="bg-white rounded-3xl px-4 mb-3 border-2 border-blue-200 divide-y divide-slate-100">
        {inAttesa.map((r) => <Richiesta key={r.id} r={r} />)}
      </div>
    )
  }

  return (
    <Sezione titolo="Genitori" nota="Chi approvi vede i tuoi tempi, le gare, le presenze e i record. Puoi scollegarlo quando vuoi.">
      {richieste.length === 0 && <p className="py-4 text-sm text-slate-500">Nessun genitore collegato.</p>}
      {inAttesa.map((r) => <Richiesta key={r.id} r={r} />)}
      {collegati.map((r) => (
        <div key={r.id} className="py-3 flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold text-abisso truncate">{r.nome} {r.cognome}</p>
          <button onClick={() => scollega(r)} className="text-xs font-semibold text-slate-500 shrink-0">Scollega</button>
        </div>
      ))}
    </Sezione>
  )
}
