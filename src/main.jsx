import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {import.meta.env.VITE_VERCEL_ENV === 'preview' && (
      <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#f59e0b', color: '#000', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: '0 0 6px 6px', pointerEvents: 'none' }}>
        ANTEPRIMA
      </div>
    )}
  </React.StrictMode>
)

// Dopo un nuovo rilascio i file delle pagine cambiano nome: se una pagina
// non si carica (app rimasta aperta), ricarico una volta per prendere la versione nuova
window.addEventListener('vite:preloadError', (e) => {
  try {
    if (sessionStorage.getItem('ricaricato')) return
    sessionStorage.setItem('ricaricato', '1')
  } catch { return }
  e.preventDefault()
  window.location.reload()
})
window.addEventListener('load', () => {
  setTimeout(() => { try { sessionStorage.removeItem('ricaricato') } catch {} }, 10000)
})

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}