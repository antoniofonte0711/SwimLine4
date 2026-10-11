import { BASE, TINTE, infoLavoro } from './tipiLavoro'

// Lavori e stili tra cui scegliere in SwimLine4. I lavori di ogni squadra: lavoriDaScegliere() in tipiLavoro.js
export const TIPI_LAVORO = BASE.filter((t) => !t.soloCoach).map((t) => t.sigla)
export const STILI = ['Stile libero', 'Dorso', 'Rana', 'Farfalla', 'Misti']

// Vasca delle gare: corta (25 m) o lunga (50 m). I tempi si confrontano solo nella stessa vasca.
export const VASCHE = [[25, 'Vasca 25 m'], [50, 'Vasca 50 m']]
export const vascaDi = (g) => (Number(g?.vasca) === 50 ? 50 : 25)
export const testoVasca = (v) => `vasca ${Number(v) === 50 ? 50 : 25}`

// Ogni zona ha il suo colore pieno, uguale in tutta l'app (layout Limpida); i lavori aggiunti hanno il loro
export const coloreLavoro = (t = '') =>
  t.startsWith('Passo gara') ? TINTE.notte : TINTE[infoLavoro(t)?.colore] || TINTE.cielo

// "Passo gara 100" -> 100 (per le altre scelte non c'è una distanza fissa)
export const distanzaDaTipo = (t = '') =>
  t.startsWith('Passo gara') ? Number(t.split(' ').pop()) : null

// Data di oggi (o di un giorno dato) come 2026-09-29, nel fuso del telefono
export const dataLocale = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export const formattaGiorno = (s) =>
  s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
