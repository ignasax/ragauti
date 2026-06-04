import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        warm: {
          base:            '#fdf6ee',
          card:            '#fffaf5',
          surface:         '#f5ebe0',
          border:          '#e8ddd0',
          accent:          '#c0703a',
          'accent-hover':  '#a85f2e',
          primary:         '#2c1a0e',
          secondary:       '#a08060',
          muted:           '#c4a882',
        },
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans:  ['Raleway', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
