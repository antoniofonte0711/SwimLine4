import { coloreLavoro } from '../lib/lavori'
import { blocchiPiano, giriSerie, metriPiano, minutiPiano, perGiro, ripartenzeDiRiga } from '../lib/pianoSquadra'

// Una riga del piano; dentro una serie a giri mostra le ripetizioni di un solo giro
function RigaPiano({ r, inSerie }) {
  // In una serie: una ripartenza per giro se il coach le ha cambiate, altrimenti quella generale
  const rip = ripartenzeDiRiga(r)
  const n = inSerie ? perGiro(r) : r.ripetizioni
  return (
    <>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
      <span className="text-sm text-gray-600 ml-2">{inSerie && n === 1 ? '' : `${n}×`}{r.distanza} m {r.stile}</span>
      {rip.length > 0 && <span className="text-xs text-gray-500 ml-2">↻ ripartenza {rip.join(' · ')}</span>}
      {!inSerie && Number(r.minuti) > 0 && <span className="text-xs text-gray-500 ml-2">⏱ {Number(r.minuti)} min</span>}
      {r.note && <p className="text-xs text-gray-500 mt-1">{r.note}</p>}
    </>
  )
}

// Allenamento del coach in sola lettura (lo vedono gli atleti)
export default function PianoCard({ piano }) {
  if (!piano) return null
  return (
    <div className="bg-white border border-blue-100 rounded-3xl p-5 shadow-sm mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold">📋 {piano.titolo || 'Allenamento del coach'}</p>
        <span className="text-xs text-gray-500">
          {(metriPiano(piano.righe) / 1000).toFixed(1).replace('.', ',')} km
          {minutiPiano(piano.righe) > 0 && ` · ${minutiPiano(piano.righe)} min`}
        </span>
      </div>
      {blocchiPiano(piano.righe).map((b, i) => (
        <div key={i} className={`py-2 ${i ? 'border-t border-gray-100' : ''}`}>
          {b.serie ? (
            <>
              <p className="text-sm font-bold text-blue-700">
                🔁 {giriSerie(b.righe[0].riga)} giri
                {b.serie.recupero && <span className="text-xs font-normal text-gray-500 ml-2">rec {b.serie.recupero} tra i giri</span>}
                {Number(b.serie.minuti) > 0 && <span className="text-xs font-normal text-gray-500 ml-2">⏱ {Number(b.serie.minuti)} min</span>}
              </p>
              <div className="border-l-4 border-blue-100 pl-3 mt-1">
                {b.righe.map(({ riga }, k) => <div key={k} className="py-1"><RigaPiano r={riga} inSerie /></div>)}
              </div>
            </>
          ) : <RigaPiano r={b.riga} />}
        </div>
      ))}
    </div>
  )
}

export function SenzaSquadra() {
  return (
    <p className="text-sm text-gray-500 bg-white border border-gray-100 rounded-3xl p-6 text-center shadow-sm">
      Non trovo una squadra collegata a questo account. Il coach crea la squadra in registrazione; se stai
      provando come admin, assegna un nome squadra al tuo profilo o crea una squadra con coach_id uguale al tuo utente.
    </p>
  )
}
