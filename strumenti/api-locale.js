// Sul PC (npm run dev o finto-db) Vite non esegue le funzioni di /api come fa Vercel:
// questo plugin fa rispondere /api/fin con lo stesso codice. Solo in sviluppo, senza controllo del login.
export default function apiLocale() {
  return {
    name: 'api-locale',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/fin', async (req, res) => {
        const { default: handler } = await server.ssrLoadModule('/api/fin.js')
        const url = new URL(req.url, 'http://localhost')
        const risposta = {
          status(c) { res.statusCode = c; return risposta },
          setHeader: (k, v) => res.setHeader(k, v),
          json(o) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)) },
        }
        await handler(Object.assign(req, { query: Object.fromEntries(url.searchParams), locale: true }), risposta)
      })
    },
  }
}
