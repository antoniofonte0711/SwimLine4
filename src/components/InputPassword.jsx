import { useState } from 'react'

// Campo password con l'occhio per mostrare o nascondere quello che si scrive
export default function InputPassword({ value, onChange, className = '', autoComplete = 'current-password', required = true }) {
  const [visibile, setVisibile] = useState(false)
  // il margine sotto va al contenitore, così l'occhio resta centrato nel campo
  const margine = className.split(' ').filter((c) => /^mb-/.test(c)).join(' ')
  const campo = className.split(' ').filter((c) => !/^mb-/.test(c)).join(' ')
  return (
    <div className={`relative ${margine}`}>
      <input type={visibile ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete}
        required={required} className={`${campo} pr-12`} />
      <button type="button" onClick={() => setVisibile((v) => !v)}
        aria-label={visibile ? 'Nascondi password' : 'Mostra password'} aria-pressed={visibile}
        className="absolute right-1 top-1 bottom-1 w-10 flex items-center justify-center rounded-lg text-gray-500 active:scale-90 transition">
        {visibile ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}
