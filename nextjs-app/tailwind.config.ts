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
        // צבעים דרך משתני CSS — מאפשר מצב בהיר/כהה בהחלפת data-theme
        ink: {
          950: 'rgb(var(--ink-950-rgb) / 0.5)',
          900: 'rgb(var(--ink-900-rgb) / <alpha-value>)',
          850: 'rgb(var(--ink-850-rgb) / <alpha-value>)',
          800: 'rgb(var(--ink-800-rgb) / <alpha-value>)',
          700: 'rgb(var(--ink-700-rgb) / <alpha-value>)',
          600: 'rgb(var(--ink-600-rgb) / <alpha-value>)',
          500: 'rgb(var(--ink-500-rgb) / <alpha-value>)',
          400: 'rgb(var(--ink-400-rgb) / <alpha-value>)',
          300: 'rgb(var(--ink-300-rgb) / <alpha-value>)',
          200: 'rgb(var(--ink-200-rgb) / <alpha-value>)',
          100: 'rgb(var(--ink-100-rgb) / <alpha-value>)',
          50:  'rgb(var(--ink-50-rgb) / <alpha-value>)',
        },
        gold: {
          600: 'rgb(var(--gold-600-rgb) / <alpha-value>)',
          500: 'rgb(var(--gold-500-rgb) / <alpha-value>)',
          400: 'rgb(var(--gold-400-rgb) / <alpha-value>)',
          300: 'rgb(var(--gold-300-rgb) / <alpha-value>)',
          200: 'rgb(var(--gold-200-rgb) / <alpha-value>)',
          100: 'rgb(var(--gold-100-rgb) / <alpha-value>)',
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
