// Regia dell'analisi nel browser: legge i fotogrammi, fa girare il motore, sceglie la scala migliore
// (strategie a cascata), aggiorna i risultati man mano e permette di correggere i punti dubbi.
import { MotoreAnalisi, metriPerDischettoDaCalibrazione } from './motore'
import { posizioneInVasca, metroInVasca } from './zone'
import { MotoreTestata, taraTestata, campioniInMetri, eRipresaDallaTestata, DMAX } from './testata'
import { calcolaSerie } from './serie'
import { firma as firmaFotogramma, scorriFotogrammi, unFotogramma } from './estrazione'

const RANGO = { alta: 3, media: 2, bassa: 1 }



// Metri di un dischetto di questa vasca misurati in un video precedente (stessi galleggianti): si
// ricordano sul dispositivo e servono quando nel video nuovo non si vedono i due cambi di colore dei 5 m.
const chiaveVasca = (vasca) => `swimline4-analisi-mpp-${vasca}`
export function leggiVascaNota(vasca) {
  try { const x = Number(localStorage.getItem(chiaveVasca(vasca))); return x > 0.05 && x < 0.4 ? x : null } catch { return null }
}
function salvaVascaNota(vasca, mpp) {
  try { localStorage.setItem(chiaveVasca(vasca), String(mpp)) } catch { /* niente: la prossima volta si stima */ }
}

// Sceglie la scala: punti toccati dal coach (se li ha messi) oppure quello che l'app capisce da sola dalla
// vasca (zone di fine vasca → vasca già misurata → stima). Vedi zone.js.
export function scegliScala({ camera, calib, mppCalib, pos }) {
  if (camera === 'ferma' && calib?.ok) return { fonte: 'punti', qualita: calib.affidabilita, mpp: mppCalib || null }
  if (mppCalib && calib?.ok) {
    const q = calib.metodo === 'due-punti' ? 'bassa' : calib.metodo === 'linea' && calib.affidabilita === 'alta' ? 'media' : calib.affidabilita
    return { fonte: 'punti-galleggianti', qualita: q, mpp: mppCalib }
  }
  return pos ? { fonte: pos.fonte, qualita: pos.qualita, mpp: pos.mpp } : null
}

export const NOMI_FONTE = {
  punti: 'scala toccata sul video',
  'punti-galleggianti': 'scala toccata + passo dei galleggianti',
  zone: 'cambi di colore dei 5 m visti nel video (precisa)',
  'vasca-nota': 'misurata in un video precedente di questa vasca',
  stima: 'stimata (nel video non si vedono i due cambi di colore dei 5 m)',
  testata: 'ripresa dalla testata: prospettiva dal passo dei dischetti misurato in questa vasca e dal cambio di colore a 5 m',
  'testata-stima': 'ripresa dalla testata: prospettiva dal passo dei dischetti (stimato) e dal cambio di colore a 5 m',
}

// Tratto nuotato in metri della vasca (dal metro … al metro …), se l'app ha capito dov'è il nuotatore
export function trattoInVasca(campioni, pos) {
  if (!pos?.ancora) return null
  const c = campioni.filter((x) => x.catena === pos.catena && x.u !== null && x.u !== undefined)
  if (c.length < 2) return null
  return { da: metroInVasca(pos, c[0].u), a: metroInVasca(pos, c[c.length - 1].u), tDa: c[0].t, tA: c[c.length - 1].t }
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
    cronometro: stato.cronometro || null,
    aSalti: !!stato.aSalti,
  })
}

// Cronometro del coach (due momenti a distanza nota): ricalcola i numeri senza rifare l'analisi.
// cron = { a: { t, d }, b: { t, d } } oppure null per toglierlo.
export function applicaCronometro(stato, cron) {
  const nuovo = { ...stato, cronometro: cron }
  nuovo.serie = serieDa(nuovo)
  return nuovo
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

  const an = creaAnalizzatore(opzioni, { mppCalib, avvisi, onAggiornamento })
  let ultimaFirma = null
  await scorriFotogrammi(opzioni.url, {
    da: opzioni.tInizio,
    a: opzioni.tFine,
    annullato,
    onSalti: () => {
      an.stato.aSalti = true
      avvisi.push('Il browser non ha dato i fotogrammi uno per uno (scheda in secondo piano?): letti "a salti", precisione più bassa. Per il risultato migliore tieni la pagina aperta e visibile finché non finisce.')
    },
    suFotogramma: async (img, t, fattore) => {
      // fotogramma identico al precedente (salto finito sullo stesso fotogramma, video a 25 fps): si salta
      const firma = firmaFotogramma(img)
      if (firma === ultimaFirma) return
      ultimaFirma = firma
      if (an.aggiungi(img, t, fattore)) await new Promise((r) => setTimeout(r, 0)) // lascia respirare l'interfaccia
    },
  })
  return an.concludi()
}

