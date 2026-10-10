import { supabase } from './supabaseClient'

// Notifiche push su questo telefono. Su iPhone funzionano solo se l'app è stata aggiunta alla schermata Home.
export const notificheSupportate = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const eIPhone = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const daHome = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
// Su iPhone dal browser le notifiche non si possono attivare: va prima aggiunta l'app alla Home
export const serveHome = () => eIPhone() && !daHome()

async function registrazione() {
  return (await navigator.serviceWorker.getRegistration()) || navigator.serviceWorker.register('/sw.js')
}

// La chiave arriva in base64url, il browser la vuole in byte
function chiaveInByte(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function notificheAttive() {
  if (!notificheSupportate() || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.getRegistration()
  return !!(await reg?.pushManager.getSubscription())
}

export async function attivaNotifiche(utenteId) {
  if (!notificheSupportate()) throw new Error('Questo telefono non supporta le notifiche.')
  const permesso = await Notification.requestPermission()
  if (permesso !== 'granted') throw new Error('Hai negato il permesso: puoi riattivarlo dalle impostazioni del telefono.')
  const { data, error } = await supabase.functions.invoke('notifiche', { method: 'GET' })
  if (error || !data?.publicKey) throw new Error('Il server delle notifiche non risponde, riprova più tardi.')
  const reg = await registrazione()
  await navigator.serviceWorker.ready
  const iscr = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiaveInByte(data.publicKey) }))
  const j = iscr.toJSON()
  const { error: e2 } = await supabase.from('push_iscrizioni')
    .upsert({ utente_id: utenteId, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' })
  if (e2) throw new Error('Non sono riuscito a salvare l\'iscrizione: ' + e2.message)
}

export async function disattivaNotifiche() {
  const reg = await navigator.serviceWorker.getRegistration()
  const iscr = await reg?.pushManager.getSubscription()
  if (!iscr) return
  await supabase.from('push_iscrizioni').delete().eq('endpoint', iscr.endpoint)
  await iscr.unsubscribe()
}

// Il coach ha pubblicato: avvisa la squadra (se qualcosa non va, l'allenamento resta comunque pubblicato)
export function avvisaSquadra(squadraId, date) {
  return supabase.functions.invoke('notifiche', { body: { squadra_id: squadraId, date } }).catch(() => {})
}
