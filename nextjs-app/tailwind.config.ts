import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07050380',
          900: '#0a0806',
          850: '#0f0d0a',
          800: '#1c1812',
          700: '#2a2318',
          600: '#3d3226',
          500: '#5a4a38',
          400: '#7a6550',
          300: '#9a8570',
          200: '#c4a87d',
          100: '#e8d5b0',
          50:  '#f5eed8',
        },
        gold: {
          600: '#a07828',
          500: '#c9973a',
          400: '#d9aa4a',
          300: '#e8b84b',
          200: '#f0cc80',
          100: '#f7e4b0',
        },
        era: {
          'second-temple': '#8e44ad',
          tannaim:         '#e74c3c',
          amoraim:         '#e67e22',
          geonim:          '#f1c40f',
          rishonim:        '#27ae60',
          acharonim:       '#2980b9',
          modern:          '#1abc9c',
        },
        region: {
          ashkenaz:        '#43a047',
          'east-europe':   '#c0ca33',
          tsarfat:         '#ec407a',
          provence:        '#f9a825',
          sefarad:         '#1e88e5',
          italy:           '#26c6da',
          'north-africa':  '#8e24aa',
          mizrach:         '#ef6c00',
          'eretz-israel':  '#00897b',
          other:           '#90a4ae',
        },
      },
      fontFamily: {
        serif: ['"Frank Ruhl Libre"', 'Georgia', 'serif'],
        sans:  ['Heebo', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in':      'fadeIn 0.2s ease-out',
        'slide-in-end': 'slideInEnd 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-in-up':  'slideInUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        'drawer-open':  'drawerOpen 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideInEnd: {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        slideInUp: {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
        drawerOpen: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
      },
      boxShadow: {
        'glass':      '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-lg':   '0 8px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        'gold-glow':  '0 0 20px rgba(201,151,58,0.25)',
        'sage-card':  '0 2px 12px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}

export default config
