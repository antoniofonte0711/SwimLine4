import { difficoltaPiano } from './difficolta'
import { metriPiano } from './pianoSquadra'
import { recordPersonali, risultati } from './orgoglio'

// Riepilogo di una settimana (o di un giorno) per un atleta.
// piani: allenamenti pubblicati della squadra [{ data, righe }]
// presenze: [{ data, stato }] · allenamenti: tempi registrati [{ id, data_allenamento, tipo_lavoro, distanza, stile, passaggi }]
// gare: [{ id, data_gara, tempo, ... }] · punti: [{ data, punti }]
// da, a: '2026-10-05', '2026-10-11' (compresi)

const GG = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

export function riepilogoPeriodo({ piani = [], presenze = [], allenamenti = [], gare = [], punti = [], da, a }) {
  const dentro = (d) => d && d >= da && d <= a
  const presenza = Object.fromEntries(presenze.filter((p) => dentro(p.data)).map((p) => [p.data, p.stato]))
  const pianiQui = piani.filter((p) => dentro(p.data))

  const giorni = []
  for (let d = new Date(da + 'T12:00:00'); ; d.setDate(d.getDate() + 1)) {
    const g = d.toISOString().slice(0, 10)
    if (g > a) break
    const piano = pianiQui.find((p) => p.data === g)
    const diff = piano ? difficoltaPiano(piano.righe || []) : null
    giorni.push({
      data: g, sigla: GG[d.getDay()], numero: d.getDate(),
      metri: piano ? metriPiano(piano.righe) : 0, voto: diff?.voto ?? null,
      stato: presenza[g] || null,
      tempi: allenamenti.filter((x) => x.data_allenamento === g).length,
      gare: gare.filter((x) => x.data_gara === g && x.tempo).length,
    })
  }

  const presente = giorni.filter((g) => g.stato === 'presente')
  const record = recordPersonali(risultati(allenamenti, gare)).filter((r) => dentro(r.data))
  const piuDuro = presente.filter((g) => g.voto).sort((x, y) => y.voto - x.voto)[0] || null

  return {
    giorni,
    metriFatti: presente.reduce((s, g) => s + g.metri, 0),
    metriProgramma: giorni.reduce((s, g) => s + g.metri, 0),
    allenamentiProgramma: giorni.filter((g) => g.metri > 0).length,
    presenti: presente.length,
    assenti: giorni.filter((g) => g.stato === 'assente').length,
    tempi: giorni.reduce((s, g) => s + g.tempi, 0),
    gare: giorni.reduce((s, g) => s + g.gare, 0),
    record,
    punti: punti.filter((p) => dentro(p.data)).reduce((s, p) => s + (Number(p.punti) || 0), 0),
    piuDuro,
  }
}

export const km = (metri) => (metri / 1000).toFixed(1).replace('.', ',')
