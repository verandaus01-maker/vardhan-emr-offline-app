/**
 * PM2 Ecosystem Config — Vardhan Hospital EMR
 *
 * Keeps the server running in background even after Terminal is closed.
 * Restarts automatically on crash. Survives Mac restart if PM2 startup is configured.
 *
 * First-time setup (run once in Terminal):
 *   npm install -g pm2
 *   pm2 start ecosystem.config.cjs
 *   pm2 save                    ← saves the process list
 *   pm2 startup                 ← prints a command; run that command to auto-start on Mac reboot
 *
 * Daily commands:
 *   pm2 status                  ← check if server is running
 *   pm2 logs nexacare           ← view live logs
 *   pm2 restart nexacare        ← restart after a rebuild
 *   pm2 stop nexacare           ← stop the server
 */

module.exports = {
  apps: [
    {
      name: 'nexacare',
      script: 'server.cjs',
      cwd: __dirname,
      // Restart automatically on crash, up to 10 times
      restart_delay: 2000,
      max_restarts: 10,
      // Log files
      out_file: './logs/nexacare-out.log',
      error_file: './logs/nexacare-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // Environment
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
