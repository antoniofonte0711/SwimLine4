import React from 'react'
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { CATTURE, COLORI } from './config'
import { FONT } from './stile'

// ---------- Acqua: i riflessi della vasca (immagine del logo) che scorrono piano, più un velo per leggere i testi ----------
export const Acqua: React.FC<{ scuro?: number; zoom?: number }> = ({ scuro = 0.35, zoom = 1 }) => {
  const f = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const lato = Math.max(width, height) * 1.25
  return (
    <AbsoluteFill style={{ background: COLORI.acqua[0], overflow: 'hidden' }}>
      <Img src={staticFile('brand/acqua.png')} style={{
        position: 'absolute', width: lato, height: lato * 2.4, objectFit: 'cover', left: (width - lato) / 2,
        top: -f * 0.9 - lato * 0.2, transform: `scale(${zoom})`, transformOrigin: '50% 30%',
      }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(4,26,77,${scuro * 0.5}) 0%, rgba(4,26,77,${scuro}) 70%, rgba(4,26,77,${scuro + 0.2}) 100%)` }} />
    </AbsoluteFill>
  )
}

// ---------- Cattura: le foto continue dell'app, riprodotte alla loro velocità ----------
export const Cattura: React.FC<{ nome: string; da: number }> = ({ nome, da }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const c = CATTURE[nome]
  const i = Math.max(0, Math.min(c.foto - 1, Math.floor(((f - da) / fps) * c.fps)))
  return <Img src={staticFile(`captures/${nome}/f${String(i).padStart(5, '0')}.jpg`)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
}

// ---------- Telefono: cornice blu notte, ombra profonda, schermo con lo zoom sui punti importanti ----------
export const Telefono: React.FC<{ larghezza: number; zoom?: { scala: number; y: number }; children: React.ReactNode; style?: React.CSSProperties }> = ({ larghezza, zoom, children, style }) => {
  const h = larghezza * 2
  const s = zoom?.scala ?? 1
  const oy = (zoom?.y ?? 0.5) * 100
  return (
    <div style={{
      position: 'absolute', width: larghezza + 28, height: h + 28, borderRadius: larghezza * 0.14, background: COLORI.notte, padding: 14,
      boxShadow: '0 60px 120px rgba(4,26,77,0.55), 0 20px 40px rgba(4,26,77,0.4), inset 0 0 0 2px rgba(255,255,255,0.08)', ...style,
    }}>
      <div style={{ width: larghezza, height: h, borderRadius: larghezza * 0.11, overflow: 'hidden', background: '#eef3fb', position: 'relative' }}>
        <div style={{ width: '100%', height: '100%', transform: `scale(${s})`, transformOrigin: `50% ${oy}%` }}>{children}</div>
      </div>
    </div>
  )
}

// ---------- Nota: pillola di testo che entra con una molla ----------
export const Nota: React.FC<{ testo: string; inizio: number; fine: number; style?: React.CSSProperties; grande?: boolean }> = ({ testo, inizio, fine, style, grande }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const dentro = spring({ frame: f - inizio, fps, config: { damping: 14, stiffness: 160 } })
  const fuori = spring({ frame: f - fine, fps, config: { damping: 20, stiffness: 200 } })
  const v = dentro - fuori
  if (f < inizio || v <= 0.001) return null
  return (
    <div style={{
      position: 'absolute', padding: grande ? '26px 40px' : '20px 32px', borderRadius: 999, background: 'rgba(255,255,255,0.96)', color: COLORI.notte,
      fontFamily: FONT.titoli, fontWeight: 800, fontSize: grande ? 58 : 46, lineHeight: 1.1, whiteSpace: 'nowrap',
      boxShadow: '0 24px 60px rgba(4,26,77,0.35)', opacity: Math.min(1, v * 1.4),
      transform: `translateY(${(1 - v) * 40}px) scale(${0.85 + 0.15 * v})`, filter: `blur(${(1 - Math.min(1, v)) * 8}px)`, ...style,
    }}>
      <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 7, background: COLORI.blu, marginRight: 18, verticalAlign: 'middle', position: 'relative', top: -4 }} />
      {testo}
    </div>
  )
}

// ---------- Corde: due file di galleggianti come nella vasca vera (rossi agli estremi, bianchi, blu) ----------
const COLORI_DISCO: Record<string, [string, string, string]> = {
  rosso: ['#7a0d08', '#d42a1e', '#ff6a55'], bianco: ['#8d9bb0', '#eef1f6', '#ffffff'], notte: ['#0b1550', '#1b2f8f', '#3f5bd0'], blu: ['#12308a', '#2a62de', '#6b9bff'],
}
const DISCO = 'M-9 -5 L9 -5 L12 -3.4 L14.5 -3.8 L13 -1.4 L15 0 L13 1.4 L14.5 3.8 L12 3.4 L9 5 L-9 5 L-12 3.4 L-14.5 3.8 L-13 1.4 L-15 0 L-13 -1.4 L-14.5 -3.8 L-12 -3.4 Z'
export const Corde: React.FC<{ xs: number[]; altezza: number; scala: number; entrata: number }> = ({ xs, altezza, scala, entrata }) => {
  const passo = 11 * scala
  const n = Math.ceil(altezza / passo) + 2
  return (
    <svg width="100%" height={altezza} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <defs>
        {Object.entries(COLORI_DISCO).map(([k, [s, c, l]]) => (
          <linearGradient key={k} id={`d${k}`} x1="0" x2="1">
            <stop offset="0" stopColor={s} /><stop offset="0.3" stopColor={c} /><stop offset="0.48" stopColor={l} /><stop offset="0.7" stopColor={c} /><stop offset="1" stopColor={s} />
          </linearGradient>
        ))}
      </defs>
      {xs.map((x, j) => (
        <g key={j} transform={`translate(0 ${-altezza * (1 - entrata) * (j % 2 ? 1.1 : 1)})`}>
          <line x1={x} y1={-altezza} x2={x} y2={altezza * 1.2} stroke="#0b1550" strokeWidth={1.4 * scala} opacity={0.5} />
          {Array.from({ length: n }, (_, k) => {
            const y = k * passo - passo
            const r = y / altezza
            const c = r < 0.14 || r > 0.9 ? 'rosso' : r < 0.38 ? 'bianco' : ['notte', 'notte', 'bianco', 'blu', 'blu', 'bianco'][k % 6]
            return <path key={k} d={DISCO} transform={`translate(${x} ${y}) scale(${scala})`} fill={`url(#d${c})`} stroke={COLORI_DISCO[c][0]} strokeWidth={0.8} />
          })}
        </g>
      ))}
    </svg>
  )
}

