// Regia dell'analisi nel browser: legge i fotogrammi, fa girare il motore, sceglie la scala migliore
// (strategie a cascata), aggiorna i risultati man mano e permette di correggere i punti dubbi.
import { MotoreAnalisi, metriPerDischettoDaCalibrazione } from './motore'
import { metriPerDischettoDaColori } from './marche'
import { calcolaSerie } from './serie'
import { firma as firmaFotogramma, scorriFotogrammi, unFotogramma } from './estrazione'

const RANGO = { alta: 3, media: 2, bassa: 1 }



// Sceglie la scala: punti toccati con camera ferma (prospettiva completa), oppure metri per dischetto
// dalla scala toccata o dai cambi di colore, la più affidabile.
export function scegliScala({ camera, calib, mppCalib, voti, vasca }) {
  if (camera === 'ferma' && calib?.ok) return { fonte: 'punti', qualita: calib.affidabilita, mpp: mppCalib || null }
  const candidati = []
  if (mppCalib && calib?.ok) {
    const q = calib.metodo === 'due-punti' ? 'bassa' : calib.metodo === 'linea' && calib.affidabilita === 'alta' ? 'media' : calib.affidabilita
    candidati.push({ fonte: 'punti-galleggianti', qualita: q, mpp: mppCalib })
  }
  // catena con più colori raccolti
  let migliore = null
  for (const v of voti || []) if (v && (!migliore || v.size > migliore.size)) migliore = v
  const col = metriPerDischettoDaColori(migliore, vasca)
  if (col) candidati.push({ fonte: 'colori', qualita: col.qualita, mpp: col.mpp })
  if (!candidati.length) return null
  // a parità vince la scala toccata (esplicita); se le due non vanno d'accordo, la qualità scende
  candidati.sort((a, b) => RANGO[b.qualita] - RANGO[a.qualita] || (a.fonte === 'colori' ? 1 : -1))
  let scelta = { ...candidati[0] }
  if (candidati.length === 2 && Math.abs(candidati[0].mpp - candidati[1].mpp) / candidati[1].mpp > 0.15) {
    // le due strategie non vanno d'accordo: vince quella toccata dall'utente, ma con affidabilità bassa
    scelta = { ...(candidati.find((c) => c.fonte !== 'colori') || candidati[0]), qualita: 'bassa', disaccordo: true }
  }
  return scelta
}

export const NOMI_FONTE = {
  punti: 'scala toccata sul video',
  'punti-galleggianti': 'scala toccata + passo dei galleggianti',
  colori: 'cambi di colore dei galleggianti',
}

function serieDa(stato) {
  const { campioni, scala, opzioni, fattore } = stato
  // lettura a salti: tempi meno precisi, l'affidabilità non può essere "alta"
  const q = scala?.qualita || 'bassa'
  return calcolaSerie(campioni, {
    mpp: scala?.mpp || null,
    qualitaScala: stato.aSalti && q === 'alta' ? 'media' : q,
    calib: scala?.fonte === 'punti' ? opzioni.calib : null,
    fattore,
    camera: opzioni.camera,
    stile: opzioni.stile,
  })
}

