/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background:          '#08080f',
        surface:             '#11111c',
        'surface-elevated':  '#1a1a28',
        accent:              '#7c3aed',
        'accent-hover':      '#6d28d9',
        success:             '#10b981',
        warning:             '#f59e0b',
        danger:              '#ef4444',
        foreground:          '#e2e8f0',
        muted:               '#64748b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
