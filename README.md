# MrkTahsilatWeb - Tahsilat Yönetim Sistemi

Modern ve kullanıcı dostu tahsilat yönetim web uygulaması.

## 🚀 Özellikler

- **Kullanıcı Girişi**: Güvenli authentication sistemi
- **Tahsilat Formu**: Kapsamlı tahsilat kayıt formu
- **Resim Yükleme**: Kamera ve galeri entegrasyonu
- **Dinamik Alanlar**: Tahsilat türüne göre değişen form alanları
- **Özet Raporlar**: Günlük, haftalık, aylık tahsilat özetleri
- **Plasiyer Bazında Raporlar**: Detaylı plasiyer performans takibi
- **Filtreleme**: Gelişmiş tablo filtreleme özellikleri
- **Responsive Tasarım**: Mobil ve desktop uyumluluğu
- **Türkçe Destek**: Tam Türkçe dil desteği

## 🛠️ Teknolojiler

### Frontend
- **React.js** - Modern UI framework
- **Material-UI** - UI component kütüphanesi
- **Axios** - HTTP client
- **Responsive Design** - Mobil uyumlu tasarım

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **MSSQL** - Database
- **dotenv** - Environment variables

## 📋 Gereksinimler

- Node.js 16+ LTS
- SQL Server 2019+
- npm veya yarn

## 🚀 Kurulum

### 1. Repository Clone
```bash
git clone https://github.com/yourusername/MrkTahsilatWeb.git
cd MrkTahsilatWeb
```

### 2. Backend Kurulumu
```bash
cd backend
npm install
cp .env.example .env
# .env dosyasını düzenleyin
npm start
```

### 3. Frontend Kurulumu
```bash
cd frontend
npm install
npm start
```

### 4. Database Kurulumu
SQL Server'da gerekli tabloları oluşturun:
- KULLANICITB
- LG_002_CLCARD
- GunlukTahsilat_V

## 🔧 Konfigürasyon

### Backend (.env dosyası)
```env
PORT=5000
DB_SERVER=localhost
DB_DATABASE=YourDatabase
DB_USER=YourUsername
DB_PASSWORD=YourPassword
```

### Frontend
Frontend varsayılan olarak `http://localhost:5000` adresindeki backend'e bağlanır.

## 📱 Kullanım

1. **Giriş**: Kullanıcı adı ve şifre ile giriş yapın
2. **Tahsilat Ekleme**: Sol panelden yeni tahsilat kaydı oluşturun
3. **Resim Ekleme**: Kamera veya galeriden belge fotoğrafı ekleyin
4. **Raporlama**: Sağ panelden özet bilgileri görüntüleyin
5. **Filtreleme**: Alt tabloda detaylı filtreleme yapın

## 📊 Özellik Detayları

### Tahsilat Türleri
- Nakit
- Kredi Kartı (Taksit seçeneği ile)
- Banka Havalesi
- Çek
- Senet

### Dinamik Alanlar
- **Banka Bilgileri**: Kredi kartı ve havale için
- **Taksit Sayısı**: Kredi kartı için (1-12 ay)

### Resim Yönetimi
- 5MB maksimum dosya boyutu
- Sadece resim formatları kabul edilir
- Kamera yakalama desteği (mobil)
- Önizleme özelliği

## 🚀 Deployment

### Production Build
```bash
# Frontend build
cd frontend
npm run build

# Backend production mode
cd backend
NODE_ENV=production npm start
```

### Nginx Konfigürasyonu
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        root /var/www/MrkTahsilatWeb/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔒 Güvenlik

- SQL injection koruması
- Environment variables ile hassas bilgi yönetimi
- CORS konfigürasyonu
- Input validation

## 📝 API Endpoints

- `POST /api/login` - Kullanıcı girişi
- `GET /api/clcard` - Cari liste
- `GET /api/gunluk-tahsilat` - Tahsilat verileri

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'e push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 👥 İletişim

Proje Sahibi - [your-email@example.com](mailto:your-email@example.com)

Proje Linki: [https://github.com/yourusername/MrkTahsilatWeb](https://github.com/yourusername/MrkTahsilatWeb)
