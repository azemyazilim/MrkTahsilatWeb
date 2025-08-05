#!/bin/bash

# MrkTahsilatWeb Sunucu Konfigürasyon Kontrol Scripti
# Bu script sunucudaki tüm ayarları ve dosyaları kontrol eder

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Değişkenler
PROJECT_DIR="/var/www/mrktahsilat"
DOMAIN="mrktahsilat.com"
DB_PASSWORD="MrkTahsilat2024!"

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

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
}

check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_warn() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Header
echo -e "${CYAN}"
echo "================================================================="
echo "          MrkTahsilatWeb Sunucu Konfigürasyon Kontrolü"
echo "          Domain: $DOMAIN"
echo "          Tarih: $(date)"
echo "================================================================="
echo -e "${NC}"

# 1. Sistem Bilgileri
echo ""
log "1/15 Sistem bilgileri kontrol ediliyor..."
echo ""
info "🖥️ Sistem Bilgileri:"
echo "   • OS: $(lsb_release -d | cut -f2)"
echo "   • Kernel: $(uname -r)"
echo "   • Hostname: $(hostname)"
echo "   • IP Address: $(ip route get 8.8.8.8 | awk 'NR==1 {print $7}')"
echo "   • Uptime: $(uptime -p)"
echo "   • Load Average: $(uptime | awk -F'load average:' '{print $2}')"

# 2. Disk ve Bellek Kontrolü
echo ""
log "2/15 Disk ve bellek kullanımı kontrol ediliyor..."
echo ""
info "💾 Disk Kullanımı:"
df -h | grep -E "(Filesystem|/dev/)"

echo ""
info "🧠 Bellek Kullanımı:"
free -h

# 3. Gerekli Servislerin Durumu
echo ""
log "3/15 Sistem servisleri kontrol ediliyor..."
echo ""
info "🔧 Servis Durumları:"

# Node.js
if command -v node &> /dev/null; then
    check_pass "Node.js kurulu - Versiyon: $(node --version)"
else
    check_fail "Node.js kurulu değil"
fi

# PM2
if command -v pm2 &> /dev/null; then
    check_pass "PM2 kurulu - Versiyon: $(pm2 --version)"
else
    check_fail "PM2 kurulu değil"
fi

# Nginx
if systemctl is-active --quiet nginx; then
    check_pass "Nginx aktif - Versiyon: $(nginx -v 2>&1 | cut -d'/' -f2)"
else
    check_fail "Nginx çalışmıyor"
fi

# SQL Server
if systemctl is-active --quiet mssql-server; then
    check_pass "SQL Server aktif"
else
    check_fail "SQL Server çalışmıyor"
fi

# 4. Proje Dizini Kontrolü
echo ""
log "4/15 Proje dizini kontrolü..."
echo ""
info "📁 Proje Dizini: $PROJECT_DIR"

if [ -d "$PROJECT_DIR" ]; then
    check_pass "Proje dizini mevcut"
    
    # Dizin içeriği
    echo "   📂 İçerik:"
    ls -la "$PROJECT_DIR" | while read line; do
        echo "      $line"
    done
    
    # Dizin boyutu
    echo "   📊 Boyut: $(du -sh $PROJECT_DIR | cut -f1)"
else
    check_fail "Proje dizini bulunamadı: $PROJECT_DIR"
fi

# 5. Backend Kontrolü
echo ""
log "5/15 Backend konfigürasyonu kontrol ediliyor..."
echo ""

if [ -d "$PROJECT_DIR/backend" ]; then
    check_pass "Backend dizini mevcut"
    
    # package.json kontrolü
    if [ -f "$PROJECT_DIR/backend/package.json" ]; then
        check_pass "package.json mevcut"
    else
        check_fail "package.json bulunamadı"
    fi
    
    # index.js kontrolü
    if [ -f "$PROJECT_DIR/backend/index.js" ]; then
        check_pass "index.js mevcut"
        echo "      • Boyut: $(stat -c%s $PROJECT_DIR/backend/index.js) bytes"
    else
        check_fail "index.js bulunamadı"
    fi
    
    # node_modules kontrolü
    if [ -d "$PROJECT_DIR/backend/node_modules" ]; then
        check_pass "node_modules dizini mevcut"
        echo "      • Paket sayısı: $(ls -1 $PROJECT_DIR/backend/node_modules | wc -l)"
    else
        check_warn "node_modules dizini bulunamadı"
    fi
    
    # .env dosyası kontrolü
    if [ -f "$PROJECT_DIR/backend/.env" ]; then
        check_pass ".env dosyası mevcut"
        echo "      • Dosya izinleri: $(stat -c%a $PROJECT_DIR/backend/.env)"
    else
        check_fail ".env dosyası bulunamadı"
    fi
