// Avviso unico per le letture dal database che non vanno a buon fine.
// Senza questo, una lettura fallita (rete lenta, permesso negato) mostrava
// "Nessun allenamento" come se i dati non ci fossero.

const ascoltatori = new Set()

export function ascoltaErrori(fn) {
  ascoltatori.add(fn)
  return () => ascoltatori.delete(fn)
}

export function segnalaErrore(tipo) {
  ascoltatori.forEach((fn) => fn(tipo))
}

// Solo le letture dei dati (GET su /rest/v1): login e salvataggi mostrano già i loro messaggi.
// 406 = .single() senza risultati, non è un guasto.
const eLettura = (input, init) => {
  const url = typeof input === 'string' ? input : input?.url || ''
  const metodo = (init?.method || input?.method || 'GET').toUpperCase()
  return metodo === 'GET' && url.includes('/rest/v1/')
}

export function creaFetchControllato(fetchVero = (...a) => fetch(...a)) {
  return async (input, init) => {
    const lettura = eLettura(input, init)
    try {
      const res = await fetchVero(input, init)
      if (lettura && res.status >= 400 && res.status !== 406) segnalaErrore('server')
      return res
    } catch (e) {
      if (lettura && e?.name !== 'AbortError') segnalaErrore('rete')
      throw e
    }
  }
}
