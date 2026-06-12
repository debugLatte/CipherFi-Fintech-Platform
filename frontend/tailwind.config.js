/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        navy: {
          950: '#060B18',
          900: '#0A1020',
          800: '#0F1829',
          700: '#162035',
        },
        emerald: {
          400: '#34D399',
          500: '#10B981',
        },
      },
    },
  },
  plugins: [],
}
