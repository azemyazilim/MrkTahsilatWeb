#!/bin/bash

# Veritabanı Bağlantı Onarım Scripti

DB_PASSWORD="MrkTahsilat2024!"
DB_NAME="MrkTahsilatDB"

echo "🗄️ Veritabanı Bağlantısı Kontrol Ediliyor..."

# SQL Server durumunu kontrol et
echo "📊 SQL Server Durumu:"
sudo systemctl status mssql-server

# SQL Server'ı yeniden başlat (gerekirse)
echo "🔄 SQL Server yeniden başlatılıyor..."
sudo systemctl restart mssql-server
sleep 10

# Bağlantı testi
echo "🔌 Bağlantı Testi:"
if sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -Q "SELECT @@VERSION" &>/dev/null; then
    echo "✅ SQL Server bağlantısı başarılı"
else
    echo "❌ SQL Server bağlantısı başarısız"
    exit 1
fi

# Veritabanı kontrolü
echo "🗄️ Veritabanı Kontrolü:"
if sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -Q "SELECT name FROM sys.databases WHERE name = '$DB_NAME'" | grep -q "$DB_NAME"; then
    echo "✅ $DB_NAME veritabanı mevcut"
else
    echo "❌ $DB_NAME veritabanı bulunamadı, yeniden oluşturuluyor..."
    
    # Veritabanını yeniden oluştur
    cat > /tmp/recreate_db.sql << 'EOF'
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'MrkTahsilatDB')
BEGIN
    DROP DATABASE MrkTahsilatDB;
END
GO

CREATE DATABASE MrkTahsilatDB;
GO

USE MrkTahsilatDB;
GO

-- Kullanıcı tablosu
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) UNIQUE NOT NULL,
    Password NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) DEFAULT 'user',
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Tahsilat tablosu
CREATE TABLE Tahsilat (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    MusteriAdi NVARCHAR(100) NOT NULL,
    Tutar DECIMAL(18,2) NOT NULL,
    TahsilatTarihi DATETIME DEFAULT GETDATE(),
    Durum NVARCHAR(20) DEFAULT 'pending',
    Notlar NVARCHAR(500),
    CreatedBy INT,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (CreatedBy) REFERENCES Users(Id)
);
GO

-- Test kullanıcısı
INSERT INTO Users (Username, Password, Role) 
VALUES ('admin', 'admin123', 'admin');
GO

-- Test tahsilat verisi
INSERT INTO Tahsilat (MusteriAdi, Tutar, Durum, CreatedBy) 
VALUES ('Test Müşteri', 1000.00, 'completed', 1);
GO
EOF

    sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -i /tmp/recreate_db.sql
    rm /tmp/recreate_db.sql
    echo "✅ Veritabanı yeniden oluşturuldu"
fi

# Tablo kontrolü
echo "📋 Tablo Kontrolü:"
sqlcmd -S localhost -U sa -P "$DB_PASSWORD" -d "$DB_NAME" -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES"

echo "✅ Veritabanı onarımı tamamlandı"
