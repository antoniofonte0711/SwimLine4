import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORI, FPS, Nota as NotaT, Scena } from './config'
import { Acqua, Cattura, Corde, ListaPassi, Parole, ScrittaLogo, Telefono } from './componenti'
import { FONT, useFormato } from './stile'

const molla = (f: number, da: number, fps: number, extra = {}) => spring({ frame: f - da, fps, config: { damping: 15, stiffness: 120, ...extra } })

// ---------- Hook: domanda d'apertura, parola per parola ----------
export const Hook: React.FC<{ s: Extract<Scena, { tipo: 'hook' }> }> = ({ s }) => {
  const f = useCurrentFrame()
  const { width } = useVideoConfig()
  const { orizzontale } = useFormato()
  const zoom = interpolate(f, [0, 90], [1.12, 1], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill>
      <Acqua scuro={0.62} zoom={zoom} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: orizzontale ? '0 220px' : '0 90px' }}>
        {s.righe.map((r, i) => (
          <Parole key={i} testo={r} inizio={4 + i * 10} style={{ fontFamily: FONT.titoli, fontWeight: 800, fontSize: orizzontale ? width * 0.06 : width * 0.105, lineHeight: 1.08, color: COLORI.bianco, letterSpacing: '-0.02em' }}
            colore={r === s.evidenzia ? '#8fb8ff' : undefined} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

// ---------- Logo: le corde entrano, la linea sul fondo si disegna, nasce il 4, poi SwimLine e il motto ----------
export const Logo: React.FC<{ s: Extract<Scena, { tipo: 'logo' }> }> = ({ s }) => {
  const f = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const { orizzontale } = useFormato()
  const corde = molla(f, 0, fps, { damping: 18, stiffness: 70 })
  const linea = interpolate(f, [16, 48], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3) })
  const quattro = interpolate(f, [44, 64], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3) })
  const nome = molla(f, 58, fps, { damping: 12, stiffness: 110 })
  const cx = width / 2
  const sp = orizzontale ? height * 0.05 : width * 0.06 // spessore della linea
  const top = height * (orizzontale ? 0.08 : 0.3), basso = height * (orizzontale ? 0.95 : 0.9)
  const meta = top + (basso - top) * 0.45, barra = top + (basso - top) * 0.68
  const lungDiag = (barra - meta) * 1.35
  return (
    <AbsoluteFill>
      <Acqua scuro={0.2} zoom={interpolate(f, [0, 160], [1.06, 1])} />
      {/* sul fondo, sfocata: la linea continua con la T, e il 4 che nasce dalla linea */}
      <div style={{ position: 'absolute', inset: 0, filter: 'blur(5px)', opacity: 0.75 }}>
        <div style={{ position: 'absolute', left: cx - sp / 2, top, width: sp, height: (basso - top) * linea, background: '#041d57', borderRadius: 6 }} />
        <div style={{ position: 'absolute', left: cx - sp * 2.2 * linea, top: basso - sp * 0.5, width: sp * 4.4 * linea, height: sp, background: '#041d57', borderRadius: 6, opacity: linea > 0.95 ? 1 : 0 }} />
        <div style={{ position: 'absolute', left: cx, top: meta, width: lungDiag * quattro, height: sp, background: '#041d57', borderRadius: 6, transformOrigin: '0 50%', transform: `rotate(126deg) translateY(${-sp / 2}px)` }} />
        <div style={{ position: 'absolute', left: cx - lungDiag * 0.8, top: barra, width: lungDiag * 1.3 * quattro, height: sp, background: '#041d57', borderRadius: 6 }} />
      </div>
      <Corde xs={orizzontale ? [width * 0.2, width * 0.8] : [width * 0.07, width * 0.93]} altezza={height} scala={orizzontale ? 1.9 : 2.2} entrata={corde} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: orizzontale ? 'center' : 'flex-start', paddingTop: orizzontale ? 0 : height * 0.1 }}>
        <ScrittaLogo size={orizzontale ? width * 0.08 : width * 0.118} style={{ transform: `scale(${0.6 + 0.4 * nome})`, opacity: nome, letterSpacing: `${(1 - nome) * 20}px` }} />
        <Parole testo={s.claim} inizio={86} passo={3} style={{ marginTop: orizzontale ? 40 : 46, fontFamily: FONT.titoli, fontWeight: 800, fontSize: orizzontale ? 52 : 54, maxWidth: orizzontale ? 1100 : 780, color: COLORI.bianco, textShadow: '0 4px 24px rgba(4,26,77,0.9)', textAlign: 'center' }} />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

