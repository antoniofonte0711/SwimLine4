// VERIFICA 05 — Giro di tutte le pagine per ogni ruolo e larghezza, sul FINTO database (nessun dato reale).
// 1) preview_start "swimline4-finto-db" (http://localhost:5175)  2) incolla questo codice con javascript_tool
// sulla scheda dell'app  3) dopo ~3 minuti leggi window.__giro.join('\n').
// Per ogni pagina: dove finisce (i permessi rimandano altrove), errori JS, scorrimento laterale, testo vuoto.
// Atteso (11/10/2026): nessun "ERR", nessun "SCROLL"; coach -> /admin rimanda a /dashboard; atleta e genitore
// non entrano in /presenze /impostazioni /risultati /admin; il genitore non entra in /allenamenti e /punti.
window.__giro = []; window.__giroFinito = false;
(async () => {
  const ruoli = ['admin', 'coach', 'atleta', 'genitore']
  const larghezze = [375, 1280]
  const pagine = ['/dashboard', '/riepilogo', '/funzioni', '/profilo', '/notifiche', '/allenamenti', '/gare', '/storico',
    '/progressi', '/previsioni', '/record', '/squadra', '/calendario', '/punti', '/presenze', '/impostazioni', '/risultati',
    '/video', '/admin', '/guida', '/privacy', '/lavori']
  for (const r of ruoli) {
    localStorage.setItem('mock-utente', r)
    for (const w of larghezze) {
      for (const p of pagine) {
        const f = document.createElement('iframe')
        f.style.cssText = `width:${w}px;height:900px;position:fixed;left:-5000px;top:0`
        document.body.appendChild(f)
        f.src = p
        await Promise.race([new Promise((ok) => { f.onload = ok }), new Promise((ok) => setTimeout(ok, 6000))])
        const errori = []
        try {
          f.contentWindow.addEventListener('error', (e) => errori.push(e.message))
          const orig = f.contentWindow.console.error
          f.contentWindow.console.error = (...a) => { errori.push(a.map(String).join(' ').slice(0, 120)); orig(...a) }
        } catch { /* ignora */ }
        await new Promise((ok) => setTimeout(ok, 1500))
        const d = f.contentWindow.document
        const scroll = d.documentElement.scrollWidth > d.documentElement.clientWidth
        const testo = (d.body.innerText || '').trim().length
        const dove = f.contentWindow.location.pathname
        // tasti troppo piccoli per un dito (sotto 24×24 px, minimo WCAG 2.2), solo sul telefono
        const piccoli = w > 500 ? [] : [...d.querySelectorAll('button, a[href], select, input:not([type=hidden]), [role=switch], [role=tab]')]
          .filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && (b.width < 24 || b.height < 24) })
          .map((el) => (el.getAttribute('aria-label') || el.innerText || el.type || el.tagName).trim().slice(0, 25))
        window.__giro.push(`${r} ${w} ${p}${dove !== p ? ' -> ' + dove : ''}${scroll ? ' SCROLL' : ''}${testo < 40 ? ' VUOTA' : ''}${piccoli.length ? ' PICCOLI(' + piccoli.length + '): ' + [...new Set(piccoli)].slice(0, 4).join(' / ') : ''}${errori.length ? ' ERR ' + errori.join(' | ') : ''}`)
        f.remove()
      }
    }
  }
  localStorage.setItem('mock-utente', 'admin')
  window.__giroFinito = true
})()
