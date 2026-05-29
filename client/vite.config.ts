import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "public",
      filename: "sw.js",
      registerType: "autoUpdate",
      manifest: {
        name: "QuitKit",
        short_name: "QuitKit",
        description: "Трекер курса цитизина и дней без сигарет",
        id: "/",
        theme_color: "#fffaf0",
        background_color: "#fffaf0",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"]
      }
    })
  ],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/media": "http://localhost:3000"
    }
  }
});
