// Service worker SwimLine4: salva in cache i file dell'app (non i dati).
// I dati di Supabase passano sempre dalla rete.
const VERSIONE = 'v3'
const CACHE = `swimline4-${VERSIONE}`           // guscio dell'app (fisso)
const RUNTIME = `swimline4-runtime-${VERSIONE}` // JS/CSS/icone scaricati usando l'app
const MAX_RUNTIME = 60 // oltre questo numero tolgo i file più vecchi (es. JS di rilasci precedenti)
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  const tenere = [CACHE, RUNTIME]
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !tenere.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Le voci di una cache sono in ordine di inserimento: tolgo le prime
async function limita(nome, max) {
  const cache = await caches.open(nome)
  const chiavi = await cache.keys()
  await Promise.all(chiavi.slice(0, Math.max(0, chiavi.length - max)).map((k) => cache.delete(k)))
}

async function salva(req, res) {
  const cache = await caches.open(RUNTIME)
  // Rimetto in coda la voce così le più usate restano
  await cache.delete(req)
  await cache.put(req, res)
  await limita(RUNTIME, MAX_RUNTIME)
}

// Notifiche push (es. "Nuovo allenamento"): le manda la funzione "notifiche" di Supabase
self.addEventListener('push', (event) => {
  let dati = {}
  try { dati = event.data?.json() || {} } catch { dati = { body: event.data?.text() } }
  event.waitUntil(self.registration.showNotification(dati.title || 'SwimLine4', {
    body: dati.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: dati.url || '/dashboard' },
  }))
})

// Tocco sulla notifica: apre l'app (o la porta davanti se è già aperta) sulla pagina giusta
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((finestre) => {
      const aperta = finestre.find((f) => new URL(f.url).origin === self.location.origin)
      if (aperta) return aperta.navigate(url).then((f) => (f || aperta).focus())
      return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return

  // Pagine: prima la rete, se offline la versione in cache
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')))
    return
  }

  // File con hash nel nome (/assets/...): non cambiano mai, basta la cache
  const conHash = url.pathname.startsWith('/assets/')

  // File statici (JS, CSS, icone): cache subito, aggiornata in background
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached && conHash) return cached
      const rete = fetch(req).then((res) => {
        if (res.ok) event.waitUntil(salva(req, res.clone()))
        return res
      }).catch(() => cached)
      return cached || rete
    })
  )
})
