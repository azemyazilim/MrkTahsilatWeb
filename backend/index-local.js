// MrkTahsilatWeb Local Development Server
// Bu dosya local development için basitleştirilmiş backend sağlar

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Environment dosyasını yükle
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS ayarları - local development için
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// In-memory data store for development
let users = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
  { id: 2, username: 'user', password: 'user123', role: 'user' }
];

let tahsilat = [
  { 
    id: 1, 
    musteriAdi: 'Test Müşteri 1', 
    tutar: 1000.00, 
    tahsilatTarihi: new Date().toISOString(), 
    durum: 'completed',
    notlar: 'Test tahsilat kaydı',
    createdBy: 1 
  },
  { 
    id: 2, 
    musteriAdi: 'Test Müşteri 2', 
    tutar: 2500.50, 
    tahsilatTarihi: new Date().toISOString(), 
    durum: 'pending',
    notlar: 'Bekleyen tahsilat',
    createdBy: 1 
  }
];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MrkTahsilatWeb Local Development Server',
    timestamp: new Date().toISOString(),
    environment: 'development'
  });
});

// Login API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log(`Login attempt for user: ${username}`);
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Kullanıcı adı ve şifre gerekli' 
    });
  }

  // Kullanıcıyı kontrol et
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    console.log(`Login successful for user: ${username}`);
    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      }
    });
  } else {
    console.log(`Login failed for user: ${username}`);
    res.status(401).json({ 
      success: false, 
      message: 'Kullanıcı adı veya şifre yanlış' 
    });
  }
});

// Tahsilat listesi
app.get('/api/tahsilat', (req, res) => {
  console.log('Tahsilat listesi istendi');
  res.json({
    success: true,
    data: tahsilat
  });
});

// Yeni tahsilat ekle
app.post('/api/tahsilat', (req, res) => {
  const { musteriAdi, tutar, notlar } = req.body;
  
  if (!musteriAdi || !tutar) {
    return res.status(400).json({
      success: false,
      message: 'Müşteri adı ve tutar gerekli'
    });
  }

  const newTahsilat = {
    id: tahsilat.length + 1,
    musteriAdi,
    tutar: parseFloat(tutar),
    tahsilatTarihi: new Date().toISOString(),
    durum: 'pending',
    notlar: notlar || '',
    createdBy: 1 // Default user
  };

  tahsilat.push(newTahsilat);
  
  console.log(`Yeni tahsilat eklendi: ${musteriAdi} - ${tutar} TL`);
  
  res.json({
    success: true,
    data: newTahsilat
  });
});

// Tahsilat güncelle
app.put('/api/tahsilat/:id', (req, res) => {
  const { id } = req.params;
  const { durum, notlar } = req.body;
  
  const tahsilatIndex = tahsilat.findIndex(t => t.id === parseInt(id));
  
  if (tahsilatIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Tahsilat kaydı bulunamadı'
    });
  }

  // Güncelle
  if (durum) tahsilat[tahsilatIndex].durum = durum;
  if (notlar !== undefined) tahsilat[tahsilatIndex].notlar = notlar;
  
  console.log(`Tahsilat güncellendi: ID ${id}`);
  
  res.json({
    success: true,
    data: tahsilat[tahsilatIndex]
  });
});

// Tahsilat sil
app.delete('/api/tahsilat/:id', (req, res) => {
  const { id } = req.params;
  
  const tahsilatIndex = tahsilat.findIndex(t => t.id === parseInt(id));
  
  if (tahsilatIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Tahsilat kaydı bulunamadı'
    });
  }

  const deletedTahsilat = tahsilat.splice(tahsilatIndex, 1)[0];
  
  console.log(`Tahsilat silindi: ID ${id}`);
  
  res.json({
    success: true,
    data: deletedTahsilat
  });
});

// İstatistikler
app.get('/api/stats', (req, res) => {
  const totalTahsilat = tahsilat.length;
  const completedTahsilat = tahsilat.filter(t => t.durum === 'completed').length;
  const pendingTahsilat = tahsilat.filter(t => t.durum === 'pending').length;
  const totalAmount = tahsilat.reduce((sum, t) => sum + t.tutar, 0);
  const completedAmount = tahsilat
    .filter(t => t.durum === 'completed')
    .reduce((sum, t) => sum + t.tutar, 0);

  res.json({
    success: true,
    data: {
      totalTahsilat,
      completedTahsilat,
      pendingTahsilat,
      totalAmount,
      completedAmount,
      pendingAmount: totalAmount - completedAmount
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Endpoint bulunamadı: ${req.method} ${req.originalUrl}` 
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Sunucu hatası', 
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

// Server'ı başlat
app.listen(PORT, () => {
  console.log('🚀 MrkTahsilatWeb Local Development Server');
  console.log(`📦 Backend: http://localhost:${PORT}`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Test Login: admin/admin123 veya user/user123`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /api/health');
  console.log('  POST /api/login');
  console.log('  GET  /api/tahsilat');
  console.log('  POST /api/tahsilat');
  console.log('  PUT  /api/tahsilat/:id');
  console.log('  DELETE /api/tahsilat/:id');
  console.log('  GET  /api/stats');
  console.log('');
  console.log('🛑 Durdurmak için Ctrl+C');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Server kapatılıyor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Server sonlandırılıyor...');
  process.exit(0);
});
