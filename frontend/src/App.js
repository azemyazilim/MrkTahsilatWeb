
import React, { useState } from "react";
import { Container, Box, TextField, Button, Typography, Alert, MenuItem, Autocomplete } from "@mui/material";
import axios from "axios";
import API_BASE_URL from "./api";

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await axios.post(`${API_BASE_URL}/login`, { username, password });
      if (res.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Sunucu hatası.");
    }
  };

  if (success) {
    return <TahsilatForm username={username} />;
  }

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, p: 4, bgcolor: "#f5f5f5", borderRadius: 2, boxShadow: 2 }}>
        <Typography variant="h5" align="center" gutterBottom>Giriş Yap</Typography>
        <form onSubmit={handleLogin}>
          <TextField label="Kullanıcı Adı" fullWidth margin="normal" value={username} onChange={e => setUsername(e.target.value)} required />
          <TextField label="Şifre" type="password" fullWidth margin="normal" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>Giriş Yap</Button>
        </form>
      </Box>
    </Container>
  );
}

function TahsilatForm({ username }) {
  // State tanımları
  const [gunlukTahsilat, setGunlukTahsilat] = useState([]);
  const [filteredTahsilat, setFilteredTahsilat] = useState([]);
  const [filters, setFilters] = useState({});
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

  // Filtreleme fonksiyonu
  const applyFilters = () => {
    let filtered = gunlukTahsilat;
    Object.keys(filters).forEach(column => {
      if (filters[column] && filters[column].trim() !== '') {
        filtered = filtered.filter(row => 
          row[column] && row[column].toString().toLowerCase().includes(filters[column].toLowerCase())
        );
      }
    });
    setFilteredTahsilat(filtered);
  };

  // Filter değişikliği
  const handleFilterChange = (column, value) => {
    setFilters(prev => ({ ...prev, [column]: value }));
  };

  // Filtre uygulama
  React.useEffect(() => {
    applyFilters();
  }, [filters, gunlukTahsilat]);

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

  // Toplam hesaplama - Filtrelenmiş veriler üzerinden (kullanıcıya özel)
  const calculateTotal = () => {
    return filteredTahsilat.reduce((total, row) => {
      const tutar = parseFloat(row.Tutar) || 0;
      return total + tutar;
    }, 0);
  };

  // Kullanıcıya ait cari kodlarını alma fonksiyonu
  const getUserCariCodes = () => {
    return clcards.map(card => card.CODE);
  };

  // Günlük toplam hesaplama (bugün) - Sadece kullanıcının cari kodları
  const calculateDailyTotal = () => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }); // dd.MM.yyyy format
    const userCariCodes = getUserCariCodes();
    
    console.log('Günlük hesaplama (kullanıcıya özel) - bugün:', todayStr);
    console.log('Kullanıcının cari kodları:', userCariCodes);
    
    return gunlukTahsilat.reduce((total, row) => {
      // Sadece kullanıcının cari kodlarına ait kayıtları hesapla
      if (!userCariCodes.includes(row.CariKod)) {
        return total;
      }
      
      if (row.Tarih) {
        // Backend'den dd.MM.yyyy formatında tarih geliyor
        let normalizedDate = row.Tarih;
        
        // Eğer ISO format ise dd.MM.yyyy formatına çevir
        if (row.Tarih.includes('T') || (row.Tarih.includes('-') && row.Tarih.length >= 10)) {
          try {
            const date = new Date(row.Tarih);
            if (!isNaN(date.getTime())) {
              normalizedDate = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }
          } catch (e) {
            console.warn('Tarih dönüştürme hatası:', row.Tarih);
          }
        }
        
        if (normalizedDate === todayStr) {
          const tutar = parseFloat(row.Tutar) || 0;
          console.log('Günlük eşleşme bulundu:', { tarih: normalizedDate, tutar, cariKod: row.CariKod });
          return total + tutar;
        }
      }
      return total;
    }, 0);
  };

  // Haftalık toplam hesaplama (bu hafta) - Sadece kullanıcının cari kodları
  const calculateWeeklyTotal = () => {
    const today = new Date();
    const userCariCodes = getUserCariCodes();
    
    // Pazartesi başlangıçlı hafta hesaplama
    const dayOfWeek = today.getDay(); // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Pazar ise 6 gün geriye, diğer günler için günÜ-1
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    console.log('Haftalık hesaplama (kullanıcıya özel):', {
      today: today.toLocaleDateString('tr-TR'),
      startOfWeek: startOfWeek.toLocaleDateString('tr-TR'),
      endOfWeek: endOfWeek.toLocaleDateString('tr-TR'),
      userCariCodes: userCariCodes,
      dayOfWeek,
      daysToMonday
    });
    
    let weeklyTotal = 0;
    let matchedRecords = [];
    
    gunlukTahsilat.forEach((row, index) => {
      // Sadece kullanıcının cari kodlarına ait kayıtları hesapla
      if (!userCariCodes.includes(row.CariKod)) {
        return;
      }
      
      if (row.Tarih) {
        let rowDate;
        if (row.Tarih.includes('T')) {
          rowDate = new Date(row.Tarih);
        } else if (row.Tarih.includes('-')) {
          rowDate = new Date(row.Tarih + 'T00:00:00');
        } else if (row.Tarih.includes('.')) {
          // dd.MM.yyyy formatı
          const parts = row.Tarih.split('.');
          if (parts.length === 3) {
            rowDate = new Date(parts[2], parts[1] - 1, parts[0]);
          }
        } else {
          rowDate = new Date(row.Tarih);
        }
        
        if (!isNaN(rowDate.getTime()) && rowDate >= startOfWeek && rowDate <= endOfWeek) {
          const tutar = parseFloat(row.Tutar) || 0;
          weeklyTotal += tutar;
          matchedRecords.push({
            index,
            date: rowDate.toLocaleDateString('tr-TR'),
            tutar,
            originalDate: row.Tarih,
            cariKod: row.CariKod
          });
        }
      }
    });
    
    console.log('Haftalık eşleşen kayıtlar (kullanıcıya özel):', matchedRecords);
    console.log('Haftalık toplam (kullanıcıya özel):', weeklyTotal);
    
    return weeklyTotal;
  };

  // Plasiyer bazında toplam hesaplama fonksiyonları
  const calculatePlasiyerTotals = () => {
    const plasiyerTotals = {};
    
    gunlukTahsilat.forEach(row => {
      const plasiyer = row.Plasiyer || 'Bilinmeyen';
      
      if (!plasiyerTotals[plasiyer]) {
        plasiyerTotals[plasiyer] = {
          gunluk: 0,
          haftalik: 0,
          aylik: 0
        };
      }
      
      const tutar = parseFloat(row.Tutar) || 0;
      
      // Tarihi bir kez dönüştür ve tüm hesaplamalarda kullan
      if (row.Tarih) {
        const today = new Date();
        
        // Tarih dönüştürme - tek seferlik
        let rowDate;
        if (row.Tarih.includes('T')) {
          rowDate = new Date(row.Tarih);
        } else if (row.Tarih.includes('-')) {
          rowDate = new Date(row.Tarih + 'T00:00:00');
        } else if (row.Tarih.includes('.')) {
          const parts = row.Tarih.split('.');
          if (parts.length === 3) {
            rowDate = new Date(parts[2], parts[1] - 1, parts[0]);
          }
        } else {
          rowDate = new Date(row.Tarih);
        }
        
        // Geçerli tarih kontrolü
        if (!isNaN(rowDate.getTime())) {
          // Günlük hesaplama - dd.MM.yyyy formatında karşılaştır
          const todayStr = today.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
          let normalizedDate = row.Tarih;
          
          // Eğer ISO format ise dd.MM.yyyy formatına çevir
          if (row.Tarih.includes('T') || (row.Tarih.includes('-') && row.Tarih.length >= 10)) {
            normalizedDate = rowDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
          }
          
          if (normalizedDate === todayStr) {
            plasiyerTotals[plasiyer].gunluk += tutar;
          }
          
          // Haftalık hesaplama
          const dayOfWeek = today.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - daysToMonday);
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          
          if (rowDate >= startOfWeek && rowDate <= endOfWeek) {
            plasiyerTotals[plasiyer].haftalik += tutar;
          }
          
          // Aylık hesaplama
          const currentMonth = today.getMonth();
          const currentYear = today.getFullYear();
          
          if (rowDate.getMonth() === currentMonth && rowDate.getFullYear() === currentYear) {
            plasiyerTotals[plasiyer].aylik += tutar;
          }
        }
      }
    });
    
    return plasiyerTotals;
  };

  // Plasiyer tablosu için genel toplamlar (tüm plasiyer verileri)
  const calculateGeneralDailyTotal = () => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }); // dd.MM.yyyy format
    
    console.log('Genel günlük hesaplama - bugün:', todayStr);
    
    return gunlukTahsilat.reduce((total, row) => {
      if (row.Tarih) {
        // Backend'den dd.MM.yyyy formatında tarih geliyor
        let normalizedDate = row.Tarih;
        
        // Eğer ISO format ise dd.MM.yyyy formatına çevir
        if (row.Tarih.includes('T') || (row.Tarih.includes('-') && row.Tarih.length >= 10)) {
          try {
            const date = new Date(row.Tarih);
            if (!isNaN(date.getTime())) {
              normalizedDate = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }
          } catch (e) {
            console.warn('Tarih dönüştürme hatası:', row.Tarih);
          }
        }
        
        if (normalizedDate === todayStr) {
          const tutar = parseFloat(row.Tutar) || 0;
          console.log('Genel günlük eşleşme bulundu:', { tarih: normalizedDate, tutar, cariKod: row.CariKod });
          return total + tutar;
        }
      }
      return total;
    }, 0);
  };

  const calculateGeneralWeeklyTotal = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return gunlukTahsilat.reduce((total, row) => {
      if (row.Tarih) {
        let rowDate;
        if (row.Tarih.includes('T')) {
          rowDate = new Date(row.Tarih);
        } else if (row.Tarih.includes('-')) {
          rowDate = new Date(row.Tarih + 'T00:00:00');
        } else if (row.Tarih.includes('.')) {
          const parts = row.Tarih.split('.');
          if (parts.length === 3) {
            rowDate = new Date(parts[2], parts[1] - 1, parts[0]);
          }
        } else {
          rowDate = new Date(row.Tarih);
        }
        
        if (!isNaN(rowDate.getTime()) && rowDate >= startOfWeek && rowDate <= endOfWeek) {
          const tutar = parseFloat(row.Tutar) || 0;
          return total + tutar;
        }
      }
      return total;
    }, 0);
  };

  const calculateGeneralMonthlyTotal = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    return gunlukTahsilat.reduce((total, row) => {
      if (row.Tarih) {
        let rowDate;
        if (row.Tarih.includes('T')) {
          rowDate = new Date(row.Tarih);
        } else if (row.Tarih.includes('-')) {
          rowDate = new Date(row.Tarih + 'T00:00:00');
        } else if (row.Tarih.includes('.')) {
          const parts = row.Tarih.split('.');
          if (parts.length === 3) {
            rowDate = new Date(parts[2], parts[1] - 1, parts[0]);
          }
        } else {
          rowDate = new Date(row.Tarih);
        }
        
        if (!isNaN(rowDate.getTime()) && 
            rowDate.getMonth() === currentMonth && 
            rowDate.getFullYear() === currentYear) {
          const tutar = parseFloat(row.Tutar) || 0;
          return total + tutar;
        }
      }
      return total;
    }, 0);
  };

  // Aylık toplam hesaplama (bu ay) - Sadece kullanıcının cari kodları
  const calculateMonthlyTotal = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const userCariCodes = getUserCariCodes();
    
    return gunlukTahsilat.reduce((total, row) => {
      // Sadece kullanıcının cari kodlarına ait kayıtları hesapla
      if (!userCariCodes.includes(row.CariKod)) {
        return total;
      }
      
      if (row.Tarih) {
        // Tarih string'ini Date nesnesine çevir
        let rowDate;
        if (row.Tarih.includes('T')) {
          // ISO format (2025-08-01T00:00:00.000Z)
          rowDate = new Date(row.Tarih);
        } else if (row.Tarih.includes('-')) {
          // YYYY-MM-DD format
          rowDate = new Date(row.Tarih + 'T00:00:00');
        } else if (row.Tarih.includes('.')) {
          // dd.MM.yyyy formatı
          const parts = row.Tarih.split('.');
          if (parts.length === 3) {
            rowDate = new Date(parts[2], parts[1] - 1, parts[0]);
          }
        } else {
          // Diğer formatlar
          rowDate = new Date(row.Tarih);
        }
        
        if (!isNaN(rowDate.getTime()) && 
            rowDate.getMonth() === currentMonth && 
            rowDate.getFullYear() === currentYear) {
          const tutar = parseFloat(row.Tutar) || 0;
          return total + tutar;
        }
      }
      return total;
    }, 0);
  };

  // Mevcut ayın verilerini filtrele
  const filterCurrentMonthData = (data) => {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-based (Ağustos = 7)
    const currentYear = today.getFullYear(); // 2025
    
    console.log('Filtreleme Başlangıç:', {
      currentMonth: currentMonth,
      currentYear: currentYear,
      monthName: today.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
      totalRecords: data.length
    });
    
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
        
        // Debug için ilk 5 kayıt bilgisini logla
        if (data.indexOf(row) < 5) {
          console.log(`Kayıt ${data.indexOf(row) + 1}:`, {
            originalDate: row.Tarih,
            parsedDate: isValidDate ? rowDate.toLocaleDateString('tr-TR') : 'Geçersiz',
            rowMonth: isValidDate ? rowDate.getMonth() : 'N/A',
            rowYear: isValidDate ? rowDate.getFullYear() : 'N/A',
            currentMonth: currentMonth,
            currentYear: currentYear,
            isCurrentMonth,
            isCurrentYear,
            willInclude: isValidDate && isCurrentMonth && isCurrentYear
          });
        }
        
        return isValidDate && isCurrentMonth && isCurrentYear;
      }
      return false;
    });
    
    console.log('Filtreleme Sonuç:', {
      originalCount: data.length,
      filteredCount: filteredData.length,
      sampleDates: data.slice(0, 5).map(r => r.Tarih),
      filteredSampleDates: filteredData.slice(0, 3).map(r => r.Tarih)
    });
    
    return filteredData;
  };

  // Verileri yenileme fonksiyonu
  const refreshData = () => {
    console.log('Veriler yenileniyor...');
    
    // Cari listesi API çağrısı - kullanıcıya özel (SPECODE = username)
    axios.get(`${API_BASE_URL}/clcard?username=${username}`).then(res => {
      // Backend {success: true, data: [...]} formatında döndürüyor
      const clcardsData = res.data.success ? res.data.data : [];
      setClcards(clcardsData);
      console.log('Cari listesi yenilendi:', clcardsData.length, 'kayıt');
    }).catch(err => {
      console.error('Cari listesi yenilenirken hata:', err);
      setClcards([]); // Hata durumunda boş array
    });
    
    // Günlük tahsilat verilerini al - belirtilen plasiyer filtresi ile
    axios.get(`${API_BASE_URL}/gunluk-tahsilat`).then(res => {
      // Backend {success: true, data: [...]} formatında döndürüyor
      const tahsilatData = res.data.success ? res.data.data : [];
      console.log('API\'den gelen yeni ham veri (ilk 3 kayıt):', tahsilatData.slice(0, 3));
      
      // Sadece mevcut ayın verilerini filtrele
      const currentMonthData = filterCurrentMonthData(tahsilatData);
      
      // ID'ye göre azalan sıralama (DESC)
      const sortedData = currentMonthData.sort((a, b) => {
        const idA = parseInt(a.ID) || 0;
        const idB = parseInt(b.ID) || 0;
        return idB - idA; // Azalan sıralama için b - a
      });
      
      setGunlukTahsilat(sortedData);
      setFilteredTahsilat(sortedData); // İlk yüklemede filtresiz göster
      
      console.log('Tahsilat verileri yenilendi ve ID DESC sıralandı:', sortedData.length, 'kayıt');
    }).catch(err => {
      console.error('Günlük tahsilat verileri yenilenirken hata:', err);
      setGunlukTahsilat([]); // Hata durumunda boş array
      setFilteredTahsilat([]);
    });
  };

  // Kullanıcıya özel cari listesini backend'den çek ve tahsilat verilerini al
  React.useEffect(() => {
    refreshData(); // İlk yükleme için mevcut fonksiyonu kullan
  }, [username]);

  // Form submit
  const handleSubmit = (e) => {
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
    
    console.log('Form verileri:', formData);
    
    if (selectedImage) {
      alert(`Tahsilat kaydedildi!\nResim: ${selectedImage.name} (${(selectedImage.size / 1024).toFixed(1)} KB)`);
    } else {
      alert("Tahsilat kaydedildi!");
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
              getOptionLabel={option => `${option.CODE} - ${option.DEFINITION_} (${option.SPECODE})`}
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
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={handleRemoveImage}
                    sx={{ minWidth: 120 }}
                  >
                    🗑️ Kaldır
                  </Button>
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
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 4, tableLayout: 'fixed' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    {Object.keys(gunlukTahsilat[0]).map(col => {
                      // Responsive kolon genişliklerini belirle (yüzde olarak)
                      let width = '8%';
                      if (col === 'CariUnvan') width = '18%';
                      else if (col === 'TahsilatTuru') width = '10%';
                      else if (col === 'BANKAADI') width = '10%';
                      else if (col === 'Tutar') width = '8%';
                      else if (col === 'EklemeTarihi') width = '10%';
                      else if (col === 'CariKod') width = '8%';
                      else if (col === 'EvrakNo') width = '8%';
                      else if (col === 'Bölge') width = '7%';
                      else if (col === 'Plasiyer') width = '8%';
                      else if (col === 'Durum') width = '7%';
                      else if (col === 'Tarih') width = '8%';
                      else if (col === 'ID') width = '5%';
                      
                      return (
                        <th key={col} style={{ 
                          padding: '4px 2px', 
                          borderBottom: '2px solid #1976d2', 
                          background: '#f5f5f5', 
                          color: '#1976d2', 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          width: width,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          <div style={{ marginBottom: '4px' }}>{col}</div>
                          <input
                            type="text"
                            placeholder={`Filtre...`}
                            value={filters[col] || ''}
                            onChange={(e) => handleFilterChange(col, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '2px 3px',
                              fontSize: '10px',
                              border: '1px solid #ddd',
                              borderRadius: '3px',
                              background: '#fff',
                              boxSizing: 'border-box'
                            }}
                          />
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredTahsilat.length === 0 ? (
                    <tr>
                      <td colSpan={Object.keys(gunlukTahsilat[0]).length} style={{ 
                        padding: '20px', 
                        textAlign: 'center', 
                        color: '#666',
                        fontStyle: 'italic',
                        backgroundColor: '#f9f9f9'
                      }}>
                        Filtreleme kriterlerinize uygun kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredTahsilat.map((row, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                        {Object.entries(row).map(([key, val], j) => {
                          // Responsive kolon genişliklerini belirle (yüzde olarak)
                          let width = '8%';
                          if (key === 'CariUnvan') width = '18%';
                          else if (key === 'TahsilatTuru') width = '10%';
                          else if (key === 'BANKAADI') width = '10%';
                          else if (key === 'Tutar') width = '8%';
                          else if (key === 'EklemeTarihi') width = '10%';
                          else if (key === 'CariKod') width = '8%';
                          else if (key === 'EvrakNo') width = '8%';
                          else if (key === 'Bölge') width = '7%';
                          else if (key === 'Plasiyer') width = '8%';
                          else if (key === 'Durum') width = '7%';
                          else if (key === 'Tarih') width = '8%';
                          else if (key === 'ID') width = '5%';
                          
                          return (
                            <td key={j} style={{ 
                              padding: '4px 2px', 
                              borderBottom: '1px solid #eee', 
                              fontSize: '11px',
                              width: width,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              textAlign: key === 'Tutar' ? 'right' : 'left'
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
                        })}
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
                borderTop: '2px solid #1976d2',
                zIndex: 2,
                boxShadow: '0 -2px 4px rgba(0,0,0,0.1)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <tbody>
                    <tr style={{ backgroundColor: '#e3f2fd' }}>
                      {Object.keys(gunlukTahsilat[0]).map((col, index) => {
                        // Responsive kolon genişliklerini belirle (yüzde olarak)
                        let width = '8%';
                        if (col === 'CariUnvan') width = '18%';
                        else if (col === 'TahsilatTuru') width = '10%';
                        else if (col === 'BANKAADI') width = '10%';
                        else if (col === 'Tutar') width = '8%';
                        else if (col === 'EklemeTarihi') width = '10%';
                        else if (col === 'CariKod') width = '8%';
                        else if (col === 'EvrakNo') width = '8%';
                        else if (col === 'Bölge') width = '7%';
                        else if (col === 'Plasiyer') width = '8%';
                        else if (col === 'Durum') width = '7%';
                        else if (col === 'Tarih') width = '8%';
                        else if (col === 'ID') width = '5%';
                        
                        return (
                          <td key={index} style={{ 
                            padding: '6px 2px', 
                            fontSize: '11px',
                            fontWeight: 'bold',
                            textAlign: col === 'Tutar' ? 'right' : 'center',
                            color: '#1976d2',
                            width: width,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            borderBottom: '1px solid #1976d2'
                          }}>
                            {col === 'Tutar' ? formatCurrency(calculateTotal()) : 
                             index === 0 ? 'TOPLAM' : ''}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  Toplam {gunlukTahsilat.length} kayıttan {filteredTahsilat.length} tanesi gösteriliyor
                </Typography>
                {filteredTahsilat.length !== gunlukTahsilat.length && (
                  <Button 
                    size="small" 
                    onClick={() => setFilters({})}
                    sx={{ fontSize: '11px', padding: '2px 8px' }}
                  >
                    Filtreleri Temizle
                  </Button>
                )}
              </Box>
            </>
          )}
        </Box>      </Box>
    </Container>
  );
}

export default App;
