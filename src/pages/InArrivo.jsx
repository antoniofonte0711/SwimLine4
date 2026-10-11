import AppShell from '../components/AppShell'

// Segnaposto per le sezioni che arrivano nella prossima fase.
// fermo: la sezione c'è ma non è ancora in funzione (barra di avviso al posto del contenuto)
export default function InArrivo({ titolo, fermo = false }) {
  return (
    <AppShell titolo={titolo} attiva="funzioni" indietro="/funzioni">
      {fermo ? (
        <div role="status" className="bg-amber-50 border border-amber-200 text-amber-900 rounded-3xl px-5 py-4 font-semibold">
          Attualmente non in funzione.
          <p className="text-sm font-normal mt-1">Questa sezione sarà attivata più avanti: per ora non si possono caricare né guardare video.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 text-center text-slate-500 shadow-card">
          <p>Questa sezione arriva a breve.</p>
        </div>
      )}
    </AppShell>
  )
}
