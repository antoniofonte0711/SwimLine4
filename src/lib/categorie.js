// Categorie FIN (Regolamento Settore Nuoto 2025/26): stessa regola della funzione categoria_fin del database.
// Contano gli anni compiuti nell'anno in cui finisce la stagione (1 ottobre → 30 settembre).
// Maschi: ES B 10-11, ES A 12-13, Ragazzi 14-16, Juniores 17-18, Cadetti 19-20, Seniores da 21.
// Femmine: ES B 9-10, ES A 11-12, Ragazzi 13-14, Juniores 15-16, Cadetti 17-18, Seniores da 19.
const MASCHI = [[9, 'Propaganda'], [11, 'Esordienti B'], [13, 'Esordienti A'], [16, 'Ragazzi'], [18, 'Juniores'], [20, 'Cadetti']]
const FEMMINE = [[8, 'Propaganda'], [10, 'Esordienti B'], [12, 'Esordienti A'], [14, 'Ragazzi'], [16, 'Juniores'], [18, 'Cadetti']]

const cerca = (tabella, anni) => tabella.find(([fino]) => anni <= fino)?.[1] || 'Seniores'

// nascita: 'AAAA-MM-GG'; sesso: 'M' | 'F' | null (se manca e le categorie sono diverse: "Ragazzi o Juniores")
export function categoriaFin(nascita, sesso, oggi = new Date()) {
  if (!nascita) return null
  const anno = Number(String(nascita).slice(0, 4))
  if (!anno) return null
  const anni = oggi.getFullYear() + (oggi.getMonth() >= 9 ? 1 : 0) - anno
  const m = cerca(MASCHI, anni)
  const f = cerca(FEMMINE, anni)
  if (sesso === 'M') return m
  if (sesso === 'F') return f
  return m === f ? m : `${m} o ${f}`
}

export const SESSI = [['M', 'Maschile'], ['F', 'Femminile']]
