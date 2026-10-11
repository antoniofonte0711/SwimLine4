// Protezione dalle password rubate, gratis: si controlla l'elenco pubblico di haveibeenpwned.com
// (oltre 900 milioni di password uscite da furti di dati). La password non lascia mai il telefono:
// si calcola la sua impronta SHA-1 e si mandano solo i primi 5 caratteri ("k-anonimato");
// il servizio risponde con tutte le impronte che iniziano così e il confronto si fa qui.
// Se il servizio non risponde (niente rete) non si blocca nessuno.

export const MESSAGGIO_RUBATA = 'Questa password compare negli elenchi di password rubate in altri siti: chi la conosce potrebbe entrare nel tuo account. Scegline un\'altra.'

export async function impronta(testo) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(testo))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

// Quante volte la password compare tra quelle rubate (0 = mai vista, o servizio non raggiungibile)
export async function volteRubata(password, chiedi = fetch) {
  try {
    const h = await impronta(password)
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    const r = await chiedi(`https://api.pwnedpasswords.com/range/${h.slice(0, 5)}`, { signal: ctrl.signal, headers: { 'Add-Padding': 'true' } })
    clearTimeout(t)
    if (!r.ok) return 0
    const resto = h.slice(5)
    const riga = (await r.text()).split('\n').find((l) => l.trim().startsWith(resto))
    return riga ? Number(riga.split(':')[1]) || 0 : 0
  } catch {
    return 0
  }
}
