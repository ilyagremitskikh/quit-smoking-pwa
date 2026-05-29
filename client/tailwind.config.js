/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        paper: "#fffaf0",
        panel: "#ffffff",
        line: "#e7dfd2",
        mint: "#20c997",
        sky: "#38bdf8",
        amber: "#f59e0b",
        coral: "#f43f5e"
      }
    }
  },
  plugins: []
};
