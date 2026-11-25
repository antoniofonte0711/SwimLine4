// Prova del lettore FIN su PDF scaricati: node strumenti/prova-fin.mjs linee.pdf programma.pdf Città "Nome Cognome"
import { readFileSync } from 'node:fs'
import { pezziDaPdf } from '../src/lib/fin/estrai.js'
import { leggiLineeGuida, leggiProgramma, unisciOrari } from '../src/lib/fin/leggi.js'
import { cercaAtleti } from '../src/lib/fin/abbina.js'
const [linee, programma, citta, chi] = process.argv.slice(2)
const cal = leggiLineeGuida(await pezziDaPdf(readFileSync(linee)))
console.log('Città nel calendario:', Object.keys(cal).join(', '))
const gare = unisciOrari(leggiProgramma(await pezziDaPdf(readFileSync(programma))), cal[citta])
console.log('Gare:', gare.length, '· iscritti:', gare.reduce((s, g) => s + g.iscritti.length, 0), '· senza orario:', gare.filter((g) => !g.ora).length,
  '· senza tempo:', gare.reduce((s, g) => s + g.iscritti.filter((x) => !x.tempo).length, 0))
if (chi) {
  const [nome, ...cognome] = chi.split(' ')
  console.log(JSON.stringify(cercaAtleti(gare, [{ id: 'x', nome, cognome: cognome.join(' ') }]), null, 1))
}
