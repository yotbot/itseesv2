/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'itsees-dark': '#141414',
        'itsees-bg': '#e8d8c9',
        'itsees-text': '#141414',
        'itsees-blue': '#4b607f',
        'itsees-blue-light': '#6a82a8',
        'itsees-orange': '#f3701e',
        'itsees-green': '#4b607f',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