else
    check_fail "Backend dizini bulunamadı"
fi

# 6. Frontend Kontrolü
echo ""
log "6/15 Frontend konfigürasyonu kontrol ediliyor..."
echo ""

if [ -d "$PROJECT_DIR/frontend" ]; then
    check_pass "Frontend dizini mevcut"
    
    # package.json kontrolü
    if [ -f "$PROJECT_DIR/frontend/package.json" ]; then
        check_pass "package.json mevcut"
    else
        check_fail "package.json bulunamadı"
    fi
    
    # build dizini kontrolü
    if [ -d "$PROJECT_DIR/frontend/build" ]; then
        check_pass "Build dizini mevcut"
        echo "      • Build boyutu: $(du -sh $PROJECT_DIR/frontend/build | cut -f1)"
    else
        check_warn "Build dizini bulunamadı - Frontend build edilmemiş"
    fi
    
    # src dizini kontrolü
    if [ -d "$PROJECT_DIR/frontend/src" ]; then
        check_pass "Source dizini mevcut"
        echo "      • JS dosya sayısı: $(find $PROJECT_DIR/frontend/src -name '*.js' | wc -l)"
    else
        check_fail "Source dizini bulunamadı"
    fi
else
    check_fail "Frontend dizini bulunamadı"
fi

# 7. PM2 Durumu
echo ""
log "7/15 PM2 process durumu kontrol ediliyor..."
echo ""

if command -v pm2 &> /dev/null; then
    echo "📊 PM2 Process Listesi:"
    pm2 jlist | jq -r '.[] | "   • \(.name): \(.pm2_env.status) (PID: \(.pid), CPU: \(.monit.cpu)%, Memory: \(.monit.memory))"' 2>/dev/null || pm2 status
    
    # Backend process kontrolü
    if pm2 list | grep -q "mrktahsilatweb-backend"; then
        if pm2 list | grep "mrktahsilatweb-backend" | grep -q "online"; then
            check_pass "Backend process çalışıyor"
        else
            check_fail "Backend process durdurulmuş"
        fi
    else
        check_fail "Backend process bulunamadı"
    fi
else
    check_fail "PM2 kurulu değil"
fi

# 8. Nginx Konfigürasyonu
echo ""
log "8/15 Nginx konfigürasyonu kontrol ediliyor..."
echo ""

# Nginx test
if nginx -t &>/dev/null; then
    check_pass "Nginx konfigürasyonu geçerli"
else
    check_fail "Nginx konfigürasyonu hatalı"
    nginx -t
fi

# Site konfigürasyonu
if [ -f "/etc/nginx/sites-available/$DOMAIN" ]; then
    check_pass "Site konfigürasyonu mevcut"
    
    # Symlink kontrolü
    if [ -L "/etc/nginx/sites-enabled/$DOMAIN" ]; then
        check_pass "Site aktif (symlink mevcut)"
    else
        check_warn "Site aktif değil (symlink yok)"
    fi
else
    check_fail "Site konfigürasyonu bulunamadı"
fi

# Default site kontrolü
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    check_warn "Default site hala aktif"
else
    check_pass "Default site devre dışı"
fi

# 9. Veritabanı Kontrolü
echo ""
log "9/15 Veritabanı bağlantısı kontrol ediliyor..."
echo ""

# SQL Server bağlantı testi
if sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -Q "SELECT @@VERSION" &>/dev/null; then
    check_pass "SQL Server bağlantısı başarılı"
    
    # Veritabanı kontrolü
    if sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -Q "SELECT name FROM sys.databases WHERE name = 'MrkTahsilatDB'" | grep -q "MrkTahsilatDB"; then
        check_pass "MrkTahsilatDB veritabanı mevcut"
        
        # Tablo kontrolü
        TABLE_COUNT=$(sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -d "MrkTahsilatDB" -Q "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES" -h -1 | tr -d ' ')
        echo "      • Tablo sayısı: $TABLE_COUNT"
        
        # Kullanıcı sayısı
        USER_COUNT=$(sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -d "MrkTahsilatDB" -Q "SELECT COUNT(*) FROM Users" -h -1 | tr -d ' ' 2>/dev/null || echo "0")
        echo "      • Kullanıcı sayısı: $USER_COUNT"
        
    else
        check_fail "MrkTahsilatDB veritabanı bulunamadı"
    fi