// opzioni: { url, tInizio, tFine, tap: {x,y} pixel video, camera, stile, vasca, calib, punti, tCalib }
export async function eseguiAnalisi(opzioni, { onAggiornamento, annullato }) {
  const avvisi = []
  let mppCalib = null
  if (opzioni.calib?.ok && opzioni.punti?.length) {
    // metri di un dischetto misurati sul fotogramma dove è stata toccata la scala
    try {
      const { img, fattore } = await unFotogramma(opzioni.url, opzioni.tCalib ?? opzioni.tInizio)
      const cx = opzioni.punti.reduce((s, p) => s + p.x, 0) / opzioni.punti.length / fattore
      const cy = opzioni.punti.reduce((s, p) => s + p.y, 0) / opzioni.punti.length / fattore
      mppCalib = metriPerDischettoDaCalibrazione(img, { x: cx, y: cy }, opzioni.calib, fattore)
    } catch { /* si va avanti con le altre strategie */ }
  }

  const stato = { campioni: [], scala: null, opzioni, fattore: 1, w: 0, h: 0, voti: [], avvisi, mppCalib }
  let motore = null
  let n = 0
  let ultimaFirma = null
  const durata = Math.max(0.1, (opzioni.tFine ?? Infinity) - opzioni.tInizio)
  const aggiorna = (fine) => {
    stato.voti = motore.voti
    stato.scala = scegliScala({ camera: opzioni.camera, calib: opzioni.calib, mppCalib, voti: motore.voti, vasca: opzioni.vasca })
    stato.serie = serieDa(stato)
    const ultimo = stato.campioni[stato.campioni.length - 1]
    onAggiornamento?.({ ...stato, avanzamento: fine ? 1 : Math.min(0.99, (ultimo.t - opzioni.tInizio) / durata), finito: !!fine })
  }

  await scorriFotogrammi(opzioni.url, {
    da: opzioni.tInizio,
    a: opzioni.tFine,
    annullato,
    onSalti: () => {
      stato.aSalti = true
      avvisi.push('Il browser non ha dato i fotogrammi uno per uno (scheda in secondo piano?): letti "a salti", precisione più bassa. Per il risultato migliore tieni la pagina aperta e visibile finché non finisce.')
    },
    suFotogramma: async (img, t, fattore) => {
      // fotogramma identico al precedente (salto finito sullo stesso fotogramma, video a 25 fps): si salta
      const firma = firmaFotogramma(img)
      if (firma === ultimaFirma) return
      ultimaFirma = firma
      if (!motore) {
        stato.fattore = fattore
        stato.w = img.w
        stato.h = img.h
        motore = new MotoreAnalisi({ w: img.w, h: img.h, camera: opzioni.camera })
        stato.campioni = motore.campioni
        const esito = motore.inizia(img, t, { x: opzioni.tap.x / fattore, y: opzioni.tap.y / fattore })
        if (!esito.corsieTrovate) {
          avvisi.push(opzioni.camera === 'ferma' && opzioni.calib?.ok
            ? 'Non trovo le due file di galleggianti attorno al nuotatore: lo seguo senza il vincolo della corsia (meno sicuro con altri nuotatori vicini).'
            : 'Non trovo le due file di galleggianti attorno al nuotatore: senza corsie la camera in movimento non si può compensare. Con camera ferma imposta la scala toccando i punti.')
        }
      } else motore.passo(img, t)
      n++
      if (n % 12 === 0) {
        aggiorna(false)
        await new Promise((r) => setTimeout(r, 0)) // lascia respirare l'interfaccia
      }
    },
  })
  if (!motore) throw new Error('Nessun fotogramma letto')
  aggiorna(true)
  const trovati = stato.campioni.filter((c) => c.trovato).length
  if (trovati < stato.campioni.length * 0.1) avvisi.push('Il nuotatore non si riesce a seguire quasi mai: prova a toccarlo in un momento in cui si vede bene, o con un video più vicino.')
  if (!stato.scala) avvisi.push('Scala non trovata: non vedo cambi di colore dei galleggianti utilizzabili. Imposta la scala (tasto Scala) toccando almeno 2 punti a distanza nota.')
  return stato
}

// Correzione di un punto dubbio: si ritrova il nuotatore con un tocco al tempo `da` e si rifà
// l'inseguimento fino a quando torna d'accordo con quello di prima (o al massimo 3 s dopo il tratto).
export async function correggi(stato, { da, a, tap }, { onAggiornamento, annullato } = {}) {
  const { campioni, opzioni, fattore } = stato
  let i0 = 0
  for (let i = 0; i < campioni.length; i++) if (Math.abs(campioni[i].t - da) < Math.abs(campioni[i0].t - da)) i0 = i
  const motore = new MotoreAnalisi({ w: stato.w, h: stato.h, camera: opzioni.camera })
  let primo = true
  let accordo = 0
  let ultimaFirma = null
  await scorriFotogrammi(opzioni.url, {
    da: campioni[i0].t,
    a: Math.min(opzioni.tFine ?? Infinity, a + 3),
    annullato,
    suFotogramma: (img, t) => {
      const firma = firmaFotogramma(img)
      if (firma === ultimaFirma) return
      ultimaFirma = firma
      if (primo) { motore.riprendiDa(campioni[i0], img, t, { x: tap.x / fattore, y: tap.y / fattore }); primo = false; return }
      motore.passo(img, t)
      if (t > a) {
        const nuovo = motore.campioni[motore.campioni.length - 1]
        const vecchio = campioni.reduce((m, c) => (Math.abs(c.t - t) < Math.abs(m.t - t) ? c : m), campioni[0])
        if (nuovo.trovato && vecchio.trovato && Math.abs(nuovo.x - vecchio.x) < nuovo.bw * 0.3) accordo++
        else accordo = 0
        if (accordo >= 5) return false
      }
    },
  })
  // sostituzione dei campioni nello stesso intervallo di tempo
  const nuovi = motore.campioni
  if (nuovi.length) {
    const tFineNuovi = nuovi[nuovi.length - 1].t
    let i1 = i0
    while (i1 + 1 < campioni.length && campioni[i1 + 1].t <= tFineNuovi + 1e-4) i1++
    // dopo la correzione la catena continua: le distanze successive si allineano con l'ultimo campione nuovo
    const ultimoNuovo = nuovi[nuovi.length - 1]
    const vecchioFine = campioni[i1]
    if (ultimoNuovo.u !== null && vecchioFine?.u !== null && ultimoNuovo.catena === vecchioFine.catena) {
      const delta = ultimoNuovo.u - vecchioFine.u
      for (let i = i1 + 1; i < campioni.length; i++) {
        if (campioni[i].catena !== vecchioFine.catena) break
        if (campioni[i].u !== null) campioni[i] = { ...campioni[i], u: campioni[i].u + delta }
      }
    }
    campioni.splice(i0, i1 - i0 + 1, ...nuovi)
  }
  stato.serie = serieDa(stato)
  onAggiornamento?.({ ...stato, avanzamento: 1, finito: true })
  return stato
}
