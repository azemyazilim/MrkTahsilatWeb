# 🚀 MrkTahsilatWeb - mrkotomotiv.com Deployment Rehberi

## 🌐 Domain Bilgileri
- **Ana Domain:** mrkotomotiv.com
- **WWW Subdomain:** www.mrkotomotiv.com
- **Backend API:** mrkotomotiv.com/api
- **SSL:** Let's Encrypt ücretsiz sertifika

## 📋 Deployment Adımları

### 1. Ubuntu Server Hazırlığı
```bash
# Sunucuya SSH ile bağlan
ssh root@your-server-ip

# Sistem güncellemeleri
sudo apt update && sudo apt upgrade -y

# Gerekli araçları kur
sudo apt install curl wget git unzip software-properties-common -y

# Firewall ayarları
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
```

### 2. Node.js Kurulumu
```bash
# NodeSource deposunu ekle
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Node.js ve npm kur
sudo apt install nodejs -y

# Versiyonları kontrol et
node --version  # v18.x.x olmalı
npm --version

# PM2 process manager kur
sudo npm install -g pm2
```

### 3. Microsoft SQL Server Kurulumu
```bash
# Microsoft GPG anahtarını ekle
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -

# SQL Server deposunu ekle
sudo add-apt-repository "$(wget -qO- https://packages.microsoft.com/config/ubuntu/20.04/mssql-server-2019.list)"

# SQL Server kur
sudo apt update
sudo apt install mssql-server -y

# SQL Server yapılandır
sudo /opt/mssql/bin/mssql-conf setup
# Developer Edition seç (ücretsiz)
# SA kullanıcısı için güçlü şifre belirle: MrkOtomotiv2024!

# SQL Server araçlarını kur
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
curl https://packages.microsoft.com/config/ubuntu/20.04/prod.list | sudo tee /etc/apt/sources.list.d/msprod.list
sudo apt update
sudo apt install mssql-tools unixodbc-dev -y

# PATH'e ekle
echo 'export PATH="$PATH:/opt/mssql-tools/bin"' >> ~/.bashrc
source ~/.bashrc

# SQL Server başlat
sudo systemctl start mssql-server
sudo systemctl enable mssql-server
```

### 4. Nginx Web Sunucusu Kurulumu
```bash
# Nginx kur
sudo apt install nginx -y

# Nginx başlat
sudo systemctl start nginx
sudo systemctl enable nginx

# Test et
curl http://localhost  # Nginx welcome sayfası görünmeli
```

### 5. Proje Dosyalarını Sunucuya Yükleme

**Seçenek A: Git ile (Önerilen)**
```bash
# Proje dizini oluştur
sudo mkdir -p /var/www/mrkotomotiv
sudo chown $USER:$USER /var/www/mrkotomotiv

# GitHub'dan klonla (projenizi GitHub'a push ettikten sonra)
cd /var/www/mrkotomotiv
git clone https://github.com/yourusername/MrkTahsilatWeb.git .
```

**Seçenek B: Manuel dosya yükleme**
```bash
# Windows'tan Linux'a dosya kopyalama (PowerShell'de çalıştır)
scp -r C:\Users\AZEMDELL\source\repos\Code\MrkTahsilatWeb\* username@server-ip:/var/www/mrkotomotiv/
```

### 6. Veritabanı Kurulumu
```bash
# SQL Server'a bağlan
sqlcmd -S localhost -U sa -P 'MrkOtomotiv2024!'

# Veritabanı oluştur
CREATE DATABASE MrkTahsilatDB;
GO

USE MrkTahsilatDB;
GO

-- Kullanıcı tablosu oluştur (örnek)
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) UNIQUE NOT NULL,
    Password NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) DEFAULT 'user',
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Test kullanıcısı ekle
INSERT INTO Users (Username, Password, Role) 
VALUES ('admin', 'admin123', 'admin');
GO

-- Tahsilat tablosu (örnek)
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

EXIT
```

### 7. Backend Konfigürasyonu
```bash
# Backend dizinine git
cd /var/www/mrkotomotiv/backend

# Environment dosyası oluştur
cat > .env << 'EOF'
# Database Configuration
DB_USER=sa
DB_PASSWORD=MrkOtomotiv2024!
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=MrkTahsilatDB

# Server Configuration
PORT=5000
NODE_ENV=production

# Security
JWT_SECRET=mrkotomotiv-super-secret-jwt-key-2024
SESSION_SECRET=mrkotomotiv-session-secret-2024

# CORS Configuration
CORS_ORIGIN=https://mrkotomotiv.com,https://www.mrkotomotiv.com

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/mrktahsilatweb/app.log
EOF

# Dosya izinlerini güvenli yap
chmod 600 .env

# Log dizini oluştur
sudo mkdir -p /var/log/mrktahsilatweb
sudo chown $USER:$USER /var/log/mrktahsilatweb

# Node.js bağımlılıklarını kur
npm install --production
```

### 8. Frontend Build İşlemi
```bash
# Frontend dizinine git
cd /var/www/mrkotomotiv/frontend

# React bağımlılıklarını kur
npm install

# Production build oluştur
npm run build

# Build başarılı oldu mu kontrol et
ls -la build/  # index.html ve static klasörü olmalı
```

