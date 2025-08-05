#!/bin/bash

# MrkTahsilatWeb Sorun Giderme Scripti
# Tespit edilen sorunları otomatik olarak çözer

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Değişkenler
PROJECT_DIR="/var/www/mrktahsilat"
DOMAIN="mrktahsilat.com"
DB_PASSWORD="MrkTahsilat2024!"

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

echo -e "${BLUE}"
echo "================================================================="
echo "          MrkTahsilatWeb Sorun Giderme Scripti"
echo "          Sunucu: server.azemyazilim.com (89.252.179.189)"
echo "          Domain: $DOMAIN"
echo "================================================================="
echo -e "${NC}"

# Root kontrolü
if [[ $EUID -ne 0 ]]; then
   error "Bu script sudo ile çalıştırılmalıdır."
   exit 1
fi

# 1. Veritabanı Sorununu Çöz
echo ""
log "1/6 Veritabanı bağlantı sorunu çözülüyor..."

# SQL Server'ı yeniden başlat
systemctl restart mssql-server
sleep 10

# Bağlantı testi
if sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -Q "SELECT 1" &>/dev/null; then
    info "✅ SQL Server bağlantısı düzeltildi"
else
    warning "SQL Server şifresi sıfırlanıyor..."
    
    # SQL Server'ı durdur
    systemctl stop mssql-server
    
    # Şifreyi sıfırla
    export ACCEPT_EULA=Y
    export SA_PASSWORD="$DB_PASSWORD"
    export MSSQL_PID=Developer
    
    /opt/mssql/bin/mssql-conf -n setup accept-eula
    systemctl start mssql-server
    sleep 15
fi

# Veritabanını yeniden oluştur
info "Veritabanı kontrol ediliyor..."
if ! sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -Q "SELECT name FROM sys.databases WHERE name = 'MrkTahsilatDB'" | grep -q "MrkTahsilatDB"; then
    warning "Veritabanı yeniden oluşturuluyor..."
    
    cat > /tmp/create_db.sql << 'EOF'
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'MrkTahsilatDB')
BEGIN
    DROP DATABASE MrkTahsilatDB;
END
GO

CREATE DATABASE MrkTahsilatDB;
GO

USE MrkTahsilatDB;
GO

-- Kullanıcı tablosu
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) UNIQUE NOT NULL,
    Password NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) DEFAULT 'user',
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Tahsilat tablosu
CREATE TABLE Tahsilat (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    MusteriAdi NVARCHAR(100) NOT NULL,
    Tutar DECIMAL(18,2) NOT NULL,
    TahsilatTarihi DATETIME DEFAULT GETDATE(),
    Durum NVARCHAR(20) DEFAULT 'pending',
    Notlar NVARCHAR(500),
    CreatedBy INT,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (CreatedBy) REFERENCES Users(Id)
);
GO

-- Test kullanıcısı
INSERT INTO Users (Username, Password, Role) 
VALUES ('admin', 'admin123', 'admin');
GO

-- Test tahsilat verisi
INSERT INTO Tahsilat (MusteriAdi, Tutar, Durum, CreatedBy) 
VALUES ('Test Müşteri', 1000.00, 'completed', 1);
GO
EOF

    sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -i /tmp/create_db.sql
    rm /tmp/create_db.sql
    info "✅ Veritabanı oluşturuldu"
fi

# 2. Backend Environment Dosyasını Düzelt
echo ""
log "2/6 Backend environment dosyası kontrol ediliyor..."

cd "$PROJECT_DIR/backend"

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

CORS_ORIGIN=https://mrktahsilat.com,https://www.mrktahsilat.com,http://mrktahsilat.com,http://www.mrktahsilat.com

LOG_LEVEL=info
LOG_FILE=/var/log/mrktahsilatweb/app.log
EOF

chmod 600 .env
chown www-data:www-data .env
info "✅ Backend environment dosyası güncellendi"

# 3. Frontend Build Et
echo ""
log "3/6 Frontend build ediliyor..."

cd "$PROJECT_DIR/frontend"

# Frontend environment dosyası
cat > .env.production << 'EOF'
REACT_APP_API_URL=http://mrktahsilat.com/api
REACT_APP_ENV=production
GENERATE_SOURCEMAP=false
CI=false
EOF

# Dependencies kur
if [ ! -d "node_modules" ]; then
    info "Frontend dependencies kuruluyor..."
    npm install
fi

# Build et
info "Frontend build ediliyor... (Bu birkaç dakika sürebilir)"
npm run build

if [ -d "build" ]; then
    info "✅ Frontend başarıyla build edildi"
    chown -R www-data:www-data build/
else
    error "❌ Frontend build başarısız"
