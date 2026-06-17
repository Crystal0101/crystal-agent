/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          black: '#0a0a0f',
          dark: '#0f0f1a',
          card: '#13131f',
          border: '#1e1e3a',
          purple: '#7c3aed',
          'purple-light': '#a855f7',
          cyan: '#06b6d4',
          'cyan-light': '#67e8f9',
          pink: '#ec4899',
          green: '#10b981',
          yellow: '#f59e0b',
          red: '#ef4444',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
        'typing': 'typing 1.5s steps(3) infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #7c3aed, 0 0 10px #7c3aed' },
          '100%': { boxShadow: '0 0 10px #a855f7, 0 0 20px #a855f7, 0 0 40px #a855f7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        scan: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
        typing: {
          '0%': { content: '.' },
          '33%': { content: '..' },
          '66%': { content: '...' },
        },
      },
      backgroundImage: {
        'cyber-grid': `linear-gradient(rgba(124, 58, 237, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(124, 58, 237, 0.03) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid': '30px 30px',
      },
    },
  },
  plugins: [],
};
