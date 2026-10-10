import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { dataLocale } from '../lib/lavori'
import { useFigli, useFiglioScelto } from '../lib/famiglia'
import { riepilogoOrgoglio } from '../lib/orgoglio'
import { useRegole } from '../lib/regole'

const dataBreve = (s) => new Date(s + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })

function Numero({ valore, etichetta }) {
  return (
    <div className="bg-white rounded-3xl p-4 text-center">
      <p className="font-display text-[40px] font-extrabold leading-none text-blue-600">{valore}</p>
      <p className="text-[13px] font-semibold text-slate-500 mt-1.5 leading-tight">{etichetta}</p>
    </div>
  )
}

// Genitore: i progressi del figlio raccontati con frasi semplici, numeri grandi e un mini grafico.
// Su ogni risultato può mandare un cuore o un "Bravo!", che arriva al figlio come notifica.
export default function VistaOrgoglio() {
  const { approvati, figli, pronto } = useFigli()
  const { puo } = useRegole()
  const [figlio, scegli] = useFiglioScelto(approvati)
  const [dati, setDati] = useState(null)
  const [mandati, setMandati] = useState(new Set())

  useEffect(() => {
    if (!figlio) return
    let attivo = true
    const da = new Date()
    da.setMonth(da.getMonth() - 6)
    const inizio = dataLocale(da)
    Promise.all([
      supabase.from('allenamenti').select('id, tipo_lavoro, distanza, stile, passaggi, data_allenamento')
        .eq('atleta_id', figlio.atleta_id).gte('data_allenamento', inizio),
      supabase.from('gare').select('id, nome_gara, distanza, stile, tempo, data_gara')
        .eq('atleta_id', figlio.atleta_id).not('tempo', 'is', null).gte('data_gara', inizio),
      supabase.from('presenze').select('data, stato').eq('atleta_id', figlio.atleta_id).gte('data', inizio),
      supabase.from('incoraggiamenti').select('riferimento, tipo').eq('atleta_id', figlio.atleta_id),
    ]).then(([a, g, p, i]) => {
      if (!attivo) return
      setDati(riepilogoOrgoglio({ allenamenti: a.data || [], gare: (g.data || []).filter((x) => x.tempo), presenze: p.data || [] }))
      setMandati(new Set((i.data || []).map((x) => `${x.riferimento}|${x.tipo}`)))
    })
    return () => { attivo = false }
  }, [figlio?.atleta_id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function incoraggia(r, tipo) {
    const chiave = `${r.rif}|${tipo}`
    if (mandati.has(chiave)) return
    setMandati(new Set([...mandati, chiave]))
    const descrizione = `i ${r.etichetta} ${r.gara ? 'in gara' : 'in allenamento'} in ${r.tempo}`
    const { error } = await supabase.rpc('incoraggia', { p_atleta: figlio.atleta_id, p_tipo: tipo, p_riferimento: r.rif, p_descrizione: descrizione })
    if (error) {
      const s = new Set(mandati)
      s.delete(chiave)
      setMandati(s)
      window.alert('Non sono riuscito a mandarlo: ' + error.message)
    }
  }

  if (!pronto) return null

  if (!approvati.length) {
    const inAttesa = figli.some((f) => f.stato === 'in_attesa')
    return (
      <div className="bg-white rounded-3xl p-6 text-center mb-3">
        <p className="text-4xl mb-2" aria-hidden="true">👨‍👩‍👧</p>
        <p className="font-display text-xl font-extrabold text-abisso mb-1">{inAttesa ? 'In attesa di approvazione' : 'Segui i progressi di tuo figlio'}</p>
        <p className="text-sm text-slate-500 mb-4">
          {inAttesa ? 'Appena tuo figlio approva dal suo telefono, qui vedrai i suoi miglioramenti.' : 'Sceglilo dall\'elenco della squadra: lui approva e qui vedrai i suoi miglioramenti.'}
        </p>
        {!inAttesa && <Link to="/profilo" className="inline-block font-bold text-white bg-blue-600 rounded-2xl px-5 py-3">Collega tuo figlio</Link>}
      </div>
    )
  }

  const nome = figlio.nome
  const mese = new Date().toLocaleDateString('it-IT', { month: 'long' })

  return (
    <section className="mb-4" aria-label={`Progressi di ${nome}`}>
      {approvati.length > 1 && (
        <div className="flex gap-2 mb-3 overflow-x-auto" role="tablist" aria-label="Figlio">
          {approvati.map((f) => (
            <button key={f.atleta_id} role="tab" aria-selected={f.atleta_id === figlio.atleta_id} onClick={() => scegli(f.atleta_id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${f.atleta_id === figlio.atleta_id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
              {f.nome}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-[32px] bg-blue-600 text-white p-5 mb-3">
        <p className="text-xs font-bold tracking-[0.12em] text-blue-100 uppercase">I progressi di {nome} · {mese}</p>
        {!dati ? <p className="mt-3 text-blue-100">Carico…</p> : (
          <p className="font-display text-[26px] font-extrabold leading-tight mt-2">
            {dati.miglioramento
              ? <>Ha migliorato di {dati.miglioramento.testo} sui {dati.miglioramento.etichetta}{dati.miglioramento.gara ? ' in gara' : ''} 💪</>
              : dati.allenamentiMese > 0
                ? <>Questo mese è venuto a {dati.allenamentiMese} allenament{dati.allenamentiMese === 1 ? 'o' : 'i'}: la costanza paga 👏</>
                : <>Il mese è appena iniziato: i primi risultati arrivano presto 🌊</>}
          </p>
        )}
      </div>

      {dati && (
        <>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <Numero valore={dati.recordMese} etichetta={dati.recordMese === 1 ? 'nuovo record personale' : 'nuovi record personali'} />
            <Numero valore={dati.allenamentiMese} etichetta={dati.allenamentiMese === 1 ? 'allenamento completato' : 'allenamenti completati'} />
          </div>

          {dati.grafico.length >= 2 && (
            <div className="bg-white rounded-3xl p-4 mb-3">
              <p className="font-bold text-abisso">{dati.titoloGrafico}</p>
              <p className="text-xs text-slate-500 mb-2">Più la linea sale, più è veloce</p>
              <div className="h-28" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dati.grafico} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                    <YAxis reversed hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                    <Line type="monotone" dataKey="sec" stroke="#0b4fd9" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {dati.ultimi.length > 0 && (
            <div className="bg-white rounded-3xl px-4 mb-3 divide-y divide-slate-100">
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase pt-4 pb-2">Ultimi risultati</p>
              {dati.ultimi.map((r) => (
                <div key={r.rif} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-abisso">
                      {r.etichetta} <span className="font-display font-extrabold text-blue-600">{r.tempo}</span>
                      {r.record && <span className="ml-1.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">Record!</span>}
                    </p>
                    <p className="text-xs text-slate-500">{r.gara ? r.nome || 'Gara' : `Allenamento ${r.tipo}`} · {dataBreve(r.data)}</p>
                  </div>
                  {puo('g_cuori') && <div className="flex gap-1.5 shrink-0">
                    {[['cuore', '❤️', 'Manda un cuore'], ['bravo', '👏', 'Di\' bravo']].map(([tipo, icona, nomeAzione]) => {
                      const fatto = mandati.has(`${r.rif}|${tipo}`)
                      return (
                        <button key={tipo} onClick={() => incoraggia(r, tipo)} disabled={fatto} aria-label={`${nomeAzione} a ${nome}`} aria-pressed={fatto}
                          className={`w-11 h-11 rounded-2xl text-xl flex items-center justify-center transition active:scale-90 ${fatto ? 'bg-amber-100' : 'bg-bordo'}`}>
                          {icona}
                        </button>
                      )
                    })}
                  </div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