// Il cuore dell'analisi SENZA il browser: riceve i fotogrammi uno alla volta (aggiungi) e alla fine dà lo
// stato completo (concludi). Lo usano sia l'app (eseguiAnalisi) sia le prove con i video finti, così le
// prove controllano esattamente il codice dell'app.
export function creaAnalizzatore(opzioni, { mppCalib = null, avvisi = [], onAggiornamento } = {}) {
  const stato = { campioni: [], scala: null, opzioni, fattore: 1, w: 0, h: 0, voti: [], avvisi, mppCalib }
  let motore = null
  let n = 0
  const durata = Math.max(0.1, (opzioni.tFine ?? Infinity) - opzioni.tInizio)
  const aggiorna = (fine) => {
    if (stato.testata) {
      // dalla testata: prospettiva tarata su tutto quello che si è visto finora, poi metri dalla parete
      const tara = taraTestata(motore.campioni, opzioni.vasca, leggiVascaNota(opzioni.vasca))
      stato.tara = tara
      stato.campioni = campioniInMetri(motore.campioni, tara)
      stato.scala = tara ? { fonte: tara.fonte, qualita: tara.qualita, mpp: 1 } : null
      stato.tratto = null
      stato.serie = calcolaSerie(stato.campioni, { mpp: 1, qualitaScala: stato.scala?.qualita || 'bassa', camera: 'movimento', stile: opzioni.stile, fattore: stato.fattore, testata: true })
    } else {
      stato.voti = motore.voti
      stato.posizione = posizioneInVasca({ campioni: stato.campioni, voti: motore.voti, vasca: opzioni.vasca, mppNoto: leggiVascaNota(opzioni.vasca) })
      stato.scala = scegliScala({ camera: opzioni.camera, calib: opzioni.calib, mppCalib, pos: stato.posizione })
      stato.tratto = trattoInVasca(stato.campioni, stato.posizione)
      stato.serie = serieDa(stato)
    }
    const ultimo = stato.campioni[stato.campioni.length - 1]
    onAggiornamento?.({ ...stato, avanzamento: fine ? 1 : Math.min(0.99, (ultimo.t - opzioni.tInizio) / durata), finito: !!fine })
  }

  // ritorna true quando ha appena aggiornato i risultati (ogni 12 fotogrammi)
  function aggiungi(img, t, fattore) {
    if (!motore) {
      stato.fattore = fattore
      stato.w = img.w
      stato.h = img.h
      const tap = { x: opzioni.tap.x / fattore, y: opzioni.tap.y / fattore }
      // Inquadratura: di lato (corsia orizzontale) o dalla testata (corsia che va verso il fondo)?
      if (eRipresaDallaTestata(img, tap).testata) {
        stato.testata = true
        motore = new MotoreTestata({ w: img.w, h: img.h })
        motore.inizia(img, t, tap)
      } else {
        motore = new MotoreAnalisi({ w: img.w, h: img.h, camera: opzioni.camera })
        const esito = motore.inizia(img, t, tap)
        if (!esito.corsieTrovate) {
          avvisi.push(opzioni.camera === 'ferma' && opzioni.calib?.ok
            ? 'Non trovo le due file di galleggianti attorno al nuotatore: lo seguo senza il vincolo della corsia (meno sicuro con altri nuotatori vicini).'
            : 'Non trovo le due file di galleggianti attorno al nuotatore: senza corsie la camera in movimento non si può compensare.')
        }
      }
      stato.campioni = motore.campioni
    } else motore.passo(img, t)
    n++
    if (n % 12 === 0) { aggiorna(false); return true }
    return false
  }

  function concludi() {
    if (!motore) throw new Error('Nessun fotogramma letto')
    aggiorna(true)
    const trovati = stato.campioni.filter((c) => c.trovato).length
    if (trovati < stato.campioni.length * 0.1) avvisi.push('Il nuotatore non si riesce a seguire quasi mai: prova a toccarlo in un momento in cui si vede bene, o con un video più vicino.')
    if (stato.posizione?.fonte === 'zone') salvaVascaNota(opzioni.vasca, stato.posizione.mpp)
    // distanze quasi mai misurate, oppure un nuotatore che "non avanza" (sotto 0,35 m/s per più di 3 s:
    // nuotando è impossibile; succede con inquadrature che il motore non capisce)
    const misurati = stato.campioni.filter((c) => c.u !== null).length
    const rie = stato.serie?.riepilogo
    const fermo = !stato.testata && rie && rie.tempo >= 3 && rie.media !== null && rie.media < 0.35
    if (stato.testata && !stato.tara) {
      stato.nonMisurabile = "Video ripreso dalla testata: per misurare i metri mi servono le corde della corsia ben visibili e il cambio di colore dei galleggianti a 5 m dalla parete. In questo video non li trovo: riprendi un po' più dall'alto, con la corsia intera nell'inquadratura."
    } else if (misurati < stato.campioni.length * 0.2 || fermo) {
      stato.nonMisurabile = stato.testata
        ? `Video ripreso dalla testata: non riesco a seguire il nuotatore nei primi ${DMAX} m dalla parete. Tocca il nuotatore quando è vicino alla camera e si vede bene.`
        : "In questo video non riesco a misurare la distanza. Serve una ripresa di lato (la corsia attraversa l'immagine da sinistra a destra) oppure dalla testata della vasca (la corsia va verso il fondo), con i galleggianti ben visibili."
    }
    if (stato.testata) avvisi.push(`Dalla testata misuro i primi ${DMAX} m dalla parete (arrivo, virata, subacquea, ripartenza): più lontano il nuotatore è troppo piccolo per una misura precisa.`)
    return stato
  }

  return { stato, aggiungi, concludi }
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
