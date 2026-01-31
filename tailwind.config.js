/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        crypto: {
          dark: '#0B0E11',
          card: '#151A21',
          border: '#2A2F3A',
          accent: '#3B82F6',
          up: '#0ECB81',
          down: '#F6465D',
          text: '#EAECEF',
          muted: '#848E9C'
        }
      }
    },
  },
  plugins: [],
}