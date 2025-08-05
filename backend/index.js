
// ...existing code...
// ...existing code...
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mssql from "mssql";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Login API
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Login attempt for user:", username);
  try {
    console.log("Connecting to database...");
    const pool = await mssql.connect(dbConfig);
    console.log("Database connected successfully");
    const result = await pool.request()
      .input("username", mssql.VarChar, username)
      .input("password", mssql.VarChar, password)
      .query("SELECT * FROM KULLANICITB WHERE KullaniciAdi COLLATE SQL_Latin1_General_CP1_CI_AS = @username COLLATE SQL_Latin1_General_CP1_CI_AS AND Sifre = @password");
    console.log("Query executed, found records:", result.recordset.length);
    if (result.recordset.length > 0) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: "Kullanıcı adı veya şifre yanlış." });
    }
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ success: false, message: `Sunucu hatası: ${err.message}` });
  }
});

// Cari listesi API kaldırıldı

// Cari listesi API
app.get("/api/clcard", async (req, res) => {
  const { username } = req.query;
  try {
    const pool = await mssql.connect(dbConfig);
    // Kullanıcıya özel cari listesi (SPECODE = username)
    const result = await pool.request()
      .input("username", mssql.VarChar, username)
      .query(`
        SELECT CODE, DEFINITION_, SPECODE 
        FROM LG_002_CLCARD 
        WHERE SPECODE COLLATE SQL_Latin1_General_CP1_CI_AS = @username COLLATE SQL_Latin1_General_CP1_CI_AS
        ORDER BY DEFINITION_
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: `Sunucu hatası: ${err.message}` });
  }
});

// Günlük tahsilat API
app.get("/api/gunluk-tahsilat", async (req, res) => {
  try {
    const pool = await mssql.connect(dbConfig);
    // Belirtilen Plasiyer değerlerine sahip günlük tahsilat verileri
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
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: `Sunucu hatası: ${err.message}` });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
