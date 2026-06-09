import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    optimizeDeps: {
      include: ["d3"],
    },
    server: {
      host: true,
      proxy: {
        // Proxy all /api requests to backend
        "/api": {
          target: env.VITE_BACKEND_TARGET || "https://alb.phase-1.kznhub.com",
          changeOrigin: true,
          secure: false,
          ws: true, // Enable WebSocket/SSE proxy
          configure: (proxy, _options) => {
            proxy.on("error", (err, _req, _res) => {
              console.log("[Vite Proxy] Error:", err);
            });
            proxy.on("proxyReq", (proxyReq, req, _res) => {
              console.log(`[Vite Proxy] → ${req.method} ${req.url}`);
            });
            proxy.on("proxyRes", (proxyRes, req, _res) => {
              console.log(`[Vite Proxy] ← ${proxyRes.statusCode} ${req.url}`);
            });
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
