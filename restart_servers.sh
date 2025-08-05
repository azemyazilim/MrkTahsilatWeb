#!/bin/bash

# MrkTahsilatWeb Sunucu Yeniden Başlatma Scripti
# PuTTY Terminal üzerinden çalıştırılmak üzere tasarlanmıştır

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logger fonksiyonları
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Header
echo -e "${BLUE}"
echo "=================================================="
echo "     MrkTahsilatWeb Sunucu Yeniden Başlatma"
echo "     Domain: mrktahsilat.com"
echo "=================================================="
echo -e "${NC}"

# Root kontrolü
if [[ $EUID -ne 0 ]]; then
   warning "Bu script sudo ile çalıştırılmalıdır."
   echo "Kullanım: sudo bash restart_servers.sh"
   exit 1
fi

# 1. Mevcut durumu göster
echo ""
log "1/7 Mevcut sunucu durumları kontrol ediliyor..."
echo ""
info "📊 PM2 Durumu:"
pm2 status || echo "PM2 çalışmıyor"

echo ""
info "🌐 Nginx Durumu:"
systemctl status nginx --no-pager -l || echo "Nginx durumu alınamadı"

echo ""
info "🗄️ SQL Server Durumu:"
systemctl status mssql-server --no-pager -l || echo "SQL Server durumu alınamadı"

# 2. Backend'i durdur
echo ""
log "2/7 Backend servisi durduruluyor..."
pm2 stop mrktahsilatweb-backend 2>/dev/null || warning "Backend zaten durdurulmuş"
pm2 delete mrktahsilatweb-backend 2>/dev/null || warning "Backend process bulunamadı"

# 3. SQL Server'ı yeniden başlat
echo ""
log "3/7 SQL Server yeniden başlatılıyor..."
systemctl stop mssql-server
sleep 3
systemctl start mssql-server
sleep 10

# SQL Server'ın başlamasını bekle
info "SQL Server'ın hazır olması bekleniyor..."
for i in {1..30}; do
    if sqlcmd -S localhost -U sa -P 'MrkTahsilat2024!' -Q "SELECT 1" &>/dev/null; then
        log "✅ SQL Server hazır"
        break
    fi
    echo -n "."
    sleep 2
done

# 4. Nginx'i yeniden başlat
echo ""
log "4/7 Nginx yeniden başlatılıyor..."
nginx -t
if [ $? -eq 0 ]; then
    systemctl restart nginx
    log "✅ Nginx başarıyla yeniden başlatıldı"
else
    error "❌ Nginx konfigürasyon hatası"
    exit 1
fi

# 5. Backend'i yeniden başlat
echo ""
log "5/7 Backend servisi yeniden başlatılıyor..."
cd /var/www/mrktahsilat/backend

# Environment dosyasını kontrol et
if [ ! -f ".env" ]; then
    warning "Environment dosyası bulunamadı, oluşturuluyor..."
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
fi

# Backend'i başlat
pm2 start index.js --name mrktahsilatweb-backend --log /var/log/pm2/mrktahsilatweb-backend.log
pm2 save

# 6. Servis durumlarını kontrol et
echo ""
log "6/7 Servis durumları kontrol ediliyor..."
sleep 5

# PM2 durumu
echo ""
info "📊 PM2 Durum Raporu:"
pm2 status

# Nginx durumu
echo ""
info "🌐 Nginx Durum Raporu:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx: Aktif"
else
    echo "❌ Nginx: İnaktif"
fi

# SQL Server durumu
echo ""
info "🗄️ SQL Server Durum Raporu:"
if systemctl is-active --quiet mssql-server; then
    echo "✅ SQL Server: Aktif"
else
    echo "❌ SQL Server: İnaktif"
fi

# 7. API health check
echo ""
log "7/7 API health check yapılıyor..."
sleep 3

# Backend API testi
if curl -f http://localhost:5000/api/health &>/dev/null; then
    echo "✅ Backend API: Çalışıyor"
else
    echo "❌ Backend API: Çalışmıyor"
fi

# Web sitesi testi
if curl -f http://mrktahsilat.com &>/dev/null; then
    echo "✅ Web Sitesi: Erişilebilir"
else
    echo "❌ Web Sitesi: Erişilemiyor"
fi

# Özet rapor
echo ""
echo -e "${GREEN}"
echo "=================================================="
echo "          YENİDEN BAŞLATMA TAMAMLANDI"
echo "=================================================="
echo -e "${NC}"

echo ""
info "📋 Hızlı Durum Kontrol Komutları:"
echo "   • pm2 status"
echo "   • systemctl status nginx"
echo "   • systemctl status mssql-server"
echo "   • curl http://localhost:5000/api/health"
echo "   • curl http://mrktahsilat.com"

echo ""
info "📊 Log Dosyaları:"
echo "   • Backend: pm2 logs mrktahsilatweb-backend"
echo "   • Nginx: sudo tail -f /var/log/nginx/error.log"
echo "   • SQL Server: sudo journalctl -u mssql-server -f"

echo ""
log "🎉 Tüm servisler yeniden başlatıldı!"
