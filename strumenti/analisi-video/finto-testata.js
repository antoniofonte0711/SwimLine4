/* global process */
// Disegna un fotogramma del video finto dalla testata (per guardarlo). Uso: … finto-testata.js -- <t> <uscita.bmp> [percorso]
import { creaScenaTestata, percorsi } from '../../src/lib/analisiVideo/sinteticoTestata.js'
import { salvaBmp } from './fotogramma.js'
const [t, out, quale = 'virata'] = process.argv.slice(2).filter((a) => a !== '--')
const pos = quale === 'arrivo' ? percorsi.arrivo(7, 1.2) : quale === 'spinta' ? percorsi.spinta(2.2, 1.3) : percorsi.virata(7, 1.1)
const s = creaScenaTestata({ posizione: pos })
console.log('nuotatore:', JSON.stringify(s.puntoNuotatore(Number(t))), JSON.stringify(pos(Number(t))))
salvaBmp(out, s.fotogramma(Number(t)))
