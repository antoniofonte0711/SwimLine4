import React from 'react'
import { AbsoluteFill, Audio, Sequence, getStaticFiles, interpolate, staticFile, useVideoConfig } from 'remotion'
import { TransitionSeries, springTiming, TransitionPresentation } from '@remotion/transitions'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import { fade } from '@remotion/transitions/fade'
import { MUSICA, RIPRESA_MUSICA, SCENE, TRANSIZIONE, frameDi } from './config'
import { Capitolo, Cose, Hook, Logo, Outro } from './scene'
import { Formato } from './stile'

// transizioni: tagli rapidi e diversi tra loro, sempre con la molla
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transizioni: (() => TransitionPresentation<any>)[] = [
  () => fade(),
  () => wipe({ direction: 'from-bottom' }),
  () => slide({ direction: 'from-right' }),
  () => slide({ direction: 'from-bottom' }),
  () => wipe({ direction: 'from-left' }),
]
const tempo = springTiming({ config: { damping: 200 }, durationInFrames: TRANSIZIONE })

export const Video: React.FC<{ orizzontale: boolean }> = ({ orizzontale }) => {
  const { durationInFrames, fps } = useVideoConfig()
  const musica = getStaticFiles().some((x) => x.name === MUSICA.file)
  return (
    <Formato.Provider value={{ orizzontale }}>
      <AbsoluteFill style={{ background: '#041a4d' }}>
        <TransitionSeries>
          {SCENE.flatMap((s, i) => {
            const d = frameDi(s.durata)
            const pezzo = (
              <TransitionSeries.Sequence key={s.id} durationInFrames={d}>
                {s.tipo === 'hook' && <Hook s={s} />}
                {s.tipo === 'logo' && <Logo s={s} />}
                {s.tipo === 'cose' && <Cose s={s} />}
                {s.tipo === 'capitolo' && <Capitolo s={s} durata={d} />}
                {s.tipo === 'outro' && <Outro s={s} />}
              </TransitionSeries.Sequence>
            )
            if (i === 0) return [pezzo]
            return [<TransitionSeries.Transition key={s.id + '-t'} presentation={transizioni[i % transizioni.length]()} timing={tempo} />, pezzo]
          })}
        </TransitionSeries>
        {/* musica (solo se public/music.mp3 esiste): apertura del brano, poi dissolvenza incrociata sul finale */}
        {musica && (() => {
          const giunta = MUSICA.apertura * fps, mezzo = (MUSICA.incrocio * fps) / 2
          const dopo = durationInFrames - (giunta - mezzo)
          return (
            <>
              <Audio src={staticFile(MUSICA.file)} trimAfter={Math.round(giunta + mezzo)}
                volume={(f) => MUSICA.volume * interpolate(f, [giunta - mezzo, giunta + mezzo], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
              <Sequence from={Math.round(giunta - mezzo)}>
                <Audio src={staticFile(MUSICA.file)} trimBefore={Math.round(RIPRESA_MUSICA * fps - mezzo)}
                  volume={(f) => MUSICA.volume * Math.min(
                    interpolate(f, [0, mezzo * 2], [0, 1], { extrapolateRight: 'clamp' }),
                    interpolate(f, [dopo - MUSICA.fadeOut * fps, dopo], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                  )} />
              </Sequence>
            </>
          )
        })()}
      </AbsoluteFill>
    </Formato.Provider>
  )
}
