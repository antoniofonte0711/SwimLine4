// Logo SwimLine4: dal disegno del canvas (logo.dc.html) a una pagina statica con tutte le immagini da fotografare.
// Uso: node strumenti/logo/genera.cjs  ->  strumenti/logo/pagina.html
// Poi si apre la pagina da un piccolo server locale (file:// è bloccato) e si fotografa ogni <svg id="…"> con Playwright:
//   i512 -> public/icons/icon-512.png, i192 -> icon-192.png, apple -> apple-touch-icon.png,
//   mask -> icon-maskable-512.png, fav -> favicon-64.png, logo -> public/logo/swimline4-logo.png
// (prima di fotografare: aspettare il font Cinzel Decorative e mettere rx="0" ai clipPath delle icone).
const fs = require('fs')
const path = require('path')
const s = fs.readFileSync(path.join(__dirname, 'logo.dc.html'), 'utf8')

// galleggianti come in renderVals() del canvas
const ROSSO = { colore: 'rosso', nervatura: '#7a0d08' }, BIANCO = { colore: 'bianco', nervatura: '#8d9bb0' }
const NOTTE = { colore: 'notte', nervatura: '#0b1550' }, BLU = { colore: 'blu', nervatura: '#12308a' }
function fila(fine, rossoSopra, bianchiFino, rossoSotto) {
  const l = []
  for (let y = -6, k = 0; y <= fine; y += 16.5, k++) {
    const c = (y < rossoSopra || y > rossoSotto) ? ROSSO : y < bianchiFino ? BIANCO : [NOTTE, NOTTE, BIANCO, BLU, BLU, BIANCO][k % 6]
    l.push({ y, ...c })
  }
  return l
}
const espandi = (txt, nome, lista) => txt.replace(new RegExp('<sc-for list="\\{\\{' + nome + '\\}\\}"[^>]*>([\\s\\S]*?)</sc-for>'), (_, t) =>
  lista.map((g) => t.replace(/\{\{g\.y\}\}/g, g.y).replace(/\{\{g\.colore\}\}/g, g.colore).replace(/\{\{g\.nervatura\}\}/g, g.nervatura)).join(''))
const conPrefisso = (txt, p) => txt.replace(/id="(logo|icona)/g, `id="${p}`).replace(/url\(#(logo|icona)/g, `url(#${p}`)

const logo = espandi(s.match(/<svg width="1152" height="806" viewBox="0 0 1000 700"[^>]*>([\s\S]*?)<\/svg>/)[1], 'galleggianti', fila(712, 120, 300, 610)).replace(/\{\{testo\}\}/g, '#ffffff')
const icona = espandi(s.match(/<svg width="240" height="240" viewBox="0 0 500 500"[^>]*>([\s\S]*?)<\/svg>/)[1], 'galleggiantiIcona', fila(512, 70, 200, 440)).replace(/\{\{testo\}\}/g, '#ffffff')
// maskable: tutto ridotto all'80% nella zona sicura, l'acqua riempie il quadrato (niente ritaglio né secondo sfondo: niente cornice)
const maskable = '<rect width="500" height="500" fill="url(#iconaAcqua)"></rect>' + icona
  .replace('<g id="iconaIntera" clip-path="url(#iconaBordo)">', '<g id="iconaIntera" transform="translate(50 50) scale(0.8)">')
  .replace(/(<g id="iconaIntera"[^>]*>)\s*<rect width="500" height="500" fill="url\(#iconaAcqua\)"><\/rect>/, '$1')
  .replace(/<rect width="500" height="500" fill="url\(#iconaLuce\)"><\/rect>/, '')

const svg = (id, w, h, vb, c) => `<svg id="${id}" width="${w}" height="${h}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" style="display:block">${c}</svg>`
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@900&display=block" rel="stylesheet">
<style>body{margin:0;display:flex;flex-wrap:wrap;gap:20px;padding:20px}</style></head><body>
${svg('logo', 1200, 840, '0 0 1000 700', conPrefisso(logo, 'f'))}
${svg('i512', 512, 512, '0 0 500 500', conPrefisso(icona, 'a'))}
${svg('i192', 192, 192, '0 0 500 500', conPrefisso(icona, 'b'))}
${svg('apple', 180, 180, '0 0 500 500', conPrefisso(icona, 'c'))}
${svg('mask', 512, 512, '0 0 500 500', conPrefisso(maskable, 'd'))}
${svg('fav', 64, 64, '0 0 500 500', conPrefisso(icona, 'e'))}
</body></html>`
fs.writeFileSync(path.join(__dirname, 'pagina.html'), html)
// una pagina per immagine (più leggera da fotografare), icone già senza angoli arrotondati
const testa = '<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@900&display=block" rel="stylesheet"><style>body{margin:0}</style></head><body>'
const dritte = (x) => x.replace(/<clipPath id="(\w+)Bordo"><rect width="500" height="500" rx="110"><\/rect><\/clipPath>/g, '<clipPath id="$1Bordo"><rect width="500" height="500"></rect></clipPath>')
fs.mkdirSync(path.join(__dirname, 'pagine'), { recursive: true })
for (const blocco of html.match(/<svg id="[^"]+"[\s\S]*?<\/svg>/g)) {
  const id = blocco.match(/id="([^"]+)"/)[1]
  fs.writeFileSync(path.join(__dirname, 'pagine', id + '.html'), testa + (id === 'logo' ? blocco.replace('<rect width="1000" height="700" rx="28"></rect></clipPath>', '<rect width="1000" height="700"></rect></clipPath>') : dritte(blocco)) + '</body></html>')
}
console.log('pagina.html e pagine/*.html pronte')
