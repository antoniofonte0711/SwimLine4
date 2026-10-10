import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { addGiorni } from '../lib/pianoSquadra'
import { km, riepilogoPeriodo } from '../lib/riepilogo'
import { formattaVoto } from '../lib/difficolta'
import { secondiInTempo } from '../lib/tempo'
import { useFigli, useFiglioScelto } from '../lib/famiglia'

const COLORE_STATO = { presente: 'bg-emerald-500', assente: 'bg-red-500', non_penale: 'bg-amber-400' }

// Tutto quello che serve per riassumere un periodo di un atleta (i record si calcolano su un anno di storia)
export function useRecap(atletaId, squadraId, da, a) {
  const [r, setR] = useState(null)
  useEffect(() => {
    if (!atletaId) return
    let attivo = true
    const storia = addGiorni(da, -365)
    Promise.all([
      squadraId
        ? supabase.from('allenamenti_squadra').select('data, righe').eq('squadra_id', squadraId).eq('pubblicato', true).gte('data', da).lte('data', a)
        : Promise.resolve({ data: [] }),
      supabase.from('presenze').select('data, stato').eq('atleta_id', atletaId).gte('data', da).lte('data', a),
      supabase.from('allenamenti').select('id, data_allenamento, tipo_lavoro, distanza, stile, passaggi').eq('atleta_id', atletaId).gte('data_allenamento', storia).lte('data_allenamento', a),
      supabase.from('gare').select('id, nome_gara, distanza, stile, tempo, data_gara').eq('atleta_id', atletaId).gte('data_gara', storia).lte('data_gara', a),
      supabase.from('punti_movimenti').select('data, punti').eq('atleta_id', atletaId).gte('data', da).lte('data', a),
    ]).then(([p, pr, al, g, pt]) => {
      if (!attivo) return
      setR(riepilogoPeriodo({
        piani: p.data || [], presenze: pr.data || [], allenamenti: al.data || [],
        gare: (g.data || []).filter((x) => x.tempo), punti: pt.data || [], da, a,
      }))
    })
    return () => { attivo = false }
  }, [atletaId, squadraId, da, a])
  return r
}

function Numero({ valore, etichetta }) {
  return (
    <div className="bg-bordo rounded-2xl p-3 text-center">
      <p className="font-display text-2xl font-extrabold leading-none text-abisso">{valore}</p>
      <p className="text-[12px] font-semibold text-slate-500 mt-1 leading-tight">{etichetta}</p>
    </div>
  )
}

