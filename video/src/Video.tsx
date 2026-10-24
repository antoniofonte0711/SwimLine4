import React from 'react'
import { AbsoluteFill, Audio, getStaticFiles, interpolate, staticFile, useVideoConfig } from 'remotion'
import { TransitionSeries, springTiming, TransitionPresentation } from '@remotion/transitions'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import { fade } from '@remotion/transitions/fade'
import { INIZIO_MUSICA, MUSICA, SCENE, TRANSIZIONE, frameDi } from './config'
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
        {/* musica: c'è solo se public/music.mp3 esiste; si usa il finale del brano */}
        {musica && (
          <Audio src={staticFile(MUSICA.file)} trimBefore={Math.round(INIZIO_MUSICA * fps)} volume={(f) => MUSICA.volume * Math.min(
            interpolate(f, [0, MUSICA.fadeIn * fps], [0, 1], { extrapolateRight: 'clamp' }),
            interpolate(f, [durationInFrames - MUSICA.fadeOut * fps, durationInFrames], [1, 0], { extrapolateLeft: 'clamp' }),
          )} />
        )}
      </AbsoluteFill>
    </Formato.Provider>
  )
}
