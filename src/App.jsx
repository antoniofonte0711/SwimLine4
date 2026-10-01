import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CarrelloProvider } from './context/CarrelloContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Registrati from './pages/Registrati'
import Dashboard from './pages/Dashboard'
import Riepilogo from './pages/Riepilogo'
import Funzioni from './pages/Funzioni'
import Profilo from './pages/Profilo'
import Allenamenti from './pages/Allenamenti'
import Gare from './pages/Gare'
import Storico from './pages/Storico'
import Progressi from './pages/Progressi'
import Presenze from './pages/Presenze'
import Squadra from './pages/Squadra'
import Record from './pages/Record'
import InArrivo from './pages/InArrivo'
import AdminPanel from './pages/AdminPanel'

// Sezioni che arrivano nella fase 2
const PROSSIMAMENTE = [
  ['/video', 'Video'],
  ['/archivio', 'Archivio gare'],
  ['/calendario', 'Calendario'],
  ['/impostazioni', 'Impostazioni'],
]

export default function App() {
  return (
    <AuthProvider>
      <CarrelloProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registrati" element={<Registrati />} />

            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/riepilogo" element={<ProtectedRoute><Riepilogo /></ProtectedRoute>} />
            <Route path="/funzioni" element={<ProtectedRoute><Funzioni /></ProtectedRoute>} />
            <Route path="/profilo" element={<ProtectedRoute><Profilo /></ProtectedRoute>} />
            <Route path="/allenamenti" element={<ProtectedRoute><Allenamenti /></ProtectedRoute>} />
            <Route path="/gare" element={<ProtectedRoute><Gare /></ProtectedRoute>} />

            <Route path="/storico" element={<ProtectedRoute><Storico /></ProtectedRoute>} />
            <Route path="/progressi" element={<ProtectedRoute><Progressi /></ProtectedRoute>} />
            <Route path="/squadra" element={<ProtectedRoute><Squadra /></ProtectedRoute>} />
            <Route path="/record" element={<ProtectedRoute><Record /></ProtectedRoute>} />
            <Route path="/presenze" element={<ProtectedRoute requireCoach><Presenze /></ProtectedRoute>} />

            {PROSSIMAMENTE.map(([percorso, titolo]) => (
              <Route key={percorso} path={percorso}
                element={<ProtectedRoute><InArrivo titolo={titolo} /></ProtectedRoute>} />
            ))}

            {/* Sezione riservata: solo account con role = 'admin' */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </CarrelloProvider>
    </AuthProvider>
  )
}
