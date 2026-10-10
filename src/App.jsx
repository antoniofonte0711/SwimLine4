import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CarrelloProvider } from './context/CarrelloContext'
import ProtectedRoute from './components/ProtectedRoute'
import AvvisoErrore from './components/AvvisoErrore'
import { mostraInArrivo } from './lib/permessi'
import Home from './pages/Home'
import Login from './pages/Login'

// Le altre pagine si scaricano solo quando servono (bundle iniziale più leggero).
// Dashboard è lazy anche lei: porta con sé framer-motion (~120 KB).
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Registrati = lazy(() => import('./pages/Registrati'))
const Riepilogo = lazy(() => import('./pages/Riepilogo'))
const Funzioni = lazy(() => import('./pages/Funzioni'))
const Profilo = lazy(() => import('./pages/Profilo'))
const Allenamenti = lazy(() => import('./pages/Allenamenti'))
const Gare = lazy(() => import('./pages/Gare'))
const Storico = lazy(() => import('./pages/Storico'))
const Progressi = lazy(() => import('./pages/Progressi'))
const Presenze = lazy(() => import('./pages/Presenze'))
const Squadra = lazy(() => import('./pages/Squadra'))
const Record = lazy(() => import('./pages/Record'))
const InArrivo = lazy(() => import('./pages/InArrivo'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const Impostazioni = lazy(() => import('./pages/Impostazioni'))
const Calendario = lazy(() => import('./pages/Calendario'))
const Punti = lazy(() => import('./pages/Punti'))
const RisultatiAllenamento = lazy(() => import('./pages/RisultatiAllenamento'))
const PresenzeAtleta = lazy(() => import('./pages/PresenzeAtleta'))
const NuovaPassword = lazy(() => import('./pages/NuovaPassword'))
const NonTrovata = lazy(() => import('./pages/NonTrovata'))
const Notifiche = lazy(() => import('./pages/Notifiche'))

// Sezioni che arrivano nella fase 2 (visibili solo in sviluppo e anteprima)
const PROSSIMAMENTE = [
  ['/video', 'Video'],
  ['/archivio', 'Archivio gare'],
]

export default function App() {
  return (
    <AuthProvider>
      <CarrelloProvider>
        <BrowserRouter>
          <AvvisoErrore />
          <Suspense fallback={<div className="p-6 text-center text-slate-500">Carico…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registrati" element={<Registrati />} />
              <Route path="/nuova-password" element={<NuovaPassword />} />

              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/riepilogo" element={<ProtectedRoute><Riepilogo /></ProtectedRoute>} />
              <Route path="/funzioni" element={<ProtectedRoute><Funzioni /></ProtectedRoute>} />
              <Route path="/profilo" element={<ProtectedRoute><Profilo /></ProtectedRoute>} />
              <Route path="/notifiche" element={<ProtectedRoute><Notifiche /></ProtectedRoute>} />
              <Route path="/allenamenti" element={<ProtectedRoute><Allenamenti /></ProtectedRoute>} />
              <Route path="/gare" element={<ProtectedRoute><Gare /></ProtectedRoute>} />

              <Route path="/storico" element={<ProtectedRoute><Storico /></ProtectedRoute>} />
              <Route path="/progressi" element={<ProtectedRoute><Progressi /></ProtectedRoute>} />
              <Route path="/squadra" element={<ProtectedRoute><Squadra /></ProtectedRoute>} />
              <Route path="/record" element={<ProtectedRoute><Record /></ProtectedRoute>} />
              <Route path="/presenze" element={<ProtectedRoute requireCoach><Presenze /></ProtectedRoute>} />

              <Route path="/punti" element={<ProtectedRoute><Punti /></ProtectedRoute>} />
              <Route path="/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />
              <Route path="/impostazioni" element={<ProtectedRoute requireCoach><Impostazioni /></ProtectedRoute>} />
              <Route path="/risultati" element={<ProtectedRoute requireCoach><RisultatiAllenamento /></ProtectedRoute>} />
              <Route path="/squadra/presenze/:id" element={<ProtectedRoute requireCoach><PresenzeAtleta /></ProtectedRoute>} />

              {mostraInArrivo && PROSSIMAMENTE.map(([percorso, titolo]) => (
                <Route key={percorso} path={percorso}
                  element={<ProtectedRoute><InArrivo titolo={titolo} /></ProtectedRoute>} />
              ))}

              {/* Sezione riservata: solo account con role = 'admin' */}
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>} />

              <Route path="*" element={<NonTrovata />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </CarrelloProvider>
    </AuthProvider>
  )
}
