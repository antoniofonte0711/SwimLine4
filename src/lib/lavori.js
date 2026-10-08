// Lavori e stili tra cui scegliere in SwimLine4
export const TIPI_LAVORO = [
  'A2', 'B1', 'B2', 'C1', 'C2', 'C3',
  'Passo gara 50', 'Passo gara 100', 'Passo gara 200', 'Passo gara 400',
]
export const STILI = ['Stile libero', 'Dorso', 'Rana', 'Farfalla', 'Misti']

// Ogni zona ha il suo colore pieno, uguale in tutta l'app (layout Limpida)
const COLORI = {
  A2: 'bg-[#0b4fd9] text-white',
  B1: 'bg-[#f2b705] text-[#0a1a2f]',
  B2: 'bg-[#e8711a] text-[#0a1a2f]',
  C1: 'bg-[#c42b20] text-white',
  C2: 'bg-[#6d28c9] text-white',
  C3: 'bg-[#c2309f] text-white',
}
export const coloreLavoro = (t = '') =>
  t.startsWith('Passo gara') ? 'bg-[#0a1a2f] text-white' : COLORI[t] || 'bg-[#d9efff] text-[#0a3a5c]'

// "Passo gara 100" -> 100 (per le altre scelte non c'è una distanza fissa)
export const distanzaDaTipo = (t = '') =>
  t.startsWith('Passo gara') ? Number(t.split(' ').pop()) : null

// Data di oggi (o di un giorno dato) come 2026-09-29, nel fuso del telefono
export const dataLocale = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export const formattaGiorno = (s) =>
  s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
