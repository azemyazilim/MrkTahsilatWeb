# 🚀 MrkTahsilatWeb Local Development

Bu rehber projeyi local bilgisayarınızda çalıştırmanız için gerekli adımları içerir.

## 📋 Gereksinimler

- **Node.js** (v16 veya üzeri) - [İndir](https://nodejs.org/)
- **Git** - [İndir](https://git-scm.com/)
- **Web Browser** (Chrome, Firefox, Safari, Edge)

## 🏃‍♂️ Hızlı Başlangıç (Windows)

### Otomatik Kurulum:

1. **Projeyi klonlayın:**
   ```bash
   git clone https://github.com/azemyazilim/MrkTahsilatWeb.git
   cd MrkTahsilatWeb
   ```

2. **Development environment'ı başlatın:**
   ```batch
   start_dev.bat
   ```

3. **Tarayıcınızda açın:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Test Kullanıcıları:
- **Yönetici:** `admin` / `admin123`
- **Kullanıcı:** `user` / `user123`

## 🛠️ Manuel Kurulum

### 1. Dependencies Kurulumu

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies  
cd ../frontend
npm install
```

### 2. Environment Dosyaları

**Backend (.env):**
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**Frontend (.env.local):**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

### 3. Servisleri Başlatma

**Backend:**
```bash
cd backend
node index-local.js
```

**Frontend (yeni terminal):**
```bash
cd frontend
npm start
```

## 🌐 Erişim URL'leri

| Servis | URL | Açıklama |
|--------|-----|----------|
| Frontend | http://localhost:3000 | React uygulaması |
| Backend | http://localhost:5000 | API server |
| Health Check | http://localhost:5000/api/health | Server durumu |

## 📡 API Endpoints

### Kimlik Doğrulama
- `POST /api/login` - Kullanıcı girişi

### Tahsilat İşlemleri
- `GET /api/tahsilat` - Tahsilat listesi
- `POST /api/tahsilat` - Yeni tahsilat ekle
- `PUT /api/tahsilat/:id` - Tahsilat güncelle
- `DELETE /api/tahsilat/:id` - Tahsilat sil

### İstatistikler
- `GET /api/stats` - Tahsilat istatistikleri

## 🧪 Test API'si

Local development'ta backend gerçek veritabanı yerine in-memory data kullanır:

```bash
# Health check
curl http://localhost:5000/api/health

# Login test
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Tahsilat listesi
curl http://localhost:5000/api/tahsilat
```

## 🔧 Development Features

- **Hot Reload:** Kod değişiklikleri otomatik yenilenir
- **CORS:** Frontend-Backend iletişimi yapılandırılmış
- **Mock Data:** Test için hazır veri
- **Error Handling:** Detaylı hata mesajları
- **Logging:** Console'da detaylı loglar

## 🗂️ Proje Yapısı

```
MrkTahsilatWeb/
├── backend/
│   ├── index.js           # Production backend
│   ├── index-local.js     # Development backend
│   ├── package.json
│   └── .env.local
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.local
├── start_dev.bat          # Windows başlatma scripti
└── README_LOCAL.md        # Bu dosya
```

## 🐛 Sorun Giderme

### Port Kullanımda Hatası:
```bash
# Port 3000 kullanımda
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Port 5000 kullanımda  
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Node Modules Sorunları:
```bash
# Cache temizle
npm cache clean --force

# Node modules sil ve yeniden kur
rm -rf node_modules package-lock.json
npm install
```

### CORS Hataları:
- Browser'ınızın developer tools'unda Network tab'ını kontrol edin
- Backend'in http://localhost:5000'de çalıştığından emin olun
- CORS_ORIGIN environment variable'ını kontrol edin

## 🔄 Production'a Geçiş

Local development'tan production'a geçmek için:

1. **Gerçek veritabanını kullanın** (SQL Server)
2. **Production environment dosyalarını** ayarlayın
3. **SSL sertifikası** kurun
4. **Domain konfigürasyonu** yapın

Production deployment için `install_mrktahsilat.sh` scriptini kullanın.

## 📞 Destek

Sorun yaşarsanız:
- GitHub Issues: [Yeni Issue Oluştur](https://github.com/azemyazilim/MrkTahsilatWeb/issues)
- Local logs: Browser Developer Tools Console
- Backend logs: Terminal/CMD çıktıları

---

**Happy Coding! 🎉**
