#!/bin/bash

# MrkTahsilatWeb Hata Teşhis Scripti

echo "🔍 Backend Hata Teşhisi Başlatılıyor..."

# 1. PM2 durumunu kontrol et
echo "📊 PM2 Durumu:"
pm2 status

echo ""
echo "📋 PM2 Logları (Son 20 satır):"
pm2 logs mrktahsilatweb-backend --lines 20

# 2. Port kontrolü
echo ""
echo "🔌 Port 5000 Durumu:"
sudo netstat -tlnp | grep 5000

# 3. Backend dosya kontrolü
echo ""
echo "📁 Backend Dosya Durumu:"
ls -la /var/www/mrktahsilat/backend/

# 4. Environment dosyası kontrolü
echo ""
echo "⚙️ Environment Dosyası:"
if [ -f "/var/www/mrktahsilat/backend/.env" ]; then
    echo "✅ .env dosyası mevcut"
    # Sensitive bilgileri göstermeden kontrol
    grep -v "PASSWORD\|SECRET" /var/www/mrktahsilat/backend/.env || true
else
    echo "❌ .env dosyası bulunamadı"
fi

# 5. Node.js modülleri kontrolü
echo ""
echo "📦 Node Modules Durumu:"
if [ -d "/var/www/mrktahsilat/backend/node_modules" ]; then
    echo "✅ node_modules klasörü mevcut"
else
    echo "❌ node_modules klasörü bulunamadı"
fi

# 6. Veritabanı bağlantısı kontrolü
echo ""
echo "🗄️ Veritabanı Bağlantısı:"
sqlcmd -S localhost -U sa -P 'MrkTahsilat2024!' -Q "SELECT 1 AS Status" 2>/dev/null && echo "✅ Veritabanı bağlantısı başarılı" || echo "❌ Veritabanı bağlantısı başarısız"

# 7. Nginx konfigürasyon kontrolü
echo ""
echo "🌐 Nginx Konfigürasyonu:"
sudo nginx -t

# 8. Disk alanı kontrolü
echo ""
echo "💾 Disk Alanı:"
df -h

echo ""
echo "🔧 Önerilen Çözümler:"
echo "1. Backend'i yeniden başlat: pm2 restart mrktahsilatweb-backend"
echo "2. Logları detaylı incele: pm2 logs mrktahsilatweb-backend"
echo "3. Environment dosyasını kontrol et: cat /var/www/mrktahsilat/backend/.env"
echo "4. Node modules'i yeniden kur: cd /var/www/mrktahsilat/backend && npm install"
