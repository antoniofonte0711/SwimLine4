// Lavori e stili tra cui scegliere in SwimLine4
export const TIPI_LAVORO = [
  'A2', 'B1', 'B2', 'C1', 'C2',
  'Passo gara 50', 'Passo gara 100', 'Passo gara 200', 'Passo gara 400',
]
export const STILI = ['Stile libero', 'Dorso', 'Rana', 'Farfalla', 'Misti']

const COLORI = {
  A2: 'bg-blue-100 text-blue-700',
  B1: 'bg-yellow-100 text-yellow-700',
  B2: 'bg-orange-100 text-orange-700',
  C1: 'bg-red-100 text-red-700',
  C2: 'bg-purple-100 text-purple-700',
}
export const coloreLavoro = (t = '') =>
  t.startsWith('Passo gara') ? 'bg-slate-800 text-white' : COLORI[t] || 'bg-gray-100 text-gray-700'

// "Passo gara 100" -> 100 (per le altre scelte non c'è una distanza fissa)
export const distanzaDaTipo = (t = '') =>
  t.startsWith('Passo gara') ? Number(t.split(' ').pop()) : null

// Data di oggi (o di un giorno dato) come 2026-09-29, nel fuso del telefono
export const dataLocale = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export const formattaGiorno = (s) =>
  s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
