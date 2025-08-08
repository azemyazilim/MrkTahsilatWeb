
import React, { useState, useCallback, useMemo } from "react";
import { Container, Box, TextField, Button, Typography, Alert, MenuItem, Autocomplete, CircularProgress } from "@mui/material";
import axios from "axios";
import API_BASE_URL from "./api";
import Dashboard from "./Dashboard";

// Axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Error interceptor
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    return Promise.reject(error?.response?.data || error);
  }
);

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const res = await api.post('/login', { username, password });
      if (res.data.success) {
        // Save user info to localStorage
        localStorage.setItem('user', JSON.stringify({
          username,
          lastLogin: new Date().toISOString()
        }));
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message || "Sunucu hatası.");
    } finally {
      setLoading(false);
    }
  };

  // Check for existing session
  React.useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const { username: savedUsername } = JSON.parse(savedUser);
        setUsername(savedUsername);
        setSuccess(true);
      } catch (err) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  if (success) {
    return <TahsilatForm username={username} />;
  }

  return (
    <Container maxWidth="xs">
      <Box 
        sx={{ 
          mt: 8, 
          p: 4, 
          bgcolor: "#f5f5f5", 
          borderRadius: 2, 
          boxShadow: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Typography 
          variant="h5" 
          align="center" 
          gutterBottom
          sx={{ fontWeight: 'bold', color: '#1976d2' }}
        >
          MRK Tahsilat Sistemi
        </Typography>
        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <TextField 
            label="Kullanıcı Adı" 
            fullWidth 
            margin="normal" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            disabled={loading}
            required 
          />
          <TextField 
            label="Şifre" 
            type="password" 
            fullWidth 
            margin="normal" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            disabled={loading}
            required 
          />
          {error && (
            <Alert 
              severity="error" 
              sx={{ mt: 2, mb: 2 }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            fullWidth 
            sx={{ 
              mt: 2,
              height: 48,
              fontSize: '1.1rem',
              textTransform: 'none'
            }}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Giriş Yap'
            )}
          </Button>
        </form>
      </Box>
    </Container>
  );
}

function TahsilatForm({ username }) {
  // State tanımları
  const [gunlukTahsilat, setGunlukTahsilat] = useState([]);
  // Filtreleme kaldırıldı - basit görünüm için
  // const [filteredTahsilat, setFilteredTahsilat] = useState([]);
  // const [filters, setFilters] = useState({});
  const [clcards, setClcards] = useState([]);
  const [selectedClcard, setSelectedClcard] = useState("");
  const [evrakNo, setEvrakNo] = useState("");
  const [tahsilatTuru, setTahsilatTuru] = useState("");
  const [tutar, setTutar] = useState("");
  const [tarih, setTarih] = useState(() => new Date().toISOString().slice(0, 10));
  const [banka, setBanka] = useState("");
  const [taksit, setTaksit] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Dummy data ve türler
  const tahsilatTurleri = ["Nakit", "Kredi Kartı", "Banka Havalesi", "Çek", "Senet"];
  const bankaBilgileri = ["Ziraat", "Garanti", "İş Bankası", "Yapı Kredi"];

  // Dinamik alanlar
  const isBankaVisible = tahsilatTuru === "Kredi Kartı" || tahsilatTuru === "Banka Havalesi";
  const isBankaActive = isBankaVisible;
  const isTaksitVisible = tahsilatTuru === "Kredi Kartı";
  const isTaksitActive = isTaksitVisible;

  // Resim işleme fonksiyonları
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Dosya boyutu kontrolü (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Resim boyutu 5MB\'dan küçük olmalıdır.');
        return;
      }
      
      // Dosya türü kontrolü
      if (!file.type.startsWith('image/')) {
        alert('Lütfen sadece resim dosyası seçiniz.');
        return;
      }
      
      setSelectedImage(file);
      
      // Önizleme için FileReader kullan
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    // File input'u temizle
    const fileInput = document.getElementById('image-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleCameraCapture = () => {
    // Mobil cihazlarda kamera açmak için
    const fileInput = document.getElementById('camera-input');
    if (fileInput) {
      fileInput.click();
    }
  };

  // OCR ile evrak bilgilerini çıkar
  const handleOCRExtract = async () => {
    if (!selectedImage) {
      alert('Önce bir resim seçiniz!');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      
      const response = await axios.post(`${API_BASE_URL}/ocr-extract`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const extracted = response.data.data.extractedData;

        // Form alanlarını otomatik doldur
        if (extracted.evrakNo) {
          setEvrakNo(extracted.evrakNo);
        }
        if (extracted.tutar) {
          setTutar(extracted.tutar);
        }
        if (extracted.tarih) {
          // Tarih formatını yyyy-MM-dd'ye çevir
          const [gun, ay, yil] = extracted.tarih.split('.');
          const formattedDate = `${yil}-${ay.padStart(2, '0')}-${gun.padStart(2, '0')}`;
          setTarih(formattedDate);
        }
        if (extracted.odemeSecenegi) {
          setTahsilatTuru(extracted.odemeSecenegi);
        }

        alert(`✅ OCR Tamamlandı!\n\n📄 Evrak No: ${extracted.evrakNo || 'Bulunamadı'}\n💰 Tutar: ${extracted.tutar || 'Bulunamadı'}\n📅 Tarih: ${extracted.tarih || 'Bulunamadı'}\n💳 Ödeme: ${extracted.odemeSecenegi || 'Bulunamadı'}\n\n🎯 Güven: %${extracted.confidence}`);
      } else {
        throw new Error(response.data.message);
      }

    } catch (error) {
      alert(`❌ OCR işlemi başarısız: ${error.response?.data?.message || error.message}`);
    }
  };

  // Filtreleme fonksiyonu - Artık kullanılmıyor (basit görünüm için kaldırıldı)
  // const applyFilters = () => {
  //   setFilteredTahsilat(gunlukTahsilat);
  // };

  // Filter değişikliği - Artık kullanılmıyor
  // const handleFilterChange = (column, value) => {
  //   setFilters(prev => ({ ...prev, [column]: value }));
  // };

  // Filtre uygulama - Artık kullanılmıyor
  // React.useEffect(() => {
  //   applyFilters();
  // }, [filters, gunlukTahsilat]);

  // Tutar formatlaması
  const formatCurrency = (value) => {
    if (!value || isNaN(value)) return "0,00 TL";
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(parseFloat(value));
  };

  // Tarih formatlaması
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // Eğer zaten kısa format ise (dd.MM.yyyy) olduğu gibi döndür
    if (dateString.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      return dateString;
    }
    
    // ISO format ise (2025-08-01T00:00:00.000Z) kısa formata çevir
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Geçersiz tarih ise olduğu gibi döndür
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // 0-based olduğu için +1
      const year = date.getFullYear();
      
      return `${day}.${month}.${year}`;
    } catch (error) {
      return dateString; // Hata durumunda orijinal değeri döndür
    }
  };

  // Toplam hesaplama - Tüm veriler üzerinden
  const calculateTotal = () => {
    return gunlukTahsilat.reduce((total, row) => {
      const tutar = parseFloat(row.Tutar) || 0;
      return total + tutar;
    }, 0);
  };

  // Kullanıcıya ait cari kodlarını alma fonksiyonu
  const getUserCariCodes = () => {
    return clcards.map(card => card.CODE);
  };

  // Güvenli tarih parse fonksiyonu
  const parseDate = (dateString) => {
    if (!dateString) return null;
    
    try {
      // dd.MM.yyyy formatı (backend'den gelen format)
      if (dateString.includes('.')) {
        const parts = dateString.split('.');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // JavaScript ayları 0-based
          const year = parseInt(parts[2], 10);
          
          // Geçerli tarih kontrolü
          if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900 && year <= 2100) {
            return new Date(year, month, day);
          }
        }
      }
      // ISO format fallback (2025-08-01T00:00:00.000Z)
      else if (dateString.includes('T')) {
        return new Date(dateString);
      }
      // YYYY-MM-DD format fallback
      else if (dateString.includes('-') && dateString.length >= 10) {
        return new Date(dateString + 'T00:00:00');
      }
      
      // Diğer formatlar için genel Date constructor
      return new Date(dateString);
    } catch (error) {
      console.warn('Tarih parse hatası:', dateString, error);
      return null;
    }
  };

  // Tarihleri karşılaştırma fonksiyonu
  const isSameDate = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // Bu haftayı hesaplama (Pazartesi başlangıçlı)
  const getWeekRange = (date) => {
    const dayOfWeek = date.getDay(); // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Pazar ise 6 gün geriye
    
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return { startOfWeek, endOfWeek };
  };

  // Bu ayı kontrol etme
  const isSameMonth = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth();
  };

  // Günlük toplam hesaplama (bugün) - Sadece kullanıcının plasiyer adına göre
  const calculateDailyTotal = () => {
    const today = new Date();
    
    let total = 0;
    let matchedRecords = [];
    
    gunlukTahsilat.forEach((row, index) => {
      // Sadece kullanıcının plasiyer adına ait kayıtları hesapla
      if (row.Plasiyer !== username) {
        return;
      }
      
      const rowDate = parseDate(row.Tarih);
      if (rowDate && isSameDate(rowDate, today)) {
        const tutar = parseFloat(row.Tutar) || 0;
        total += tutar;
        matchedRecords.push({
          index,
          date: rowDate.toLocaleDateString('tr-TR'),
          tutar,
          originalDate: row.Tarih,
          cariKod: row.CariKod,
          plasiyer: row.Plasiyer
        });
      }
    });
    
    return total;
  };

  // Haftalık toplam hesaplama (bu hafta) - Sadece kullanıcının plasiyer adına göre
  const calculateWeeklyTotal = () => {
    const today = new Date();
    const { startOfWeek, endOfWeek } = getWeekRange(today);
    
    let weeklyTotal = 0;
    let matchedRecords = [];
    
    gunlukTahsilat.forEach((row, index) => {
      // Sadece kullanıcının plasiyer adına ait kayıtları hesapla
      if (row.Plasiyer !== username) {
        return;
      }
      
      const rowDate = parseDate(row.Tarih);
      if (rowDate && rowDate >= startOfWeek && rowDate <= endOfWeek) {
        const tutar = parseFloat(row.Tutar) || 0;
        weeklyTotal += tutar;
        matchedRecords.push({
          index,
          date: rowDate.toLocaleDateString('tr-TR'),
          tutar,
          originalDate: row.Tarih,
          cariKod: row.CariKod,
          plasiyer: row.Plasiyer
        });
      }
    });
    
    return weeklyTotal;
  };

  // Plasiyer bazında toplam hesaplama fonksiyonları
  const calculatePlasiyerTotals = () => {
    const plasiyerTotals = {};
    const today = new Date();
    const { startOfWeek, endOfWeek } = getWeekRange(today);
    const userCariCodes = getUserCariCodes(); // Kullanıcının cari kodları
    
    gunlukTahsilat.forEach((row, index) => {
      const plasiyer = row.Plasiyer || 'Bilinmeyen';
      
      if (!plasiyerTotals[plasiyer]) {
        plasiyerTotals[plasiyer] = {
          gunluk: 0,
          haftalik: 0,
          aylik: 0,
          toplam_kayit: 0,
          kullanici_kayit: 0
        };
      }
      
      const tutar = parseFloat(row.Tutar) || 0;
      const rowDate = parseDate(row.Tarih);
      
      // Tüm plasiyer verilerini say
      plasiyerTotals[plasiyer].toplam_kayit++;
      
      // Kullanıcının cari kodlarına ait kayıtları say
      if (userCariCodes.includes(row.CariKod)) {
        plasiyerTotals[plasiyer].kullanici_kayit++;
      }
      
      if (rowDate) {
        // Günlük hesaplama - TÜM VERİLER (kullanıcı filtresi YOK)
        if (isSameDate(rowDate, today)) {
          plasiyerTotals[plasiyer].gunluk += tutar;
        }
        
        // Haftalık hesaplama - TÜM VERİLER (kullanıcı filtresi YOK)
        if (rowDate >= startOfWeek && rowDate <= endOfWeek) {
          plasiyerTotals[plasiyer].haftalik += tutar;
        }
        
        // Aylık hesaplama - TÜM VERİLER (kullanıcı filtresi YOK)
        if (isSameMonth(rowDate, today)) {
          plasiyerTotals[plasiyer].aylik += tutar;
        }
      }
    });
    
    return plasiyerTotals;
  };

  // Plasiyer tablosu için genel toplamlar (tüm plasiyer verileri)
  const calculateGeneralDailyTotal = () => {
    const today = new Date();
    
    let total = 0;
    let matchedRecords = [];
    
    gunlukTahsilat.forEach((row, index) => {
      const rowDate = parseDate(row.Tarih);
      if (rowDate && isSameDate(rowDate, today)) {
        const tutar = parseFloat(row.Tutar) || 0;
        total += tutar;
        matchedRecords.push({
          index,
          date: rowDate.toLocaleDateString('tr-TR'),
          tutar,
          originalDate: row.Tarih,
          cariKod: row.CariKod,
          plasiyer: row.Plasiyer
        });
      }
    });
    
    return total;
  };

  const calculateGeneralWeeklyTotal = () => {
    const today = new Date();
    const { startOfWeek, endOfWeek } = getWeekRange(today);
    
    let total = 0;
    let matchedRecords = [];
    
    gunlukTahsilat.forEach((row, index) => {
      const rowDate = parseDate(row.Tarih);
      if (rowDate && rowDate >= startOfWeek && rowDate <= endOfWeek) {
        const tutar = parseFloat(row.Tutar) || 0;
        total += tutar;
        matchedRecords.push({
          index,
          date: rowDate.toLocaleDateString('tr-TR'),
          tutar,
          originalDate: row.Tarih,
          cariKod: row.CariKod,
          plasiyer: row.Plasiyer
        });
      }
    });
    
    return total;
  };

  const calculateGeneralMonthlyTotal = () => {
    const today = new Date();
    
    let total = 0;
    let matchedRecords = [];
    
    gunlukTahsilat.forEach((row, index) => {
      const rowDate = parseDate(row.Tarih);
      if (rowDate && isSameMonth(rowDate, today)) {
        const tutar = parseFloat(row.Tutar) || 0;
        total += tutar;
        matchedRecords.push({
          index,
          date: rowDate.toLocaleDateString('tr-TR'),
          tutar,
          originalDate: row.Tarih,
          cariKod: row.CariKod,
          plasiyer: row.Plasiyer
        });
      }
    });
    
    return total;
  };

  // Aylık toplam hesaplama (bu ay) - Sadece kullanıcının plasiyer adına göre
  const calculateMonthlyTotal = () => {
    const today = new Date();
    
    let monthlyTotal = 0;
    let matchedRecords = [];
    
    gunlukTahsilat.forEach((row, index) => {
      // Sadece kullanıcının plasiyer adına ait kayıtları hesapla
      if (row.Plasiyer !== username) {
        return;
      }
      
      const rowDate = parseDate(row.Tarih);
      if (rowDate && isSameMonth(rowDate, today)) {
        const tutar = parseFloat(row.Tutar) || 0;
        monthlyTotal += tutar;
        matchedRecords.push({
          index,
          date: rowDate.toLocaleDateString('tr-TR'),
          tutar,
          originalDate: row.Tarih,
          cariKod: row.CariKod,
          plasiyer: row.Plasiyer
        });
      }
    });
    
    return monthlyTotal;
  };

  // Mevcut ayın verilerini filtrele
  const filterCurrentMonthData = (data) => {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-based (Ağustos = 7)
    const currentYear = today.getFullYear(); // 2025
    
    const filteredData = data.filter(row => {
      if (row.Tarih) {
        let rowDate;
        
        // Backend'den gelen format: dd.MM.yyyy (örn: "04.08.2025")
        if (row.Tarih.includes('.')) {
          const parts = row.Tarih.split('.');
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // 0-based month
            const year = parseInt(parts[2]);
            rowDate = new Date(year, month, day);
          }
        } else if (row.Tarih.includes('T')) {
          // ISO format fallback
          rowDate = new Date(row.Tarih);
        } else if (row.Tarih.includes('-') && row.Tarih.length >= 10) {
          // YYYY-MM-DD format fallback
          rowDate = new Date(row.Tarih + 'T00:00:00');
        } else {
          rowDate = new Date(row.Tarih);
        }
        
        const isValidDate = !isNaN(rowDate.getTime());
        const isCurrentMonth = isValidDate && rowDate.getMonth() === currentMonth;
        const isCurrentYear = isValidDate && rowDate.getFullYear() === currentYear;
        
        return isValidDate && isCurrentMonth && isCurrentYear;
      }
      return false;
    });
    
    return filteredData;
  };

  // Verileri yenileme fonksiyonu
  const refreshData = () => {
    
    // Cari listesi API çağrısı - kullanıcıya özel (SPECODE = username)
    axios.get(`${API_BASE_URL}/clcard?username=${username}`).then(res => {
      // Backend {success: true, data: [...]} formatında döndürüyor
      const clcardsData = res.data.success ? res.data.data : [];
      setClcards(clcardsData);
    }).catch(err => {
      // Cari listesi yenilenirken hata oluştu
    });
    
    // Günlük tahsilat verilerini al - belirtilen plasiyer filtresi ile
    axios.get(`${API_BASE_URL}/gunluk-tahsilat`).then(res => {
      // Backend {success: true, data: [...]} formatında döndürüyor
      const tahsilatData = res.data.success ? res.data.data : [];
      
      // Sadece mevcut ayın verilerini filtrele
      const currentMonthData = filterCurrentMonthData(tahsilatData);
      
      // ID'ye göre azalan sıralama (DESC)
      const sortedData = currentMonthData.sort((a, b) => {
        const idA = parseInt(a.ID) || 0;
        const idB = parseInt(b.ID) || 0;
        return idB - idA; // Azalan sıralama için b - a
      });
      
      setGunlukTahsilat(sortedData);
      // Artık filtreleme yok, sadece ana veriyi kullanıyoruz
      
    }).catch(err => {
      // Günlük tahsilat verileri yenilenirken hata oluştu
      setGunlukTahsilat([]); // Hata durumunda boş array
    });
  };

  // Kullanıcıya özel cari listesini backend'den çek ve tahsilat verilerini al
  React.useEffect(() => {
    refreshData(); // İlk yükleme için mevcut fonksiyonu kullan
  }, [username, refreshData]);

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form verilerini topla
    const formData = {
      selectedClcard,
      evrakNo,
      tahsilatTuru,
      banka,
      taksit,
      tutar,
      tarih,
      hasImage: selectedImage !== null,
      imageName: selectedImage ? selectedImage.name : null,
      imageSize: selectedImage ? selectedImage.size : null
    };
    
    try {
      // 1. Önce tahsilat kaydını oluştur (burada sizin mevcut tahsilat kaydetme kodunuz gelecek)
      
      // TODO: Gerçek tahsilat kaydetme API'nizi buraya ekleyin
      // const tahsilatResponse = await axios.post(`${API_BASE_URL}/save-tahsilat`, formData);
      // const tahsilatId = tahsilatResponse.data.tahsilatId;
      
      // Şimdilik mock tahsilatId - gerçek implementasyonda yukarıdaki satırları kullanın
      const tahsilatId = Date.now(); // Geçici mock ID
      
      // 2. Eğer resim seçilmişse, TahsilatID ile birlikte yükle
      if (selectedImage) {
        
        const imageFormData = new FormData();
        imageFormData.append('image', selectedImage);
        imageFormData.append('username', username);
        imageFormData.append('tahsilatId', tahsilatId); // ✨ TahsilatID ile birlikte
        
        const uploadResponse = await axios.post(`${API_BASE_URL}/upload-image`, imageFormData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        if (uploadResponse.data.success) {
          // console.log('✅ Resim başarıyla yüklendi:', uploadResponse.data.data);
        } else {
          throw new Error(uploadResponse.data.message || 'Resim yükleme başarısız');
        }
      }
      
      // 3. Başarı mesajı göster
      if (selectedImage) {
        alert(`✅ Tahsilat ve resim başarıyla kaydedildi!\n\n📸 Resim: ${selectedImage.name}\n📏 Boyut: ${(selectedImage.size / 1024).toFixed(1)} KB\n🆔 Tahsilat ID: ${tahsilatId}`);
      } else {
        alert(`✅ Tahsilat kaydedildi!\n🆔 Tahsilat ID: ${tahsilatId}`);
      }
      
      // Form'u temizle
      setSelectedClcard("");
      setEvrakNo("");
      setTahsilatTuru("");
      setBanka("");
      setTaksit("");
      setTutar("");
      setTarih(new Date().toISOString().slice(0, 10));
      handleRemoveImage();
      
    } catch (error) {
      alert(`❌ Hata oluştu: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ 
        mt: 4, 
        display: 'flex', 
        flexDirection: 'column',
        gap: 3, 
        minHeight: '100vh'
      }}>
        
        {/* Üst Kısım - Tahsilat Formu ve Özet Bilgiler */}
        <Box sx={{ 
          display: 'flex',
          gap: 3,
          flexDirection: { xs: 'column', md: 'row' }
        }}>
          
          {/* Sol Taraf - Tahsilat Formu */}
          <Box sx={{ 
            flex: 1,
            p: 4, 
            bgcolor: "#f8fafc", 
            borderRadius: 3, 
            boxShadow: 4
          }}>
          <Alert severity="success" sx={{ mb: 2 }}>Giriş başarılı şekilde yapıldı</Alert>
          <Typography variant="h5" align="center" sx={{ mb: 3, color: "#1976d2" }}>
            Tahsilat Formu <span style={{ fontSize: 18, color: '#555', marginLeft: 12 }}>({username})</span>
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ 
            display: "flex", 
            flexDirection: "column",
            gap: 3
          }}>
            <Autocomplete
              options={clcards}
              getOptionLabel={option => `${option.CODE} - ${option.DEFINITION_} (${option.SPECODE}) [REF:${option.LOGICALREF}]`}
              value={clcards.find(c => c.CODE === selectedClcard) || null}
              onChange={(e, newValue) => setSelectedClcard(newValue ? newValue.CODE : "")}
              renderInput={params => (
                <TextField {...params} label="Cari Listesi" fullWidth sx={{ bgcolor: "#fff" }} />
              )}
              isOptionEqualToValue={(option, value) => option.CODE === value.CODE}
              sx={{ bgcolor: "#fff" }}
            />
            <TextField label="Evrak No" fullWidth value={evrakNo} onChange={e => setEvrakNo(e.target.value)} sx={{ bgcolor: "#fff" }} />
            <TextField
              select
              label="Tahsilat Türü"
              value={tahsilatTuru}
              onChange={e => setTahsilatTuru(e.target.value)}
              fullWidth
              required
              sx={{ bgcolor: "#fff" }}
            >
              <MenuItem value="">Seçiniz</MenuItem>
              {tahsilatTurleri.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            {isBankaVisible && (
              <TextField
                select
                label="Banka Bilgileri"
                value={banka}
                onChange={e => setBanka(e.target.value)}
                fullWidth
                disabled={!isBankaActive}
                sx={{ bgcolor: "#fff" }}
              >
                <MenuItem value="">Seçiniz</MenuItem>
                {bankaBilgileri.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </TextField>
            )}
            {isTaksitVisible && (
              <TextField
                select
                label="Taksit Sayısı"
                value={taksit}
                onChange={e => setTaksit(Number(e.target.value))}
                fullWidth
                disabled={!isTaksitActive}
                sx={{ bgcolor: "#fff" }}
              >
                <MenuItem value="">Seçiniz</MenuItem>
                {[...Array(12)].map((_, i) => (
                  <MenuItem key={i+1} value={i+1}>{i+1}</MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label="Tutar"
              value={tutar}
              onChange={e => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) setTutar(val);
              }}
              fullWidth
              required
              sx={{ bgcolor: "#fff" }}
            />
            <TextField
              label="Tarih"
              type="date"
              value={tarih}
              onChange={e => setTarih(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: "#fff" }}
            />
            
            {/* Resim Ekleme Bölümü */}
            <Box sx={{ mt: 3, p: 3, bgcolor: "#fff", borderRadius: 2, border: '2px dashed #ddd' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                📷 Resim Ekle
              </Typography>
              
              {/* Resim Seçenekleri */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={() => document.getElementById('image-input').click()}
                  sx={{ minWidth: 120 }}
                >
                  📁 Galeri
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={handleCameraCapture}
                  sx={{ minWidth: 120 }}
                >
                  📷 Kamera
                </Button>
                {selectedImage && (
                  <>
                    <Button
                      variant="outlined"
                      color="info"
                      size="small"
                      onClick={handleOCRExtract}
                      sx={{ minWidth: 120 }}
                    >
                      🔍 OCR Oku
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={handleRemoveImage}
                      sx={{ minWidth: 120 }}
                    >
                      🗑️ Kaldır
                    </Button>
                  </>
                )}
              </Box>
              
              {/* Gizli File Input'lar */}
              <input
                id="image-input"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              <input
                id="camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              
              {/* Resim Önizleme */}
              {imagePreview && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>
                    Seçilen Resim:
                  </Typography>
                  <Box sx={{ 
                    position: 'relative', 
                    display: 'inline-block',
                    border: '1px solid #ddd',
                    borderRadius: 2,
                    overflow: 'hidden'
                  }}>
                    <img 
                      src={imagePreview} 
                      alt="Seçilen resim" 
                      style={{ 
                        maxWidth: '200px', 
                        maxHeight: '150px', 
                        display: 'block'
                      }} 
                    />
                  </Box>
                  {selectedImage && (
                    <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 1 }}>
                      Dosya: {selectedImage.name} ({(selectedImage.size / 1024).toFixed(1)} KB)
                    </Typography>
                  )}
                </Box>
              )}
              
              {!imagePreview && (
                <Typography variant="caption" sx={{ color: '#999', fontStyle: 'italic' }}>
                  Fatura, fiş veya diğer belge fotoğraflarını buraya ekleyebilirsiniz.
                </Typography>
              )}
            </Box>
            
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              sx={{ 
                mt: 2, 
                py: 1.5, 
                fontWeight: 600, 
                fontSize: 16
              }}
            >
              Kaydet
            </Button>
          </Box>
        </Box>
        
        {/* Sağ Taraf - Özet Bilgiler */}
        <Box sx={{ 
          flex: 1,
          p: 4, 
          bgcolor: "#f8fafc", 
          borderRadius: 3, 
          boxShadow: 4
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ color: "#1976d2" }}>
              SENİN TAHSİLATİN
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              size="small"
              onClick={refreshData}
              sx={{ 
                minWidth: 80, 
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: '#1976d2',
                  color: '#fff'
                }
              }}
            >
              🔄 Yenile
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Günlük Tahsilat */}
            <Box sx={{ 
              p: 3, 
              bgcolor: "#e3f2fd", 
              borderRadius: 2, 
              border: '2px solid #1976d2',
              textAlign: 'center'
            }}>
              <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 600, mb: 1 }}>
                Toplam Günlük Tahsilat
              </Typography>
              <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>
                (Bugün - {new Date().toLocaleDateString('tr-TR')})
              </Typography>
              <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 700 }}>
                {formatCurrency(calculateDailyTotal())}
              </Typography>
            </Box>
            
            {/* Haftalık Tahsilat */}
            <Box sx={{ 
              p: 3, 
              bgcolor: "#e8f5e8", 
              borderRadius: 2, 
              border: '2px solid #4caf50',
              textAlign: 'center'
            }}>
              <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 600, mb: 1 }}>
                Haftalık Tahsilat
              </Typography>
              <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>
                (Bu Hafta)
              </Typography>
              <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 700 }}>
                {formatCurrency(calculateWeeklyTotal())}
              </Typography>
            </Box>
            
            {/* Aylık Tahsilat */}
            <Box sx={{ 
              p: 3, 
              bgcolor: "#fff3e0", 
              borderRadius: 2, 
              border: '2px solid #ff9800',
              textAlign: 'center'
            }}>
              <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 600, mb: 1 }}>
                Aylık Tahsilat
              </Typography>
              <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>
                ({new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })})
              </Typography>
              <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 700 }}>
                {formatCurrency(calculateMonthlyTotal())}
              </Typography>
            </Box>
            
          </Box>
        </Box>
        
        </Box>
        
        {/* PLASIYER Özet Tablosu */}
        {gunlukTahsilat.length > 0 && (
          <Box sx={{ 
            p: 4, 
            bgcolor: "#f8fafc", 
            borderRadius: 3, 
            boxShadow: 4, 
            width: '100%'
          }}>
            <Typography variant="h5" align="center" sx={{ mb: 3, color: '#1976d2' }}>
              Plasiyer Bazında Tahsilat Özeti
            </Typography>
            
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 4 }}>
                <thead>
                  <tr style={{ backgroundColor: '#1976d2', color: '#fff' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>
                      Plasiyer
                    </th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '14px' }}>
                      Günlük Tahsilat
                    </th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '14px' }}>
                      Haftalık Tahsilat
                    </th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '14px' }}>
                      Aylık Tahsilat
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(calculatePlasiyerTotals()).map(([plasiyer, totals], index) => (
                    <tr key={plasiyer} style={{ 
                      backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9',
                      borderBottom: '1px solid #eee'
                    }}>
                      <td style={{ padding: '10px', fontWeight: 600, color: '#333' }}>
                        {plasiyer}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#1976d2', fontWeight: 500 }}>
                        {formatCurrency(totals.gunluk)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#4caf50', fontWeight: 500 }}>
                        {formatCurrency(totals.haftalik)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#ff9800', fontWeight: 500 }}>
                        {formatCurrency(totals.aylik)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#e3f2fd', borderTop: '2px solid #1976d2' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#1976d2' }}>
                      GENEL TOPLAM
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#1976d2' }}>
                      {formatCurrency(calculateGeneralDailyTotal())}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#4caf50' }}>
                      {formatCurrency(calculateGeneralWeeklyTotal())}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#ff9800' }}>
                      {formatCurrency(calculateGeneralMonthlyTotal())}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </Box>
          </Box>
        )}
        
        {/* Alt Kısım - Günlük Tahsilat Tablosu */}
        <Box sx={{ 
          p: 4, 
          bgcolor: "#f8fafc", 
          borderRadius: 3, 
          boxShadow: 4, 
          width: '100%'
        }}>
          <Typography variant="h5" align="center" sx={{ mb: 3, color: '#1976d2' }}>
            Günlük Tahsilatlar ({new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })})
          </Typography>
          {gunlukTahsilat.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>Veri yükleniyor...</Typography>
          ) : (
            <>
              <Box sx={{ maxHeight: '70vh', overflowY: 'auto', position: 'relative', width: '100%' }}>
                <table className="auto-layout-table" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 4 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    {(() => {
                      // Kolon sıralamasını belirle - Taksit BANKAADI'dan sonra gelsin
                      const allKeys = Object.keys(gunlukTahsilat[0]);
                      const orderedKeys = [];
                      
                      // Önce BANKAADI'ya kadar olan sütunları ekle
                      allKeys.forEach(key => {
                        if (key !== 'Taksit') {
                          orderedKeys.push(key);
                          // BANKAADI'dan sonra Taksit'i ekle
                          if (key === 'BANKAADI') {
                            orderedKeys.push('Taksit');
                          }
                        }
                      });
                      
                      return orderedKeys;
                    })().map(col => {
                      // Başlangıç kolon genişliklerini belirle
                      let width = '120px';
                      if (col === 'CariUnvan') width = '250px';
                      else if (col === 'TahsilatTuru') width = '140px';
                      else if (col === 'BANKAADI') width = '140px';
                      else if (col === 'Taksit') width = '100px';
                      else if (col === 'Tutar') width = '120px';
                      else if (col === 'EklemeTarihi') width = '150px';
                      else if (col === 'CariKod') width = '120px';
                      else if (col === 'EvrakNo') width = '120px';
                      else if (col === 'Bölge') width = '100px';
                      else if (col === 'Plasiyer') width = '120px';
                      else if (col === 'Durum') width = '100px';
                      else if (col === 'Tarih') width = '110px';
                      else if (col === 'ID') width = '80px';
                      
                      return (
                        <th key={col} 
                            className="resizable-table" 
                            style={{ 
                              padding: '12px 8px', 
                              borderBottom: '3px solid #1976d2', 
                              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', 
                              color: '#fff', 
                              fontSize: '13px', 
                              fontWeight: 700, 
                              width: width,
                              minWidth: '60px',
                              position: 'relative',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              textAlign: 'center',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              cursor: 'default',
                              userSelect: 'none'
                            }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            height: '100%'
                          }}>
                            <span style={{ flex: 1, textAlign: 'center' }}>{col}</span>
                            {/* Kolon resize handle - daha görünür */}
                            <div 
                              className="resize-handle"
                              title="⟷ Sürükleyerek kolon genişliğini ayarlayın"
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                height: '100%',
                                width: '8px',
                                cursor: 'col-resize',
                                backgroundColor: 'rgba(255,255,255,0.3)',
                                borderRight: '2px solid rgba(255,255,255,0.5)',
                                transition: 'all 0.2s ease',
                                zIndex: 10
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = 'rgba(255,255,255,0.5)';
                                e.target.style.borderRight = '2px solid #fff';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'rgba(255,255,255,0.3)';
                                e.target.style.borderRight = '2px solid rgba(255,255,255,0.5)';
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                const startX = e.clientX;
                                const th = e.target.closest('th');
                                const startWidth = th.offsetWidth;
                                
                                // Resize sırasında body'e class ekle
                                document.body.classList.add('resizing');
                                
                                const handleMouseMove = (e) => {
                                  const newWidth = startWidth + (e.clientX - startX);
                                  if (newWidth > 60) { // Minimum genişlik 60px
                                    th.style.width = newWidth + 'px';
                                    th.style.minWidth = newWidth + 'px';
                                  }
                                };
                                
                                const handleMouseUp = () => {
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                  document.body.classList.remove('resizing');
                                };
                                
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                            />
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {gunlukTahsilat.length === 0 ? (
                    <tr>
                      <td colSpan={Object.keys(gunlukTahsilat[0]).length} style={{ 
                        padding: '20px', 
                        textAlign: 'center', 
                        color: '#666',
                        fontStyle: 'italic',
                        backgroundColor: '#f9f9f9'
                      }}>
                        Veri bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    gunlukTahsilat.map((row, i) => (
                      <tr key={i} style={{ 
                        backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9',
                        transition: 'background-color 0.2s ease',
                        '&:hover': {
                          backgroundColor: '#e3f2fd'
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.target.closest('tr').style.backgroundColor = '#e3f2fd';
                      }}
                      onMouseLeave={(e) => {
                        e.target.closest('tr').style.backgroundColor = i % 2 === 0 ? '#fff' : '#f9f9f9';
                      }}
                      >
                        {(() => {
                          // Kolon sıralamasını belirle - Taksit BANKAADI'dan sonra gelsin
                          const allKeys = Object.keys(row);
                          const orderedKeys = [];
                          
                          // Önce BANKAADI'ya kadar olan sütunları ekle
                          allKeys.forEach(key => {
                            if (key !== 'Taksit') {
                              orderedKeys.push(key);
                              // BANKAADI'dan sonra Taksit'i ekle
                              if (key === 'BANKAADI') {
                                orderedKeys.push('Taksit');
                              }
                            }
                          });
                          
                          return orderedKeys.map((key, j) => {
                            const val = row[key];
                            return (
                              <td key={j} style={{ 
                                padding: '8px 6px', 
                                borderBottom: '1px solid #eee', 
                                fontSize: '12px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                textAlign: key === 'Tutar' ? 'right' : 'left',
                                color: '#333'
                              }}>
                                <span title={
                                  key === 'Tutar' ? formatCurrency(val) : 
                                  key === 'Tarih' || key === 'EklemeTarihi' ? formatDate(val) : val
                                }>
                                  {key === 'Tutar' ? formatCurrency(val) : 
                                   key === 'Tarih' || key === 'EklemeTarihi' ? formatDate(val) : val}
                                </span>
                              </td>
                            );
                          });
                        })()}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Toplam Satırı - Sticky bottom position */}
              <div style={{ 
                position: 'sticky',
                bottom: 0,
                width: '100%',
                backgroundColor: '#fff',
                borderTop: '3px solid #1976d2',
                zIndex: 2,
                boxShadow: '0 -4px 8px rgba(0,0,0,0.15)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ backgroundColor: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
                      {(() => {
                        // Kolon sıralamasını belirle - Taksit BANKAADI'dan sonra gelsin
                        const allKeys = Object.keys(gunlukTahsilat[0]);
                        const orderedKeys = [];
                        
                        // Önce BANKAADI'ya kadar olan sütunları ekle
                        allKeys.forEach(key => {
                          if (key !== 'Taksit') {
                            orderedKeys.push(key);
                            // BANKAADI'dan sonra Taksit'i ekle
                            if (key === 'BANKAADI') {
                              orderedKeys.push('Taksit');
                            }
                          }
                        });
                        
                        return orderedKeys.map((col, index) => {
                          return (
                            <td key={index} style={{ 
                              padding: '10px 8px', 
                              fontSize: '13px',
                              fontWeight: 'bold',
                              textAlign: col === 'Tutar' ? 'right' : 'center',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              borderBottom: '1px solid #1976d2',
                              background: index === 0 ? 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)' : 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                              color: index === 0 ? '#fff' : '#1976d2'
                            }}>
                              {col === 'Tutar' ? formatCurrency(calculateTotal()) : 
                               index === 0 ? '📊 TOPLAM' : ''}
                            </td>
                          );
                        });
                      })()}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Box>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ 
                  color: '#1976d2', 
                  fontWeight: 600,
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  borderRadius: 2,
                  border: '1px solid #1976d2'
                }}>
                  📋 Toplam {gunlukTahsilat.length} kayıt gösteriliyor • Kolon genişliklerini ayarlamak için sağ kenarları sürükleyin ⟷
                </Typography>
              </Box>
            </>
          )}
        </Box>      </Box>
    </Container>
  );
}

export default App;
