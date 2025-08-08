module.exports = {
  apps: [{
    name: 'mrktahsilatweb-backend',
    script: 'backend/index.js',
    cwd: '/var/www/mrktahsilat',
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
      PORT: 5000
    },
    error_file: '/var/log/mrktahsilatweb/err.log',
    out_file: '/var/log/mrktahsilatweb/out.log',
    log_file: '/var/log/mrktahsilatweb/combined.log',
    time: true
  }]
};


