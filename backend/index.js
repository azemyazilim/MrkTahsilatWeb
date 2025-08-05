// MrkTahsilatWeb Backend API
const express = require('express');
const cors = require('cors');
const mssql = require('mssql');
const path = require('path');

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: path.join(__dirname, envFile) });

// Environment info (reduced for production)
if (process.env.NODE_ENV !== 'production') {
  console.log('📊 Environment Debug:');
  console.log('   .env path:', path.join(__dirname, envFile));
  console.log('   DB_SERVER:', process.env.DB_SERVER);
  console.log('   DB_PORT:', process.env.DB_PORT);
  console.log('   DB_DATABASE:', process.env.DB_DATABASE);
  console.log('   DB_USER:', process.env.DB_USER);
  console.log('');
}

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://mrktahsilat.com', 'https://www.mrktahsilat.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '8423Otomotiv',
  server: process.env.DB_SERVER || '88.247.8.178',
  port: parseInt(process.env.DB_PORT || '2024', 10),
  database: process.env.DB_DATABASE || 'GO3',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MrkTahsilatWeb Backend API',
    timestamp: new Date().toISOString(),
    database: {
      server: dbConfig.server,
      port: dbConfig.port,
      database: dbConfig.database
    }
  });
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  console.log(`🔐 Login attempt: ${username}`);
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Kullanıcı adı ve şifre gerekli' 
    });
  }

  try {
    console.log('📡 Connecting to database...');
    const pool = await mssql.connect(dbConfig);
    console.log('✅ Database connected successfully');
    
    const result = await pool.request()
      .input('username', mssql.VarChar, username)
      .input('password', mssql.VarChar, password)
      .query('SELECT * FROM KULLANICITB WHERE KullaniciAdi COLLATE SQL_Latin1_General_CP1_CI_AS = @username COLLATE SQL_Latin1_General_CP1_CI_AS AND Sifre = @password');
    
    console.log(`📊 Query executed, found records: ${result.recordset.length}`);
    
    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      console.log(`✅ Login successful: ${username}`);
      res.json({ 
        success: true, 
        user: { 
          id: user.KullaniciID || user.Id,
          username: user.KullaniciAdi || user.Username,
          role: user.Rol || user.Role || 'user'
        }
      });
    } else {
      console.log(`❌ Login failed: ${username}`);
      res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı adı veya şifre yanlış' 
      });
    }
  } catch (err) {
    console.error('❌ Database error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: `Veritabanı hatası: ${err.message}` 
    });
  }
});

// Get all customers from LG_002_CLCARD
app.get('/api/clcard', async (req, res) => {
  const { username } = req.query;
  
  try {
    const pool = await mssql.connect(dbConfig);
    
    let query = 'SELECT TOP 100 CODE, DEFINITION_, SPECODE FROM LG_002_CLCARD';
    let result;
    
    if (username) {
      // Kullanıcıya özel cari listesi (SPECODE = username)
      result = await pool.request()
        .input('username', mssql.VarChar, username)
        .query(`
          ${query}
          WHERE SPECODE COLLATE SQL_Latin1_General_CP1_CI_AS = @username COLLATE SQL_Latin1_General_CP1_CI_AS
          ORDER BY DEFINITION_
        `);
    } else {
      // Tüm cariler
      result = await pool.request()
        .query(`${query} ORDER BY DEFINITION_`);
    }
    
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (err) {
    console.error('❌ CLCARD error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: `Müşteri listesi alınamadı: ${err.message}` 
    });
  }
});

// Get tahsilat data
app.get('/api/gunluk-tahsilat', async (req, res) => {
  try {
    const pool = await mssql.connect(dbConfig);
    
    // Get today's collections
    const result = await pool.request()
      .query(`
        SELECT 
          ID,
          FORMAT(Tarih, 'dd.MM.yyyy') as Tarih,
          CariKod,
          CariUnvan,
          TahsilatTuru,
          BANKAADI,
          Tutar,
          FORMAT(EklemeTarihi, 'dd.MM.yyyy HH:mm') as EklemeTarihi,
          Durum,
          Bölge,
          Plasiyer,
          EvrakNo
        FROM GunlukTahsilat_V 
        WHERE Plasiyer IN ('EYÜP', 'ALİ', 'YİĞİT', 'AZİZ', 'GÖRKEM', 'ATAKAN', 'SÜLEYMAN', 'HASAN')
        ORDER BY EklemeTarihi DESC
      `);
    
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (err) {
    console.error('❌ Günlük tahsilat error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: `Günlük tahsilat verisi alınamadı: ${err.message}` 
    });
  }
});

