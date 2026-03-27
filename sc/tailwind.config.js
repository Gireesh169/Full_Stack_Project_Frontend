/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'auth-bg': 'radial-gradient(circle at 10% 15%, #d5f5f6 0%, #f2f6db 35%, #f9e6c7 100%)',
        'app-bg': 'linear-gradient(145deg, #f6fbfc 0%, #fef9ef 55%, #f3f4f6 100%)',
      },
      fontFamily: {
        sans: ['Manrope', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

