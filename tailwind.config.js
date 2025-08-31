/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Steam Official Colors
        'steam-primary': '#1b2838',
        'steam-secondary': '#66c0f4', 
        'steam-accent': '#c7d5e0',
        'steam-dark': '#0e1419',
        'steam-light': '#ffffff',
        'steam-success': '#a1d44a',
        'steam-warning': '#ffd700',
        'steam-error': '#ff4444',
        
        // Gamingflix Colors
        'gamingflix-red': '#EA1328',
        'gamingflix-accent': '#ff4458',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['Fira Code', 'Monaco', 'monospace'],
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce': 'bounce 1s infinite',
        'spin': 'spin 1s linear infinite',
      },
      backdropBlur: {
        'xs': '2px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
};