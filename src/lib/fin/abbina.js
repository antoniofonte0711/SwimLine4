// Atleti della squadra cercati per nome negli iscritti FIN (non per società: il nome ufficiale in FIN
// spesso è diverso da quello della squadra nell'app). Se lo stesso nome compare con società diverse
// non si sceglie a caso: l'atleta conferma chi è.

// "Nicolò D'Amico" e "NICOLO' D AMICO" diventano uguali: maiuscole, niente accenti né apostrofi
export const normaleNome = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/[^A-Z ]+/g, ' ').replace(/\s+/g, ' ').trim()
const parole = (s) => normaleNome(s).split(' ').filter(Boolean)

// Il nome FIN è dell'atleta? Tutte le parole di nome e cognome dell'app devono esserci (in qualsiasi ordine),
// e il nome FIN può averne di più (secondo nome) ma non più di due in più.
export function stessoNome(nomeFin, atleta) {
  const fin = parole(nomeFin)
  const app = [...parole(atleta.nome), ...parole(atleta.cognome)]
  if (!app.length || !parole(atleta.cognome).length) return false
  const resto = [...fin]
  for (const p of app) {
    const i = resto.indexOf(p)
    if (i < 0) return false
    resto.splice(i, 1)
  }
  return resto.length <= 2
}

// gare: dal programma (con data e ora). atleti: [{ id, nome, cognome, sesso? }] (col sesso si saltano le gare dell'altro sesso).
// -> [{ atleta, societa: [{ nome, gare: [{ distanza, stile, sesso, categoria, data, ora, tempo, nomeFin, anno }] }] }]
// solo gli atleti trovati; società in ordine di nome. Una sola società = sicuro, più di una = da confermare.
export function cercaAtleti(gare = [], atleti = []) {
  return atleti.map((atleta) => {
    const perSocieta = new Map()
    gare.forEach((g) => g.iscritti.forEach((x) => {
      if (atleta.sesso && g.sesso && atleta.sesso !== g.sesso) return
      if (!stessoNome(x.nome, atleta)) return
      const k = x.societa || '—'
      if (!perSocieta.has(k)) perSocieta.set(k, [])
      perSocieta.get(k).push({
        distanza: g.distanza, stile: g.stile, sesso: g.sesso, categoria: g.categoria, data: g.data, ora: g.ora,
        tempo: x.tempo, nomeFin: x.nome, anno: x.anno,
      })
    }))
    const societa = [...perSocieta.entries()].map(([nome, lista]) => ({ nome, gare: ordina(lista) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
    return { atleta, societa }
  }).filter((t) => t.societa.length)
}
const ordina = (lista) => [...lista].sort((a, b) => `${a.data}${a.ora}`.localeCompare(`${b.data}${b.ora}`))