// La settimana raccontata: numeri grandi, i 7 giorni, i record. compatta: versione per la schermata Oggi.
export function CardSettimana({ recap, nome, compatta = false, onChiudi }) {
  if (!recap) return <div className="bg-white rounded-3xl p-5 mb-3 text-slate-500">Carico la settimana…</div>
  const r = recap
  const chi = nome ? `${nome} è venut${nome.endsWith('a') ? 'a' : 'o'}` : 'Sei venuto'
  const frase = r.allenamentiProgramma === 0
    ? 'Questa settimana non c\'erano allenamenti in programma.'
    : r.presenti === r.allenamentiProgramma
      ? `${chi} a tutti gli allenamenti: settimana perfetta! 🏅`
      : `${chi} a ${r.presenti} allenament${r.presenti === 1 ? 'o' : 'i'} su ${r.allenamentiProgramma}.`

  return (
    <section className="bg-white rounded-3xl p-5 mb-3" aria-label="Com'è andata la settimana">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Com'è andata la settimana</p>
        {onChiudi && (
          <button type="button" onClick={onChiudi} aria-label="Chiudi il riepilogo" className="w-9 h-9 -mt-2 -mr-2 rounded-full text-slate-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        )}
      </div>
      <p className="font-display text-[40px] font-extrabold leading-none mt-2">
        {km(r.metriFatti)}<span className="text-lg"> km</span>
        <span className="font-sans text-sm font-semibold text-slate-500 tracking-normal"> su {km(r.metriProgramma)} in programma</span>
      </p>
      <p className="text-[15px] text-slate-600 mt-2">{frase}</p>

      <div className="grid grid-cols-7 gap-1 mt-4" aria-label="I giorni della settimana">
        {r.giorni.map((g) => (
          <div key={g.data} className="flex flex-col items-center gap-1" title={g.stato || ''}>
            <span className="text-[11px] font-bold text-slate-500">{g.sigla}</span>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold ${
              g.stato === 'presente' ? 'bg-emerald-500 text-white' : g.stato === 'assente' ? 'bg-red-100 text-red-700' : g.metri ? 'bg-schiuma text-blue-600' : 'bg-bordo text-slate-400'
            }`}>{g.numero}</span>
            {g.gare > 0 && <span className="text-[10px] font-bold text-amber-700">gara</span>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <Numero valore={r.record.length} etichetta={r.record.length === 1 ? 'nuovo record' : 'nuovi record'} />
        <Numero valore={r.tempi} etichetta={r.tempi === 1 ? 'lavoro con tempi' : 'lavori con tempi'} />
        <Numero valore={r.punti} etichetta="punti presi" />
      </div>

      {!compatta && r.record.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-bold text-abisso mb-1">I record della settimana</p>
          {r.record.map((x) => (
            <p key={x.rif} className="text-sm text-slate-600 py-1">
              🏅 {x.etichetta}{x.gara ? ' in gara' : ` (${x.tipo})`}: <b className="text-abisso">{secondiInTempo(x.sec)}</b>, −{secondiInTempo(x.meglio)}
            </p>
          ))}
        </div>
      )}
      {!compatta && r.piuDuro && (
        <p className="text-sm text-slate-600 mt-3">
          L'allenamento più duro: <b className="text-abisso">{new Date(r.piuDuro.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long' })}</b>, difficoltà {formattaVoto(r.piuDuro.voto)}/10.
        </p>
      )}
      {compatta && (
        <Link to="/riepilogo" className="block text-center font-bold text-blue-600 bg-schiuma rounded-2xl py-3 mt-4">Vedi tutto il riepilogo</Link>
      )}
    </section>
  )
}

const CHIAVE_CHIUSO = 'swimline4:recapChiuso:'
const weekend = (g) => [0, 6].includes(new Date(g + 'T12:00:00').getDay())

// Schermata Oggi: sabato e domenica la card della settimana (si aggiunge a gara o allenamento, si chiude con la X)
// e, per ogni giorno passato o di oggi, il riassunto del giorno
export function RecapOggi({ atletaId, squadraId, giorno, nome }) {
  const oggi = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  const d = new Date(giorno + 'T12:00:00')
  const lunedi = addGiorni(giorno, -((d.getDay() + 6) % 7))
  const [chiuso, setChiuso] = useState(() => {
    try { return localStorage.getItem(CHIAVE_CHIUSO + lunedi) === '1' } catch { return false }
  })
  useEffect(() => {
    try { setChiuso(localStorage.getItem(CHIAVE_CHIUSO + lunedi) === '1') } catch { setChiuso(false) }
  }, [lunedi])
  const passato = giorno <= oggi
  const mostraSettimana = passato && weekend(giorno) && !chiuso
  const settimana = useRecap(mostraSettimana ? atletaId : null, squadraId, lunedi, addGiorni(lunedi, 6))
  const delGiorno = useRecap(passato ? atletaId : null, squadraId, giorno, giorno)

  function chiudi() {
    setChiuso(true)
    try { localStorage.setItem(CHIAVE_CHIUSO + lunedi, '1') } catch { /* non disponibile */ }
  }

  return (
    <>
      {passato && <CardGiorno recap={delGiorno} oggi={giorno === oggi} />}
      {mostraSettimana && <CardSettimana recap={settimana} nome={nome} compatta onChiudi={chiudi} />}
    </>
  )
}

// Genitore: lo stesso riepilogo, del figlio scelto
export function RecapOggiFiglio({ squadraId, giorno }) {
  const { approvati } = useFigli()
  const [figlio] = useFiglioScelto(approvati)
  if (!figlio) return null
  return <RecapOggi atletaId={figlio.atleta_id} squadraId={squadraId} giorno={giorno} nome={figlio.nome} />
}

// A fine giornata: com'è andato oggi (solo se c'era qualcosa da raccontare)
export function CardGiorno({ recap, oggi }) {
  if (!recap) return null
  const g = recap.giorni[0]
  if (!g || (!g.stato && !g.tempi && !g.gare)) return null
  const pezzi = []
  if (g.stato === 'presente' && g.metri) pezzi.push(`${km(g.metri)} km nuotati`)
  if (g.stato === 'assente') pezzi.push('assente all\'allenamento')
  if (g.tempi) pezzi.push(`${g.tempi} ${g.tempi === 1 ? 'lavoro' : 'lavori'} con i tempi`)
  if (g.gare) pezzi.push(`${g.gare} ${g.gare === 1 ? 'gara' : 'gare'}`)
  if (recap.record.length) pezzi.push(`${recap.record.length} ${recap.record.length === 1 ? 'nuovo record' : 'nuovi record'} 🏅`)
  if (recap.punti) pezzi.push(`+${recap.punti} punti`)
  if (!pezzi.length) return null
  return (
    <section className="bg-white rounded-3xl p-4 mb-3 flex items-center gap-3" aria-label="Com'è andata oggi">
      <span aria-hidden="true" className={`w-3 h-3 shrink-0 rounded-full ${COLORE_STATO[g.stato] || 'bg-blue-500'}`} />
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">{oggi ? 'Com\'è andata oggi' : 'Com\'è andata'}</p>
        <p className="text-[15px] font-semibold text-abisso mt-0.5">{pezzi.join(' · ')}</p>
      </div>
    </section>
  )
}
