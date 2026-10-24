/** @type {import('tailwindcss').Config} */
// Token del design (layout Limpida): colori, raggi, ombre e tempi delle transizioni stanno SOLO qui.
// Le spaziature restano la scala di Tailwind (multipli di 4px: p-1 = 4px, p-2 = 8px, p-4 = 16px, p-6 = 24px…).
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // un solo colore d'accento: il blu
        blue: { 500: '#2563eb', 600: '#0b4fd9', 700: '#083a9e', 50: '#e8f1ff', 200: '#bfdbfe' },
        abisso: '#0a1a2f', // testo primario
        bordo: '#eef3f7', // fondo pagina (un filo più scuro delle card bianche, per staccarle)
        linea: '#dde5ec', // bordo sottile di card e separatori
        schiuma: '#e8f1ff', // accento tenue
        corsia: '#b8361a', // pallino delle notifiche
        // testo secondario: un filo più scuro del grigio di Tailwind, per il contrasto AA anche sul fondo pagina
        slate: { 400: '#64748b', 500: '#526075' },
        // colori di stato (solo per dire com'è andata, mai come decorazione)
        stato: { ok: '#15803d', attenzione: '#b45309', errore: '#b91c1c' },
      },
      borderRadius: {
        campo: '12px', // campi, chip, bottoni piccoli
        card: '24px', // card
        barra: '28px', // elementi flottanti (barra di navigazione)
      },
      boxShadow: {
        card: '0 1px 2px rgba(10,26,47,0.06)',
        flottante: '0 12px 32px rgba(10,26,47,0.16)',
      },
      transitionDuration: { DEFAULT: '150ms' },
      fontFamily: {
        sans: ['Figtree', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['"Cinzel Decorative"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
