import AppShell from '../components/AppShell'

// Segnaposto per le sezioni che arrivano nella prossima fase
export default function InArrivo({ titolo }) {
  return (
    <AppShell titolo={titolo} attiva="funzioni" indietro="/funzioni">
      <div className="bg-white rounded-3xl p-8 text-center text-slate-500 shadow-[0_1px_2px_rgba(10,26,47,0.05)]">
        <p className="text-4xl mb-2">🛠️</p>
        <p>Questa sezione arriva a breve.</p>
      </div>
    </AppShell>
  )
}
