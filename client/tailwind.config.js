/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        cream:    '#FAFAF8',
        parchment:'#F2F0EC',
        linen:    '#ECEAE5',
        sand:     '#D8D4CC',
        brown: {
          100: '#EDE5D8',
          200: '#D4C5B0',
          300: '#B8A48C',
          400: '#9A8068',
          500: '#7C5C44',
          600: '#5E3E2C',
          700: '#3D2314',
          800: '#220F06',
        },
        yt: {
          red:   '#FF0000',
          dark:  '#CC0000',
          light: '#FF4444',
        },
      },
      backgroundImage: {
        'warm-noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(93,57,30,0.12), 0 1px 2px rgba(93,57,30,0.08)',
        'warm-md': '0 4px 12px rgba(93,57,30,0.12), 0 2px 4px rgba(93,57,30,0.08)',
        'warm-lg': '0 8px 30px rgba(93,57,30,0.14), 0 4px 8px rgba(93,57,30,0.08)',
        'yt':      '0 4px 20px rgba(255,0,0,0.25)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.45s ease forwards',
        'shimmer':    'shimmer 3s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
    },
  },
  plugins: [],
};
