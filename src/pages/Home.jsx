import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const funzioni = [
  { icona: '⏱️', titolo: 'Tempi di gara e allenamento', testo: 'Inserisci i tuoi tempi in pochi secondi, subito dopo la vasca.' },
  { icona: '🎥', titolo: 'Video per ogni sessione', testo: 'Collega foto e video a gare e allenamenti, tutto in un posto solo.' },
  { icona: '📈', titolo: 'Grafici di miglioramento', testo: 'Guarda i progressi per distanza e tipo di lavoro.' },
]

const ruoli = [
  { icona: '🏊', nome: 'Atleta', testo: 'Registra i tuoi tempi e segui i tuoi progressi.' },
  { icona: '📋', nome: 'Coach', testo: 'Gestisci i risultati di tutta la squadra.' },
  { icona: '👨‍👩‍👧', nome: 'Genitore', testo: 'Guarda i tempi di tuo figlio.' },
]

export default function Home() {
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <header className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-blue-500 flex items-center justify-center text-4xl shadow-xl shadow-blue-200">
            🏊
          </div>
          <h1 className="text-4xl font-extrabold text-black tracking-tight">SwimLine4</h1>
          <p className="text-gray-500 mt-2">I tuoi tempi, la tua squadra, i tuoi progressi.</p>
        </header>

        <div className="flex flex-col sm:flex-row gap-3 mb-12">
          {loading ? (
            <div className="flex-1 text-center text-gray-400 py-4">Caricamento...</div>
          ) : user ? (
            <Link to="/dashboard" className="flex-1 text-center bg-blue-500 text-white font-bold rounded-2xl py-4 text-lg hover:bg-blue-600 active:scale-[0.98] transition shadow-lg shadow-blue-200">
              Vai alla dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="flex-1 text-center bg-blue-500 text-white font-bold rounded-2xl py-4 text-lg hover:bg-blue-600 active:scale-[0.98] transition shadow-lg shadow-blue-200">
                Accedi
              </Link>
              <Link to="/registrati" className="flex-1 text-center bg-black text-white font-bold rounded-2xl py-4 text-lg hover:bg-gray-800 active:scale-[0.98] transition shadow-lg shadow-gray-300">
                Registrati
              </Link>
            </>
          )}
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {funzioni.map((f) => (
            <div key={f.titolo} className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm text-center">
              <div className="text-3xl mb-2">{f.icona}</div>
              <h2 className="font-bold text-black mb-1">{f.titolo}</h2>
              <p className="text-sm text-gray-500">{f.testo}</p>
            </div>
          ))}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-extrabold text-black text-center mb-4">Per tutta la squadra</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ruoli.map((r) => (
              <div key={r.nome} className="bg-blue-500 text-white rounded-2xl p-5 text-center shadow-lg shadow-blue-200">
                <div className="text-3xl mb-1">{r.icona}</div>
                <h3 className="font-bold">{r.nome}</h3>
                <p className="text-sm text-blue-100">{r.testo}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center text-xs text-gray-400">SwimLine4</footer>
      </div>
    </div>
  )
}