/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1e3a8a',
          gold: '#facc15',
        }
      }
    },
  },
  plugins: [],
}
