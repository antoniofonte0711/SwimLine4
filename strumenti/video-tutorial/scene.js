async (page) => {
  // Scene animate del tutorial: l'app vera (database finto, atleta di prova) usata davanti alla "telecamera".
  // Ogni scena è un video .webm in scene/, lungo più o meno quanto la voce della sua parte.
  const DIR = 'C:/Users/maipa/Documents/SwimLine4/strumenti/video-tutorial/scene/'
  const BASE = 'http://localhost:5175'
  const browser = page.context().browser()
  const fatte = []
  const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

  // cerchio che mostra dove si tocca + scorrimento morbido
  const aiuti = () => {
    addEventListener('pointerdown', (e) => {
      const c = document.createElement('div')
      Object.assign(c.style, { position: 'fixed', left: e.clientX - 22 + 'px', top: e.clientY - 22 + 'px', width: '44px', height: '44px', borderRadius: '50%',
        background: 'rgba(37,99,235,0.35)', border: '3px solid rgba(255,255,255,0.95)', zIndex: 999999, pointerEvents: 'none', transition: 'transform .45s, opacity .45s' })
      document.body.appendChild(c)
      requestAnimationFrame(() => { c.style.transform = 'scale(1.6)'; c.style.opacity = '0' })
      setTimeout(() => c.remove(), 500)
    }, true)
    document.documentElement.style.scrollBehavior = 'smooth'
  }
  const SOLO = null // per rifare solo alcune scene: ['s1-cose']
  const tempi = {}
  const scena = async (nome, chi, url, fn) => {
    if (SOLO && !SOLO.includes(nome)) return
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: false })
    await ctx.addInitScript((c) => { try { localStorage.setItem('mock-utente', c) } catch {} }, chi)
    await ctx.addInitScript(aiuti)
    const p = await ctx.newPage()
    // la pagina si apre prima di cominciare a fotografare (la prima foto durante il caricamento si blocca)
    await p.goto(BASE + url); await pausa(2200)
    // foto continue (circa 10 al secondo) finché la scena non è finita; si annota quando è stata fatta ognuna
    let finita = false
    const t0 = Date.now(), quando = []
    const foto = (async () => {
      for (let i = 0; !finita; i++) {
        try { await p.screenshot({ path: DIR + nome + '/f' + String(i).padStart(5, '0') + '.jpg', type: 'jpeg', quality: 86 }); quando.push(Date.now() - t0) }
        catch { quando.push(null) }
      }
    })()
    await fn(p)
    finita = true
    await foto
    await ctx.close()
    tempi[nome] = quando
    fatte.push(nome)
  }
  const tocca = async (p, loc) => { await loc.scrollIntoViewIfNeeded(); await pausa(250); await loc.click(); await pausa(400) }
  const scorri = async (p, dy, ms = 900) => { await p.mouse.wheel(0, dy); await pausa(ms) }
  const vai = async (p, url) => { await p.evaluate((u) => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')) }, url); await pausa(900) }

  // 1. cos'è: la pagina d'ingresso
  await scena('s1-cose', 'nessuno', '/', async (p) => {
    await pausa(600)
    await scorri(p, 260, 2500); await scorri(p, -260, 2500); await pausa(2500)
  })

  // 2. registrazione
  await scena('s2-registrati', 'nessuno', '/', async (p) => {
    await p.evaluate(async () => {
      const { supabase } = await import('/strumenti/finto-db/supabaseClient.js')
      await supabase.from('squadre').insert([{ id: 'csdc-cat', nome: 'C.S.D.C Categoria' }, { id: 'csdc-eso', nome: 'C.S.D.C esordienti' }])
    })
    await tocca(p, p.getByRole('link', { name: /Registrati/ }).first())
    await pausa(600)
    await p.locator('input').nth(0).click(); await p.keyboard.type('Giulia', { delay: 70 })
    await p.locator('input').nth(1).click(); await p.keyboard.type('Rossi', { delay: 70 })
    await tocca(p, p.locator('#data-nascita')); await p.keyboard.type('12032012', { delay: 80 })
    await scorri(p, 300, 700)
    const sq = p.locator('select').filter({ hasText: 'Nessuna squadra per ora' })
    await sq.scrollIntoViewIfNeeded(); await pausa(300)
    const cat = (await sq.locator('option').allTextContents()).find((o) => o.includes('C.S.D.C Categoria'))
    await sq.click().catch(() => {}); if (cat) await sq.selectOption({ label: cat }); await pausa(700)
    const em = p.locator('input[type="email"]')
    await em.scrollIntoViewIfNeeded(); await em.click(); await p.keyboard.type('giulia.rossi@esempio.it', { delay: 45 })
    await p.locator('input[type="password"]').first().click(); await p.keyboard.type('Bracciata!26', { delay: 60 })
    await scorri(p, 300, 1200)
  })

  // 3. oggi (con un allenamento di oggi nei dati finti)
  await scena('s3-oggi', 'atleta', '/dashboard', async (p) => {
    await pausa(800)
    await scorri(p, 380, 1800); await scorri(p, 300, 1800); await scorri(p, -680, 1600)
  })

  // 4. scrivi i tempi
  await scena('s4-tempi', 'atleta', '/dashboard', async (p) => {
    await pausa(500)
    const scrivi = p.getByRole('link', { name: /Scrivi i tempi/ }).first()
    if (await scrivi.count()) await tocca(p, scrivi); else await vai(p, '/allenamenti')
    await pausa(1000)
    // l'atleta apre il lavoro di cui ha i tempi
    const apri = p.getByRole('button', { name: /\+ Scrivi i tempi/ }).nth(1)
    if (await apri.count()) await tocca(p, apri)
    await pausa(500)
    const campi = p.locator('input[inputmode="decimal"]')
    const tempi = ['11240', '11310', '11280']
    for (let i = 0; i < Math.min(3, await campi.count()); i++) {
      await campi.nth(i).scrollIntoViewIfNeeded(); await campi.nth(i).click(); await p.keyboard.type(tempi[i], { delay: 110 }); await pausa(250)
    }
    const media = p.getByRole('button', { name: /scrivo la media/ }).first()
    if (await media.count()) await tocca(p, media)
    await pausa(1600)
  })

  // 5. i miei tempi: progressi e record
  await scena('s5-progressi', 'atleta', '/dashboard', async (p) => {
    await pausa(500)
    await tocca(p, p.getByRole('link', { name: /I miei tempi/ }).first()); await pausa(1300)
    await scorri(p, 260, 1300)
    const rec = p.getByRole('button', { name: /^Record$/ }).first()
    if (await rec.count()) { await scorri(p, -260, 700); await tocca(p, rec) } else await vai(p, '/record')
    await pausa(1800)
  })

  // 6. gare
  await scena('s6-gare', 'atleta', '/dashboard', async (p) => {
    await pausa(500)
    await tocca(p, p.getByRole('link', { name: /^Gare$/ }).first()); await pausa(1500)
    await scorri(p, 220, 1500)
  })
  return JSON.stringify(tempi)
}
