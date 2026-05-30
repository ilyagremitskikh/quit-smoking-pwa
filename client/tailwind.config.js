/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
