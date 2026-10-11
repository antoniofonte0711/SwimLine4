// Previsioni: quanto può migliorare un atleta da qui a una data, se l'allenamento resta costante
// (niente infortuni, pause o cali). Per ogni gara/lavoro (distanza + stile, nei lavori anche il tipo):
// 1. si prende il miglior tempo di ogni giorno nel periodo scelto;
// 2. si misura la tendenza (retta sul logaritmo dei tempi = miglioramento in % all'anno);
// 3. con pochi dati la tendenza conta poco e si usa un miglioramento tipico (MIGLIORAMENTO_TIPICO);
// 4. il miglioramento rallenta col tempo (più si migliora, più è difficile): curva che si appiattisce.
import { tempoInSecondi } from './tempo'

export const MIGLIORAMENTO_TIPICO = 0.03 // 3% all'anno: atleta giovane che si allena con costanza
const MASSIMO_ANNUO = 0.08 // oltre l'8% all'anno la tendenza è rumore (o atleta agli inizi)
const MASSIMO_TOTALE = 0.15 // in nessun caso più del 15% in meno rispetto a oggi
const RALLENTAMENTO = 3 // anni: dopo circa 3 anni il miglioramento annuo si è ridotto di 2/3
const GIORNO = 86400000

const giorni = (da, a) => (new Date(a + 'T12:00:00') - new Date(da + 'T12:00:00')) / GIORNO

// Date della stagione (settembre → luglio) che contiene il giorno dato
export function stagione(oggi) {
  const [y, m] = oggi.split('-').map(Number)
  const inizio = m >= 9 ? y : y - 1
  return { inizio: `${inizio}-09-01`, fine: `${inizio + 1}-07-31` }
}

// Le date della previsione: metà stagione (fine gennaio) e fine stagione (fine luglio).
// Ad agosto, a stagione finita, si guarda già la prossima; la metà stagione già passata non si propone più.
export function scorciatoie(oggi) {
  let s = stagione(oggi)
  if (s.fine < oggi) s = stagione(`${s.fine.slice(0, 4)}-09-01`)
  const meta = `${Number(s.inizio.slice(0, 4)) + 1}-01-31`
  return [...(meta >= oggi ? [['Metà stagione', meta]] : []), ['Fine stagione', s.fine]]
}

// Raggruppa i tempi: gare per vasca+distanza+stile, lavori per tipo+distanza+stile. Un punto per giorno (il migliore).
export function serieTempi(allenamenti = [], gare = []) {
  const serie = {}
  const aggiungi = (chiave, base, data, sec) => {
    if (sec === null || !data) return
    const s = (serie[chiave] ||= { ...base, chiave, giorni: {} })
    if (s.giorni[data] === undefined || sec < s.giorni[data]) s.giorni[data] = sec
  }
  gare.forEach((g) => {
    if (!g.distanza) return
    const vasca = Number(g.vasca) === 50 ? 50 : 25 // vasca corta e lunga: tempi diversi, serie diverse
    aggiungi(`G|${vasca}|${g.distanza}|${g.stile}`, { fonte: 'gara', vasca, distanza: g.distanza, stile: g.stile }, g.data_gara, tempoInSecondi(g.tempo))
  })
  allenamenti.forEach((a) => {
    if (!a.distanza) return
    const tempi = [...(a.passaggi || []), a.tempo_totale].map(tempoInSecondi).filter((x) => x !== null)
    if (!tempi.length) return
    aggiungi(`A|${a.tipo_lavoro}|${a.distanza}|${a.stile}`, { fonte: 'allenamento', tipo: a.tipo_lavoro, distanza: a.distanza, stile: a.stile },
      a.data_allenamento || (a.created_at || '').slice(0, 10), Math.min(...tempi))
  })
  return Object.values(serie).map(({ giorni: g, ...s }) => ({
    ...s,
    punti: Object.entries(g).map(([data, sec]) => ({ data, sec })).sort((x, y) => x.data.localeCompare(y.data)),
  }))
}

// Tendenza: miglioramento all'anno (0,03 = 3% più veloce in un anno) dalla retta su ln(tempo)
function tendenza(punti) {
  const x = punti.map((p) => giorni(punti[0].data, p.data) / 365)
  const y = punti.map((p) => Math.log(p.sec))
  const mx = x.reduce((a, b) => a + b, 0) / x.length
  const my = y.reduce((a, b) => a + b, 0) / y.length
  const sxx = x.reduce((a, xi) => a + (xi - mx) ** 2, 0)
  if (!sxx) return 0
  const sxy = x.reduce((a, xi, i) => a + (xi - mx) * (y[i] - my), 0)
  return -(sxy / sxx)
}

// Previsione per una serie di tempi { data, sec }: dal = inizio dei dati da usare, fino = data della previsione
export function prevedi(punti, { oggi, dal, fino }) {
  let usati = punti.filter((p) => (!dal || p.data >= dal) && p.data <= oggi)
  const tuttoLoStorico = usati.length === 0
  if (tuttoLoStorico) usati = punti.filter((p) => p.data <= oggi)
  if (!usati.length) return null

  const attuale = Math.min(...usati.map((p) => p.sec))
  const arco = giorni(usati[0].data, usati[usati.length - 1].data)
  const n = usati.length
  // quanto fidarsi della tendenza misurata: servono più giorni e un arco di tempo lungo
  const peso = n >= 3 ? Math.min(1, (n - 2) / 8) * Math.min(1, arco / 120) : 0
  const misurata = n >= 3 && arco >= 14 ? tendenza(usati) : 0
  const annuo = Math.min(MASSIMO_ANNUO, Math.max(0, peso * misurata + (1 - peso) * MIGLIORAMENTO_TIPICO))

  const anni = Math.max(0, giorni(oggi, fino) / 365)
  const totale = Math.min(MASSIMO_TOTALE, annuo * RALLENTAMENTO * (1 - Math.exp(-anni / RALLENTAMENTO)))
  return {
    attuale,
    previsto: attuale * (1 - totale),
    ottimista: attuale * (1 - Math.min(MASSIMO_TOTALE, totale * 1.4)),
    prudente: attuale * (1 - totale * 0.6),
    percentuale: totale * 100,
    annuo: annuo * 100,
    giorniDati: n,
    affidabilita: n >= 8 && arco >= 60 ? 'alta' : n >= 3 && arco >= 14 ? 'media' : 'bassa',
    tuttoLoStorico,
  }
}
