import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useFigli } from '../lib/famiglia'
import { Sezione } from './Impostazione'

const STATO = {
  approvato: ['Collegato', 'bg-emerald-50 text-emerald-700'],
  in_attesa: ['In attesa che approvi', 'bg-amber-50 text-amber-700'],
  rifiutato: ['Non approvato', 'bg-red-50 text-red-700'],
}

// Profilo del genitore: i figli collegati e la scelta di nuovi figli dall'elenco della squadra
export default function FigliGenitore() {
  const { figli, ricarica } = useFigli()
  const [aperto, setAperto] = useState(false)
  const [atleti, setAtleti] = useState([])
  const [scelti, setScelti] = useState([])
  const [esito, setEsito] = useState('')

  useEffect(() => {
    if (!aperto) return
    supabase.from('compagni_squadra').select('id, nome, cognome').order('cognome').then(({ data }) => setAtleti(data || []))
  }, [aperto])

  const giaCollegati = new Set(figli.filter((f) => f.stato !== 'rifiutato').map((f) => f.atleta_id))
  const disponibili = atleti.filter((a) => !giaCollegati.has(a.id))
  const cambia = (id) => setScelti((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  async function invia() {
    if (!scelti.length) return
    const { error } = await supabase.rpc('chiedi_figli', { p_atleti: scelti })
    if (error) return setEsito('Non sono riuscito a inviare: ' + error.message)
    setEsito(scelti.length === 1 ? 'Richiesta inviata: appena tuo figlio approva, vedi i suoi progressi.' : 'Richieste inviate: appena approvano, vedi i loro progressi.')
    setScelti([])
    setAperto(false)
    ricarica()
  }

  async function scollega(f) {
    if (!window.confirm(`Scollegarti da ${f.nome}? Non vedrai più i suoi progressi.`)) return
    await supabase.from('genitori_figli').delete().eq('id', f.id)
    ricarica()
  }

  return (
    <Sezione titolo="I miei figli" nota="Scegli i tuoi figli dall'elenco della squadra: ognuno deve approvare dal suo telefono.">
      {figli.length === 0 && !aperto && <p className="py-4 text-sm text-slate-500">Non sei ancora collegato a nessun atleta.</p>}
      {figli.map((f) => (
        <div key={f.id} className="py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-abisso truncate">{f.nome} {f.cognome}</p>
            <span className={`inline-block text-xs font-bold rounded-full px-2 py-0.5 mt-1 ${STATO[f.stato][1]}`}>{STATO[f.stato][0]}</span>
          </div>
          <button onClick={() => scollega(f)} className="text-xs font-semibold text-slate-500 shrink-0">Scollega</button>
        </div>
      ))}
      {aperto ? (
        <div className="py-3">
          <p className="text-sm font-bold text-abisso mb-2">Chi sono i tuoi figli?</p>
          {disponibili.length === 0 && <p className="text-sm text-slate-500 mb-2">Nessun altro atleta in squadra.</p>}
          <div className="flex flex-col gap-2 mb-3">
            {disponibili.map((a) => {
              const on = scelti.includes(a.id)
              return (
                <button key={a.id} type="button" onClick={() => cambia(a.id)} aria-pressed={on}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left font-semibold transition ${on ? 'bg-blue-600 text-white' : 'bg-bordo text-abisso'}`}>
                  {a.nome} {a.cognome}
                  <span className="text-sm">{on ? '✓' : '+'}</span>
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setAperto(false); setScelti([]) }} className="font-bold text-slate-600 bg-bordo rounded-2xl py-3">Annulla</button>
            <button type="button" onClick={invia} disabled={!scelti.length}
              className="font-bold text-white bg-blue-600 rounded-2xl py-3 disabled:opacity-50">Chiedi di collegarmi</button>
          </div>
        </div>
      ) : (
        <div className="py-3">
          <button type="button" onClick={() => { setAperto(true); setEsito('') }} className="w-full font-bold text-blue-600 bg-schiuma rounded-2xl py-3">
            + Aggiungi un figlio
          </button>
        </div>
      )}
      {esito && <p className="text-sm text-emerald-700 py-3">{esito}</p>}
    </Sezione>
  )
}
