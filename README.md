# MrkTahsilatWeb - Tahsilat Yönetim Sistemi

Bu proje, işletmeler için geliştirilmiş profesyonel tahsilat yönetim sistemidir.

## 🗂️ Proje Yapısı

```
MrkTahsilatWeb/
├── backend/                 # Node.js/Express API Server
│   ├── index.js            # Ana backend dosyası
│   ├── package.json        # Dependencies
│   ├── env.production      # Production environment
│   └── uploads/            # Yüklenen dosyalar
├── frontend/               # React.js Frontend
│   ├── src/                # React source files
│   ├── public/            # Static files
│   └── package.json       # Dependencies
├── database/              # Veritabanı dosyaları
│   └── create_images_table.sql
├── deployment-guide.md    # Deployment rehberi
├── setup-server.sh        # Sunucu kurulum scripti
├── quick-deploy.sh        # Hızlı deployment scripti
├── nginx.conf            # Nginx konfigürasyonu
├── ecosystem.config.js   # PM2 konfigürasyonu
└── README.md             # Bu dosya
```

## 🔧 Veritabanı Bağlantısı

Backend aşağıdaki tablolarla çalışır:

- **KULLANICITB** - Kullanıcı giriş bilgileri
- **LG_002_CLCARD** - Müşteri listesi 
- **GunlukTahsilat_V** - Günlük tahsilat verileri

### Bağlantı Ayarları
```
Server: 88.247.8.178:2024
Database: GO3
User: sa
Password: 8423Otomotiv
```

## 🚀 Nasıl Başlatılır

### 1. Backend Başlatma
```bash
cd backend
npm install
node index.js
```

### 2. Frontend Başlatma (Yeni Terminal)
```bash
cd frontend  
npm install
npm start
```

## 📡 API Endpoints

Backend şu endpoints'leri sağlar:

- `POST /api/login` - Kullanıcı girişi (KULLANICITB)
- `GET /api/health` - Server durumu
- `GET /api/clcard` - Müşteri listesi (LG_002_CLCARD)
- `GET /api/gunluk-tahsilat` - Günlük tahsilat (GunlukTahsilat_V)
- `GET /api/stats` - İstatistikler
- `GET /api/test` - Tüm tabloları test et
- `POST /api/upload-image` - Resim yükleme
- `GET /api/images/:user` - Kullanıcı resimleri

## 🌐 Erişim

- **Backend API:** http://localhost:5000
- **Frontend:** http://localhost:3000
- **API Test:** http://localhost:5000/api/test

## 🧪 Test

API'lerin çalışıp çalışmadığını test etmek için:

```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:5000/api/test" -Method GET

# Browser
http://localhost:5000/api/test
```

## 🚀 Production Deployment

Production ortamında yayınlamak için:

1. `deployment-guide.md` dosyasını inceleyin
2. `setup-server.sh` scriptini çalıştırın
3. `quick-deploy.sh` ile hızlı deployment yapın

## 📋 Temizlenmiş Özellikler

- ✅ Gereksiz console.log'lar temizlendi
- ✅ Boş dosyalar silindi
- ✅ Eski deployment scriptleri kaldırıldı
- ✅ Gereksiz batch dosyaları silindi
- ✅ .gitignore optimize edildi
- ✅ Kod kalitesi artırıldı

Proje artık production ortamında çalışmaya hazır!
