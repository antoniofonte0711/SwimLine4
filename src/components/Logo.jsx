// Logo di SwimLine4 (corsia 4 vista dall'alto): le immagini stanno in public/, il disegno sorgente in strumenti/logo.
// Marchio: l'icona quadrata dell'app. LogoCompleto: la vasca con la scritta SwimLine.

export function Marchio({ className = 'w-10 h-10', etichetta }) {
  return (
    <img src="/icons/icon-192.png" width="192" height="192" alt={etichetta || ''} aria-hidden={etichetta ? undefined : 'true'}
      className={`${className} rounded-[22%] shrink-0 object-cover`} />
  )
}

export function LogoCompleto({ className = 'w-full max-w-[340px]' }) {
  return (
    <img src="/logo/swimline4-logo.png" width="1200" height="840" alt="SwimLine4"
      className={`${className} h-auto rounded-[24px] shadow-[0_18px_48px_rgba(4,26,77,0.45)]`} />
  )
}
