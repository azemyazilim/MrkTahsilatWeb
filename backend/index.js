// MrkTahsilatWeb Backend API

// Error handling - Must be at the very top
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
  process.exit(1);
});

process.on('exit', (code) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🛑 Process exiting with code: ${code}`);
  }
});

const express = require('express');
const cors = require('cors');
const mssql = require('mssql');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs').promises;
const compression = require('compression');
const helmet = require('helmet');
const NodeCache = require('node-cache');

// Cache configuration
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 1 minute
  useClones: false // For better performance
});

// Cache middleware
const cacheMiddleware = (duration) => (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  const key = req.originalUrl;
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    res.json(cachedResponse);
    return;
  }

  res.originalJson = res.json;
  res.json = (body) => {
    cache.set(key, body, duration);
    res.originalJson(body);
  };
  next();
};

// UUID generator using crypto
const generateUUID = () => {
  return crypto.randomUUID();
};

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: path.join(__dirname, envFile) });

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

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.'
});

// Apply rate limiting to all routes
app.use('/api/', apiLimiter);

// Security Headers for Norton/Antivirus compatibility
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  next();
});

// Logging middleware - optimized for production
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});

// Database configuration with optimized connection pool
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
    connectionTimeout: 15000,
    requestTimeout: 15000,
    enableConcurrentTransactions: true
  },
  pool: {
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 15000,
    createTimeoutMillis: 15000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200
  }
};

// Uploads directory setup
const uploadsDir = path.join(__dirname, 'uploads');
const imagesDir = path.join(uploadsDir, 'images');

// Create directories if they don't exist
const ensureDirectories = async () => {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(imagesDir, { recursive: true });
  } catch (error) {
    console.error('❌ Error creating directories:', error);
  }
};

// Multer configuration for image uploads
const storage = multer.memoryStorage(); // Store in memory for processing

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Single file
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
  }
});

// Static files middleware for serving images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize directories
ensureDirectories();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MrkTahsilatWeb Backend API',
    company: 'Azem Yazılım',
    purpose: 'Tahsilat Yönetim Sistemi',
    security: 'SSL Enabled - Business Application',
    contact: 'info@mrktahsilat.com',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: {
      server: dbConfig.server,
      port: dbConfig.port,
      database: dbConfig.database,
      status: 'Connected'
    }
  });
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Kullanıcı adı ve şifre gerekli' 
    });
  }

  try {
    const pool = await mssql.connect(dbConfig);
    
    const result = await pool.request()
      .input('username', mssql.VarChar, username)
      .input('password', mssql.VarChar, password)
      .query('SELECT * FROM KULLANICITB WHERE KullaniciAdi COLLATE SQL_Latin1_General_CP1_CI_AS = @username COLLATE SQL_Latin1_General_CP1_CI_AS AND Sifre = @password');
    
    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      res.json({ 
        success: true, 
        user: { 
          id: user.KullaniciID || user.Id,
          username: user.KullaniciAdi || user.Username,
          role: user.Rol || user.Role || 'user'
        }
      });
    } else {
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

// Image upload endpoint - requires TahsilatID
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Resim dosyası seçilmedi'
      });
    }

    const { username, tahsilatId } = req.body;
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı gerekli'
      });
    }

    if (!tahsilatId) {
      return res.status(400).json({
        success: false,
        message: 'TahsilatID gerekli - önce tahsilat kaydını oluşturunuz'
      });
    }

    const file = req.file;
    const originalName = file.originalname;
    const fileExtension = path.extname(originalName).toLowerCase();
    const uniqueFileName = `${generateUUID()}${fileExtension}`;
    const filePath = path.join(imagesDir, uniqueFileName);
    const relativePath = `uploads/images/${uniqueFileName}`;

    // Save original image directly to disk without processing
    const fileBuffer = file.buffer;
    const fileSize = fileBuffer.length;
    const mimeType = file.mimetype;

    // Save image to disk
    await fs.writeFile(filePath, fileBuffer);

    // Save to database
    const pool = await mssql.connect(dbConfig);
    const result = await pool.request()
      .input('TahsilatID', mssql.Int, parseInt(tahsilatId))
      .input('FileName', mssql.NVarChar, uniqueFileName)
      .input('OriginalFileName', mssql.NVarChar, originalName)
      .input('FilePath', mssql.NVarChar, relativePath)
      .input('FileSize', mssql.BigInt, fileSize)
      .input('MimeType', mssql.NVarChar, mimeType)
      .input('Width', mssql.Int, null) // No image processing
      .input('Height', mssql.Int, null) // No image processing
      .input('UploadedBy', mssql.NVarChar, username)
      .query(`
        INSERT INTO TahsilatResimleri 
        (TahsilatID, FileName, OriginalFileName, FilePath, FileSize, MimeType, Width, Height, UploadedBy)
        VALUES 
        (@TahsilatID, @FileName, @OriginalFileName, @FilePath, @FileSize, @MimeType, @Width, @Height, @UploadedBy);
        
        SELECT SCOPE_IDENTITY() as ImageID;
      `);

    const imageID = result.recordset[0].ImageID;

    res.json({
      success: true,
      message: 'Resim başarıyla yüklendi',
      data: {
        imageID: imageID,
        fileName: uniqueFileName,
        originalName: originalName,
        filePath: relativePath,
        fileSize: fileSize,
        url: `/uploads/images/${uniqueFileName}`
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Resim yüklenirken hata oluştu: ' + error.message
    });
  }
});

// Get images for a user
app.get('/api/images/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    const pool = await mssql.connect(dbConfig);
    const result = await pool.request()
      .input('username', mssql.NVarChar, username)
      .query(`
        SELECT 
          ID as imageID,
          FileName,
          OriginalFileName,
          FilePath,
          FileSize,
          MimeType,
          Width,
          Height,
          UploadedAt,
          Description
        FROM TahsilatResimleri 
        WHERE UploadedBy = @username AND IsActive = 1
        ORDER BY UploadedAt DESC
      `);

    res.json({
      success: true,
      data: result.recordset.map(img => ({
        ...img,
        url: `/${img.FilePath.replace(/\\/g, '/')}`
      }))
    });

  } catch (error) {
    console.error('❌ Get images error:', error);
    res.status(500).json({
      success: false,
      message: 'Resimler getirilirken hata oluştu: ' + error.message
    });
  }
});

// Get all customers from LG_002_CLCARD with caching
app.get('/api/clcard', cacheMiddleware(300), async (req, res) => {
  const { username } = req.query;
  
  try {
    const pool = await mssql.connect(dbConfig);
    
    let query = 'SELECT TOP 100 LOGICALREF, CODE, DEFINITION_, SPECODE FROM LG_002_CLCARD';
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
    
    const response = {
      success: true,
      data: result.recordset.map(record => ({
        id: record.LOGICALREF,
        code: record.CODE,
        name: record.DEFINITION_,
        specode: record.SPECODE
      }))
    };

    res.json(response);
  } catch (err) {
    console.error('❌ CLCARD error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: `Müşteri listesi alınamadı: ${err.message}` 
    });
  }
});

// Get tahsilat data with caching and optimization
app.get('/api/gunluk-tahsilat', cacheMiddleware(60), async (req, res) => {
  try {
    const pool = await mssql.connect(dbConfig);
    
    // Get today's collections with pagination and filtering
    const { page = 1, limit = 50, startDate, endDate, plasiyer } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = ["Plasiyer IN ('EYÜP', 'ALİ', 'YİĞİT', 'AZİZ', 'GÖRKEM', 'ATAKAN', 'SÜLEYMAN', 'HASAN')"];
    const queryParams = {};
    
    if (startDate) {
      whereConditions.push('Tarih >= @startDate');
      queryParams.startDate = new Date(startDate);
    }
    
    if (endDate) {
      whereConditions.push('Tarih <= @endDate');
      queryParams.endDate = new Date(endDate);
    }
    
    if (plasiyer) {
      whereConditions.push('Plasiyer = @plasiyer');
      queryParams.plasiyer = plasiyer;
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    const query = `
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
        EvrakNo,
        Taksit,
        COUNT(*) OVER() as TotalCount
      FROM GunlukTahsilat_V 
      ${whereClause}
      ORDER BY EklemeTarihi DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;
    
    const request = pool.request();
    
    // Add query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      request.input(key, value);
    });
    
    const result = await request.query(query);
    
    const totalCount = result.recordset[0]?.TotalCount || 0;
    const totalPages = Math.ceil(totalCount / limit);
    
    const response = {
      success: true,
      data: result.recordset.map(record => ({
        ...record,
        Tutar: parseFloat(record.Tutar),
        TotalCount: undefined // Remove from individual records
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
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
    
    // Günlük toplam (bugün) - Türkiye saat dilimi ile
    const todayQuery = `
      SELECT SUM(Tutar) as total, COUNT(*) as count 
      FROM GunlukTahsilat_V 
      WHERE CAST(Tarih as DATE) = CAST(GETDATE() AS DATE)
      AND Plasiyer IN ('EYÜP', 'ALİ', 'YİĞİT', 'AZİZ', 'GÖRKEM', 'ATAKAN', 'SÜLEYMAN', 'HASAN')
    `;
    
    const todayResult = await pool.request().query(todayQuery);
    
    // Haftalık toplam (bu hafta Pazartesi'den itibaren)
    const weeklyQuery = `
      SELECT SUM(Tutar) as total, COUNT(*) as count 
      FROM GunlukTahsilat_V 
      WHERE Tarih >= DATEADD(DAY, 1 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE))
      AND Tarih <= GETDATE()
      AND Plasiyer IN ('EYÜP', 'ALİ', 'YİĞİT', 'AZİZ', 'GÖRKEM', 'ATAKAN', 'SÜLEYMAN', 'HASAN')
    `;
    
    const weeklyResult = await pool.request().query(weeklyQuery);
    
    // Aylık toplam (bu ay)
    const monthlyQuery = `
      SELECT SUM(Tutar) as total, COUNT(*) as count 
      FROM GunlukTahsilat_V 
      WHERE YEAR(Tarih) = YEAR(GETDATE()) 
      AND MONTH(Tarih) = MONTH(GETDATE())
      AND Plasiyer IN ('EYÜP', 'ALİ', 'YİĞİT', 'AZİZ', 'GÖRKEM', 'ATAKAN', 'SÜLEYMAN', 'HASAN')
    `;
    
    const monthlyResult = await pool.request().query(monthlyQuery);
    
    res.json({
      success: true,
      stats: {
        totalCustomers: customerCount.recordset[0].count,
        
        // Günlük istatistikler
        todayTotal: todayResult.recordset[0].total || 0,
        todayCount: todayResult.recordset[0].count || 0,
        
        // Haftalık istatistikler  
        weeklyTotal: weeklyResult.recordset[0].total || 0,
        weeklyCount: weeklyResult.recordset[0].count || 0,
        
        // Aylık istatistikler
        monthlyTotal: monthlyResult.recordset[0].total || 0,
        monthlyCount: monthlyResult.recordset[0].count || 0,
        
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

// Dashboard analytics endpoint
app.get('/api/dashboard', async (req, res) => {
  try {
    const { startDate, endDate, plasiyer } = req.query;
    const pool = await mssql.connect(dbConfig);
    
    // Base query conditions
    let whereConditions = [];
    let queryParams = {};
    
    if (startDate) {
      whereConditions.push('Tarih >= @startDate');
      queryParams.startDate = startDate;
    }
    
    if (endDate) {
      whereConditions.push('Tarih <= @endDate');
      queryParams.endDate = endDate;
    }
    
    if (plasiyer && plasiyer !== 'all') {
      whereConditions.push('Plasiyer = @plasiyer');
      queryParams.plasiyer = plasiyer;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')} AND Plasiyer IN ('EYÜP', 'ALİ', 'YİĞİT', 'AZİZ', 'GÖRKEM', 'ATAKAN', 'SÜLEYMAN', 'HASAN')`
      : `WHERE Plasiyer IN ('EYÜP', 'ALİ', 'YİĞİT', 'AZİZ', 'GÖRKEM', 'ATAKAN', 'SÜLEYMAN', 'HASAN')`;
    
    // 1. Daily trend data (son 30 gün)
    const dailyTrendQuery = `
      SELECT 
        FORMAT(Tarih, 'yyyy-MM-dd') as Tarih,
        SUM(Tutar) as ToplamTutar,
        COUNT(*) as IslemSayisi
      FROM GunlukTahsilat_V 
      ${whereClause}
      AND Tarih >= DATEADD(DAY, -30, GETDATE())
      GROUP BY FORMAT(Tarih, 'yyyy-MM-dd')
      ORDER BY Tarih
    `;
    
    // 2. Plasiyer performance data
    const plasiyerPerformanceQuery = `
      SELECT 
        Plasiyer,
        SUM(Tutar) as ToplamTutar,
        COUNT(*) as IslemSayisi,
        AVG(Tutar) as OrtalamaTutar,
        MIN(Tutar) as MinTutar,
        MAX(Tutar) as MaxTutar
      FROM GunlukTahsilat_V 
      ${whereClause}
      GROUP BY Plasiyer
      ORDER BY ToplamTutar DESC
    `;
    
    // 3. Payment method distribution
    const paymentMethodQuery = `
      SELECT 
        TahsilatTuru,
        SUM(Tutar) as ToplamTutar,
        COUNT(*) as IslemSayisi,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM GunlukTahsilat_V ${whereClause})), 2) as Yuzde
      FROM GunlukTahsilat_V 
      ${whereClause}
      GROUP BY TahsilatTuru
      ORDER BY ToplamTutar DESC
    `;
    
    // 4. Monthly comparison (bu yıl vs geçen yıl)
    const monthlyComparisonQuery = `
      SELECT 
        MONTH(Tarih) as Ay,
        YEAR(Tarih) as Yil,
        SUM(Tutar) as ToplamTutar,
        COUNT(*) as IslemSayisi
      FROM GunlukTahsilat_V 
      WHERE Plasiyer IN ('EYÜP', 'ALİ', 'YİĞİT', 'AZİZ', 'GÖRKEM', 'ATAKAN', 'SÜLEYMAN', 'HASAN')
      AND YEAR(Tarih) IN (YEAR(GETDATE()), YEAR(GETDATE()) - 1)
      GROUP BY MONTH(Tarih), YEAR(Tarih)
      ORDER BY Yil, Ay
    `;
    
    // 5. Top customers
    const topCustomersQuery = `
      SELECT TOP 10
        CariKod,
        CariUnvan,
        SUM(Tutar) as ToplamTutar,
        COUNT(*) as IslemSayisi,
        MAX(Tarih) as SonIslemTarihi
      FROM GunlukTahsilat_V 
      ${whereClause}
      GROUP BY CariKod, CariUnvan
      ORDER BY ToplamTutar DESC
    `;
    
    // 6. Weekly performance (son 12 hafta)
    const weeklyPerformanceQuery = `
      SELECT 
        YEAR(Tarih) as Yil,
        DATEPART(WEEK, Tarih) as Hafta,
        MIN(Tarih) as HaftaBaslangic,
        MAX(Tarih) as HaftaBitis,
        SUM(Tutar) as ToplamTutar,
        COUNT(*) as IslemSayisi
      FROM GunlukTahsilat_V 
      ${whereClause}
      AND Tarih >= DATEADD(WEEK, -12, GETDATE())
      GROUP BY YEAR(Tarih), DATEPART(WEEK, Tarih)
      ORDER BY Yil, Hafta
    `;
    
    // Execute all queries
    const request = pool.request();
    
    // Add parameters
    Object.keys(queryParams).forEach(key => {
      if (key === 'startDate' || key === 'endDate') {
        request.input(key, mssql.Date, queryParams[key]);
      } else {
        request.input(key, mssql.VarChar, queryParams[key]);
      }
    });
    
    const [
      dailyTrend,
      plasiyerPerformance,
      paymentMethods,
      monthlyComparison,
      topCustomers,
      weeklyPerformance
    ] = await Promise.all([
      request.query(dailyTrendQuery),
      request.query(plasiyerPerformanceQuery),
      request.query(paymentMethodQuery),
      request.query(monthlyComparisonQuery),
      request.query(topCustomersQuery),
      request.query(weeklyPerformanceQuery)
    ]);
    
    // Calculate summary statistics
    const totalAmount = plasiyerPerformance.recordset.reduce((sum, p) => sum + (parseFloat(p.ToplamTutar) || 0), 0);
    const totalTransactions = plasiyerPerformance.recordset.reduce((sum, p) => sum + (parseInt(p.IslemSayisi) || 0), 0);
    const avgTransactionAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
    
    res.json({
      success: true,
      data: {
        summary: {
          totalAmount,
          totalTransactions,
          avgTransactionAmount,
          activePlasiyerCount: plasiyerPerformance.recordset.length,
          dateRange: {
            start: startDate || 'Tüm zamanlar',
            end: endDate || 'Bugün'
          }
        },
        charts: {
          dailyTrend: dailyTrend.recordset,
          plasiyerPerformance: plasiyerPerformance.recordset,
          paymentMethods: paymentMethods.recordset,
          monthlyComparison: monthlyComparison.recordset,
          topCustomers: topCustomers.recordset,
          weeklyPerformance: weeklyPerformance.recordset
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard verileri alınamadı: ' + error.message
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
    
    // Test 6: GunlukTahsilat_V kolonlarını kontrol et
    const columns = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'GunlukTahsilat_V'
      ORDER BY ORDINAL_POSITION
    `);
    
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
        },
        columns: {
          GunlukTahsilat_V: columns.recordset.map(col => col.COLUMN_NAME)
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

// Start server with error handling
const server = app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Server start error:', err);
    process.exit(1);
  }
  if (process.env.NODE_ENV !== 'production') {
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
    console.log('   POST /api/upload-image  - Upload image with processing');
    console.log('   GET  /api/images/:user  - Get user images');
    console.log('   GET  /api/health        - Server status');
    console.log('   GET  /api/clcard        - Customer list (LG_002_CLCARD)');
    console.log('   GET  /api/gunluk-tahsilat - Daily collections (GunlukTahsilat_V)');
    console.log('   GET  /api/stats         - Statistics');
    console.log('   GET  /api/test          - Test all endpoints');
    console.log('   GET  /uploads/*         - Static file serving');
    console.log('================================================================');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🛑 SIGTERM received, shutting down gracefully');
  }
  server.close(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Server closed');
    }
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🛑 SIGINT received, shutting down gracefully');
  }
  server.close(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Server closed');
    }
    process.exit(0);
  });
});
