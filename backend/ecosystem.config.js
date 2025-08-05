module.exports = {
  apps: [{
    name: 'mrktahsilatweb-backend',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      DB_USER: 'sa',
      DB_PASSWORD: 'YourStrongPassword123!',
      DB_SERVER: 'localhost',
      DB_PORT: 1433,
      DB_DATABASE: 'MrkTahsilatDB'
    },
    error_file: '/var/log/pm2/mrktahsilatweb-error.log',
    out_file: '/var/log/pm2/mrktahsilatweb-out.log',
    log_file: '/var/log/pm2/mrktahsilatweb-combined.log',
    time: true
  }]
}
