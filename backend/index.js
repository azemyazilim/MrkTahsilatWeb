// MrkTahsilatWeb Backend API
const express = require('express');
const cors = require('cors');
const mssql = require('mssql');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');
const fs = require('fs').promises;
const Tesseract = require('tesseract.js');

// UUID generator using crypto
const generateUUID = () => {
  return crypto.randomUUID();
};

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

// Uploads directory setup
const uploadsDir = path.join(__dirname, 'uploads');
const imagesDir = path.join(uploadsDir, 'images');

// Create directories if they don't exist
const ensureDirectories = async () => {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(imagesDir, { recursive: true });
    console.log('📁 Upload directories ensured');
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

// Image upload endpoint - requires TahsilatID
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  console.log('📸 Image upload request received');
  
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

    console.log(`📁 Processing image: ${originalName} -> ${uniqueFileName}`);

    // Process image with Sharp (resize, optimize)
    let processedBuffer;
    let imageInfo;
    
    try {
      const image = sharp(file.buffer);
      imageInfo = await image.metadata();
      
      // Resize if too large, maintain aspect ratio, optimize quality
      processedBuffer = await image
        .resize({
          width: imageInfo.width > 1920 ? 1920 : undefined,
          height: imageInfo.height > 1080 ? 1080 : undefined,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      console.log(`🔧 Image processed: ${imageInfo.width}x${imageInfo.height} -> optimized`);
    } catch (sharpError) {
      console.error('❌ Image processing error:', sharpError);
      return res.status(400).json({
        success: false,
        message: 'Resim işlenirken hata oluştu'
      });
    }

    // Save processed image to disk
    await fs.writeFile(filePath, processedBuffer);
    console.log(`💾 Image saved: ${filePath}`);

    // Save to database
    const pool = await mssql.connect(dbConfig);
    const result = await pool.request()
      .input('TahsilatID', mssql.Int, parseInt(tahsilatId))
      .input('FileName', mssql.NVarChar, uniqueFileName)
      .input('OriginalFileName', mssql.NVarChar, originalName)
      .input('FilePath', mssql.NVarChar, relativePath)
      .input('FileSize', mssql.BigInt, processedBuffer.length)
      .input('MimeType', mssql.NVarChar, 'image/jpeg') // Always JPEG after processing
      .input('Width', mssql.Int, imageInfo.width)
      .input('Height', mssql.Int, imageInfo.height)
      .input('UploadedBy', mssql.NVarChar, username)
      .query(`
        INSERT INTO TahsilatResimleri 
        (TahsilatID, FileName, OriginalFileName, FilePath, FileSize, MimeType, Width, Height, UploadedBy)
        VALUES 
        (@TahsilatID, @FileName, @OriginalFileName, @FilePath, @FileSize, @MimeType, @Width, @Height, @UploadedBy);
        
        SELECT SCOPE_IDENTITY() as ImageID;
      `);

    const imageID = result.recordset[0].ImageID;
    console.log(`✅ Image saved to database with ID: ${imageID}`);

    res.json({
      success: true,
      message: 'Resim başarıyla yüklendi',
      data: {
        imageID: imageID,
        fileName: uniqueFileName,
        originalName: originalName,
        filePath: relativePath,
        fileSize: processedBuffer.length,
        dimensions: {
          width: imageInfo.width,
          height: imageInfo.height
        },
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

// OCR endpoint - Extract document number from image
app.post('/api/ocr-extract', upload.single('image'), async (req, res) => {
  console.log('👁️ OCR extraction request received');
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Resim dosyası seçilmedi'
      });
    }

    const file = req.file;
    console.log('📸 Processing image for OCR:', file.originalname);
    console.log('📊 File info:', {
      size: file.size,
      mimetype: file.mimetype,
      hasBuffer: !!file.buffer
    });

    // Buffer'dan resmi oku ve OCR için optimize et - daha agresif preprocessing
    const processedBuffer = await sharp(file.buffer)
      .resize({ width: 2000, fit: 'inside', withoutEnlargement: false }) // Resmi büyüt
      .greyscale() // Siyah-beyaz yaparak OCR performansını artır
      .normalize() // Kontrast iyileştirme
      .linear(1.5, -20) // Kontrast ve parlaklık ayarı
      .sharpen({ sigma: 2, m1: 0.8, m2: 0.6 }) // Daha güçlü keskinlik
      .threshold(120) // Binary threshold - siyah/beyaz yapma
      .png() // PNG format OCR için daha iyi
      .toBuffer();

    console.log('✅ Image processed for OCR, size:', processedBuffer.length);

    // Tesseract ile OCR işlemi
    console.log('🔍 Running OCR analysis...');
    
    try {
      // İlk OCR denemesi - tam text
      const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        options: {
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÇĞIİÖŞÜçğıiöşü.,:-/TL₺KrNoN ',
          tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
          preserve_interword_spaces: '1'
        }
      });

      console.log('📄 OCR Raw Text:', text);
      let extractedData = extractDocumentInfo(text);

      // Eğer evrak no bulunamadıysa farklı PSM modları dene
      if (!extractedData.evrakNo) {
        console.log('🔄 Trying different PSM modes...');
        
        // PSM.SINGLE_BLOCK modunu dene
        const { data: { text: text2 } } = await Tesseract.recognize(processedBuffer, 'eng', {
          options: {
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÇĞIİÖŞÜçğıiöşü.,:-/TL₺KrNoN ',
            tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
          }
        });
        
        console.log('📄 PSM.SINGLE_BLOCK Text:', text2);
        let extractedData2 = extractDocumentInfo(text2);
        
        if (extractedData2.evrakNo) {
          extractedData = extractedData2;
        } else {
          // PSM.SINGLE_COLUMN modunu dene
          const { data: { text: text3 } } = await Tesseract.recognize(processedBuffer, 'eng', {
            options: {
              tessedit_pageseg_mode: Tesseract.PSM.SINGLE_COLUMN,
              tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÇĞIİÖŞÜçğıiöşü.,:-/TL₺KrNoN ',
              tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
            }
          });
          
          console.log('📄 PSM.SINGLE_COLUMN Text:', text3);
          let extractedData3 = extractDocumentInfo(text3);
          
          if (extractedData3.evrakNo) {
            extractedData = extractedData3;
          }
        }
      }

      res.json({
        success: true,
        message: 'OCR işlemi tamamlandı',
        data: {
          rawText: text,
          extractedData: extractedData,
          confidence: extractedData.confidence || 0
        }
      });

    } catch (ocrError) {
      console.error('❌ Tesseract OCR error:', ocrError);
      
      // Fallback: Sadece sayısal OCR dene
      try {
        console.log('🔄 Trying numeric-only OCR...');
        const { data: { text: numericText } } = await Tesseract.recognize(processedBuffer, 'eng', {
          options: {
            tessedit_char_whitelist: '0123456789.,:-/',
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
          }
        });
        
        console.log('📄 Numeric OCR Text:', numericText);
        const extractedData = extractDocumentInfo(numericText);
        
        res.json({
          success: true,
          message: 'OCR işlemi tamamlandı (sadece sayılar)',
          data: {
            rawText: numericText,
            extractedData: extractedData,
            confidence: Math.max(0, (extractedData.confidence || 0) - 20)
          }
        });
        
      } catch (fallbackError) {
        throw new Error(`OCR failed: ${ocrError.message} | Fallback failed: ${fallbackError.message}`);
      }
    }

  } catch (error) {
    console.error('❌ OCR error:', error);

    res.status(500).json({
      success: false,
      message: 'OCR işlemi sırasında hata oluştu: ' + error.message
    });
  }
});

