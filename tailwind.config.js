/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0D0D0D',
        'bg-secondary': '#1A1A2E',
        'bg-elevated': '#16213E',
        'accent-primary': '#E94560',
        'accent-secondary': '#0F3460',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0A0A0',
        'success': '#4ADE80',
        'warning': '#FBBF24',
        'error': '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(233, 69, 96, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(233, 69, 96, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