// ---------- Cos'è: tre frasi a cascata e il telefono che galleggia ----------
export const Cose: React.FC<{ s: Extract<Scena, { tipo: 'cose' }> }> = ({ s }) => {
  const f = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const { orizzontale } = useFormato()
  const tel = molla(f, 8, fps, { damping: 16, stiffness: 90 })
  const galleggia = Math.sin(f / 18) * 10
  const lt = orizzontale ? height * 0.33 : width * 0.5
  return (
    <AbsoluteFill>
      <Acqua scuro={0.45} />
      <AbsoluteFill style={{ padding: orizzontale ? '0 0 0 150px' : `${height * 0.08}px 80px 0`, justifyContent: orizzontale ? 'center' : 'flex-start' }}>
        {s.righe.map((r, i) => (
          <Parole key={i} testo={r} inizio={6 + i * 14} passo={3} style={{ fontFamily: FONT.titoli, fontWeight: 800, fontSize: orizzontale ? 84 : 80, lineHeight: 1.15, color: i === 2 ? '#8fb8ff' : COLORI.bianco, letterSpacing: '-0.02em' }} />
        ))}
      </AbsoluteFill>
      <Telefono larghezza={lt} style={{
        left: orizzontale ? width * 0.66 - lt / 2 : width / 2 - lt / 2 - 14, top: (orizzontale ? height * 0.1 : height * 0.36) + (1 - tel) * height * 0.6 + galleggia,
        transform: `rotate(${(1 - tel) * -8 + (orizzontale ? -4 : -3)}deg)`,
      }}>
        <Cattura nome={s.cattura} da={8} />
      </Telefono>
    </AbsoluteFill>
  )
}

