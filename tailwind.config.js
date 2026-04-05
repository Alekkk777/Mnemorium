/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Memorium Design System ──────────────────────────────────────────
        background:        '#08080f',
        surface:           '#11111c',
        'surface-elevated': '#1a1a28',
        accent:            '#7c3aed',
        'accent-hover':    '#6d28d9',
        success:           '#10b981',
        warning:           '#f59e0b',
        danger:            '#ef4444',
        foreground:        '#e2e8f0',
        muted:             '#64748b',
        // ── Keep blue palette for compatibility ─────────────────────────────
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Crimson Pro', 'Georgia', 'serif'],
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-in-out',
        pop:    'pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%':   { opacity: '0', transform: 'scale(0)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
