// Tutto quello che si cambia del video sta qui: testi, durate, colori, ritmo, musica.
import catture from '../src-captures.json'

export const FPS = 30
// ritmo della musica: i tagli si agganciano al beat. PRIMO_BEAT = secondi prima del primo colpo nella traccia.
export const BPM = 120
export const PRIMO_BEAT = 0
export const TRANSIZIONE = 12 // frame
// brano: Flashbacks (120 BPM) – ThisIsBeatKitchen, Pixabay. Mix: APERTURA della canzone + FINALE col botto.
// apertura = secondi iniziali del brano usati all'inizio del video (0–16 s: l'intro, prima che la canzone salga)
// fineBrano = secondo in cui la musica finisce (dopo c'è silenzio); incrocio = secondi di dissolvenza tra i due pezzi
export const MUSICA = { file: 'music.mp3', volume: 0.7, apertura: 16, fineBrano: 163.6, incrocio: 0.4, fadeOut: 0.8 }

export const COLORI = {
  blu: '#2563eb',
  notte: '#0a1a2f',
  schiuma: '#e8f1ff',
  acqua: ['#0a3fbf', '#0b5fe0', '#1aa3e8'],
  bianco: '#ffffff',
  rosso: '#d42a1e',
}

export type Nota = { da: number; testo: string; zoom?: { scala: number; y: number } }
export type Scena =
  | { id: string; tipo: 'hook'; durata: number; righe: string[]; evidenzia?: string }
  | { id: string; tipo: 'logo'; durata: number; claim: string }
  | { id: string; tipo: 'cose'; durata: number; righe: string[]; cattura: string }
  | { id: string; tipo: 'capitolo'; durata: number; numero: number; titolo: string; cattura: string; passi: Nota[] }
  | { id: string; tipo: 'outro'; durata: number; parole: string[]; invito: string; link: string }

// durate in secondi (si arrotondano al beat); "da" dei passi = secondi dall'arrivo del telefono
export const SCENE: Scena[] = [
  { id: 'hook1', tipo: 'hook', durata: 2.5, righe: ['Ti alleni', 'tutta la settimana.'] },
  { id: 'hook2', tipo: 'hook', durata: 2.5, righe: ['Ma quanto migliori', 'davvero?'], evidenzia: 'davvero?' },
  { id: 'logo', tipo: 'logo', durata: 5.5, claim: 'I tuoi tempi. La tua squadra.' },
  { id: 'cose', tipo: 'cose', durata: 4.5, righe: ['Il coach prepara.', 'Tu nuoti.', "L'app ricorda tutto."], cattura: 's1-cose' },
  {
    id: 'registrati', tipo: 'capitolo', durata: 12, numero: 1, titolo: 'Registrati', cattura: 's2-registrati',
    passi: [
      { da: 0, testo: 'Tocca “Registrati”' },
      { da: 1.4, testo: 'Scrivi nome, cognome e data di nascita', zoom: { scala: 1.2, y: 0.3 } },
      { da: 4.6, testo: 'Scegli “Atleta” e la tua squadra', zoom: { scala: 1.2, y: 0.45 } },
      { da: 6.6, testo: 'Scrivi email e password', zoom: { scala: 1.2, y: 0.72 } },
      { da: 9, testo: 'Tocca “Crea account”: fatto!' },
    ],
  },
  {
    id: 'oggi', tipo: 'capitolo', durata: 9, numero: 2, titolo: 'Oggi', cattura: 's3-oggi',
    passi: [
      { da: 0.3, testo: 'Apri “Oggi”: c’è l’allenamento del coach', zoom: { scala: 1.2, y: 0.35 } },
      { da: 2.6, testo: 'Guarda lavori, metri e fatica' },
      { da: 5.2, testo: '“Inizia in vasca”: un lavoro alla volta' },
    ],
  },
  {
    id: 'tempi', tipo: 'capitolo', durata: 14, numero: 3, titolo: 'Scrivi i tempi', cattura: 's4-tempi',
    passi: [
      { da: 0, testo: 'In “Oggi” tocca “Scrivi i tempi”' },
      { da: 1.8, testo: 'Sotto il lavoro tocca “+ Scrivi i tempi”' },
      { da: 3.2, testo: 'Scrivi solo numeri: 11240 = 1’12”40', zoom: { scala: 1.22, y: 0.58 } },
      { da: 6.6, testo: 'Non ricordi? “Scrivo la media”', zoom: { scala: 1.2, y: 0.45 } },
      { da: 9.2, testo: 'Premi “Salva i tempi”: il lavoro diventa verde' },
    ],
  },
  {
    id: 'progressi', tipo: 'capitolo', durata: 9, numero: 4, titolo: 'I miei tempi', cattura: 's5-progressi',
    passi: [
      { da: 0.3, testo: 'Tocca “I miei tempi” in basso' },
      { da: 1.8, testo: 'Il grafico ti mostra quanto migliori', zoom: { scala: 1.2, y: 0.5 } },
      { da: 4.2, testo: '“Record”: i tuoi tempi migliori', zoom: { scala: 1.2, y: 0.3 } },
    ],
  },
  {
    id: 'gare', tipo: 'capitolo', durata: 9.5, numero: 5, titolo: 'Gare', cattura: 's6-gare',
    passi: [
      { da: 0.3, testo: 'Tocca “Gare” in basso' },
      { da: 1.8, testo: 'Le gare del coach: “Aggiungi al calendario”' },
      { da: 3.6, testo: 'Hai fatto una gara? “Nuova gara”' },
      { da: 5.6, testo: 'Scrivi il tempo e premi “Salva gara”' },
    ],
  },
  { id: 'outro', tipo: 'outro', durata: 6, parole: ['Registrati', 'Allenati', 'Migliora'], invito: 'Chiedi il link al tuo coach', link: 'swim-line4.vercel.app' },
]

export const CATTURE = catture as Record<string, { foto: number; fps: number }>

// secondi → frame, agganciati al mezzo beat
const mezzoBeat = (FPS * 60) / BPM / 2
export const frameDi = (sec: number) => Math.max(mezzoBeat * 2, Math.round((sec * FPS) / mezzoBeat) * mezzoBeat)
export const DURATA_TOTALE = SCENE.reduce((s, x) => s + frameDi(x.durata), 0) - (SCENE.length - 1) * TRANSIZIONE
export const PRIMO_BEAT_FRAME = Math.round(PRIMO_BEAT * FPS)

// da che secondo il brano riparte dopo l'apertura: il finale riempie il resto del video, agganciato alla battuta (4 beat)
const BATTUTA = (60 / BPM) * 4
export const RIPRESA_MUSICA = Math.floor((MUSICA.fineBrano - (DURATA_TOTALE / FPS - MUSICA.apertura)) / BATTUTA) * BATTUTA
