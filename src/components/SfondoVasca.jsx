import { useEffect, useState } from 'react'

// Sfondo della schermata d'ingresso: una vasca vista dall'alto.
// Acqua profonda, riflessi di luce che si muovono sul fondo (due strati fermi che scorrono piano: leggero anche sui telefoni),
// le linee nere sul fondo e le corde delle 4 corsie (il "4" di SwimLine4): rosse vicino ai bordi, bianche e blu al centro.
// Le corsie si allargano o stringono con lo schermo, così le 4 corde si vedono sempre (anche sul telefono in verticale).

const PASSO = 22

// Larghezza visibile della vasca (su 1000) per uno schermo largo w e alto h
function largaVisibile() {
  if (typeof window === 'undefined') return 1000
  return Math.min(1000, Math.max(300, (window.innerWidth / window.innerHeight) * 1000))
}

function Corda({ x, i }) {
  const n = Math.ceil(1000 / PASSO) + 2
  return (
    <g className="corda-vasca" style={{ animationDelay: `${-i * 1.7}s` }}>
      {Array.from({ length: n }, (_, k) => {
        const y = k * PASSO - PASSO
        const vicinoBordo = y < 110 || y > 890
        const colore = vicinoBordo ? '#e5402a' : k % 2 ? '#ffffff' : '#2f6df2'
        return <ellipse key={k} cx={x} cy={y} rx="7" ry="9" fill={colore} opacity={vicinoBordo ? 0.95 : 0.85} />
      })}
    </g>
  )
}

export default function SfondoVasca() {
  const [visibile, setVisibile] = useState(largaVisibile)
  useEffect(() => {
    const f = () => setVisibile(largaVisibile())
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])

  // 5 corsie larghe uguali dentro la parte visibile: le 4 corde stanno tra una corsia e l'altra
  const corsia = visibile / 5
  const inizio = 500 - visibile / 2
  const corde = [1, 2, 3, 4].map((k) => inizio + k * corsia)
  const centri = [0, 1, 2, 3, 4].map((k) => inizio + (k + 0.5) * corsia)
  const t = Math.min(40, corsia * 0.35)

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="acqua" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a3fbf" />
            <stop offset="0.55" stopColor="#0b5fe0" />
            <stop offset="1" stopColor="#1aa3e8" />
          </linearGradient>
          {/* riflessi: rumore trasformato in sottili reticoli luminosi */}
          <filter id="riflessi" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.011 0.016" numOctaves="2" seed="7" result="r" />
            <feColorMatrix in="r" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.6 1.55" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0 0 0 0.05 0.7 0.05 0 0 0" />
            </feComponentTransfer>
          </filter>
          <filter id="riflessi2" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.014 0.01" numOctaves="2" seed="23" result="r" />
            <feColorMatrix in="r" type="matrix" values="0 0 0 0 0.8  0 0 0 0 0.95  0 0 0 0 1  0 0 0 -2.6 1.55" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0 0 0 0.04 0.55 0.04 0 0 0" />
            </feComponentTransfer>
          </filter>
          <radialGradient id="luce" cx="0.5" cy="0.38" r="0.6">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1000" height="1000" fill="url(#acqua)" />

        {/* linee sul fondo, al centro di ogni corsia, con la "T" alle estremità */}
        {centri.map((x) => (
          <g key={x} fill="#06286f" opacity="0.32">
            <rect x={x - 9} y="120" width="18" height="760" rx="4" />
            <rect x={x - t} y="112" width={t * 2} height="16" rx="4" />
            <rect x={x - t} y="872" width={t * 2} height="16" rx="4" />
          </g>
        ))}

        <g className="riflessi-vasca" opacity="0.5" style={{ mixBlendMode: 'screen' }}>
          <rect x="-200" y="-200" width="1400" height="1400" filter="url(#riflessi)" />
        </g>
        <g className="riflessi-vasca riflessi-vasca-2" opacity="0.4" style={{ mixBlendMode: 'screen' }}>
          <rect x="-200" y="-200" width="1400" height="1400" filter="url(#riflessi2)" />
        </g>

        {corde.map((x, i) => <Corda key={i} x={x} i={i} />)}

        <rect width="1000" height="1000" fill="url(#luce)" />
      </svg>
      {/* velo scuro al centro: il testo resta leggibile */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(4,26,77,0.55)_0%,rgba(4,26,77,0.15)_55%,transparent_80%)]" />
    </div>
  )
}
