import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",   // FastAPI address
        changeOrigin: true,
        // maps "/api/profile-data" -> "/profile-data" on the backend
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