else
    check_fail "SQL Server bağlantısı başarısız"
fi

# 10. Port Kontrolü
echo ""
log "10/15 Port kullanımı kontrol ediliyor..."
echo ""

info "🔌 Port Durumları:"
# Port 80 (HTTP)
if netstat -tlnp | grep -q ":80 "; then
    check_pass "Port 80 (HTTP) dinleniyor"
    echo "      $(netstat -tlnp | grep ":80 " | head -1)"
else
    check_fail "Port 80 (HTTP) dinlenmiyor"
fi

# Port 443 (HTTPS)
if netstat -tlnp | grep -q ":443 "; then
    check_pass "Port 443 (HTTPS) dinleniyor"
else
    check_warn "Port 443 (HTTPS) dinlenmiyor - SSL kurulmamış"
fi

# Port 5000 (Backend)
if netstat -tlnp | grep -q ":5000 "; then
    check_pass "Port 5000 (Backend) dinleniyor"
    echo "      $(netstat -tlnp | grep ":5000 " | head -1)"
else
    check_fail "Port 5000 (Backend) dinlenmiyor"
fi

# Port 1433 (SQL Server)
if netstat -tlnp | grep -q ":1433 "; then
    check_pass "Port 1433 (SQL Server) dinleniyor"
else
    check_warn "Port 1433 (SQL Server) harici erişime kapalı"
fi

# 11. SSL Sertifikası Kontrolü
echo ""
log "11/15 SSL sertifikası kontrol ediliyor..."
echo ""

if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    check_pass "Let's Encrypt sertifikası mevcut"
    
    # Sertifika geçerlilik tarihi
    CERT_EXPIRE=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" | cut -d= -f2)
    echo "      • Geçerlilik tarihi: $CERT_EXPIRE"
else
    check_warn "SSL sertifikası bulunamadı"
fi

# 12. Firewall Kontrolü
echo ""
log "12/15 Firewall ayarları kontrol ediliyor..."
echo ""

if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status | head -1)
    if [[ $UFW_STATUS == *"active"* ]]; then
        check_pass "UFW firewall aktif"
        echo "      • HTTP: $(ufw status | grep "80/tcp" || echo "Tanımlı değil")"
        echo "      • HTTPS: $(ufw status | grep "443/tcp" || echo "Tanımlı değil")"
        echo "      • SSH: $(ufw status | grep "22/tcp" || echo "Tanımlı değil")"
    else
        check_warn "UFW firewall pasif"
    fi
else
    check_warn "UFW firewall kurulu değil"
fi

# 13. API Health Check
echo ""
log "13/15 API health check yapılıyor..."
echo ""