// Get statistics from actual tables
app.get('/api/stats', async (req, res) => {
  try {
    const pool = await mssql.connect(dbConfig);
    
    // Get basic statistics
    const customerCount = await pool.request()
      .query('SELECT COUNT(*) as count FROM LG_002_CLCARD');
    
    const totalAmount = await pool.request()
      .query('SELECT SUM(Tutar) as total FROM GunlukTahsilat_V WHERE CAST(Tarih as DATE) = CAST(GETDATE() AS DATE)');
    
    const todayCount = await pool.request()
      .query('SELECT COUNT(*) as count FROM GunlukTahsilat_V WHERE CAST(Tarih as DATE) = CAST(GETDATE() AS DATE)');
    
    res.json({
      success: true,
      stats: {
        totalCustomers: customerCount.recordset[0].count,
        todayTotal: totalAmount.recordset[0].total || 0,
        todayCount: todayCount.recordset[0].count || 0,
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('❌ Stats error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: `İstatistik verisi alınamadı: ${err.message}` 
    });
  }
});

// Test endpoint - Tüm API'leri test et
app.get('/api/test', async (req, res) => {
  try {
    const pool = await mssql.connect(dbConfig);
    
    // Test 1: Database connection
    await pool.request().query('SELECT 1 as test');
    
    // Test 2: KULLANICITB table
    const users = await pool.request().query('SELECT COUNT(*) as count FROM KULLANICITB');
    
    // Test 3: LG_002_CLCARD table
    const customers = await pool.request().query('SELECT COUNT(*) as count FROM LG_002_CLCARD');
    
    // Test 4: GunlukTahsilat_V view
    const tahsilat = await pool.request().query('SELECT COUNT(*) as count FROM GunlukTahsilat_V');
    
    // Test 5: Sample data from each table
    const sampleUser = await pool.request().query('SELECT TOP 1 KullaniciAdi FROM KULLANICITB');
    const sampleCustomer = await pool.request().query('SELECT TOP 1 CODE, DEFINITION_ FROM LG_002_CLCARD');
    const sampleTahsilat = await pool.request().query('SELECT TOP 1 ID, CariUnvan, Tutar FROM GunlukTahsilat_V');
    
    res.json({
      success: true,
      message: 'Tüm testler başarılı',
      timestamp: new Date().toISOString(),
      tests: {
        database: 'OK',
        tables: {
          KULLANICITB: `${users.recordset[0].count} kullanıcı`,
          LG_002_CLCARD: `${customers.recordset[0].count} müşteri`,
          GunlukTahsilat_V: `${tahsilat.recordset[0].count} tahsilat kaydı`
        },
        samples: {
          user: sampleUser.recordset[0] || null,
          customer: sampleCustomer.recordset[0] || null,
          tahsilat: sampleTahsilat.recordset[0] || null
        }
      }
    });
  } catch (err) {
    console.error('❌ Test error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: `Test başarısız: ${err.message}`,
      error: err.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 MrkTahsilatWeb Backend API');
  console.log('================================================================');
  console.log(`📦 Server: http://localhost:${PORT}`);
  console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('📡 Database Config:');
  console.log(`   Server: ${dbConfig.server}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log('');
  console.log('📋 API Endpoints:');
  console.log('   POST /api/login         - User authentication (KULLANICITB)');
  console.log('   GET  /api/health        - Server status');
  console.log('   GET  /api/clcard        - Customer list (LG_002_CLCARD)');
  console.log('   GET  /api/gunluk-tahsilat - Daily collections (GunlukTahsilat_V)');
  console.log('   GET  /api/stats         - Statistics');
  console.log('   GET  /api/test          - Test all endpoints');
  console.log('================================================================');
});
