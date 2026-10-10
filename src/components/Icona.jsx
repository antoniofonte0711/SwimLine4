// Icone disegnate (le emoji cambiano aspetto da un telefono all'altro): tratto sottile, colore dal testo (currentColor)
const ICONE = {
  onde: <><path d="M2 15c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" /><path d="M2 19.5c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" /><circle cx="15" cy="6" r="2.2" /><path d="M5 11.5 9 8l3 2.5" /></>,
  grafico: <><path d="M3 17l5-5 4 3 8-8" /><path d="M15 7h5v5" /></>,
  griglia: <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>,
  persona: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  cronometro: <><circle cx="12" cy="13.5" r="7.5" /><path d="M12 9.5v4l2.5 2" /><path d="M10 2.5h4" /><path d="M12 2.5V6" /></>,
  libro: <><path d="M5 4.5h11a3 3 0 0 1 3 3v12.5H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></>,
  spunta: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>,
  coppa: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5.5a2.5 2.5 0 0 0 2.7 4" /><path d="M16 6h2.5a2.5 2.5 0 0 1-2.7 4" /><path d="M12 13v4" /><path d="M8.5 20h7" /><path d="M10 17h4" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="3" /><path d="M16 10.5l5-3v9l-5-3" /></>,
  medaglia: <><path d="M7.5 3l3 6.5" /><path d="M16.5 3l-3 6.5" /><circle cx="12" cy="15" r="5.5" /><path d="M12 12.5v5" /></>,
  archivio: <><rect x="3" y="4" width="18" height="5" rx="1.5" /><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" /><path d="M10 13h4" /></>,
  gruppo: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14.5c2.4 0 4 1.8 4 4.5" /></>,
  calendario: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17" /><path d="M8 3v4" /><path d="M16 3v4" /></>,
  stella: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  campanella: <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  regolazioni: <><path d="M4 7h10" /><path d="M18 7h2" /><circle cx="16" cy="7" r="2" /><path d="M4 17h4" /><path d="M12 17h8" /><circle cx="10" cy="17" r="2" /></>,
}

export default function Icona({ nome, className = 'w-6 h-6', spessore = 1.9 }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth={spessore} strokeLinecap="round" strokeLinejoin="round">
      {ICONE[nome]}
    </svg>
  )
}