// OCR text analysis function
function extractDocumentInfo(text) {
  const result = {
    evrakNo: null,
    tutar: null,
    tarih: null,
    odemeSecenegi: null,
    confidence: 0
  };

  try {
    console.log('🔍 Analyzing text for patterns...');
    
    // Evrak numarası çıkarma - çok daha geniş pattern'ler
    const noPatterns = [
      /(?:No|NO|no|№|N°|Evrak|EVRAK|Fiş|FİŞ|Belge|BELGE)\s*:?\s*(\d{4,8})/gi,
      /(\d{5,8})\s*(?:No|NO|no)/gi,
      /(?:^|\s)(\d{5,8})(?:\s|$)/gm, // Tek başına 5-8 haneli sayılar
      /(?:Seri|SERİ|Serie)\s*:?\s*[A-Z]*\s*(?:No|NO|no)\s*:?\s*(\d{4,8})/gi
    ];
    
    for (const pattern of noPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const evrakNo = match[1];
        if (evrakNo && evrakNo.length >= 4) {
          result.evrakNo = evrakNo;
          result.confidence += 30;
          console.log('✅ Evrak No bulundu (pattern):', result.evrakNo);
          break;
        }
      }
      if (result.evrakNo) break;
    }

    // Tutar çıkarma - TL, ₺ veya sayı,sayı formatları
    const tutarPatterns = [
      /(\d+[.,]\d+)\s*(?:TL|₺|Kr)/gi,
      /(?:Toplam|TOPLAM|Total|TOTAL|Tutar|TUTAR|Miktar|MİKTAR)\s*:?\s*(\d+[.,]\d+)/gi,
      /(\d+[.,]\d{2})\s*(?:TL|₺)/gi
    ];
    
    for (const pattern of tutarPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.tutar = match[1].replace(',', '.');
        result.confidence += 25;
        console.log('✅ Tutar bulundu:', result.tutar);
        break;
      }
    }

    // Tarih çıkarma - çeşitli formatlar
    const tarihPattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/;
    const tarihMatch = text.match(tarihPattern);
    if (tarihMatch) {
      const [, gun, ay, yil] = tarihMatch;
      const fullYear = yil.length === 2 ? '20' + yil : yil;
      result.tarih = `${gun.padStart(2, '0')}.${ay.padStart(2, '0')}.${fullYear}`;
      result.confidence += 20;
      console.log('✅ Tarih bulundu:', result.tarih);
    }

    // Ödeme türü çıkarma
    if (text.includes('NAKİT') || text.includes('NAKIT')) {
      result.odemeSecenegi = 'Nakit';
      result.confidence += 15;
    } else if (text.includes('KART') || text.includes('KREDİ')) {
      result.odemeSecenegi = 'Kredi Kartı';
      result.confidence += 15;
    } else if (text.includes('ÇEK')) {
      result.odemeSecenegi = 'Çek';
      result.confidence += 15;
    } else if (text.includes('HAVALE')) {
      result.odemeSecenegi = 'Banka Havalesi';
      result.confidence += 15;
    }

    console.log('📊 OCR Analysis Result:', result);
    return result;

  } catch (error) {
    console.error('❌ Text analysis error:', error);
    return result;
  }
}

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
  console.log('   POST /api/upload-image  - Upload image with processing');
  console.log('   GET  /api/images/:user  - Get user images');
  console.log('   GET  /api/health        - Server status');
  console.log('   GET  /api/clcard        - Customer list (LG_002_CLCARD)');
  console.log('   GET  /api/gunluk-tahsilat - Daily collections (GunlukTahsilat_V)');
  console.log('   GET  /api/stats         - Statistics');
  console.log('   GET  /api/test          - Test all endpoints');
  console.log('   GET  /uploads/*         - Static file serving');
  console.log('================================================================');
});
