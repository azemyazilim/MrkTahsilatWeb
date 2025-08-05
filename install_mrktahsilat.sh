#!/bin/bash

# MrkTahsilatWeb Hızlı Kurulum Scripti - mrktahsilat.com
# Bu script tüm kurulum adımlarını otomatik olarak gerçekleştirir

set -e

# Konfigürasyon
DOMAIN="mrktahsilat.com"
PROJECT_DIR="/var/www/mrktahsilat"
DB_PASSWORD="MrkTahsilat2024!"
DB_NAME="MrkTahsilatDB"

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
    exit 1
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
echo "     MrkTahsilatWeb Otomatik Kurulum"
echo "     Domain: $DOMAIN"
echo "=================================================="
echo -e "${NC}"

# Root kullanıcı kontrolü
if [[ $EUID -ne 0 ]]; then
   error "Bu script root kullanıcısı ile çalıştırılmalıdır. 'sudo bash install.sh' kullanın."
fi

# 1. Sistem güncellemesi
log "1/12 Sistem güncelleniyor..."
apt update && apt upgrade -y

# 2. Gerekli paketleri kur
log "2/12 Gerekli paketler kuruluyor..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release htop

# 3. Node.js kurulumu
log "3/12 Node.js kuruluyor..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Node.js versiyonunu kontrol et
NODE_VERSION=$(node --version)
info "Node.js sürümü: $NODE_VERSION"

# PM2 kur
npm install -g pm2

# 4. Nginx kurulumu
log "4/12 Nginx kuruluyor..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# 5. SQL Server kurulumu
log "5/12 Microsoft SQL Server kuruluyor..."
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
add-apt-repository "$(wget -qO- https://packages.microsoft.com/config/ubuntu/20.04/mssql-server-2019.list)"
apt update
apt install -y mssql-server

# SQL Server'ı yapılandır (otomatik)
export ACCEPT_EULA=Y
export SA_PASSWORD=$DB_PASSWORD
export MSSQL_PID=Developer

/opt/mssql/bin/mssql-conf -n setup accept-eula

# SQL Server araçlarını kur
curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
curl https://packages.microsoft.com/config/ubuntu/20.04/prod.list | tee /etc/apt/sources.list.d/msprod.list
apt update
ACCEPT_EULA=Y apt install -y mssql-tools unixodbc-dev

# PATH'e ekle
echo 'export PATH="$PATH:/opt/mssql-tools/bin"' >> /root/.bashrc
export PATH="$PATH:/opt/mssql-tools/bin"

# SQL Server'ı başlat
systemctl start mssql-server
systemctl enable mssql-server

# 6. Proje dizini oluştur
log "6/12 Proje dizini hazırlanıyor..."
mkdir -p $PROJECT_DIR
chown www-data:www-data $PROJECT_DIR

# 7. Veritabanı oluştur
log "7/12 Veritabanı oluşturuluyor..."
sleep 5  # SQL Server'ın başlamasını bekle

# Veritabanı scripti oluştur
cat > /tmp/create_db.sql << 'EOF'
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

# Veritabanını oluştur
sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -i /tmp/create_db.sql
rm /tmp/create_db.sql

# 8. Nginx konfigürasyonu
log "8/12 Nginx yapılandırılıyor..."
cat > /etc/nginx/sites-available/$DOMAIN << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

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
    }

    # Block sensitive files
    location ~ /\.(env|git) {
        deny all;
        return 404;
    }
}
EOF

# Site'ı etkinleştir
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Nginx'i test et ve yeniden başlat
nginx -t
systemctl reload nginx

# 9. Firewall ayarları
log "9/12 Firewall yapılandırılıyor..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'

# 10. SSL sertifikası (Certbot)
log "10/12 SSL sertifikası hazırlanıyor..."
apt install -y certbot python3-certbot-nginx

# 11. Log dizinleri oluştur
log "11/12 Log dizinleri oluşturuluyor..."
mkdir -p /var/log/mrktahsilatweb
mkdir -p /var/log/pm2
chown www-data:www-data /var/log/mrktahsilatweb
chmod 755 /var/log/mrktahsilatweb

# 12. Kurulum scripti oluştur
log "12/12 Deployment scriptleri hazırlanıyor..."

# Proje deployment scripti
cat > $PROJECT_DIR/deploy-project.sh << 'EOF'
#!/bin/bash
set -e

PROJECT_DIR="/var/www/mrktahsilat"
DB_PASSWORD="MrkTahsilat2024!"

echo "🚀 Proje deployment başlatılıyor..."

# Backend environment dosyası oluştur
cd $PROJECT_DIR/backend
cat > .env << 'ENV_EOF'
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
ENV_EOF

chmod 600 .env

# Backend bağımlılıklarını kur
echo "📦 Backend bağımlılıkları kuruluyor..."
npm install --production

# Frontend environment dosyası oluştur
cd $PROJECT_DIR/frontend
cat > .env.production << 'ENV_EOF'
REACT_APP_API_URL=https://mrktahsilat.com/api
REACT_APP_ENV=production
GENERATE_SOURCEMAP=false
CI=false
ENV_EOF

# Frontend bağımlılıklarını kur ve build et
echo "🏗️ Frontend build ediliyor..."
npm install
npm run build

# PM2 ile backend'i başlat
echo "🔄 Backend servisi başlatılıyor..."
cd $PROJECT_DIR/backend
pm2 stop mrktahsilatweb-backend 2>/dev/null || true
pm2 delete mrktahsilatweb-backend 2>/dev/null || true
pm2 start index.js --name mrktahsilatweb-backend
pm2 startup
pm2 save

# Nginx'i reload et
echo "🌐 Nginx yeniden yükleniyor..."
nginx -s reload

echo "✅ Deployment tamamlandı!"
echo "🌍 Site: http://mrktahsilat.com"
echo "📊 API Health: http://mrktahsilat.com/api/health"
echo "📋 PM2 Status: pm2 status"
EOF

chmod +x $PROJECT_DIR/deploy-project.sh

# Son kontroller
echo ""
log "Kurulum tamamlandı! ✅"
echo ""
info "📋 Kurulum Özeti:"
echo "   • Domain: $DOMAIN"
echo "   • Proje Dizini: $PROJECT_DIR"
echo "   • Veritabanı: $DB_NAME"
echo "   • Node.js: $(node --version)"
echo "   • Nginx: Aktif"
echo "   • SQL Server: Aktif"
echo ""
warning "🔧 Sonraki Adımlar:"
echo "   1. Proje dosyalarınızı $PROJECT_DIR dizinine yükleyin"
echo "   2. Domain DNS'ini sunucu IP'sine yönlendirin"
echo "   3. Deployment scripti çalıştırın: $PROJECT_DIR/deploy-project.sh"
echo "   4. SSL sertifikası kurun: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
info "📊 Durum Kontrol Komutları:"
echo "   • pm2 status"
echo "   • systemctl status nginx"
echo "   • systemctl status mssql-server"
echo "   • curl http://localhost:5000/api/health"
echo ""
info "📁 Proje yükleme örneği:"
echo "   scp -r /local/path/* root@server:$PROJECT_DIR/"
echo "   cd $PROJECT_DIR && ./deploy-project.sh"
echo ""

# Final test
if systemctl is-active --quiet nginx && systemctl is-active --quiet mssql-server; then
    log "🎉 Tüm servisler çalışıyor!"
else
    error "❌ Bazı servisler çalışmıyor, lütfen kontrol edin."
fi
