import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Chip
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import API_BASE_URL from './api';

// Chart.js kayıt
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

function Dashboard({ username, onBack }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    plasiyer: 'all'
  });

  // Plasiyer listesi
  const plasiyerList = [
    { value: 'all', label: 'Tüm Plasiyerler' },
    { value: 'EYÜP', label: 'EYÜP' },
    { value: 'ALİ', label: 'ALİ' },
    { value: 'YİĞİT', label: 'YİĞİT' },
    { value: 'AZİZ', label: 'AZİZ' },
    { value: 'GÖRKEM', label: 'GÖRKEM' },
    { value: 'ATAKAN', label: 'ATAKAN' },
    { value: 'SÜLEYMAN', label: 'SÜLEYMAN' },
    { value: 'HASAN', label: 'HASAN' }
  ];

  // Para formatı
  const formatCurrency = (value) => {
    if (!value || isNaN(value)) return "0,00 TL";
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(parseFloat(value));
  };

  // Sayı formatı
  const formatNumber = (value) => {
    if (!value || isNaN(value)) return "0";
    return new Intl.NumberFormat('tr-TR').format(parseInt(value));
  };

  // Dashboard verilerini yükle
  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.plasiyer !== 'all') params.append('plasiyer', filters.plasiyer);

      const response = await axios.get(`${API_BASE_URL}/dashboard?${params.toString()}`);
      
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Dashboard verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // İlk yükleme ve filtre değişikliklerinde veri yükle
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filtre uygula
  const handleApplyFilters = () => {
    loadDashboardData();
  };

  // Filtre temizle
  const handleClearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      plasiyer: 'all'
    });
    // Filtreler temizlendikten sonra veriyi yeniden yükle
    setTimeout(() => {
      loadDashboardData();
    }, 100);
  };

  // Chart renkleri
  const chartColors = {
    primary: '#1976d2',
    secondary: '#dc004e',
    success: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3',
    error: '#f44336',
    purple: '#9c27b0',
    teal: '#009688',
    indigo: '#3f51b5',
    pink: '#e91e63'
  };

  // Günlük trend grafiği
  const dailyTrendChart = dashboardData ? {
    labels: dashboardData.charts.dailyTrend.map(d => {
      const date = new Date(d.Tarih);
      return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
    }),
    datasets: [
      {
        label: 'Günlük Tahsilat (TL)',
        data: dashboardData.charts.dailyTrend.map(d => parseFloat(d.ToplamTutar) || 0),
        borderColor: chartColors.primary,
        backgroundColor: chartColors.primary + '20',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: chartColors.primary,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      },
      {
        label: 'İşlem Sayısı',
        data: dashboardData.charts.dailyTrend.map(d => parseInt(d.IslemSayisi) || 0),
        borderColor: chartColors.success,
        backgroundColor: chartColors.success + '20',
        fill: false,
        tension: 0.4,
        yAxisID: 'y1',
        pointBackgroundColor: chartColors.success,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      }
    ]
  } : null;

  // Plasiyer performans grafiği
  const plasiyerPerformanceChart = dashboardData ? {
    labels: dashboardData.charts.plasiyerPerformance.map(p => p.Plasiyer),
    datasets: [
      {
        label: 'Toplam Tahsilat (TL)',
        data: dashboardData.charts.plasiyerPerformance.map(p => parseFloat(p.ToplamTutar) || 0),
        backgroundColor: [
          chartColors.primary,
          chartColors.success,
          chartColors.warning,
          chartColors.error,
          chartColors.purple,
          chartColors.teal,
          chartColors.indigo,
          chartColors.pink
        ],
        borderColor: '#fff',
        borderWidth: 2
      }
    ]
  } : null;

  // Ödeme yöntemi dağılımı
  const paymentMethodChart = dashboardData ? {
    labels: dashboardData.charts.paymentMethods.map(p => p.TahsilatTuru),
    datasets: [
      {
        data: dashboardData.charts.paymentMethods.map(p => parseFloat(p.ToplamTutar) || 0),
        backgroundColor: [
          chartColors.primary,
          chartColors.success,
          chartColors.warning,
          chartColors.error,
          chartColors.purple,
          chartColors.teal
        ],
        borderColor: '#fff',
        borderWidth: 3
      }
    ]
  } : null;

  // Chart seçenekleri
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '600'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: chartColors.primary,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            if (context.dataset.label.includes('TL')) {
              return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
            }
            return context.dataset.label + ': ' + formatNumber(context.parsed.y);
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.1)'
        },
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value) {
            return formatNumber(value);
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(0,0,0,0.1)'
        }
      }
    }
  };

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.1)'
        },
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(0,0,0,0.1)'
        }
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '600'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: chartColors.primary,
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return context.label + ': ' + formatCurrency(context.parsed) + ' (' + percentage + '%)';
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>Dashboard yükleniyor...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={loadDashboardData}>
            Tekrar Dene
          </Button>
          <Button variant="outlined" onClick={onBack} sx={{ ml: 2 }}>
            Geri Dön
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ color: chartColors.primary, fontWeight: 700 }}>
            📊 Dashboard & Analitik
          </Typography>
          <Button variant="outlined" onClick={onBack}>
            ← Geri Dön
          </Button>
        </Box>

        {/* Filtreler */}
        <Paper sx={{ p: 3, mb: 4, bgcolor: '#f8fafc' }}>
          <Typography variant="h6" sx={{ mb: 2, color: chartColors.primary }}>
            🔍 Filtreler
          </Typography>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Başlangıç Tarihi"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Bitiş Tarihi"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                label="Plasiyer"
                value={filters.plasiyer}
                onChange={(e) => setFilters(prev => ({ ...prev, plasiyer: e.target.value }))}
                fullWidth
                size="small"
              >
                {plasiyerList.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="contained" 
                  onClick={handleApplyFilters}
                  size="small"
                  sx={{ minWidth: 100 }}
                >
                  Uygula
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={handleClearFilters}
                  size="small"
                  sx={{ minWidth: 100 }}
                >
                  Temizle
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Özet Kartları */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: '#fff' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>💰 Toplam Tahsilat</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {formatCurrency(dashboardData?.summary?.totalAmount)}
                </Typography>
                <Chip 
                  label={`${dashboardData?.summary?.dateRange?.start || 'Tüm zamanlar'} - ${dashboardData?.summary?.dateRange?.end || 'Bugün'}`}
                  size="small"
                  sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)', color: '#fff' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>📋 Toplam İşlem</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {formatNumber(dashboardData?.summary?.totalTransactions)}
                </Typography>
                <Chip 
                  label="İşlem Sayısı"
                  size="small"
                  sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', color: '#fff' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>📊 Ortalama İşlem</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {formatCurrency(dashboardData?.summary?.avgTransactionAmount)}
                </Typography>
                <Chip 
                  label="İşlem Başına"
                  size="small"
                  sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)', color: '#fff' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>👥 Aktif Plasiyer</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {formatNumber(dashboardData?.summary?.activePlasiyerCount)}
                </Typography>
                <Chip 
                  label="Plasiyer Sayısı"
                  size="small"
                  sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Grafikler */}
        <Grid container spacing={3}>
          
          {/* Günlük Trend */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" sx={{ mb: 2, color: chartColors.primary }}>
                📈 Günlük Tahsilat Trendi (Son 30 Gün)
              </Typography>
              <Box sx={{ height: 320 }}>
                {dailyTrendChart && (
                  <Line data={dailyTrendChart} options={chartOptions} />
                )}
              </Box>
            </Card>
          </Grid>

          {/* Ödeme Yöntemi Dağılımı */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" sx={{ mb: 2, color: chartColors.primary }}>
                💳 Ödeme Yöntemi Dağılımı
              </Typography>
              <Box sx={{ height: 320 }}>
                {paymentMethodChart && (
                  <Doughnut data={paymentMethodChart} options={pieChartOptions} />
                )}
              </Box>
            </Card>
          </Grid>

          {/* Plasiyer Performansı */}
          <Grid item xs={12}>
            <Card sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" sx={{ mb: 2, color: chartColors.primary }}>
                👥 Plasiyer Performans Karşılaştırması
              </Typography>
              <Box sx={{ height: 320 }}>
                {plasiyerPerformanceChart && (
                  <Bar data={plasiyerPerformanceChart} options={barChartOptions} />
                )}
              </Box>
            </Card>
          </Grid>

          {/* En İyi Müşteriler */}
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, color: chartColors.primary }}>
                🏆 En İyi Müşteriler (Top 10)
              </Typography>
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {dashboardData?.charts?.topCustomers?.map((customer, index) => (
                  <Box key={index} sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    p: 2,
                    mb: 1,
                    bgcolor: index % 2 === 0 ? '#f9f9f9' : '#fff',
                    borderRadius: 1,
                    border: '1px solid #eee'
                  }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {customer.CariUnvan}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {customer.CariKod} • {formatNumber(customer.IslemSayisi)} işlem
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ color: chartColors.success, fontWeight: 600 }}>
                      {formatCurrency(customer.ToplamTutar)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Card>
          </Grid>

          {/* Haftalık Performans */}
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, color: chartColors.primary }}>
                📅 Haftalık Performans (Son 12 Hafta)
              </Typography>
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {dashboardData?.charts?.weeklyPerformance?.map((week, index) => (
                  <Box key={index} sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    p: 2,
                    mb: 1,
                    bgcolor: index % 2 === 0 ? '#f9f9f9' : '#fff',
                    borderRadius: 1,
                    border: '1px solid #eee'
                  }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {week.Yil} - Hafta {week.Hafta}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatNumber(week.IslemSayisi)} işlem
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ color: chartColors.warning, fontWeight: 600 }}>
                      {formatCurrency(week.ToplamTutar)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Card>
          </Grid>

        </Grid>

        {/* Footer */}
        <Box sx={{ mt: 4, p: 3, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            📊 Dashboard son güncelleme: {new Date().toLocaleString('tr-TR')} • 
            Veriler gerçek zamanlı olarak güncellenmektedir
          </Typography>
        </Box>

      </Box>
    </Container>
  );
}

export default Dashboard;
