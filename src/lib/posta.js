// "Apri la posta": dal dominio dell'email, la pagina della casella (sul telefono di solito apre l'app di posta)
const CASELLE = [
  [/^(gmail|googlemail)\./, 'https://mail.google.com/mail/u/0/#inbox', 'Gmail'],
  [/^(outlook|hotmail|live|msn)\./, 'https://outlook.live.com/mail/', 'Outlook'],
  [/^(yahoo|ymail)\./, 'https://mail.yahoo.com/', 'Yahoo Mail'],
  [/^(icloud|me|mac)\.com$/, 'https://www.icloud.com/mail', 'iCloud Mail'],
  [/^libero\.it$/, 'https://mail1.libero.it/', 'Libero Mail'],
  [/^virgilio\.it$/, 'https://mail.virgilio.it/', 'Virgilio Mail'],
  [/^(tim|alice|tin)\.it$/, 'https://mail.tim.it/', 'TIM Mail'],
  [/^tiscali\.it$/, 'https://mail.tiscali.it/', 'Tiscali Mail'],
]

// { url, nome } oppure null se la casella non è tra le più usate
export function casellaDi(email = '') {
  const dominio = String(email).split('@')[1]?.trim().toLowerCase()
  if (!dominio) return null
  const trovata = CASELLE.find(([re]) => re.test(dominio))
  return trovata ? { url: trovata[1], nome: trovata[2] } : null
}

// Il codice dell'email: solo cifre (Supabase ne manda 6, a volte fino a 10)
export const pulisciCodice = (testo) => String(testo || '').replace(/\D/g, '').slice(0, 10)
