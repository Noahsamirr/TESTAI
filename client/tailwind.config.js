/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{tsx,ts,jsx,js}'],
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#5eead4',
          500: '#2dd4bf',
          600: '#14b8a6',
        },
        surface: {
          950: '#0c0f14',
          900: '#111827',
          800: '#1a2234',
          700: '#243044',
          600: '#2f3d52',
        },
        accent: {
          primary: '#5eead4',
          green: '#5eead4',
          muted: '#94a3b8',
          success: '#4ade80',
          warning: '#fbbf24',
          danger: '#f87171',
          red: '#f87171',
          info: '#60a5fa',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px rgba(0, 0, 0, 0.25)',
        panel: '0 1px 0 rgba(255, 255, 255, 0.04) inset',
      },
    },
  },
  plugins: [],
};
