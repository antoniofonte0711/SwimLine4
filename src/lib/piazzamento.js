// "Batteria 4: 3° posto" e "Unica Femmine: 19° su 70" (gare.piazzamento, scritto dalla funzione "risultati")
export function testoPiazzamento(p) {
  if (!p) return []
  const righe = []
  if (p.batteria && p.posto_batteria) righe.push(`Batteria ${p.batteria}: ${p.posto_batteria}° posto`)
  if (p.posizione) righe.push(`${p.categoria || 'Classifica'}: ${p.posizione}°${p.classificati ? ` su ${p.classificati}` : ''}`)
  return righe
}
