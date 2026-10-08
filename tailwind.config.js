/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Layout "Limpida": un solo blu deciso, fondo bordo vasca, testo blu abisso
      colors: {
        blue: { 500: '#2563eb', 600: '#0b4fd9', 700: '#083a9e', 50: '#e8f1ff', 200: '#bfdbfe' },
        abisso: '#0a1a2f',
        bordo: '#f2f6f9',
        schiuma: '#e8f1ff',
        corsia: '#b8361a',
      },
      fontFamily: {
        sans: ['Figtree', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Figtree', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