# Local API test
if curl -f -s http://localhost:5000/api/health &>/dev/null; then
    check_pass "Backend API (localhost) erişilebilir"
    API_RESPONSE=$(curl -s http://localhost:5000/api/health | jq -r '.status' 2>/dev/null || echo "OK")
    echo "      • Status: $API_RESPONSE"
else
    check_fail "Backend API (localhost) erişilemiyor"
fi

# Domain API test
if curl -f -s http://$DOMAIN/api/health &>/dev/null; then
    check_pass "Backend API (domain) erişilebilir"
else
    check_fail "Backend API (domain) erişilemiyor"
fi

# 14. Web Sitesi Kontrolü
echo ""
log "14/15 Web sitesi erişimi kontrol ediliyor..."
echo ""

# HTTP test
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    check_pass "Web sitesi (HTTP) erişilebilir - Status: $HTTP_STATUS"
elif [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    check_pass "Web sitesi (HTTP) yönlendirme - Status: $HTTP_STATUS"
else
    check_fail "Web sitesi (HTTP) erişilemiyor - Status: $HTTP_STATUS"
fi

# HTTPS test (eğer SSL varsa)
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN 2>/dev/null || echo "000")
    if [ "$HTTPS_STATUS" = "200" ]; then
        check_pass "Web sitesi (HTTPS) erişilebilir - Status: $HTTPS_STATUS"
    else
        check_fail "Web sitesi (HTTPS) erişilemiyor - Status: $HTTPS_STATUS"
    fi
fi

# 15. Log Dosyaları Kontrolü
echo ""
log "15/15 Log dosyaları kontrol ediliyor..."
echo ""

info "📋 Log Dosyaları:"

# Nginx logs
if [ -f "/var/log/nginx/access.log" ]; then
    LOG_SIZE=$(stat -c%s "/var/log/nginx/access.log")
    echo "   • Nginx Access: $(($LOG_SIZE / 1024))KB"
else
    echo "   • Nginx Access: Bulunamadı"
fi

if [ -f "/var/log/nginx/error.log" ]; then
    LOG_SIZE=$(stat -c%s "/var/log/nginx/error.log")
    ERROR_COUNT=$(wc -l < "/var/log/nginx/error.log")
    echo "   • Nginx Error: $(($LOG_SIZE / 1024))KB ($ERROR_COUNT satır)"
else
    echo "   • Nginx Error: Bulunamadı"
fi

# PM2 logs
if [ -f "/root/.pm2/logs/mrktahsilatweb-backend-out.log" ]; then
    LOG_SIZE=$(stat -c%s "/root/.pm2/logs/mrktahsilatweb-backend-out.log")
    echo "   • PM2 Output: $(($LOG_SIZE / 1024))KB"
else
    echo "   • PM2 Output: Bulunamadı"
fi

if [ -f "/root/.pm2/logs/mrktahsilatweb-backend-error.log" ]; then
    LOG_SIZE=$(stat -c%s "/root/.pm2/logs/mrktahsilatweb-backend-error.log")
    echo "   • PM2 Error: $(($LOG_SIZE / 1024))KB"
else
    echo "   • PM2 Error: Bulunamadı"
fi

# Özet Rapor
echo ""
echo -e "${CYAN}"
echo "================================================================="
echo "                    KONTROL RAPORU ÖZETİ"
echo "================================================================="
echo -e "${NC}"

echo ""
echo -e "${PURPLE}📊 Sistem Durumu:${NC}"
echo "   • Hostname: $(hostname)"
echo "   • IP: $(ip route get 8.8.8.8 | awk 'NR==1 {print $7}' 2>/dev/null || echo 'Bulunamadı')"
echo "   • Domain: $DOMAIN"
echo "   • OS: $(lsb_release -d | cut -f2 2>/dev/null || echo 'Ubuntu')"

echo ""
echo -e "${PURPLE}🔧 Servis Durumu:${NC}"
echo "   • Node.js: $(command -v node &> /dev/null && echo "✅ $(node --version)" || echo "❌ Kurulu değil")"
echo "   • PM2: $(command -v pm2 &> /dev/null && echo "✅ Kurulu" || echo "❌ Kurulu değil")"
echo "   • Nginx: $(systemctl is-active --quiet nginx && echo "✅ Aktif" || echo "❌ İnaktif")"
echo "   • SQL Server: $(systemctl is-active --quiet mssql-server && echo "✅ Aktif" || echo "❌ İnaktif")"

echo ""
echo -e "${PURPLE}📁 Proje Durumu:${NC}"
echo "   • Proje Dizini: $([ -d "$PROJECT_DIR" ] && echo "✅ Mevcut" || echo "❌ Bulunamadı")"
echo "   • Backend: $([ -f "$PROJECT_DIR/backend/index.js" ] && echo "✅ Kurulu" || echo "❌ Eksik")"
echo "   • Frontend: $([ -d "$PROJECT_DIR/frontend/build" ] && echo "✅ Build edilmiş" || echo "❌ Build edilmemiş")"
echo "   • Database: $(sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -Q "SELECT 1" &>/dev/null && echo "✅ Bağlantı OK" || echo "❌ Bağlantı hatası")"

echo ""
echo -e "${PURPLE}🌐 Web Erişimi:${NC}"
echo "   • HTTP: $(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null | grep -q "200\|301\|302" && echo "✅ Erişilebilir" || echo "❌ Erişilemiyor")"
echo "   • API: $(curl -f -s http://localhost:5000/api/health &>/dev/null && echo "✅ Çalışıyor" || echo "❌ Çalışmıyor")"
echo "   • SSL: $([ -d "/etc/letsencrypt/live/$DOMAIN" ] && echo "✅ Kurulu" || echo "❌ Kurulu değil")"

echo ""
info "📋 Önerilen Kontrol Komutları:"
echo "   • pm2 status"
echo "   • systemctl status nginx"
echo "   • systemctl status mssql-server" 
echo "   • curl http://localhost:5000/api/health"
echo "   • curl http://$DOMAIN"
echo "   • tail -f /var/log/nginx/error.log"

echo ""
log "🎉 Sunucu konfigürasyon kontrolü tamamlandı!"

echo ""
echo -e "${YELLOW}Not: Bu raporu kaydetmek için:${NC}"
echo "sudo bash server_check.sh > sunucu_raporu_$(date +%Y%m%d_%H%M%S).txt"
