#!/bin/bash

# MrkTahsilatWeb Ubuntu 20.04 Server Setup Script
# Bu script Ubuntu 20.04 sunucusunda gerekli tüm servisleri kurar ve yapılandırır

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Bu script root yetkisi gerektirir. 'sudo' ile çalıştırın."
fi

log "🚀 MrkTahsilatWeb Ubuntu 20.04 Server Setup başlatılıyor..."

# Update system
log "📦 Sistem güncelleniyor..."
apt update && apt upgrade -y
success "Sistem güncellendi"

# Install essential packages
log "📦 Temel paketler kuruluyor..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
success "Temel paketler kuruldu"

# Install Node.js 18.x
log "📦 Node.js 18.x kuruluyor..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
success "Node.js $(node --version) kuruldu"

# Install PM2 globally
log "📦 PM2 kuruluyor..."
npm install -g pm2
success "PM2 kuruldu"

# Install Nginx
log "📦 Nginx kuruluyor..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx
success "Nginx kuruldu ve başlatıldı"

# Install Certbot for SSL
log "📦 Certbot kuruluyor..."
apt install -y certbot python3-certbot-nginx
success "Certbot kuruldu"

# Create application directory
log "📁 Uygulama dizini oluşturuluyor..."
mkdir -p /var/www/mrktahsilat
mkdir -p /var/log/mrktahsilatweb
chown -R www-data:www-data /var/www/mrktahsilat
chown -R www-data:www-data /var/log/mrktahsilatweb
success "Uygulama dizinleri oluşturuldu"

# Configure firewall
log "🔥 Firewall yapılandırılıyor..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 5000
ufw --force enable
success "Firewall yapılandırıldı"

# Configure Nginx
log "⚙️ Nginx yapılandırılıyor..."
cp nginx.conf /etc/nginx/sites-available/mrktahsilat
ln -sf /etc/nginx/sites-available/mrktahsilat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
success "Nginx yapılandırıldı"

# Create systemd service for PM2
log "⚙️ PM2 systemd servisi oluşturuluyor..."
pm2 startup systemd -u www-data --hp /var/www/mrktahsilat
success "PM2 systemd servisi oluşturuldu"

# Create deployment script
log "📝 Deployment script oluşturuluyor..."
cat > /var/www/mrktahsilat/deploy.sh << 'EOF'
#!/bin/bash
cd /var/www/mrktahsilat

# Pull latest changes
git pull origin main

# Install backend dependencies
cd backend
npm install --production

# Build frontend
cd ../frontend
npm install
npm run build

# Restart PM2 process
pm2 restart mrktahsilatweb-backend

# Reload Nginx
systemctl reload nginx

echo "✅ Deployment completed!"
EOF

chmod +x /var/www/mrktahsilat/deploy.sh
success "Deployment script oluşturuldu"

# Create environment file
log "⚙️ Environment dosyası oluşturuluyor..."
cat > /var/www/mrktahsilat/backend/.env.production << 'EOF'
NODE_ENV=production
PORT=5000
DB_SERVER=88.247.8.178
DB_PORT=2024
DB_DATABASE=GO3
DB_USER=sa
DB_PASSWORD=8423Otomotiv
CORS_ORIGIN=https://mrktahsilat.com,https://www.mrktahsilat.com
EOF

chown www-data:www-data /var/www/mrktahsilat/backend/.env.production
success "Environment dosyası oluşturuldu"

# Create log rotation
log "📝 Log rotation yapılandırılıyor..."
cat > /etc/logrotate.d/mrktahsilatweb << 'EOF'
/var/log/mrktahsilatweb/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

success "Log rotation yapılandırıldı"

# Create monitoring script
log "📊 Monitoring script oluşturuluyor..."
cat > /var/www/mrktahsilat/monitor.sh << 'EOF'
#!/bin/bash
# Simple monitoring script

echo "=== MrkTahsilatWeb System Status ==="
echo "Date: $(date)"
echo ""

echo "=== PM2 Status ==="
pm2 list
echo ""

echo "=== Nginx Status ==="
systemctl status nginx --no-pager -l
echo ""

echo "=== Disk Usage ==="
df -h /var/www/mrktahsilat
echo ""

echo "=== Memory Usage ==="
free -h
echo ""

echo "=== Recent Logs ==="
tail -20 /var/log/mrktahsilatweb/combined.log
EOF

chmod +x /var/www/mrktahsilat/monitor.sh
success "Monitoring script oluşturuldu"

# Final instructions
log "🎉 Server setup tamamlandı!"
echo ""
echo -e "${GREEN}📋 Sonraki Adımlar:${NC}"
echo "1. Domain DNS ayarlarını yapın (A record -> sunucu IP'si)"
echo "2. SSL sertifikası alın: sudo certbot --nginx -d mrktahsilat.com -d www.mrktahsilat.com"
echo "3. Projeyi klonlayın: cd /var/www/mrktahsilat && git clone [REPO_URL] ."
echo "4. Dependencies kurun: cd backend && npm install && cd ../frontend && npm install"
echo "5. Frontend build edin: cd frontend && npm run build"
echo "6. PM2 ile başlatın: pm2 start ecosystem.config.js"
echo "7. PM2'yi kaydedin: pm2 save && pm2 startup"
echo ""
echo -e "${GREEN}🔗 Faydalı Komutlar:${NC}"
echo "- Deployment: /var/www/mrktahsilat/deploy.sh"
echo "- Monitoring: /var/www/mrktahsilat/monitor.sh"
echo "- PM2 logs: pm2 logs mrktahsilatweb-backend"
echo "- Nginx logs: tail -f /var/log/nginx/mrktahsilat.error.log"
echo ""
echo -e "${GREEN}🌐 Erişim:${NC}"
echo "- Frontend: https://mrktahsilat.com"
echo "- Backend API: https://mrktahsilat.com/api"
echo "- Health Check: https://mrktahsilat.com/health"
echo ""
success "Server setup başarıyla tamamlandı!"