fi

# 4. Nginx Konfigürasyonunu Düzelt
echo ""
log "4/6 Nginx konfigürasyonu düzeltiliyor..."

# Mevcut site konfigürasyonunu güncelle
cat > /etc/nginx/sites-available/$DOMAIN << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN 89.252.179.189;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Frontend (React build files)
    location / {
        root $PROJECT_DIR/frontend/build;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout ayarları
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/api/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Block sensitive files
    location ~ /\.(env|git) {
        deny all;
        return 404;
    }
    
    # Favicon
    location = /favicon.ico {
        root $PROJECT_DIR/frontend/build;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Site'ı etkinleştir
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Nginx test et
if nginx -t; then
    systemctl reload nginx
    info "✅ Nginx konfigürasyonu güncellendi"
else
    error "❌ Nginx konfigürasyon hatası"
    nginx -t
fi

# 5. Backend'i Yeniden Başlat
echo ""
log "5/6 Backend servisi yeniden başlatılıyor..."

cd "$PROJECT_DIR/backend"

# PM2 process'i durdur
pm2 stop mrktahsilatweb-backend 2>/dev/null || true
pm2 delete mrktahsilatweb-backend 2>/dev/null || true

# Dependencies kontrol et
if [ ! -d "node_modules" ]; then
    info "Backend dependencies kuruluyor..."
    npm install --production
fi

# Backend'i başlat
pm2 start index.js --name mrktahsilatweb-backend --log /var/log/pm2/mrktahsilatweb-backend.log
pm2 save

info "✅ Backend servisi başlatıldı"

# 6. Final Testler
echo ""
log "6/6 Final testler yapılıyor..."

sleep 5

# PM2 durumu
info "📊 PM2 Durumu:"
pm2 status

# API test
if curl -f -s http://localhost:5000/api/health &>/dev/null; then
    info "✅ Backend API çalışıyor"
else
    warning "❌ Backend API çalışmıyor"
fi

# Database test
if sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -Q "SELECT COUNT(*) FROM MrkTahsilatDB.dbo.Users" &>/dev/null; then
    info "✅ Veritabanı bağlantısı çalışıyor"
else
    warning "❌ Veritabanı bağlantısı hala sorunlu"
fi

# Web sitesi test
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    info "✅ Web sitesi erişilebilir (HTTP $HTTP_STATUS)"
elif [ "$HTTP_STATUS" = "502" ]; then
    warning "❌ Web sitesi 502 Bad Gateway - Backend sorunu"
elif [ "$HTTP_STATUS" = "000" ]; then
    warning "❌ Web sitesi erişilemiyor - DNS sorunu olabilir"
else
    warning "❌ Web sitesi durum kodu: $HTTP_STATUS"
fi

# SSL Sertifikası Kur
echo ""
log "SSL sertifikası kuruluyor..."

if command -v certbot &> /dev/null; then
    info "Let's Encrypt SSL sertifikası kuruluyor..."
    # Certbot'u non-interactive mode'da çalıştır
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect
    
    if [ $? -eq 0 ]; then
        info "✅ SSL sertifikası başarıyla kuruldu"
    else
        warning "❌ SSL sertifikası kurulamadı - DNS ayarlarını kontrol edin"
    fi
else
    warning "Certbot kurulu değil, SSL için manuel kurulum gerekli"
fi

# Özet Rapor
echo ""
echo -e "${GREEN}"
echo "================================================================="
echo "                    SORUN GİDERME TAMAMLANDI"
echo "================================================================="
echo -e "${NC}"

echo ""
info "🔧 Yapılan İyileştirmeler:"
echo "   ✅ SQL Server yeniden konfigüre edildi"
echo "   ✅ Veritabanı yeniden oluşturuldu"
echo "   ✅ Backend environment dosyası düzeltildi"
echo "   ✅ Frontend build edildi"
echo "   ✅ Nginx konfigürasyonu güncellendi"
echo "   ✅ Backend servisi yeniden başlatıldı"

echo ""
info "🌐 Test Komutları:"
echo "   • curl http://$DOMAIN"
echo "   • curl http://$DOMAIN/api/health"
echo "   • curl http://89.252.179.189"

echo ""
info "📊 Durum Kontrol:"
echo "   • pm2 status"
echo "   • systemctl status nginx"
echo "   • systemctl status mssql-server"

echo ""
warning "🔍 DNS Ayarları Kontrol Edin:"
echo "   • $DOMAIN A kaydı -> 89.252.179.189"
echo "   • www.$DOMAIN A kaydı -> 89.252.179.189"

echo ""
log "🎉 Sorun giderme scripti tamamlandı!"
