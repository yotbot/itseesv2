/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'itsees-dark': '#171717',
        'itsees-blue': '#3b82f6',
        'itsees-blue-light': '#60a5fa',
        'itsees-bg': '#f5f5f0',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
