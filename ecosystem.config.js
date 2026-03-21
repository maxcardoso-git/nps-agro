module.exports = {
  apps: [
    {
      name: 'nps-agro-api',
      cwd: '/root/NPS-Agro',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || '3000',
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '3600s',
        APP_NAME: process.env.APP_NAME || 'nps-agro-api',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
      },
      max_memory_restart: '300M',
      autorestart: true,
      watch: false,
      time: true,
      out_file: '/var/log/nps-agro-api/out.log',
      error_file: '/var/log/nps-agro-api/error.log',
      merge_logs: true,
    },
  ],
};
