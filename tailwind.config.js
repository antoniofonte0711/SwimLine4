/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        blue: { 500: '#2563eb', 600: '#1d4ed8', 50: '#eff6ff', 200: '#bfdbfe' },
      },
    },
  },
  plugins: [],
}
