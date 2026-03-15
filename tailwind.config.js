/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['"IBM Plex Sans Arabic"', 'Tahoma', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        primary: {
          50:  '#eef6ff',
          100: '#daeaff',
          200: '#bdd8ff',
          300: '#90bdff',
          400: '#5c96ff',
          500: '#3670f5',
          600: '#1e4eea',
          700: '#1a3dd6',
          800: '#1c33ae',
          900: '#1c308a',
          950: '#141f55',
        },
      },
    },
  },
  plugins: [],
}