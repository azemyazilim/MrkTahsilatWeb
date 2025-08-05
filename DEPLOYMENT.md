# 🚀 MrkTahsilatWeb Projesi Ubuntu 20.04 Deployment Rehberi

## 📋 Proje Bilgileri
- **Frontend:** React.js (Material-UI)
- **Backend:** Node.js (Express.js)
- **Veritabanı:** Microsoft SQL Server
- **Sunucu:** Ubuntu 20.04 LTS

## 📋 İçindekiler
1. [Sunucu Hazırlığı](#sunucu-hazırlığı)
2. [Sistem Güncellemeleri](#sistem-güncellemeleri)
3. [Node.js Kurulumu](#nodejs-kurulumu)
4. [MS SQL Server Kurulumu](#ms-sql-server-kurulumu)
5. [Proje Deployment](#proje-deployment)
6. [Web Sunucusu Yapılandırması](#web-sunucusu-yapılandırması)
7. [SSL ve Domain Ayarları](#ssl-ve-domain-ayarları)
8. [Process Manager](#process-manager)
9. [Güvenlik Ayarları](#güvenlik-ayarları)
10. [Monitoring ve Backup](#monitoring-ve-backup)

## 🖥️ Sunucu Hazırlığı

### Minimum Gereksinimler:
- **RAM:** 4 GB (8 GB önerilen)
- **CPU:** 2 çekirdek (4 çekirdek önerilen)
- **Depolama:** 50 GB (100 GB önerilen)
- **Network:** 100 Mbps internet bağlantısı

### Sunucuya Bağlanma
```bash
# SSH ile sunucuya bağlan
ssh username@your-server-ip

# Root kullanıcısına geç (gerekirse)
sudo su -
```

## 🔄 Sistem Güncellemeleri

```bash
# Sistem paketlerini güncelle
sudo apt update && sudo apt upgrade -y

# Gerekli sistem araçlarını kur
sudo apt install curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release -y

# Firewall'ı etkinleştir
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
```

## 📦 Node.js Kurulumu

```bash
# NodeSource deposunu ekle (Node.js 18.x)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Node.js ve npm'i kur
sudo apt install nodejs -y

# Versiyonları kontrol et
node --version
npm --version

# PM2 process manager'ı global olarak kur
sudo npm install -g pm2
```

## 🗄️ MS SQL Server Kurulumu

```bash
# Microsoft GPG anahtarını ekle
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -

# Microsoft SQL Server deposunu ekle
sudo add-apt-repository "$(wget -qO- https://packages.microsoft.com/config/ubuntu/20.04/mssql-server-2019.list)"

# Paketleri güncelle ve SQL Server'ı kur
sudo apt update
sudo apt install mssql-server -y

# SQL Server'ı yapılandır
sudo /opt/mssql/bin/mssql-conf setup

# SQL Server komut satırı araçlarını kur
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
curl https://packages.microsoft.com/config/ubuntu/20.04/prod.list | sudo tee /etc/apt/sources.list.d/msprod.list

sudo apt update
sudo apt install mssql-tools unixodbc-dev -y

# PATH'e ekle
echo 'export PATH="$PATH:/opt/mssql-tools/bin"' >> ~/.bashrc
source ~/.bashrc

# SQL Server'ı başlat ve otomatik başlatmayı etkinleştir
sudo systemctl start mssql-server
sudo systemctl enable mssql-server

# Firewall'da SQL Server portunu aç
sudo ufw allow 1433
```

### Veritabanı Oluşturma
```bash
# SQL Server'a bağlan
sqlcmd -S localhost -U sa -P 'YourStrongPassword123!'

# Veritabanı oluştur (SQL komutları)
```
```sql
CREATE DATABASE MrkTahsilatDB;
GO

USE MrkTahsilatDB;
GO

-- Kullanıcı tablosu oluştur (örnek)
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) UNIQUE NOT NULL,
    Password NVARCHAR(255) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Test kullanıcısı ekle
INSERT INTO Users (Username, Password) VALUES ('admin', 'hashedpassword');
GO

-- Bağlantıyı kapat
EXIT
```

## 🚀 Proje Deployment

### 1. Proje Dosyalarını Sunucuya Yükleme

```bash
# Proje dizini oluştur
sudo mkdir -p /var/www/mrktahsilatweb
sudo chown $USER:$USER /var/www/mrktahsilatweb

# Git ile projeyi klonla (GitHub'dan)
cd /var/www/mrktahsilatweb
git clone https://github.com/yourusername/MrkTahsilatWeb.git .

# Veya manuel dosya yükleme (SCP/SFTP ile)
# scp -r C:\Users\AZEMDELL\source\repos\Code\MrkTahsilatWeb/* username@server-ip:/var/www/mrktahsilatweb/
```

### 2. Backend Kurulumu

```bash
# Backend dizinine git
cd /var/www/mrktahsilatweb/backend

# Node.js bağımlılıklarını kur
npm install

# Environment dosyası oluştur
cat > .env << 'EOF'
# Database Configuration
DB_USER=sa
DB_PASSWORD=YourStrongPassword123!
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=MrkTahsilatDB

# Server Configuration
PORT=5000
NODE_ENV=production
EOF

# Dosya izinlerini ayarla
chmod 600 .env
```

### 3. Frontend Build İşlemi

```bash
# Frontend dizinine git
cd /var/www/mrktahsilatweb/frontend

# React bağımlılıklarını kur
npm install

# Production build oluştur
npm run build

# Build dosyalarının konumunu not et: /var/www/mrktahsilatweb/frontend/build
```

## 🌐 Web Sunucusu Yapılandırması (Nginx)

```bash
# Nginx'i kur
sudo apt install nginx -y

# Nginx konfigürasyon dosyası oluştur
sudo cat > /etc/nginx/sites-available/mrktahsilatweb << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend (React build files)
    location / {
        root /var/www/mrktahsilatweb/frontend/build;
        try_files $uri $uri/ /index.html;
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

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Site'ı etkinleştir
sudo ln -s /etc/nginx/sites-available/mrktahsilatweb /etc/nginx/sites-enabled/

# Default site'ı devre dışı bırak
sudo rm /etc/nginx/sites-enabled/default

# Nginx konfigürasyonunu test et
sudo nginx -t

# Nginx'i yeniden başlat
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔐 SSL ve Domain Ayarları

```bash
# Certbot'u kur (Let's Encrypt için)
sudo apt install certbot python3-certbot-nginx -y

# SSL sertifikası al (domain'inizi değiştirin)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Otomatik yenilemeyi test et
sudo certbot renew --dry-run

# Crontab'a otomatik yenileme ekle
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## ⚙️ Process Manager (PM2)

```bash
# Backend dizinine git
cd /var/www/mrktahsilatweb/backend

# PM2 ecosystem dosyası oluştur
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'mrktahsilatweb-backend',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/pm2/mrktahsilatweb-error.log',
    out_file: '/var/log/pm2/mrktahsilatweb-out.log',
    log_file: '/var/log/pm2/mrktahsilatweb-combined.log'
  }]
}
EOF

# Log dizini oluştur
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Uygulamayı PM2 ile başlat
pm2 start ecosystem.config.js

# PM2'yi sistem başlangıcında otomatik başlat
pm2 startup
pm2 save

# PM2 durumunu kontrol et
pm2 status
pm2 logs
```

## 🔒 Güvenlik Ayarları

```bash
# Fail2ban kur (brute force saldırılara karşı)
sudo apt install fail2ban -y

# Fail2ban nginx konfigürasyonu
sudo cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF

# Fail2ban'ı başlat
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Gereksiz servisleri durdur
sudo systemctl disable apache2 2>/dev/null || true

# Firewall kurallarını güncelle
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 1433  # SQL Server (sadece gerekirse)
```

## 📊 Monitoring ve Backup

### 1. Sistem Monitoring

```bash
# htop ve iotop kur
sudo apt install htop iotop -y

# PM2 monitoring (opsiyonel)
pm2 install pm2-server-monit
```

### 2. Veritabanı Backup Script

```bash
# Backup scripti oluştur
cat > /home/$USER/backup_db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# SQL Server backup
sqlcmd -S localhost -U sa -P 'YourStrongPassword123!' -Q "BACKUP DATABASE MrkTahsilatDB TO DISK = '$BACKUP_DIR/mrktahsilatweb_$DATE.bak'"

# Eski backupları temizle (30 günden eski)
find $BACKUP_DIR -name "*.bak" -mtime +30 -delete

echo "Backup completed: mrktahsilatweb_$DATE.bak"
EOF

chmod +x /home/$USER/backup_db.sh

# Günlük backup için crontab ekle
(crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/backup_db.sh") | crontab -
```

### 3. Uygulama Logları

```bash
# Log rotation için logrotate konfigürasyonu
sudo cat > /etc/logrotate.d/mrktahsilatweb << 'EOF'
/var/log/pm2/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

## 🔧 Deployment Script'i

```bash
# Otomatik deployment scripti oluştur
cat > /home/$USER/deploy.sh << 'EOF'
#!/bin/bash
echo "🚀 MrkTahsilatWeb Deployment Başlatılıyor..."

# Proje dizinine git
cd /var/www/mrktahsilatweb

# Git'ten en son değişiklikleri çek
git pull origin main

# Backend bağımlılıklarını güncelle
cd backend
npm install --production

# Frontend'i yeniden build et
cd ../frontend
npm install --production
npm run build

# PM2 ile backend'i yeniden başlat
pm2 restart mrktahsilatweb-backend

# Nginx'i reload et
sudo nginx -s reload

echo "✅ Deployment tamamlandı!"
EOF

chmod +x /home/$USER/deploy.sh
```

## 🎯 Final Kontroller

```bash
# Sistem durumunu kontrol et
sudo systemctl status nginx
sudo systemctl status mssql-server
pm2 status

# Port kontrolü
sudo netstat -tlnp | grep -E ':80|:443|:5000|:1433'

# Log kontrolü
tail -f /var/log/nginx/access.log
pm2 logs mrktahsilatweb-backend

# SSL kontrolü (domain varsa)
curl -I https://your-domain.com
```

## 🚀 Deployment Adımları Özeti

1. **Sunucu Hazırlığı:** Sistem güncellemeleri ve temel araçlar
2. **Node.js Kurulumu:** Backend için runtime environment
3. **SQL Server Kurulumu:** Veritabanı sunucusu
4. **Proje Upload:** Kaynak kodların sunucuya yüklenmesi
5. **Backend Konfigürasyonu:** Environment variables ve bağımlılıklar
6. **Frontend Build:** React uygulamasının production build'i
7. **Nginx Konfigürasyonu:** Reverse proxy ve static file serving
8. **SSL Kurulumu:** HTTPS güvenliği
9. **PM2 Setup:** Process management
10. **Güvenlik ve Monitoring:** Firewall, fail2ban, backup

---

## 🔗 Yararlı Komutlar

```bash
# Servis durumlarını kontrol et
sudo systemctl status nginx mssql-server

# PM2 komutları
pm2 restart all
pm2 reload all
pm2 stop all
pm2 delete all

# Log dosyalarını takip et
tail -f /var/log/nginx/error.log
pm2 logs --lines 100

# Disk kullanımını kontrol et
df -h
du -sh /var/www/mrktahsilatweb

# Sistem kaynaklarını kontrol et
htop
free -h
```

Bu rehber size projenizi Ubuntu 20.04 sunucuya profesyonel bir şekilde deploy etmeniz için gereken tüm adımları sağlar. Her adımı dikkatli bir şekilde takip ederek güvenli ve stabil bir production ortamı elde edebilirsiniz.
