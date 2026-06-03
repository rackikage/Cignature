/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-raise': 'var(--surface-raise)',
        border: 'var(--border)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-faint': 'var(--text-faint)',
        primary: 'var(--primary)',
        'primary-bright': 'var(--primary-bright)',
        live: 'var(--live)',
        success: 'var(--success)',
        info: 'var(--info)',
        destructive: 'var(--destructive)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          'ui-monospace',
          'Menlo',
          'monospace',
        ],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, var(--primary) 0%, var(--live) 100%)',
      },
    },
  },
  plugins: [],
}
