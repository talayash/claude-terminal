/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#101010',
        'bg-secondary': '#171717',
        'bg-elevated': '#1E1E1E',
        'bg-surface': '#252525',
        'accent-primary': '#3B82F6',
        'accent-secondary': '#2563EB',
        'border': '#262626',
        'border-light': '#333333',
        'text-primary': '#E5E5E5',
        'text-secondary': '#737373',
        'text-tertiary': '#525252',
        'success': '#4ADE80',
        'warning': '#FBBF24',
        'error': '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
