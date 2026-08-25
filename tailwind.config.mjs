/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
      extend: {
          fontFamily: {
              sans: ['Plus Jakarta Sans', 'sans-serif'],
          },
          colors: {
              brand: {
                  50: '#f0fdfa',
                  100: '#ccfbf1',
                  400: '#2dd4bf',
                  500: '#14b8a6', // Teal focus
                  600: '#0d9488',
                  900: '#134e4a',
              }
          },
          animation: {
              'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
          },
          keyframes: {
              fadeInUp: {
                  '0%': { opacity: '0', transform: 'translateY(20px)' },
                  '100%': { opacity: '1', transform: 'translateY(0)' },
              }
          }
      }
  },
  plugins: [],
}