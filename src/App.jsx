import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Registrati from './pages/Registrati'
import Dashboard from './pages/Dashboard'
import Allenamenti from './pages/Allenamenti'
import Gare from './pages/Gare'
import AdminPanel from './pages/AdminPanel'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registrati" element={<Registrati />} />

          <Route path="/" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/allenamenti" element={
            <ProtectedRoute><Allenamenti /></ProtectedRoute>
          } />
          <Route path="/gare" element={
            <ProtectedRoute><Gare /></ProtectedRoute>
          } />

          {/* Sezione riservata: solo account con role = 'admin' */}
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