// ---------- Capitolo: numero e titolo a tutto schermo, poi il telefono sale e mostra l'app con zoom e note ----------
const ENTRA = 26 // frame: il titolo prende lo schermo, poi arriva il telefono
export const Capitolo: React.FC<{ s: Extract<Scena, { tipo: 'capitolo' }>; durata: number }> = ({ s, durata }) => {
  const f = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const { orizzontale } = useFormato()
  const titolo = molla(f, 0, fps, { damping: 13, stiffness: 140 })
  const su = molla(f, ENTRA - 6, fps, { damping: 17, stiffness: 100 })
  const tel = molla(f, ENTRA - 4, fps, { damping: 16, stiffness: 90 })
  const num = String(s.numero).padStart(2, '0')

  // zoom: ogni nota con zoom spinge lo schermo verso il suo punto, poi torna
  const note = s.passi.map((n: NotaT, i) => {
    const inizio = ENTRA + Math.round(n.da * FPS)
    const fine = i + 1 < s.passi.length ? ENTRA + Math.round(s.passi[i + 1].da * FPS) - 6 : durata - 8
    return { ...n, inizio, fine }
  })
  let scala = 1, y = 0.5
  for (const n of note) {
    if (!n.zoom) continue
    const v = molla(f, n.inizio + 4, fps, { damping: 20, stiffness: 80 }) - molla(f, n.fine, fps, { damping: 20, stiffness: 90 })
    if (v > 0.001) { scala = 1 + (Math.min(n.zoom.scala, 1.22) - 1) * v; y = n.zoom.y }
  }

  // titolo: grande al centro, poi sale nell'intestazione
  const grande = orizzontale ? 150 : 170
  const piccolo = orizzontale ? 100 : 84
  const sizeTitolo = interpolate(su, [0, 1], [grande, piccolo])
  const yTitolo = interpolate(su, [0, 1], [height * 0.42, orizzontale ? height * 0.16 : height * 0.075])
  const xTitolo = orizzontale ? interpolate(su, [0, 1], [width / 2, width * 0.28]) : width / 2
  const lt = orizzontale ? height * 0.43 : width * 0.44
  return (
    <AbsoluteFill>
      <Acqua scuro={0.5} zoom={interpolate(f, [0, durata], [1.05, 1])} />
      {/* numero dello step, enorme e trasparente dietro */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: height * 0.18, textAlign: orizzontale ? 'left' : 'center', paddingLeft: orizzontale ? 110 : 0,
        fontFamily: FONT.titoli, fontWeight: 800, fontSize: orizzontale ? 520 : 560, lineHeight: 1, color: 'rgba(255,255,255,0.07)',
        transform: `translateY(${(1 - titolo) * 120}px)`, opacity: titolo,
      }}>{num}</div>
      <div style={{ position: 'absolute', left: xTitolo, top: yTitolo, transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * titolo})`, opacity: titolo, textAlign: 'center', width: orizzontale ? width * 0.5 : width * 0.9 }}>
        <div style={{ display: 'inline-block', fontFamily: FONT.testo, fontWeight: 800, fontSize: sizeTitolo * 0.32, color: COLORI.notte, background: COLORI.bianco, borderRadius: 999, padding: '6px 22px', marginBottom: 12 }}>
          STEP {num}
        </div>
        <div style={{ fontFamily: FONT.titoli, fontWeight: 800, fontSize: sizeTitolo, lineHeight: 1, color: COLORI.bianco, letterSpacing: '-0.03em', textShadow: '0 8px 40px rgba(4,26,77,0.6)' }}>{s.titolo}</div>
      </div>
      <Telefono larghezza={lt} zoom={{ scala, y }} style={{
        left: orizzontale ? width * 0.7 - lt / 2 : width / 2 - lt / 2 - 14,
        top: (orizzontale ? height * 0.04 : height * 0.135) + (1 - tel) * height,
        transform: `rotate(${(1 - tel) * 10}deg)`,
      }}>
        <Cattura nome={s.cattura} da={ENTRA} />
      </Telefono>
      <ListaPassi passi={note} style={orizzontale
        ? { left: 110, top: height * 0.3, width: width * 0.7 - lt / 2 - 170 }
        : { left: 70, right: 70, top: height * 0.135 + lt * 2 + 70 }} />
    </AbsoluteFill>
  )
}

// ---------- Outro: tre parole, il logo, l'invito ----------
export const Outro: React.FC<{ s: Extract<Scena, { tipo: 'outro' }> }> = ({ s }) => {
  const f = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const { orizzontale } = useFormato()
  const logo = molla(f, 30, fps, { damping: 12, stiffness: 110 })
  const invito = molla(f, 52, fps)
  return (
    <AbsoluteFill>
      <Acqua scuro={0.4} zoom={interpolate(f, [0, 180], [1, 1.1])} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: orizzontale ? 40 : 60 }}>
        <div style={{ display: 'flex', gap: orizzontale ? 36 : 22, flexWrap: 'wrap', justifyContent: 'center' }}>
          {s.parole.map((p, i) => {
            const v = molla(f, i * 6, fps, { damping: 12, stiffness: 170 })
            return (
              <div key={p} style={{ fontFamily: FONT.titoli, fontWeight: 800, fontSize: orizzontale ? 64 : 62, color: COLORI.bianco, padding: '14px 30px', borderRadius: 999,
                background: 'rgba(255,255,255,0.14)', border: '2px solid rgba(255,255,255,0.35)', transform: `scale(${v}) translateY(${(1 - v) * 40}px)`, opacity: v }}>{p}</div>
            )
          })}
        </div>
        <ScrittaLogo size={orizzontale ? width * 0.09 : width * 0.15} style={{ transform: `scale(${0.5 + 0.5 * logo})`, opacity: logo }} />
        <div style={{ textAlign: 'center', opacity: invito, transform: `translateY(${(1 - invito) * 50}px)` }}>
          <div style={{ display: 'inline-block', fontFamily: FONT.titoli, fontWeight: 800, fontSize: orizzontale ? 56 : 58, color: COLORI.notte, background: COLORI.bianco, padding: '22px 46px', borderRadius: 999, boxShadow: '0 24px 60px rgba(4,26,77,0.4)' }}>{s.invito}</div>
          <div style={{ marginTop: 26, fontFamily: FONT.testo, fontWeight: 800, fontSize: orizzontale ? 40 : 44, color: COLORI.bianco }}>{s.link}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
