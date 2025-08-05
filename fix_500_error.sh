#!/bin/bash

# MrkTahsilatWeb 500 Hata Çözüm Scripti - Hızlı Onarım

echo "🚨 MrkTahsilatWeb 500 Hata Onarımı Başlatılıyor..."

PROJECT_DIR="/var/www/mrktahsilat"

# 1. Mevcut durumu kontrol et
echo "1️⃣ Mevcut durum kontrol ediliyor..."
pm2 status

# 2. Backend'i durdur
echo "2️⃣ Backend durdruluyor..."
pm2 stop mrktahsilatweb-backend 2>/dev/null || true
pm2 delete mrktahsilatweb-backend 2>/dev/null || true

# 3. SQL Server'ı yeniden başlat
echo "3️⃣ SQL Server yeniden başlatılıyor..."
sudo systemctl restart mssql-server
sleep 10

# 4. Environment dosyasını onar
echo "4️⃣ Environment dosyası onarılıyor..."
cd $PROJECT_DIR/backend

cat > .env << 'EOF'
DB_USER=sa
DB_PASSWORD=MrkTahsilat2024!
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=MrkTahsilatDB

PORT=5000
NODE_ENV=production

JWT_SECRET=mrktahsilat-super-secret-jwt-key-2024
SESSION_SECRET=mrktahsilat-session-secret-2024

CORS_ORIGIN=https://mrktahsilat.com,https://www.mrktahsilat.com

LOG_LEVEL=info
LOG_FILE=/var/log/mrktahsilatweb/app.log
EOF

chmod 600 .env
chown www-data:www-data .env

# 5. Node modules'i kontrol et
echo "5️⃣ Node modules kontrol ediliyor..."
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    echo "📦 Node modules yeniden kuruluyor..."
    rm -rf node_modules package-lock.json
    npm install --production
fi

# 6. Veritabanı bağlantısını test et
echo "6️⃣ Veritabanı bağlantısı test ediliyor..."
if ! sqlcmd -S localhost -U sa -P 'MrkTahsilat2024!' -Q "SELECT 1" &>/dev/null; then
    echo "❌ Veritabanı bağlantısı başarısız - SQL Server'ı kontrol edin"
    exit 1
fi

# 7. Backend'i yeniden başlat
echo "7️⃣ Backend yeniden başlatılıyor..."
pm2 start index.js --name mrktahsilatweb-backend --log /var/log/pm2/mrktahsilatweb-backend.log

# 8. PM2'yi kaydet
echo "8️⃣ PM2 konfigürasyonu kaydediliyor..."
pm2 save

# 9. Nginx'i yeniden yükle
echo "9️⃣ Nginx yeniden yükleniyor..."
sudo nginx -t && sudo nginx -s reload

# 10. Son kontroller
echo "🔟 Son kontroller yapılıyor..."
sleep 5

# Backend durumu
pm2 status

# API health check
echo ""
echo "🔍 API Health Check:"
curl -f http://localhost:5000/api/health 2>/dev/null && echo "✅ Backend API çalışıyor" || echo "❌ Backend API çalışmıyor"

# Web sitesi kontrolü
echo ""
echo "🌐 Web sitesi kontrolü:"
curl -f http://mrktahsilat.com 2>/dev/null >/dev/null && echo "✅ Web sitesi erişilebilir" || echo "❌ Web sitesi erişilemiyor"

echo ""
echo "✅ Onarım tamamlandı!"
echo ""
echo "📊 Durum Kontrol Komutları:"
echo "   pm2 status"
echo "   pm2 logs mrktahsilatweb-backend"
echo "   curl http://localhost:5000/api/health"
echo "   curl http://mrktahsilat.com"
echo ""
echo "📋 Log Dosyaları:"
echo "   Backend: pm2 logs mrktahsilatweb-backend"
echo "   Nginx: sudo tail -f /var/log/nginx/error.log"
echo "   PM2: tail -f /var/log/pm2/mrktahsilatweb-backend.log"
