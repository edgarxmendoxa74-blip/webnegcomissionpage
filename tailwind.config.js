/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  safelist: [
    'bg-yellow-50/50',
    'hover:bg-yellow-100/50',
    'bg-blue-50/50',
    'hover:bg-blue-100/50',
    'bg-red-50/50',
    'hover:bg-red-100/50',
  ],
  plugins: [],
}
