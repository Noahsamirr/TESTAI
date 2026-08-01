/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{tsx,ts,jsx,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          400: 'var(--color-brand-400)',
          500: 'var(--color-brand-500)',
          600: 'var(--color-brand-600)',
        },
        surface: {
          950: 'var(--color-surface-950)',
          900: 'var(--color-surface-900)',
          800: 'var(--color-surface-800)',
          700: 'var(--color-surface-700)',
          600: 'var(--color-surface-600)',
        },
        // Sidebar tokens
        sidebar: {
          bg:     '#0f1629',
          hover:  'rgba(255,255,255,0.06)',
          active: 'rgba(99,102,241,0.18)',
          border: 'rgba(255,255,255,0.06)',
          text:   '#a0aec0',
        },
        // Semantic content tokens
        content: {
          bg:     '#f0f2f5',
          card:   '#ffffff',
          border: '#e5e9f0',
        },
        // Primary (indigo)
        primary: {
          DEFAULT: '#6366f1',
          hover:   '#4f46e5',
          light:   '#eef2ff',
          text:    '#4338ca',
        },
        // Text hierarchy
        tm: {
          primary:   '#1a202c',
          secondary: '#4a5568',
          tertiary:  '#718096',
          muted:     '#a0aec0',
        },
        slate: {
          50:  'var(--color-slate-50)',
          100: 'var(--color-slate-100)',
          200: 'var(--color-slate-200)',
          300: 'var(--color-slate-300)',
          400: 'var(--color-slate-400)',
          500: 'var(--color-slate-500)',
          600: 'var(--color-slate-600)',
          700: 'var(--color-slate-700)',
          800: 'var(--color-slate-800)',
          900: 'var(--color-slate-900)',
          950: 'var(--color-slate-950)',
        },
        gray: {
          50:  'var(--color-gray-50)',
          100: 'var(--color-gray-100)',
          200: 'var(--color-gray-200)',
          300: 'var(--color-gray-300)',
          400: 'var(--color-gray-400)',
          500: 'var(--color-gray-500)',
          600: 'var(--color-gray-600)',
          700: 'var(--color-gray-700)',
          800: 'var(--color-gray-800)',
          900: 'var(--color-gray-900)',
          950: 'var(--color-gray-950)',
        },
        accent: {
          primary: 'var(--color-accent-primary)',
          green:   'var(--color-accent-green)',
          yellow:  'var(--color-accent-yellow)',
          muted:   'var(--color-accent-muted)',
          success: 'var(--color-accent-success)',
          warning: 'var(--color-accent-warning)',
          danger:  'var(--color-accent-danger)',
          red:     'var(--color-accent-red)',
          info:    'var(--color-accent-info)',
        },
      },
      boxShadow: {
        soft:  'var(--shadow-soft)',
        panel: 'var(--shadow-panel)',
        card:  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        tm: '8px',
      },
    },
  },
  plugins: [],
};
