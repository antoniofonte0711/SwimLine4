// Dai byte di un PDF ai pezzi di testo con posizione ({ str, x, y, pagina }) per leggi.js.
// Usato dal server (api/fin.js) e dalle prove: pdfjs in versione "legacy", che gira anche in Node.
// Il "worker" si carica qui con un import vero (pdfjs lo cerca in globalThis.pdfjsWorker): così Vercel
// lo mette nel pacchetto della funzione e pdfjs non deve cercare il file da solo.
export async function pezziDaPdf(byte) {
  if (!globalThis.pdfjsWorker) globalThis.pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await getDocument({ data: new Uint8Array(byte), disableFontFace: true, isEvalSupported: false, useSystemFonts: false, verbosity: 0 }).promise
  const pezzi = []
  for (let n = 1; n <= doc.numPages; n++) {
    const pagina = await doc.getPage(n)
    const { items } = await pagina.getTextContent()
    for (const it of items) {
      if (it.str && it.str.trim()) pezzi.push({ str: it.str, x: Math.round(it.transform[4] * 10) / 10, y: Math.round(it.transform[5] * 10) / 10, pagina: n })
    }
    pagina.cleanup()
  }
  await doc.destroy()
  return pezzi
}