// ---------- Scritta del logo: "Swim" blu notte, "Line" blu, alone bianco ----------
export const ScrittaLogo: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <div style={{ fontFamily: FONT.logo, fontWeight: 900, fontSize: size, lineHeight: 1, whiteSpace: 'nowrap',
    textShadow: '0 0 10px #fff, 0 0 24px #fff, 0 0 44px rgba(255,255,255,0.75)', ...style }}>
    <span style={{ color: COLORI.notte }}>Swim</span><span style={{ color: COLORI.blu }}>Line</span>
  </div>
)

// ---------- Parole che entrano una a una (blur → nitide, dal basso, con molla) ----------
export const Parole: React.FC<{ testo: string; inizio: number; passo?: number; style?: React.CSSProperties; colore?: string }> = ({ testo, inizio, passo = 4, style, colore }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <div style={style}>
      {testo.split(' ').map((p, i) => {
        const v = spring({ frame: f - inizio - i * passo, fps, config: { damping: 13, stiffness: 140 } })
        return (
          <span key={i} style={{ display: 'inline-block', marginRight: '0.26em', opacity: interpolate(v, [0, 0.6], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `translateY(${(1 - v) * 60}px)`, filter: `blur(${(1 - v) * 14}px)`, color: colore }}>{p}</span>
        )
      })}
    </div>
  )
}

// ---------- Lista dei passaggi: elenco numerato che si costruisce mentre l'app li mostra ----------
// il passo in corso è acceso, quelli fatti prendono la spunta
export const ListaPassi: React.FC<{ passi: { testo: string; inizio: number; fine: number }[]; style?: React.CSSProperties }> = ({ passi, style }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', gap: 14, ...style }}>
      {passi.map((p, i) => {
        const v = spring({ frame: f - p.inizio, fps, config: { damping: 15, stiffness: 150 } })
        const fatto = i + 1 < passi.length && f >= passi[i + 1].inizio
        const acceso = !fatto && f >= p.inizio
        if (f < p.inizio) return null
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 20, padding: '14px 24px 14px 14px', borderRadius: 28,
            background: acceso ? 'rgba(255,255,255,0.97)' : 'rgba(10,26,47,0.38)', border: acceso ? 'none' : '2px solid rgba(255,255,255,0.18)',
            boxShadow: acceso ? '0 18px 50px rgba(4,26,77,0.4)' : 'none',
            opacity: Math.min(1, v * 1.4), transform: `translateX(${(1 - v) * -80}px) scale(${acceso ? 1 : 0.97})`, transformOrigin: 'left center',
            filter: `blur(${(1 - Math.min(1, v)) * 10}px)`,
          }}>
            <div style={{ flexShrink: 0, width: 58, height: 58, borderRadius: 29, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: fatto ? '#22c55e' : COLORI.blu, color: COLORI.bianco, fontFamily: FONT.titoli, fontWeight: 800, fontSize: 32 }}>
              {fatto ? '✓' : i + 1}
            </div>
            <div style={{ fontFamily: FONT.testo, fontWeight: 800, fontSize: 40, lineHeight: 1.15, color: acceso ? COLORI.notte : 'rgba(255,255,255,0.88)' }}>{p.testo}</div>
          </div>
        )
      })}
    </div>
  )
}
