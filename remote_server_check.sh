#!/bin/bash

# MrkTahsilatWeb Uzaktan Sunucu Kontrol Scripti
# Bu script uzak sunucuya SSH ile bağlanarak kontrolleri yapar

# GÜVENLIK UYARISI: Bu scripti kullanmadan önce SSH key authentication kurmanız önerilir!

# Kullanım: ./remote_check.sh [SUNUCU_IP] [KULLANICI_ADI]
# Örnek: ./remote_check.sh 192.168.1.100 root

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logger
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

# Parametreleri kontrol et
if [ $# -lt 2 ]; then
    echo "Kullanım: $0 <SUNUCU_IP> <KULLANICI_ADI>"
    echo "Örnek: $0 192.168.1.100 root"
    echo ""
    echo "Güvenli kullanım için SSH key authentication önerilir:"
    echo "ssh-keygen -t rsa -b 4096"
    echo "ssh-copy-id kullanici@sunucu_ip"
    exit 1
fi

SERVER_IP="$1"
USERNAME="$2"
SERVER_CHECK_SCRIPT="server_check.sh"

# Header
echo -e "${BLUE}"
echo "================================================================="
echo "          MrkTahsilatWeb Uzaktan Sunucu Kontrolü"
echo "          Sunucu: $USERNAME@$SERVER_IP"
echo "          Tarih: $(date)"
echo "================================================================="
echo -e "${NC}"

# SSH bağlantısını test et
log "SSH bağlantısı test ediliyor..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes "$USERNAME@$SERVER_IP" "echo 'SSH bağlantısı başarılı'" 2>/dev/null; then
    info "✅ SSH bağlantısı başarılı"
else
    error "❌ SSH bağlantısı başarısız"
    echo ""
    warning "Olası çözümler:"
    echo "1. SSH key authentication kurun:"
    echo "   ssh-keygen -t rsa -b 4096"
    echo "   ssh-copy-id $USERNAME@$SERVER_IP"
    echo ""
    echo "2. Manuel SSH test yapın:"
    echo "   ssh $USERNAME@$SERVER_IP"
    echo ""
    echo "3. Sunucu IP adresini ve kullanıcı adını kontrol edin"
    exit 1
fi

# Sunucuya kontrol scriptini gönder
log "Kontrol scripti sunucuya gönderiliyor..."
if scp "$SERVER_CHECK_SCRIPT" "$USERNAME@$SERVER_IP:/tmp/" 2>/dev/null; then
    info "✅ Script başarıyla gönderildi"
else
    error "❌ Script gönderilemedi"
    
    # Script'i GitHub'dan indir
    warning "Script GitHub'dan indiriliyor..."
    ssh "$USERNAME@$SERVER_IP" "
        cd /tmp && 
        wget -q https://raw.githubusercontent.com/azemyazilim/MrkTahsilatWeb/main/server_check.sh && 
        chmod +x server_check.sh
    " 2>/dev/null && info "✅ Script GitHub'dan indirildi" || error "❌ Script indirilemedi"
fi

# Kontrol scriptini çalıştır
log "Sunucu kontrolü başlatılıyor..."
echo ""

# Uzak sunucuda script çalıştır
ssh "$USERNAME@$SERVER_IP" "
    cd /tmp
    if [ -f server_check.sh ]; then
        sudo bash server_check.sh
    else
        echo 'Kontrol scripti bulunamadı'
        exit 1
    fi
" 2>/dev/null || {
    error "Uzak script çalıştırılamadı"
    
    # Manuel kontrol komutları
    warning "Manuel kontrol komutları çalıştırılıyor..."
    
    ssh "$USERNAME@$SERVER_IP" "
        echo '=== SİSTEM BİLGİLERİ ==='
        echo 'OS:' \$(lsb_release -d | cut -f2)
        echo 'Hostname:' \$(hostname)
        echo 'IP:' \$(ip route get 8.8.8.8 | awk 'NR==1 {print \$7}')
        echo 'Uptime:' \$(uptime -p)
        echo ''
        
        echo '=== SERVİS DURUMLARI ==='
        echo 'Node.js:' \$(node --version 2>/dev/null || echo 'Kurulu değil')
        echo 'PM2:' \$(pm2 --version 2>/dev/null || echo 'Kurulu değil')
        echo 'Nginx:' \$(systemctl is-active nginx 2>/dev/null || echo 'İnaktif')
        echo 'SQL Server:' \$(systemctl is-active mssql-server 2>/dev/null || echo 'İnaktif')
        echo ''
        
        echo '=== PROJE DURUM ==='
        echo 'Proje dizini:' \$([ -d '/var/www/mrktahsilat' ] && echo 'Mevcut' || echo 'Bulunamadı')
        echo 'Backend:' \$([ -f '/var/www/mrktahsilat/backend/index.js' ] && echo 'Mevcut' || echo 'Bulunamadı')
        echo 'Frontend build:' \$([ -d '/var/www/mrktahsilat/frontend/build' ] && echo 'Mevcut' || echo 'Bulunamadı')
        echo ''
        
        echo '=== PM2 DURUM ==='
        pm2 status 2>/dev/null || echo 'PM2 çalışmıyor'
        echo ''
        
        echo '=== PORT DURUMLARI ==='
        echo 'Port 80:' \$(netstat -tlnp | grep ':80 ' | head -1 || echo 'Dinlenmiyor')
        echo 'Port 5000:' \$(netstat -tlnp | grep ':5000 ' | head -1 || echo 'Dinlenmiyor')
        echo ''
        
        echo '=== API TEST ==='
        curl -f -s http://localhost:5000/api/health >/dev/null 2>&1 && echo 'Backend API: Çalışıyor' || echo 'Backend API: Çalışmıyor'
        curl -f -s http://mrktahsilat.com >/dev/null 2>&1 && echo 'Web sitesi: Erişilebilir' || echo 'Web sitesi: Erişilemiyor'
    "
}

echo ""
log "Uzaktan kontrol tamamlandı!"

echo ""
info "📋 Manuel kontrol için bağlantı:"
echo "   ssh $USERNAME@$SERVER_IP"

echo ""
info "🔧 Sunucuda çalıştırılabilir komutlar:"
echo "   sudo bash /tmp/server_check.sh"
echo "   pm2 status"
echo "   systemctl status nginx"
echo "   systemctl status mssql-server"
echo "   curl http://localhost:5000/api/health"
