# MrkTahsilatWeb Ubuntu 20.04 Deployment Rehberi

Bu rehber, MrkTahsilatWeb projesini Ubuntu 20.04 sunucusunda yayınlamak için gerekli tüm adımları içerir.

## 🎯 Proje Özeti

- **Frontend:** React.js (Material-UI)
- **Backend:** Node.js/Express.js
- **Veritabanı:** Microsoft SQL Server
- **Domain:** mrktahsilat.com
- **Sunucu:** Ubuntu 20.04 LTS

## 📋 Gereksinimler

- **Sunucu:** Ubuntu 20.04 LTS
- **Domain:** mrktahsilat.com
- **SSL:** Let's Encrypt (Certbot)
- **Web Server:** Nginx
- **Process Manager:** PM2
- **Node.js:** 18.x veya üzeri

## 🚀 Kurulum Adımları

### 1. Sunucu Hazırlığı

```bash
# Sunucuya SSH ile bağlanın
ssh root@your-server-ip

# Setup scriptini çalıştırın
wget https://raw.githubusercontent.com/your-repo/mrktahsilatweb/main/setup-server.sh
chmod +x setup-server.sh
./setup-server.sh
```

### 2. Domain DNS Ayarları

Domain sağlayıcınızda aşağıdaki DNS kayıtlarını ekleyin:

```
Type: A
Name: @
Value: [SUNUCU_IP_ADRESI]
TTL: 300

Type: A
Name: www
Value: [SUNUCU_IP_ADRESI]
TTL: 300
```

### 3. SSL Sertifikası Kurulumu

```bash
# SSL sertifikası alın
sudo certbot --nginx -d mrktahsilat.com -d www.mrktahsilat.com
```

### 4. Proje Kurulumu

```bash
# Proje dizinine gidin
cd /var/www/mrktahsilat

# Git repository'yi klonlayın
git clone https://github.com/your-repo/mrktahsilatweb.git .

# Backend dependencies kurun
cd backend
npm install --production

# Frontend dependencies kurun
cd ../frontend
npm install

# Frontend build edin
npm run build
```

### 5. PM2 ile Uygulama Başlatma

```bash
# PM2 ile uygulamayı başlatın
cd /var/www/mrktahsilat
pm2 start ecosystem.config.js

# PM2'yi sistem başlangıcında otomatik başlatmak için kaydedin
pm2 save
pm2 startup
```

### 6. Nginx Yapılandırması

```bash
# Nginx konfigürasyonunu kontrol edin
sudo nginx -t

# Nginx'i yeniden başlatın
sudo systemctl reload nginx
```

## 🔧 Yapılandırma Dosyaları

### Environment Variables

`/var/www/mrktahsilat/backend/.env.production`:
```env
# Production Environment Variables
NODE_ENV=production
PORT=5000
DB_SERVER=88.247.8.178
DB_PORT=2024
DB_DATABASE=GO3
DB_USER=sa
DB_PASSWORD=8423Otomotiv
CORS_ORIGIN=https://mrktahsilat.com,https://www.mrktahsilat.com
```

### PM2 Ecosystem

`/var/www/mrktahsilat/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'mrktahsilatweb-backend',
    script: 'backend/index.js',
    cwd: '/var/www/mrktahsilat',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/mrktahsilatweb/err.log',
    out_file: '/var/log/mrktahsilatweb/out.log',
    log_file: '/var/log/mrktahsilatweb/combined.log',
    time: true
  }]
};
```

## 📊 Monitoring ve Loglar

### Log Dosyaları

- **PM2 Logs:** `/var/log/mrktahsilatweb/`
- **Nginx Logs:** `/var/log/nginx/mrktahsilat.*.log`
- **Application Logs:** PM2 tarafından yönetilir

### Monitoring Komutları

```bash
# Sistem durumu
/var/www/mrktahsilat/monitor.sh

# PM2 durumu
pm2 list

# PM2 logları
pm2 logs mrktahsilatweb-backend

# Nginx logları
tail -f /var/log/nginx/mrktahsilat.error.log

# Disk kullanımı
df -h /var/www/mrktahsilat

# Memory kullanımı
free -h
```

## 🔄 Deployment

### Otomatik Deployment

```bash
# Deployment scriptini çalıştırın
/var/www/mrktahsilat/deploy.sh
```

### Manuel Deployment

```bash
cd /var/www/mrktahsilat

# Son değişiklikleri çekin
git pull origin main

# Backend dependencies güncelleyin
cd backend
npm install --production

# Frontend build edin
cd ../frontend
npm install
npm run build

# PM2'yi yeniden başlatın
pm2 restart mrktahsilatweb-backend

# Nginx'i yeniden yükleyin
sudo systemctl reload nginx
```

## 🛠️ Sorun Giderme

### Yaygın Sorunlar

1. **Port 5000 kullanımda**
   ```bash
   # Port kullanımını kontrol edin
   sudo netstat -tlnp | grep :5000
   
   # Gerekirse process'i sonlandırın
   sudo kill -9 [PID]
   ```

2. **Nginx 502 hatası**
   ```bash
   # Backend'in çalışıp çalışmadığını kontrol edin
   curl http://localhost:5000/api/health
   
   # PM2 durumunu kontrol edin
   pm2 list
   ```

3. **SSL sertifikası sorunları**
   ```bash
   # SSL sertifikasını yenileyin
   sudo certbot renew --force-renewal
   
   # Nginx'i yeniden başlatın
   sudo systemctl reload nginx
   ```

### Health Check

```bash
# Backend health check
curl https://mrktahsilat.com/api/health

# Frontend erişimi
curl -I https://mrktahsilat.com
```

## 🔒 Güvenlik

### Firewall Ayarları

```bash
# Gerekli portları açın
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 5000

# Firewall'u etkinleştirin
sudo ufw --force enable
```

### SSL/TLS Yapılandırması

Nginx konfigürasyonunda SSL ayarları otomatik olarak yapılandırılır.

## 📞 Destek

Sorun yaşadığınızda:

1. Log dosyalarını kontrol edin
2. Monitoring scriptini çalıştırın
3. PM2 ve Nginx durumunu kontrol edin
4. Gerekirse sunucuyu yeniden başlatın

## 🎉 Tamamlandı

Kurulum tamamlandıktan sonra:

- **Frontend:** https://mrktahsilat.com
- **Backend API:** https://mrktahsilat.com/api
- **Health Check:** https://mrktahsilat.com/health

Projeniz artık production ortamında çalışmaya hazır!

## 🌐 Erişim

- **Frontend:** https://mrktahsilat.com
- **Backend API:** https://mrktahsilat.com/api
- **Health Check:** https://mrktahsilat.com/health

# Test URL'leri
curl https://mrktahsilat.com/api/health
curl -I https://mrktahsilat.com

