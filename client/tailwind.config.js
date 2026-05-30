/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Onest", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "\"Segoe UI\"", "sans-serif"],
        display: ["Onest", "ui-sans-serif", "system-ui", "sans-serif"],
        numeric: ["\"JetBrains Mono\"", "Onest", "ui-monospace", "monospace"]
      },
      colors: {
        ink: "#10271f",
        paper: "#eef6f1",
        panel: "#ffffff",
        line: "#dfe8e2",
        mint: "#18a66f",
        sky: "#38bdf8",
        amber: "#d9941c",
        coral: "#ef5a5f"
      }
    }
  },
  plugins: []
};
