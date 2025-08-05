#!/bin/bash

# MrkTahsilatWeb Otomatik Deployment Script
# Usage: ./deploy.sh [production|staging]

set -e  # Exit on any error

# Configuration
PROJECT_DIR="/var/www/mrktahsilat"
BACKUP_DIR="/home/$USER/backups"
LOG_FILE="/var/log/deployment.log"
ENVIRONMENT=${1:-production}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}ERROR: $1${NC}" | tee -a $LOG_FILE
    exit 1
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}" | tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}WARNING: $1${NC}" | tee -a $LOG_FILE
}

# Pre-deployment checks
pre_deployment_checks() {
    log "🔍 Pre-deployment checks başlatılıyor..."
    
    # Check if project directory exists
    if [ ! -d "$PROJECT_DIR" ]; then
        error "Proje dizini bulunamadı: $PROJECT_DIR"
    fi
    
    # Check if PM2 is running
    if ! command -v pm2 &> /dev/null; then
        error "PM2 bulunamadı. Önce PM2'yi kurun."
    fi
    
    # Check if Nginx is running
    if ! systemctl is-active --quiet nginx; then
        error "Nginx çalışmıyor. Önce Nginx'i başlatın."
    fi
    
    success "Pre-deployment checks tamamlandı"
}

# Backup current version
backup_current_version() {
    log "💾 Mevcut versiyon yedekleniyor..."
    
    mkdir -p $BACKUP_DIR
    BACKUP_NAME="mrktahsilatweb_backup_$(date +%Y%m%d_%H%M%S)"
    
    cd $PROJECT_DIR
    tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" . --exclude=node_modules --exclude=.git
    
    success "Backup oluşturuldu: $BACKUP_NAME.tar.gz"
}

# Update source code
update_source_code() {
    log "📥 Kaynak kod güncelleniyor..."
    
    cd $PROJECT_DIR
    
    # Stash any local changes
    git stash
    
    # Pull latest changes
    git pull origin main || error "Git pull başarısız"
    
    success "Kaynak kod güncellendi"
}

# Install backend dependencies
install_backend_dependencies() {
    log "📦 Backend bağımlılıkları kuruluyor..."
    
    cd $PROJECT_DIR/backend
    
    # Clear npm cache if needed
    npm cache clean --force
    
    # Install dependencies
    npm ci --production || error "Backend bağımlılık kurulumu başarısız"
    
    success "Backend bağımlılıkları kuruldu"
}

# Build frontend
build_frontend() {
    log "🏗️ Frontend build ediliyor..."
    
    cd $PROJECT_DIR/frontend
    
    # Clear npm cache if needed
    npm cache clean --force
    
    # Install dependencies
    npm ci || error "Frontend bağımlılık kurulumu başarısız"
    
    # Build for production
    npm run build || error "Frontend build başarısız"
    
    success "Frontend build tamamlandı"
}

# Update database if needed
update_database() {
    log "🗄️ Veritabanı kontrol ediliyor..."
    
    # Add your database migration/update commands here
    # Example:
    # sqlcmd -S localhost -U sa -P 'YourPassword' -d MrkTahsilatDB -i migrations.sql
    
    success "Veritabanı güncellemeleri tamamlandı"
}

# Restart services
restart_services() {
    log "🔄 Servisler yeniden başlatılıyor..."
    
    # Restart PM2 application
    pm2 restart mrktahsilatweb-backend || error "PM2 restart başarısız"
    
    # Reload Nginx configuration
    sudo nginx -t || error "Nginx konfigürasyonu geçersiz"
    sudo nginx -s reload || error "Nginx reload başarısız"
    
    success "Servisler yeniden başlatıldı"
}

# Health check
health_check() {
    log "🏥 Sistem sağlık kontrolü..."
    
    # Wait a bit for services to start
    sleep 5
    
    # Check backend health
    if curl -f http://localhost:5000/api/health &>/dev/null; then
        success "Backend sağlık kontrolü başarılı"
    else
        warning "Backend sağlık kontrolü başarısız - Manuel kontrol gerekebilir"
    fi
    
    # Check frontend
    if curl -f http://localhost/ &>/dev/null; then
        success "Frontend sağlık kontrolü başarılı"
    else
        warning "Frontend sağlık kontrolü başarısız - Manuel kontrol gerekebilir"
    fi
    
    # Check PM2 status
    pm2 list | grep -q "mrktahsilatweb-backend.*online" && success "PM2 durumu: online" || warning "PM2 durumu kontrol edilmeli"
}

# Cleanup old backups
cleanup_old_backups() {
    log "🧹 Eski backuplar temizleniyor..."
    
    # Keep only last 10 backups
    find $BACKUP_DIR -name "mrktahsilatweb_backup_*.tar.gz" -type f | sort -r | tail -n +11 | xargs rm -f
    
    success "Eski backuplar temizlendi"
}

# Send notification (optional)
send_notification() {
    log "📬 Bildirim gönderiliyor..."
    
    # Add your notification logic here (Slack, Discord, email, etc.)
    # Example:
    # curl -X POST -H 'Content-type: application/json' \
    #   --data '{"text":"MrkTahsilatWeb deployment completed successfully"}' \
    #   YOUR_SLACK_WEBHOOK_URL
    
    success "Bildirim gönderildi"
}

# Main deployment function
main() {
    log "🚀 MrkTahsilatWeb Deployment başlatılıyor ($ENVIRONMENT)..."
    
    pre_deployment_checks
    backup_current_version
    update_source_code
    install_backend_dependencies
    build_frontend
    update_database
    restart_services
    health_check
    cleanup_old_backups
    send_notification
    
    success "🎉 Deployment başarıyla tamamlandı!"
    log "📊 Deployment özeti:"
    log "   - Environment: $ENVIRONMENT"
    log "   - Backup: $(ls -1t $BACKUP_DIR/mrktahsilatweb_backup_*.tar.gz | head -1)"
    log "   - PM2 Status: $(pm2 jlist | jq -r '.[] | select(.name=="mrktahsilatweb-backend") | .pm2_env.status')"
}

# Rollback function
rollback() {
    log "🔙 Rollback işlemi başlatılıyor..."
    
    LATEST_BACKUP=$(ls -1t $BACKUP_DIR/mrktahsilatweb_backup_*.tar.gz | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        error "Rollback için backup bulunamadı"
    fi
    
    log "Backup restore ediliyor: $LATEST_BACKUP"
    
    cd $PROJECT_DIR
    tar -xzf "$LATEST_BACKUP" || error "Backup restore başarısız"
    
    restart_services
    health_check
    
    success "Rollback tamamlandı"
}

# Check command line arguments
case "$1" in
    "rollback")
        rollback
        ;;
    "production"|"staging"|"")
        main
        ;;
    *)
        echo "Usage: $0 [production|staging|rollback]"
        exit 1
        ;;
esac
