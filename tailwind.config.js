/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:      '#050816',
          indigo:  '#6366f1',
          purple:  '#a855f7',
          cyan:    '#0ea5e9',
          green:   '#10b981',
          amber:   '#f59e0b',
          pink:    '#ec4899',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #050816 0%, #0f0f2e 50%, #050816 100%)',
        'cta-gradient':  'linear-gradient(135deg, #6366f1, #a855f7)',
      },
    },
  },
  plugins: [],
}

