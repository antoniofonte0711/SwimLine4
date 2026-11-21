/* global process */
// 10 prove con video FINTI (verità nota) sul codice vero dell'app (creaAnalizzatore).
// Uso: npx vite-node strumenti/analisi-video/prove-finte.js -- [numero prova]
import { creaScena, PASSO_STEFANO } from '../../src/lib/analisiVideo/sintetico.js'
import { creaScenaTestata, percorsi, velocitaVera, PASSO_COPPIA } from '../../src/lib/analisiVideo/sinteticoTestata.js'
import { creaAnalizzatore } from '../../src/lib/analisiVideo/analisi.js'

const lato = (nome, opz, durata, extra = {}) => ({ nome, tipo: 'lato', durata, crea: () => creaScena({ disegno: 'stefano', w: 854, h: 480, ...opz }), ...extra })
const test = (nome, opz, durata, extra = {}) => ({ nome, tipo: 'testata', durata, crea: () => creaScenaTestata(opz), ...extra })
const PROVE = [
  lato('1 lato, camera che segue, 1,5 m/s costante, si vedono le due zone', { camera: 'segue', velocita: () => 1.5, partenza: 3 }, 12),
  lato('2 lato, camera che segue, accelera da 1,0 a 1,8 m/s', { camera: 'segue', velocita: (t) => 1.0 + 0.8 * Math.min(1, t / 10), partenza: 3 }, 12),
  lato('3 lato, camera che segue, solo la zona dei 20 m', { camera: 'segue', velocita: () => 1.4, partenza: 9 }, 7),
  lato('4 lato, camera ferma, 1,6 m/s, nuotatore coperto da schizzi per 0,5 s', { camera: 'ferma', velocita: () => 1.6, partenza: 7.5, nascostoDa: 2, nascostoA: 2.5 }, 5),
  lato('5 lato, camera che segue, lento 0,9 m/s', { camera: 'segue', velocita: () => 0.9, partenza: 4 }, 12),
  test('6 testata, arrivo a 1,2 m/s da 7 m', { posizione: percorsi.arrivo(7, 1.2) }, 4.5),
  test('7 testata, spinta in subacquea 2,2 → 1,3 m/s', { posizione: percorsi.spinta(2.2, 1.3) }, 3.5),
  test('8 testata, virata completa (arrivo 1,1, capovolta, spinta)', { posizione: percorsi.virata(7, 1.1) }, 9),
  test('9 testata, virata con la camera che trema', { posizione: percorsi.virata(7, 1.1), tremolio: 1.5, seme: 3 }, 9),
  test('10 testata, camera più alta e più indietro', { posizione: percorsi.arrivo(7, 1.4), H: 2.2, dietro: 1.5, inclinazione: 30 }, 4.2),
]

const solo = process.argv.slice(2).filter((a) => a !== '--').map(Number)
const fps = 30
const righe = []
for (const [k, p] of PROVE.entries()) {
  if (solo.length && !solo.includes(k + 1)) continue
  const s = p.crea()
  const t0 = performance.now()
  const tap = p.tipo === 'lato' ? { x: s.colonnaNuotatore(0) + 10, y: s.yNuotatore } : s.puntoNuotatore(0)
  // passo noto (come se fosse misurato in un video di lato con due zone): quello vero dei finti
  globalThis.localStorage = { getItem: () => String(p.tipo === 'lato' ? PASSO_STEFANO : PASSO_COPPIA), setItem: () => {} }
  if (k === 2) globalThis.localStorage = { getItem: () => null, setItem: () => {} } // prova 3: nessuna vasca nota → stima
  const an = creaAnalizzatore({ tInizio: 0, tFine: p.durata, tap, camera: 'movimento', stile: 'crawl', vasca: 25 })
  for (let i = 0; i <= p.durata * fps; i++) an.aggiungi(s.fotogramma(i / fps), i / fps, 1)
  const st = an.concludi()
  const sec = (performance.now() - t0) / 1000
  const serie = st.serie
  const vero = p.tipo === 'lato' ? (t) => s.velocita(t) : (t) => velocitaVera(s.posizione, t)
  const err = []
  serie.t.forEach((t, i) => { if (serie.v[i] !== null && st.serie.aff[i] !== 'bassa') err.push(Math.abs(serie.v[i] - vero(t))) })
  err.sort((a, b) => a - b)
  // media vera sullo stesso intervallo (strada / tempo)
  const rie = serie.riepilogo
  let mediaVera = null
  if (rie && rie.tempo > 0) {
    let strada = 0
    for (let t = rie.da ?? serie.t[0]; t < (rie.da ?? serie.t[0]) + rie.tempo; t += 0.01) strada += vero(t) * 0.01
    mediaVera = strada / rie.tempo
  }
  const tipoOk = (p.tipo === 'testata') === !!st.testata
  const r = {
    prova: p.nome,
    inquadratura: `${st.testata ? 'testata' : 'lato'}${tipoOk ? '' : ' ← SBAGLIATA'}`,
    scala: st.scala?.fonte || '—',
    media: rie?.media != null ? `${rie.media.toFixed(2)} (vera ${mediaVera?.toFixed(2)}, ${(100 * (rie.media - mediaVera) / mediaVera).toFixed(1)}%)` : '—',
    istantanea: err.length ? `errore mediano ${err[err.length >> 1].toFixed(2)} m/s, 90% sotto ${err[Math.floor(err.length * 0.9)].toFixed(2)}, copertura ${(100 * err.length / serie.t.length).toFixed(0)}%` : 'nessuna',
    tratto: st.tratto ? `dal metro ${st.tratto.da.toFixed(1)} al ${st.tratto.a.toFixed(1)} (vero ${s.posizione(st.tratto.tDa).toFixed?.(1) ?? s.posizione(st.tratto.tDa).d.toFixed(1)} → ${s.posizione(st.tratto.tA).toFixed?.(1) ?? s.posizione(st.tratto.tA).d.toFixed(1)})` : '—',
    tara: st.tara ? `A ${st.tara.A.toFixed(0)} B ${st.tara.B.toFixed(2)}` : '',
    errore: st.nonMisurabile || '',
    tempo: `${sec.toFixed(1)} s`,
  }
  if (process.env.DETTAGLIO) {
    for (let i = 0; i < serie.t.length; i += 6) console.log(`  t ${serie.t[i].toFixed(1)}  vera ${vero(serie.t[i]).toFixed(2)}  misurata ${serie.v[i] === null ? '—' : serie.v[i].toFixed(2)}  ${serie.aff[i]}  d ${st.campioni[i].u === null ? '—' : st.campioni[i].u.toFixed(2)} (vera ${p.tipo === 'testata' ? s.posizione(serie.t[i]).d.toFixed(2) : '-'})`)
  }
  righe.push(r)
  console.log(JSON.stringify(r, null, 1))
}
