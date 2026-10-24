import React from 'react'
import { Composition } from 'remotion'
import { DURATA_TOTALE, FPS } from './config'
import { Video } from './Video'

export const Root: React.FC = () => (
  <>
    <Composition id="Tutorial9x16" component={Video} durationInFrames={DURATA_TOTALE} fps={FPS} width={1080} height={1920} defaultProps={{ orizzontale: false }} />
    <Composition id="Tutorial16x9" component={Video} durationInFrames={DURATA_TOTALE} fps={FPS} width={1920} height={1080} defaultProps={{ orizzontale: true }} />
  </>
)