### 9. Nginx Konfigürasyonu
```bash
# mrkotomotiv.com için site konfigürasyonu oluştur
sudo tee /etc/nginx/sites-available/mrkotomotiv << 'EOF'
server {
    listen 80;
    server_name mrkotomotiv.com www.mrkotomotiv.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Frontend (React build files)
    location / {
        root /var/www/mrkotomotiv/frontend/build;
        try_files $uri $uri/ /index.html;
        
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Block sensitive files
    location ~ /\.(env|git) {
        deny all;
        return 404;
    }
}
EOF

# Site'ı etkinleştir
sudo ln -s /etc/nginx/sites-available/mrkotomotiv /etc/nginx/sites-enabled/

# Default site'ı devre dışı bırak
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx konfigürasyonunu test et
sudo nginx -t

# Nginx'i yeniden başlat
sudo systemctl reload nginx
```

### 10. PM2 ile Backend'i Başlatma
```bash
# Backend dizinine git
cd /var/www/mrkotomotiv/backend

# PM2 ile uygulamayı başlat
pm2 start index.js --name mrktahsilatweb-backend

# PM2'yi sistem başlangıcında otomatik başlat
pm2 startup
pm2 save

# Durum kontrolü
pm2 status
pm2 logs mrktahsilatweb-backend
```

### 11. Domain DNS Ayarları

**Domain sağlayıcınızda (GoDaddy, Namecheap, vs.) şu A kayıtlarını ekleyin:**

```
Type: A
Name: @
Value: YOUR_SERVER_IP
TTL: 3600

Type: A  
Name: www
Value: YOUR_SERVER_IP
TTL: 3600
```

### 12. SSL Sertifikası (Let's Encrypt)
```bash
# Certbot kur
sudo apt install certbot python3-certbot-nginx -y

# SSL sertifikası al (domain DNS'i sunucuya yönlendikten sonra)
sudo certbot --nginx -d mrkotomotiv.com -d www.mrkotomotiv.com

# Otomatik yenileme testi
sudo certbot renew --dry-run

# Crontab'a otomatik yenileme ekle
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 13. Test ve Doğrulama
```bash
# Servis durumları
sudo systemctl status nginx
sudo systemctl status mssql-server
pm2 status

# Port kontrolü
sudo netstat -tlnp | grep -E ':80|:443|:5000'

# Web sitesi testi
curl -I http://mrkotomotiv.com
curl -I https://mrkotomotiv.com

# API testi
curl http://localhost:5000/api/health
```

### 14. Güvenlik ve Monitoring
```bash
# Firewall kuralları
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Fail2ban kur
sudo apt install fail2ban -y
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Monitoring scripti çalıştırılabilir yap
cd /var/www/mrkotomotiv
chmod +x monitoring.sh
chmod +x backup_database.sh
chmod +x deploy.sh

# Crontab'a monitoring ekle
crontab -e
# Şu satırları ekle:
# */5 * * * * /var/www/mrkotomotiv/monitoring.sh full
# 0 2 * * * /var/www/mrkotomotiv/backup_database.sh daily
```

## 🔧 Yararlı Komutlar

### Deployment Sonrası Kontroller
```bash
# Site çalışıyor mu?
curl -I https://mrkotomotiv.com

# Backend API çalışıyor mu?
curl https://mrkotomotiv.com/api/health

# SSL sertifikası geçerli mi?
openssl s_client -connect mrkotomotiv.com:443 -servername mrkotomotiv.com

# PM2 durumu
pm2 status
pm2 logs mrktahsilatweb-backend --lines 50

# Nginx logları
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# SQL Server durumu
sudo systemctl status mssql-server
sqlcmd -S localhost -U sa -P 'MrkOtomotiv2024!' -Q "SELECT @@VERSION"
```

### Güncelleme Yaparken
```bash
# Otomatik deployment (Git'ten güncellemeler için)
cd /var/www/mrkotomotiv
./deploy.sh production

# Manuel güncelleme
cd /var/www/mrkotomotiv
git pull origin main
cd backend && npm install --production
cd ../frontend && npm install && npm run build
pm2 restart mrktahsilatweb-backend
sudo nginx -s reload
```

### Sorun Giderme
```bash
# Backend logları
pm2 logs mrktahsilatweb-backend

# Nginx hata logları
sudo tail -f /var/log/nginx/error.log

# SQL Server logları
sudo tail -f /var/log/mssql/errorlog

# Sistem kaynakları
htop
df -h
free -h

# Network bağlantıları
sudo netstat -tlnp
sudo ss -tlnp
```

## 🎯 Final Checklist

- [ ] ✅ Ubuntu 20.04 server hazır
- [ ] ✅ Node.js 18.x kurulu
- [ ] ✅ SQL Server 2019 kurulu ve çalışıyor
- [ ] ✅ Nginx kurulu ve yapılandırılmış
- [ ] ✅ PM2 ile backend çalışıyor
- [ ] ✅ Domain DNS'i sunucuya yönlendiriliyor
- [ ] ✅ SSL sertifikası kurulu
- [ ] ✅ Firewall yapılandırılmış
- [ ] ✅ Monitoring ve backup scriptleri aktif
- [ ] ✅ mrkotomotiv.com erişilebilir
- [ ] ✅ www.mrkotomotiv.com erişilebilir
- [ ] ✅ API endpoints çalışıyor

Bu rehberi takip ederek MrkTahsilatWeb projenizi mrkotomotiv.com domain'inde başarıyla yayınlayabilirsiniz!
