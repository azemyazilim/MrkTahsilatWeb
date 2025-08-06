-- Tahsilat Resimleri Tablosu
-- Bu tablo tahsilat kayıtlarına ait resim bilgilerini saklar

CREATE TABLE TahsilatResimleri (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    TahsilatID INT NOT NULL, -- Tahsilat kaydıyla direkt ilişkilendirilir
    FileName NVARCHAR(255) NOT NULL, -- Dosya adı (UUID + extension)
    OriginalFileName NVARCHAR(255) NOT NULL, -- Kullanıcının yüklediği orijinal dosya adı
    FilePath NVARCHAR(500) NOT NULL, -- Sunucudaki dosya yolu
    FileSize BIGINT NOT NULL, -- Dosya boyutu (bytes)
    MimeType NVARCHAR(100) NOT NULL, -- image/jpeg, image/png vs.
    Width INT NULL, -- Resim genişliği
    Height INT NULL, -- Resim yüksekliği
    UploadedBy NVARCHAR(50) NOT NULL, -- Yükleyen kullanıcı
    UploadedAt DATETIME2 DEFAULT GETDATE(), -- Yüklenme tarihi
    IsActive BIT DEFAULT 1, -- Aktif/pasif durumu
    Description NVARCHAR(500) NULL -- Açıklama (isteğe bağlı)
);

-- Index'ler
CREATE INDEX IX_TahsilatResimleri_TahsilatID ON TahsilatResimleri(TahsilatID);
CREATE INDEX IX_TahsilatResimleri_UploadedBy ON TahsilatResimleri(UploadedBy);
CREATE INDEX IX_TahsilatResimleri_UploadedAt ON TahsilatResimleri(UploadedAt);

-- Örnek veri kontrolü
-- SELECT * FROM TahsilatResimleri WHERE IsActive = 1;
