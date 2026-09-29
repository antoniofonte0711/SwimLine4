import AppShell from '../components/AppShell'

// Segnaposto per le sezioni che arrivano nella prossima fase
export default function InArrivo({ titolo }) {
  return (
    <AppShell titolo={titolo} attiva="funzioni" indietro="/funzioni">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center text-gray-400 shadow-sm">
        <p className="text-4xl mb-2">🛠️</p>
        <p>Questa sezione arriva a breve.</p>
      </div>
    </AppShell>
  )
}
