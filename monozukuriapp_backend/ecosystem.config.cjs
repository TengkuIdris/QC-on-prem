/**
 * PM2 ecosystem config for Jatco F1 backend (STG).
 * Usage on server:
 *   npm run build
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup   # optional: restart on reboot
 */
module.exports = {
  apps: [
    {
      name: "jatco-be-f1",
      script: "dist/src/main.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "development" },
      env_production: { NODE_ENV: "production" },
      // optional: limit memory on low-RAM STG
      max_memory_restart: "600M",
      time: true,
    },
  ],
};
