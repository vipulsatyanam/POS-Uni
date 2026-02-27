/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./node_modules/preline/preline.js",
    "./index.html', './src/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16"
        }
      },
      fontFamily: {
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      boxShadow: {
        "card": "0 0 0 1px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.07)",
        "card-hover": "0 0 0 1px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.10)"
      }
    }
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("preline/plugin")
  ]
};
