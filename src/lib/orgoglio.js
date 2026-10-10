import { secondiInTempo, tempoInSecondi } from './tempo'

// Calcoli della vista "Orgoglio" del genitore: frasi semplici sui progressi del figlio.
// allenamenti: [{ id, tipo_lavoro, distanza, stile, passaggi, data_allenamento }]
// gare: [{ id, nome_gara, distanza, stile, tempo, data_gara }]
// presenze: [{ data, stato }]

const minimo = (lista) => {
  const sec = (lista || []).map(tempoInSecondi).filter((x) => x !== null)
  return sec.length ? Math.min(...sec) : null
}

// Ogni risultato con un tempo: { rif, chiave, etichetta, sec, data, gara }
export function risultati(allenamenti = [], gare = []) {
  const da = (allenamenti || []).map((a) => ({
    rif: `allenamento:${a.id}`, chiave: `a|${a.tipo_lavoro}|${a.distanza}|${a.stile}`,
    etichetta: `${a.distanza} ${String(a.stile || '').toLowerCase()}`, tipo: a.tipo_lavoro,
    sec: minimo(a.passaggi), data: a.data_allenamento, gara: false,
  }))
  const dg = (gare || []).map((g) => ({
    rif: `gara:${g.id}`, chiave: `g|${g.distanza}|${g.stile}`,
    etichetta: `${g.distanza} ${String(g.stile || '').toLowerCase()}`, nome: g.nome_gara,
    sec: tempoInSecondi(g.tempo), data: g.data_gara, gara: true,
  }))
  return [...da, ...dg].filter((r) => r.sec !== null && r.data)
    .sort((x, y) => String(x.data).localeCompare(String(y.data)))
}

// Record personali: ogni volta che un tempo batte il migliore precedente sulla stessa prova
export function recordPersonali(lista) {
  const migliore = {}
  const record = []
  lista.forEach((r) => {
    const prima = migliore[r.chiave]
    if (prima !== undefined && r.sec < prima) record.push({ ...r, meglio: prima - r.sec })
    if (prima === undefined || r.sec < prima) migliore[r.chiave] = r.sec
  })
  return record
}

export function riepilogoOrgoglio({ allenamenti, gare, presenze, oggi = new Date() }) {
  const mese = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}`
  const nelMese = (d) => String(d || '').startsWith(mese)
  const lista = risultati(allenamenti, gare)
  const record = recordPersonali(lista)
  const recordMese = record.filter((r) => nelMese(r.data))

  // Il miglioramento più grande del mese: miglior tempo del mese contro il migliore di prima
  let miglioramento = null
  const chiavi = [...new Set(lista.map((r) => r.chiave))]
  chiavi.forEach((k) => {
    const tutti = lista.filter((r) => r.chiave === k)
    const prima = tutti.filter((r) => !nelMese(r.data) && r.data < mese)
    const ora = tutti.filter((r) => nelMese(r.data))
    if (!prima.length || !ora.length) return
    const diff = Math.min(...prima.map((r) => r.sec)) - Math.min(...ora.map((r) => r.sec))
    if (diff > 0 && (!miglioramento || diff > miglioramento.sec)) {
      miglioramento = { sec: diff, testo: secondiInTempo(diff), etichetta: tutti[0].etichetta, gara: tutti[0].gara, tipo: tutti[0].tipo }
    }
  })

  // Grafico: la prova con più tempi (prima le gare), miglior tempo di ogni giorno
  const conta = {}
  lista.forEach((r) => { conta[r.chiave] = (conta[r.chiave] || 0) + (r.gara ? 1000 : 1) })
  const principale = Object.keys(conta).sort((a, b) => conta[b] - conta[a])[0]
  const perGiorno = {}
  lista.filter((r) => r.chiave === principale).forEach((r) => {
    perGiorno[r.data] = Math.min(perGiorno[r.data] ?? Infinity, r.sec)
  })
  const grafico = Object.entries(perGiorno).map(([data, sec]) => ({ data, sec }))
  const prova = lista.find((r) => r.chiave === principale)

  return {
    allenamentiMese: (presenze || []).filter((p) => p.stato === 'presente' && nelMese(p.data)).length,
    recordMese: recordMese.length,
    miglioramento,
    grafico,
    titoloGrafico: prova ? `${prova.etichetta}${prova.gara ? ' in gara' : ` (${prova.tipo})`}` : '',
    ultimi: lista.slice(-5).reverse().map((r) => ({
      ...r, tempo: secondiInTempo(r.sec), record: record.some((x) => x.rif === r.rif),
    })),
  }
}
