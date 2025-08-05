@echo off
title MrkTahsilatWeb Local Development
color 0A

echo.
echo ================================
echo   MrkTahsilatWeb Local Dev
echo ================================
echo.

REM Node.js kontrolü
echo [1/4] Node.js kontrol ediliyor...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js kurulu değil!
    echo.
    echo Node.js kurulumu için: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js hazır

REM Backend hazırlığı
echo.
echo [2/4] Backend hazırlanıyor...
cd backend

REM Dependencies kontrolü
if not exist "node_modules" (
    echo Installing backend dependencies...
    npm install
)

REM Local environment dosyası
echo PORT=5000 > .env.local
echo NODE_ENV=development >> .env.local
echo CORS_ORIGIN=http://localhost:3000 >> .env.local
copy .env.local .env >nul

echo ✅ Backend hazır

REM Frontend hazırlığı
echo.
echo [3/4] Frontend hazırlanıyor...
cd ..\frontend

REM Dependencies kontrolü
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)

REM Local environment dosyası
echo REACT_APP_API_URL=http://localhost:5000/api > .env.local
echo REACT_APP_ENV=development >> .env.local

echo ✅ Frontend hazır

REM Servisleri başlat
echo.
echo [4/4] Servisler başlatılıyor...
cd ..

echo.
echo 📦 Backend başlatılıyor (Port 5000)...
start "Backend Server" cmd /k "cd backend && echo Backend: http://localhost:5000 && node index-local.js"

echo.
echo ⏳ Backend başlatılması bekleniyor...
timeout /t 5 /nobreak >nul

echo.
echo 🎨 Frontend başlatılıyor (Port 3000)...
start "Frontend Server" cmd /k "cd frontend && echo Frontend: http://localhost:3000 && npm start"

echo.
echo ✅ MrkTahsilatWeb Local Development başlatıldı!
echo.
echo 🌐 Erişim URL'leri:
echo    Frontend:     http://localhost:3000
echo    Backend API:  http://localhost:5000
echo    Health Check: http://localhost:5000/api/health
echo.
echo 🔑 Test Kullanıcıları:
echo    admin / admin123  (Yönetici)
echo    user  / user123   (Kullanıcı)
echo.
echo 💡 Not: 
echo    - Frontend otomatik açılacak
echo    - Kod değişiklikleri otomatik yenilenecek
echo    - Serverları kapatmak için pencerelerini kapatın
echo.
pause
