import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { caricaTutto } from '../lib/caricaTutto'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import Schede from '../components/Schede'
import SelettoreData from '../components/SelettoreData'
import SceltaFiglio, { useAtletaVisto } from '../components/SceltaFiglio'
import { SenzaSquadra } from '../components/PianoCard'
import { useMiaSquadra } from '../lib/pianoSquadra'
import { STILI_COACH } from '../lib/pianoSquadra'
import { TIPI_LAVORO, coloreLavoro, dataLocale } from '../lib/lavori'
import { secondiInTempo } from '../lib/tempo'
import { prevedi, scorciatoie, serieTempi, stagione } from '../lib/previsioni'

const CARD = 'bg-white rounded-3xl p-5 mb-3 shadow-card'
const CAMPO = 'w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white'
const FONTI = ['Gare', 'Allenamenti']
const AFFIDABILITA = {
  alta: ['bg-green-500', 'Stima solida: tanti tempi su un periodo lungo'],
  media: ['bg-amber-400', 'Stima indicativa: pochi tempi o periodo breve'],
  bassa: ['bg-slate-300', 'Pochi dati: si usa un miglioramento tipico'],
}
const dataIt = (s) => new Date(s + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

// Statistiche future: per ogni stile e distanza (in gara e in allenamento) dove può arrivare l'atleta
// alla data scelta, se continua ad allenarsi con costanza.
function SchedaPrevisioni({ atletaId }) {
  const oggi = dataLocale()
  const voci = scorciatoie(oggi)
  const [dati, setDati] = useState(null)
  const [fonte, setFonte] = useState(FONTI[0])
  const [dal, setDal] = useState(stagione(oggi).inizio)
  const [fino, setFino] = useState(stagione(oggi).fine)

  useEffect(() => {
    let attivo = true
    setDati(null)
    Promise.all([
      caricaTutto(() => supabase.from('allenamenti').select('tipo_lavoro, distanza, stile, passaggi, tempo_totale, data_allenamento, created_at').eq('atleta_id', atletaId)),
      caricaTutto(() => supabase.from('gare').select('distanza, stile, tempo, data_gara').eq('atleta_id', atletaId)),
    ]).then(([a, g]) => { if (attivo) setDati(serieTempi(a.data || [], g.data || [])) })
    return () => { attivo = false }
  }, [atletaId])

  // Righe raggruppate per stile, ordinate per distanza (nei lavori anche per tipo di lavoro)
  const perStile = useMemo(() => {
    if (!dati) return []
    const righe = dati
      .filter((s) => s.fonte === (fonte === 'Gare' ? 'gara' : 'allenamento'))
      .map((s) => ({ ...s, p: prevedi(s.punti, { oggi, dal, fino }) }))
      .filter((s) => s.p)
      .sort((x, y) => x.distanza - y.distanza || TIPI_LAVORO.indexOf(x.tipo) - TIPI_LAVORO.indexOf(y.tipo))
    const stili = [...new Set([...STILI_COACH, ...righe.map((r) => r.stile)])]
    return stili.map((st) => [st, righe.filter((r) => r.stile === st)]).filter(([, r]) => r.length)
  }, [dati, fonte, dal, fino, oggi])

  return (
    <>
      <div className={CARD}>
        <p className="text-sm font-bold mb-2">Fino a quando</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {voci.map(([nome, data]) => (
            <button key={nome} type="button" onClick={() => setFino(data)} aria-pressed={fino === data}
              className={`text-xs font-bold rounded-full px-3 py-2 ${fino === data ? 'bg-blue-600 text-white' : 'bg-gray-100 text-slate-600'}`}>
              {nome}
            </button>
          ))}
        </div>
        <SelettoreData etichetta="Previsione al" valore={fino} onChange={(d) => setFino(d < oggi ? oggi : d)} />
        <p className="text-xs font-semibold text-blue-600 mt-1 px-1">{dataIt(fino)}</p>
        <div className="mt-3">
          <SelettoreData etichetta="Tempi usati dal (di solito l'inizio della stagione)" valore={dal} onChange={(d) => setDal(d > oggi ? oggi : d)} />
        </div>
      </div>

      <Schede valore={fonte} opzioni={FONTI} onCambia={setFonte} etichetta="Fonte dei tempi" />

      {dati === null && <p className="text-center text-slate-500 py-6">Calcolo le previsioni…</p>}
      {dati && perStile.length === 0 && (
        <p className={`${CARD} text-sm text-slate-500 text-center`}>
          Nessun tempo {fonte === 'Gare' ? 'di gara' : 'di allenamento'} ancora: le previsioni arrivano con i primi tempi.
        </p>
      )}

      {perStile.map(([st, righe]) => (
        <div key={st} className={CARD}>
          <p className="font-bold mb-1">{st}</p>
          {righe.map((r, i) => (
            <div key={r.chiave} className={`py-3 ${i ? 'border-t border-gray-100' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 shrink-0 rounded-full ${AFFIDABILITA[r.p.affidabilita][0]}`} title={AFFIDABILITA[r.p.affidabilita][1]} />
                  {r.distanza} m
                  {r.tipo && <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${coloreLavoro(r.tipo)}`}>{r.tipo}</span>}
                </p>
                <p className="text-right shrink-0">
                  <span className="text-xs text-slate-500">{secondiInTempo(r.p.attuale)} → </span>
                  <b className="text-lg text-blue-600">{secondiInTempo(r.p.previsto)}</b>
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 text-right">
                −{secondiInTempo(r.p.attuale - r.p.previsto)} ({r.p.percentuale.toFixed(1).replace('.', ',')}%) · tra {secondiInTempo(r.p.ottimista)} e {secondiInTempo(r.p.prudente)}
                {r.p.tuttoLoStorico && ' · usa anche i tempi prima del periodo scelto'}
              </p>
            </div>
          ))}
        </div>
      ))}

      {dati && perStile.length > 0 && (
        <div className="text-xs text-slate-500 px-1 pb-2 space-y-1.5">
          <p>
            Previsione al <b>{dataIt(fino)}</b>, partendo dal miglior tempo dal {dataIt(dal)}. Si basa sulla tendenza dei tempi
            e vale <b>se l'allenamento resta costante</b>: non tiene conto di infortuni, pause o periodi no.
          </p>
          <p>Il miglioramento rallenta col tempo: più si va avanti, più ogni centesimo costa fatica.</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Affidabilità">
            {Object.entries(AFFIDABILITA).map(([k, [colore, testo]]) => (
              <li key={k} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${colore}`} />{testo}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

// Coach: sceglie l'atleta della squadra
function PrevisioniCoach() {
  const { squadra, pronto } = useMiaSquadra()
  const [atleti, setAtleti] = useState([])
  const [scelto, setScelto] = useState('')

  useEffect(() => {
    if (!squadra) return
    supabase.from('profiles').select('id, nome, cognome').in('role', ['atleta', 'admin']).eq('squadra_id', squadra.id).order('cognome')
      .then(({ data }) => {
        setAtleti(data || [])
        setScelto((s) => s || data?.[0]?.id || '')
      })
  }, [squadra?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!pronto) return <p className="text-center text-slate-500 py-8">Carico…</p>
  if (!squadra) return <SenzaSquadra />
  return (
    <>
      <div className={CARD}>
        <label className="block text-xs text-slate-500 mb-1">Atleta</label>
        <select value={scelto} onChange={(e) => setScelto(e.target.value)} className={CAMPO}>
          {atleti.length === 0 && <option value="">Nessun atleta nella squadra</option>}
          {atleti.map((a) => <option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}
        </select>
      </div>
      {scelto && <SchedaPrevisioni key={scelto} atletaId={scelto} />}
    </>
  )
}

// Atleta: le sue previsioni. Genitore: quelle del figlio scelto.
function PrevisioniAtleta() {
  const visto = useAtletaVisto()
  return (
    <>
      <SceltaFiglio visto={visto} cosa="le sue previsioni" />
      {visto.atletaId && <SchedaPrevisioni key={visto.atletaId} atletaId={visto.atletaId} />}
    </>
  )
}

export default function Previsioni() {
  const { ruolo } = useAuth()
  return (
    <AppShell titolo="Previsioni" attiva="funzioni" indietro="/funzioni">
      {ruolo === 'coach' ? <PrevisioniCoach /> : <PrevisioniAtleta />}
    </AppShell>
  )
}
