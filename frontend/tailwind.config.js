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
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554"
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
