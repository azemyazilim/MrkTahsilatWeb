#!/bin/bash

# MrkTahsilatWeb Quick Deployment Script
# Bu script mevcut sunucuda hızlı deployment yapar

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

# Check if running as root or www-data
if [ "$EUID" -ne 0 ] && [ "$USER" != "www-data" ]; then
    error "Bu script root veya www-data kullanıcısı ile çalıştırılmalıdır."
fi

# Set project directory
PROJECT_DIR="/var/www/mrktahsilat"
cd "$PROJECT_DIR" || error "Proje dizini bulunamadı: $PROJECT_DIR"

log "🚀 MrkTahsilatWeb Quick Deployment başlatılıyor..."

# Backup current version
log "💾 Mevcut versiyon yedekleniyor..."
BACKUP_DIR="/var/backups/mrktahsilatweb"
mkdir -p "$BACKUP_DIR"
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$BACKUP_DIR/$BACKUP_NAME" . --exclude=node_modules --exclude=.git --exclude=uploads
success "Backup oluşturuldu: $BACKUP_DIR/$BACKUP_NAME"

# Pull latest changes
log "📥 Son değişiklikler çekiliyor..."
git fetch origin
git reset --hard origin/main
success "Kod güncellendi"

# Install backend dependencies
log "📦 Backend dependencies kuruluyor..."
cd backend
npm install --production
success "Backend dependencies kuruldu"

# Build frontend
log "🏗️ Frontend build ediliyor..."
cd ../frontend
npm install
npm run build
success "Frontend build edildi"

# Restart PM2 process
log "🔄 PM2 process yeniden başlatılıyor..."
cd ..
pm2 restart mrktahsilatweb-backend || pm2 start ecosystem.config.js
success "PM2 process yeniden başlatıldı"

# Reload Nginx
log "🔄 Nginx yeniden yükleniyor..."
sudo systemctl reload nginx
success "Nginx yeniden yüklendi"

# Health check
log "🏥 Health check yapılıyor..."
sleep 5

if curl -f http://localhost:5000/api/health &>/dev/null; then
    success "Backend health check başarılı"
else
    warning "Backend health check başarısız - Manuel kontrol gerekebilir"
fi

if curl -f http://localhost/ &>/dev/null; then
    success "Frontend health check başarılı"
else
    warning "Frontend health check başarısız - Manuel kontrol gerekebilir"
fi

# Cleanup old backups (keep last 5)
log "🧹 Eski backuplar temizleniyor..."
find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f | sort -r | tail -n +6 | xargs rm -f
success "Eski backuplar temizlendi"

# Final status
log "📊 Deployment özeti:"; echo "   - Backup: $BACKUP_DIR/$BACKUP_NAME"; echo "   - PM2 Status: $(pm2 jlist | jq -r '.[] | select(.name=="mrktahsilatweb-backend") | .pm2_env.status' 2>/dev/null || echo 'Unknown')"; echo "   - Nginx Status: $(systemctl is-active nginx)"; echo "   - Frontend: https://mrktahsilat.com"; echo "   - Backend API: https://mrktahsilat.com/api"; echo "   - Health Check: https://mrktahsilat.com/health"

success "🎉 Quick deployment başarıyla tamamlandı!"

