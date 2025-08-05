# 🚀 MrkTahsilatWeb - mrktahsilat.com Hızlı Kurulum

## 📋 Kurulum Seçenekleri

### Seçenek 1: Otomatik Kurulum (Önerilen)

**Ubuntu 20.04 sunucuda tek komutla kurulum:**

```bash
# 1. Kurulum scriptini indir ve çalıştır
wget https://raw.githubusercontent.com/azemyazilim/MrkTahsilatWeb/main/install_mrktahsilat.sh
chmod +x install_mrktahsilat.sh
sudo bash install_mrktahsilat.sh
```

**Bu script şunları yapar:**
- ✅ Node.js 18.x kurulumu
- ✅ Microsoft SQL Server 2019 kurulumu
- ✅ Nginx web sunucusu kurulumu
- ✅ PM2 process manager kurulumu
- ✅ Firewall yapılandırması
- ✅ Veritabanı oluşturma
- ✅ SSL sertifikası hazırlığı

### Seçenek 2: Manuel Kurulum

Detaylı manuel kurulum için `MRKOTOMOTIV_DEPLOYMENT.md` dosyasını takip edin.

## 📁 Proje Dosyalarını Yükleme

### GitHub ile (Önerilen)
```bash
cd /var/www/mrkotomotiv
git clone https://github.com/yourusername/MrkTahsilatWeb.git .
./deploy-project.sh
```

### Manuel Dosya Yükleme
```bash
# Windows PowerShell'de
scp -r C:\Users\AZEMDELL\source\repos\Code\MrkTahsilatWeb\* root@server-ip:/var/www/mrkotomotiv/

# Linux sunucuda
cd /var/www/mrkotomotiv
./deploy-project.sh
```

## 🌐 Domain Ayarları

**DNS A Kayıtları** (Domain sağlayıcınızda):
```
Type: A
Name: @
Value: YOUR_SERVER_IP

Type: A
Name: www
Value: YOUR_SERVER_IP
```

## 🔐 SSL Sertifikası

```bash
# Domain DNS'i aktif olduktan sonra
sudo certbot --nginx -d mrkotomotiv.com -d www.mrkotomotiv.com
```

## ✅ Test ve Doğrulama

```bash
# Servis durumları
sudo systemctl status nginx
sudo systemctl status mssql-server
pm2 status

# Web sitesi testleri
curl -I http://mrkotomotiv.com
curl http://mrkotomotiv.com/api/health

# SSL testi (sertifika kurulumu sonrası)
curl -I https://mrkotomotiv.com
```

## 🔧 Faydalı Komutlar

### Güncellemeler
```bash
cd /var/www/mrkotomotiv
./deploy.sh production
```

### Logları Görüntüleme
```bash
pm2 logs mrktahsilatweb-backend
sudo tail -f /var/log/nginx/error.log
```

### Veritabanı Backup
```bash
./backup_database.sh daily
```

### Sistem Monitoring
```bash
./monitoring.sh full
```

## 📊 Varsayılan Konfigürasyon

- **Domain:** mrkotomotiv.com, www.mrkotomotiv.com
- **API URL:** https://mrkotomotiv.com/api
- **Database:** MrkTahsilatDB
- **Backend Port:** 5000
- **Default Login:** admin / admin123

## 🆘 Sorun Giderme

### Backend Çalışmıyor
```bash
pm2 restart mrktahsilatweb-backend
pm2 logs mrktahsilatweb-backend
```

### Frontend Erişilemiyor
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Veritabanı Bağlantı Hatası
```bash
sudo systemctl status mssql-server
sqlcmd -S localhost -U sa -P 'MrkOtomotiv2024!' -Q "SELECT 1"
```

### Port Kontrolü
```bash
sudo netstat -tlnp | grep -E ':80|:443|:5000|:1433'
```

## 📞 Destek

Kurulum sırasında sorun yaşarsanız:

1. Log dosyalarını kontrol edin
2. Firewall ayarlarını kontrol edin
3. DNS yönlendirmesini kontrol edin
4. SSL sertifikası durumunu kontrol edin

---

**🎯 Hedef:** MrkTahsilatWeb uygulamasını mrkotomotiv.com domain'inde yayınlamak

**⏱️ Tahmini Kurulum Süresi:** 15-30 dakika

**🔒 Güvenlik:** Firewall, SSL, güçlü şifreler varsayılan olarak aktif
