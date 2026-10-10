import { coloreLavoro } from '../lib/lavori'
import { blocchiPiano, giriSerie, metriPiano, minutiPiano, perGiro, ripartenzeDiRiga } from '../lib/pianoSquadra'
import Difficolta from './Difficolta'

const BREVE = { 'Stile libero': 'SL', 'Proprio stile': 'PS' }
// Sigla della zona sul blocco colorato (Riscaldamento -> RIS, Passo gara 200 -> PG 200)
export const siglaLavoro = (t = '') =>
  t.startsWith('Passo gara') ? 'PG ' + t.split(' ').pop() : t.length <= 3 ? t : t.slice(0, 3).toUpperCase()
const metri = (n) => n.toLocaleString('it-IT')

export function ChipZona({ tipo }) {
  return (
    <span title={tipo} className={`inline-flex items-center justify-center min-w-[52px] h-7 px-1.5 rounded-[10px] text-xs font-extrabold ${coloreLavoro(tipo)}`}>
      {siglaLavoro(tipo)}
    </span>
  )
}

// Una riga del piano; dentro una serie a giri mostra le ripetizioni di un solo giro
function RigaPiano({ r, inSerie }) {
  // In una serie: una ripartenza per giro se il coach le ha cambiate, altrimenti quella generale
  const rip = ripartenzeDiRiga(r)
  const n = inSerie ? perGiro(r) : r.ripetizioni
  const dettagli = [
    rip.length > 0 && `↻ ${rip.join(' · ')}`,
    !inSerie && Number(r.minuti) > 0 && `⏱ ${Number(r.minuti)} min`,
  ].filter(Boolean).join('  ')
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)_auto] gap-3 items-center">
      <ChipZona tipo={r.tipo_lavoro} />
      <span className="min-w-0">
        <b className="text-[15px] text-abisso">{n > 1 ? `${n}×` : ''}{r.distanza} {BREVE[r.stile] || r.stile}</b>
        {(r.note || dettagli) && (
          <span className="block text-[13px] text-slate-500 leading-snug">{[r.note, dettagli].filter(Boolean).join(' · ')}</span>
        )}
      </span>
      {!inSerie && <span className="text-[13px] font-bold text-slate-500">{metri(r.distanza * r.ripetizioni)}</span>}
    </div>
  )
}

// Allenamento del coach in sola lettura (lo vedono gli atleti)
export default function PianoCard({ piano, senzaTesta = false }) {
  if (!piano) return null
  const min = minutiPiano(piano.righe)
  return (
    <div className="mb-3">
      {!senzaTesta && (
        <div className="bg-white rounded-3xl p-4 mb-2">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <p className="font-display font-extrabold text-lg">{piano.titolo || 'Allenamento del coach'}</p>
            <span className="text-[13px] font-semibold text-slate-500 whitespace-nowrap">
              {(metriPiano(piano.righe) / 1000).toFixed(1).replace('.', ',')} km{min > 0 && ` · ${min} min`}
            </span>
          </div>
          <Difficolta righe={piano.righe} />
        </div>
      )}
      <div className="flex flex-col gap-2">
        {blocchiPiano(piano.righe).map((b, i) => b.serie ? (
          <div key={i} className="bg-white rounded-[20px] px-3.5 py-3">
            <p className="flex justify-between text-sm font-extrabold text-blue-600 mb-2">
              <span>
                {giriSerie(b.righe[0].riga)} giri
                {b.serie.recupero && <span className="font-semibold text-slate-500"> · rec {b.serie.recupero}</span>}
                {Number(b.serie.minuti) > 0 && <span className="font-semibold text-slate-500"> · {Number(b.serie.minuti)} min</span>}
              </span>
              <span className="text-slate-500">{metri(b.righe.reduce((s, { riga }) => s + riga.distanza * riga.ripetizioni, 0))}</span>
            </p>
            <div className="flex flex-col gap-2">
              {b.righe.map(({ riga }, k) => <RigaPiano key={k} r={riga} inSerie />)}
            </div>
          </div>
        ) : (
          <div key={i} className="bg-white rounded-[20px] px-3.5 py-3"><RigaPiano r={b.riga} /></div>
        ))}
      </div>
    </div>
  )
}

export function SenzaSquadra() {
  return (
    <p className="text-sm text-slate-500 bg-white rounded-3xl p-6 text-center shadow-[0_1px_2px_rgba(10,26,47,0.05)]">
      Non trovo una squadra collegata a questo account. Il coach crea la squadra in registrazione; se stai
      provando come admin, assegna un nome squadra al tuo profilo o crea una squadra con coach_id uguale al tuo utente.
    </p>
  )
}
