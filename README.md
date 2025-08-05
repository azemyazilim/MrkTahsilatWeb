# MrkTahsilatWeb - Local Development

Bu proje artık sadece local geliştirme için optimize edilmiştir ve gerçek veritabanına bağlanmaktadır.

## 🗂️ Proje Yapısı

```
MrkTahsilatWeb/
├── backend/                 # Node.js/Express API Server
│   ├── index.js            # Ana backend dosyası
│   ├── package.json        # Dependencies
│   └── .env                # Veritabanı ayarları
├── frontend/               # React.js Frontend
│   ├── src/                # React source files
│   ├── public/            # Static files
│   └── package.json       # Dependencies
└── README.md              # Bu dosya
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

## 📋 Temizlenmiş Dosyalar

Aşağıdaki deployment ve server dosyaları kaldırıldı:
- Tüm .sh deployment scriptleri
- Production environment dosyaları  
- Server konfigürasyon dosyaları
- Duplicate klasörler
- Gereksiz batch dosyaları

Proje artık sadece local geliştirme için optimize edilmiştir.
