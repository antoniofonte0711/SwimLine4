// Errori di accesso e registrazione (Supabase Auth, in inglese) tradotti in frasi chiare per chiunque
const MESSAGGI = [
  [/already registered|already exists|user_already_exists/i, 'Esiste già un account con questa email: accedi, oppure usa "Password dimenticata?".'],
  [/email not confirmed|email_not_confirmed/i, 'Prima devi confermare l\'email: apri il messaggio che ti abbiamo mandato (guarda anche nello spam).'],
  [/invalid login|invalid_credentials|invalid grant/i, 'Email o password non corretti.'],
  [/password should be|weak_password|password is too short/i, 'La password è troppo corta: usa almeno 8 caratteri.'],
  [/invalid format|email_address_invalid|valid email|unable to validate email/i, 'L\'indirizzo email non sembra giusto: controllalo.'],
  [/rate limit|too many|over_email_send_rate_limit|over_request_rate_limit/i, 'Troppi tentativi in poco tempo: aspetta qualche minuto e riprova.'],
  [/signups not allowed|signup_disabled/i, 'Le registrazioni sono chiuse in questo momento.'],
  [/failed to fetch|network|load failed/i, 'Connessione assente o lenta: controlla internet e riprova.'],
]

export function erroreAuth(error) {
  const testo = `${error?.code || ''} ${error?.message || ''}`
  const trovato = MESSAGGI.find(([re]) => re.test(testo))
  return trovato ? trovato[1] : 'Qualcosa non ha funzionato: riprova tra poco.'
}

// Età in anni compiuti (data di nascita 'AAAA-MM-GG'); null se manca
export function eta(dataNascita, oggi = new Date()) {
  if (!dataNascita) return null
  const [a, m, g] = dataNascita.split('-').map(Number)
  let anni = oggi.getFullYear() - a
  if (oggi.getMonth() + 1 < m || (oggi.getMonth() + 1 === m && oggi.getDate() < g)) anni -= 1
  return anni
}

// In Italia sotto i 14 anni serve il consenso di un genitore per i servizi online (art. 2-quinquies Codice privacy)
export const ETA_CONSENSO = 14
