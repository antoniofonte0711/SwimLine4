async (page) => {
  const OUT = 'C:/Users/maipa/Documents/SwimLine4/strumenti/video-tutorial/schermate/'
  const BASE = 'http://localhost:5175'
  const browser = page.context().browser()
  const fatti = []
  const attesa = (ms) => new Promise((r) => setTimeout(r, ms))

  // scritta minimale in basso, come nel video
  const scritta = async (p, testo) => {
    await p.evaluate((t) => {
      document.getElementById('scritta-video')?.remove()
      if (!t) return
      const d = document.createElement('div')
      d.id = 'scritta-video'
      d.textContent = t
      Object.assign(d.style, {
        position: 'fixed', left: '50%', bottom: '96px', transform: 'translateX(-50%)', zIndex: 99999,
        background: 'rgba(10,26,47,0.88)', color: '#fff', font: '800 20px/1.25 Figtree, system-ui, sans-serif',
        padding: '12px 20px', borderRadius: '18px', textAlign: 'center', maxWidth: '330px', boxShadow: '0 10px 30px rgba(4,26,77,0.35)',
      })
      document.body.appendChild(d)
    }, testo)
  }
  const foto = async (p, nome, testo) => {
    await scritta(p, testo)
    await attesa(350)
    await p.screenshot({ path: OUT + nome + '.jpg', type: 'jpeg', quality: 92 })
    fatti.push(nome)
  }
  const contesto = async (chi) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 1080 / 390, isMobile: true, hasTouch: true })
    await ctx.addInitScript((c) => { try { localStorage.setItem('mock-utente', c) } catch {} }, chi)
    const p = await ctx.newPage()
    return { ctx, p }
  }
  // naviga dentro l'app senza ricaricare (i dati finti aggiunti restano in memoria)
  const vai = async (p, url) => {
    await p.evaluate((u) => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')) }, url)
    await attesa(1200)
  }

  // ---------- chi non è ancora entrato: ingresso e registrazione ----------
  {
    const { ctx, p } = await contesto('nessuno')
    await p.goto(BASE + '/'); await attesa(2500)
    // gruppi come quelli veri nella lista della registrazione
    await p.evaluate(async () => {
      const { supabase } = await import('/strumenti/finto-db/supabaseClient.js')
      await supabase.from('squadre').insert([{ id: 'csdc-cat', nome: 'C.S.D.C Categoria' }, { id: 'csdc-eso', nome: 'C.S.D.C esordienti' }])
    })
    await foto(p, '02a-ingresso', '')
    await vai(p, '/registrati'); await attesa(800)
    await p.fill('input >> nth=0', 'Giulia')
    await p.fill('input >> nth=1', 'Rossi')
    await p.locator('#data-nascita').click(); await p.keyboard.type('12032012')
    await foto(p, '03a-registrati', 'Nome e data come sul tesserino')
    const squadra = p.locator('select').filter({ hasText: 'Nessuna squadra per ora' })
    await squadra.scrollIntoViewIfNeeded()
    const opzioni = await squadra.locator('option').allTextContents()
    const cat = opzioni.find((o) => o.includes('C.S.D.C Categoria'))
    if (cat) await squadra.selectOption({ label: cat })
    await p.evaluate(() => window.scrollBy(0, -120))
    await foto(p, '03b-gruppo', 'Scegli il tuo gruppo')
    const email = p.locator('input[type="email"]')
    await email.scrollIntoViewIfNeeded(); await email.fill('giulia.rossi@esempio.it')
    await p.locator('input[type="password"]').first().fill('Bracciata!2026')
    await p.evaluate(() => window.scrollBy(0, 120))
    await foto(p, '03c-email', 'Email e password')
    await ctx.close()
  }

  // ---------- l'atleta: oggi, tempi, progressi, gare ----------
  {
    const { ctx, p } = await contesto('atleta')
    await p.goto(BASE + '/dashboard'); await attesa(3000)
    // allenamento di oggi per la squadra dell'atleta (solo nei dati finti, in memoria)
    await p.evaluate(async () => {
      const { supabase } = await import('/strumenti/finto-db/supabaseClient.js')
      const { data: { session } } = await supabase.auth.getSession()
      const { data: io } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      const oggi = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
      const r = (tipo_lavoro, ripetizioni, distanza, stile, extra = {}) => ({ tipo_lavoro, ripetizioni, distanza, stile, note: '', minuti: null, ripartenza: null, ...extra })
      await supabase.from('allenamenti_squadra').insert({
        id: 'oggi-video', squadra_id: io.squadra_id, coach_id: io.squadra_id, data: oggi, titolo: 'Velocità e misti', pubblicato: true, visibilita: 'squadra',
        righe: [
          r('Riscaldamento', 1, 400, 'Stile libero'),
          r('Tecnica', 8, 50, 'Misti', { note: 'gambe + braccia' }),
          r('B1', 6, 100, 'Stile libero', { ripartenza: `1'40"` }),
          r('Passo gara 100', 4, 50, 'Stile libero', { ripartenza: `1'30"` }),
          r('Defaticamento', 1, 200, 'Stile libero'),
        ],
      })
    })
    await vai(p, '/progressi'); await vai(p, '/dashboard'); await attesa(800)
    await foto(p, '05a-oggi', "L'allenamento di oggi")
    await p.evaluate(() => window.scrollBy(0, 420)); await attesa(500)
    await foto(p, '05b-lavori', 'Lavori, metri e fatica')
    await p.evaluate(() => window.scrollTo(0, 0))
    const oggi = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    await vai(p, '/allenamenti?data=' + oggi); await attesa(800)
    const scrivi = p.getByRole('button', { name: /Scrivi i tempi/ }).first()
    if (await scrivi.count()) { await scrivi.scrollIntoViewIfNeeded(); await scrivi.click(); await attesa(500) }
    const campi = p.locator('input[inputmode="decimal"], input[placeholder*="\'"]')
    const n = await campi.count()
    const tempi = ['1\'12"4', '1\'13"1', '1\'12"8']
    for (let i = 0; i < Math.min(3, n); i++) { await campi.nth(i).fill(tempi[i]); }
    if (n) await campi.first().scrollIntoViewIfNeeded()
    await p.evaluate(() => window.scrollBy(0, -140))
    await foto(p, '06a-tempi', 'Scrivi i tempi')
    const media = p.getByRole('button', { name: /scrivo la media/ }).first()
    if (await media.count()) { await media.scrollIntoViewIfNeeded(); await media.click(); await attesa(400); await p.evaluate(() => window.scrollBy(0, 100)) }
    await foto(p, '06b-media', 'Non ricordi tutto? Solo la media')
    await vai(p, '/progressi'); await attesa(1200)
    await foto(p, '07a-progressi', 'I tuoi progressi')
    await vai(p, '/record'); await attesa(1000)
    await foto(p, '07b-record', 'I tuoi record')
    await vai(p, '/gare'); await attesa(1000)
    await foto(p, '08a-gare', 'Le tue gare')
    await ctx.close()
  }
  return fatti.join(', ')
}
