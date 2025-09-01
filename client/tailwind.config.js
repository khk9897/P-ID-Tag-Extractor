/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
        'fade-in-out': 'fade-in-out 2s ease-out',
      },
      keyframes: {
        'fade-in-up': {
          'from': {
            opacity: '0',
            transform: 'translateY(20px)'
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'fade-in-out': {
          '0%': {
            opacity: '0',
            'stroke-width': '1'
          },
          '20%': {
            opacity: '0.8',
            'stroke-width': '3.5'
          },
          '80%': {
            opacity: '0.8',
            'stroke-width': '3.5'
          },
          '100%': {
            opacity: '0',
            'stroke-width': '1'
          }
        }
      }
    },
  },
  plugins: [],
}