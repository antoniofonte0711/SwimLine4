// Cambi di colore dei galleggianti (strategia automatica per la scala).
// Galleggianti da gara: rossi nei primi 5 m da ogni parete, cambiano colore a 15 m da ogni parete
// e, in vasca da 50, anche a 25 m. I cambi consecutivi distano quindi 5 m (vasca da 25) o 10 m (vasca da 50).
// Contando quanti dischetti ci sono tra due cambi si ottengono i metri di un dischetto.
import { N_CLASSI } from './immagine'

const FIN = 6 // mezzi dischetti per lato (3 dischetti)

// voti: Map(mezzo-dischetto → conteggi per classe). Ritorna i cambi trovati, in dischetti.
export function cambiColore(voti) {
  if (!voti || voti.size < FIN * 4) return []
  const chiavi = [...voti.keys()].sort((a, b) => a - b)
  const da = chiavi[0], a = chiavi[chiavi.length - 1]
  const n = a - da + 1
  const frazioni = new Array(n).fill(null)
  for (const [k, v] of voti) {
    const tot = v.reduce((s, x) => s + x, 0)
    if (tot >= 3) frazioni[k - da] = Array.from(v, (x) => x / tot)
  }
  const media = (i0, i1) => {
    const m = new Array(N_CLASSI).fill(0)
    let k = 0
    for (let i = Math.max(0, i0); i <= Math.min(n - 1, i1); i++) {
      if (!frazioni[i]) continue
      for (let c = 0; c < N_CLASSI; c++) m[c] += frazioni[i][c]
      k++
    }
    return k >= FIN * 0.6 ? m.map((x) => x / k) : null
  }
  const dist = new Array(n).fill(0)
  for (let i = FIN; i < n - FIN; i++) {
    const s = media(i - FIN, i - 1), d = media(i, i + FIN - 1)
    if (!s || !d) continue
    let tv = 0
    for (let c = 0; c < N_CLASSI; c++) tv += Math.abs(s[c] - d[c])
    dist[i] = tv / 2
  }
  // soglia relativa: tra un dischetto e l'altro si vede l'acqua, che "sporca" tutti i tratti allo stesso modo
  const nz = dist.filter((x) => x > 0).sort((a, b) => a - b)
  const soglia = Math.max(0.15, 4 * (nz[nz.length >> 1] || 0))
  const cambi = []
  // ai bordi dei dati (inizio vasca, fine ripresa) i cambi sono falsi
  for (let i = FIN * 3; i < n - FIN * 3; i++) {
    if (dist[i] < soglia || dist[i] < dist[i - 1] || dist[i] < dist[i + 1]) continue
    // due picchi vicini (meno di ~7 dischetti) sono lo stesso cambio visto a pezzi
    if (cambi.length && i - cambi[cambi.length - 1].i < FIN * 5) {
      if (dist[i] > cambi[cambi.length - 1].forza) cambi[cambi.length - 1] = { i, forza: dist[i] }
      continue
    }
    cambi.push({ i, forza: dist[i] })
  }
  return cambi.map(({ i, forza }) => ({ u: (i + da) / 2, forza }))
}

// Metri per dischetto dai cambi di colore. qualita: 'alta' (≥2 distanze coerenti), 'media' (1), null se niente
export function metriPerDischettoDaColori(voti, vasca) {
  const cambi = cambiColore(voti)
  if (cambi.length < 2) return null
  const passoM = vasca === 50 ? 10 : 5
  const diff = []
  for (let i = 1; i < cambi.length; i++) diff.push(cambi[i].u - cambi[i - 1].u)
  // un cambio non visto fa una distanza doppia: si riporta al passo base
  const base = Math.min(...diff)
  if (base < 8) return null // meno di 8 dischetti in 5 m: non sono cambi veri
  const norm = []
  for (const d of diff) {
    const k = Math.round(d / base)
    if (k >= 1 && Math.abs(d / k - base) / base < 0.25) norm.push(d / k)
  }
  if (!norm.length) return null
  const dischetti = norm.reduce((s, x) => s + x, 0) / norm.length
  const spread = (Math.max(...norm) - Math.min(...norm)) / dischetti
  return { mpp: passoM / dischetti, qualita: norm.length >= 2 && spread < 0.08 ? 'alta' : 'media', cambi }
}
