import { createContext, useContext } from 'react'
import { loadFont as cinzel } from '@remotion/google-fonts/CinzelDecorative'
import { loadFont as figtree } from '@remotion/google-fonts/Figtree'
import { loadFont as bricolage } from '@remotion/google-fonts/BricolageGrotesque'

// font del brand: titoli Bricolage Grotesque, testo Figtree, logo Cinzel Decorative
export const FONT = {
  logo: cinzel('normal', { weights: ['900'], subsets: ['latin'] }).fontFamily,
  testo: figtree('normal', { weights: ['600', '800'], subsets: ['latin'] }).fontFamily,
  titoli: bricolage('normal', { weights: ['800'], subsets: ['latin'] }).fontFamily,
}

// formato del video: in orizzontale il layout cambia (testi a sinistra, telefono a destra)
export const Formato = createContext({ orizzontale: false })
export const useFormato = () => useContext(Formato)
