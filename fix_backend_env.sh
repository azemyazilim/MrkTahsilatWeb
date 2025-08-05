#!/bin/bash

# Backend Environment Dosyası Onarım Scripti

PROJECT_DIR="/var/www/mrktahsilat"

echo "🔧 Backend Environment Dosyası Onarılıyor..."

# Backend dizinine git
cd $PROJECT_DIR/backend

# Yedek environment dosyası oluştur
cat > .env << 'EOF'
# Database Configuration
DB_USER=sa
DB_PASSWORD=MrkTahsilat2024!
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=MrkTahsilatDB

# Server Configuration
PORT=5000
NODE_ENV=production

# Security
JWT_SECRET=mrktahsilat-super-secret-jwt-key-2024
SESSION_SECRET=mrktahsilat-session-secret-2024

# CORS
CORS_ORIGIN=https://mrktahsilat.com,https://www.mrktahsilat.com

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/mrktahsilatweb/app.log
EOF

# Dosya izinlerini ayarla
chmod 600 .env
chown www-data:www-data .env

echo "✅ Environment dosyası oluşturuldu"

# Node modules kontrol et
if [ ! -d "node_modules" ]; then
    echo "📦 Node modules kuruluyor..."
    npm install --production
fi

# PM2'yi yeniden başlat
echo "🔄 Backend servisi yeniden başlatılıyor..."
pm2 stop mrktahsilatweb-backend 2>/dev/null || true
pm2 delete mrktahsilatweb-backend 2>/dev/null || true
pm2 start index.js --name mrktahsilatweb-backend

echo "✅ Backend onarımı tamamlandı"
echo "📊 Durum kontrolü: pm2 status"
echo "📋 Log kontrolü: pm2 logs mrktahsilatweb-backend"
