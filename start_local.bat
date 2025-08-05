@echo off
echo 🚀 MrkTahsilatWeb Local Development Başlatılıyor...
echo.

REM Node.js kontrolü
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js kurulu değil!
    echo Node.js indirin: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js kurulu
echo.

REM Backend dependencies
echo 📦 Backend dependencies kontrol ediliyor...
if not exist "backend\node_modules" (
    echo Backend dependencies kuruluyor...
    cd backend
    npm install
    cd ..
)

REM Frontend dependencies  
echo 🎨 Frontend dependencies kontrol ediliyor...
if not exist "frontend\node_modules" (
    echo Frontend dependencies kuruluyor...
    cd frontend
    npm install
    cd ..
)

echo.
echo ✅ Dependencies hazır!
echo.

REM Environment dosyaları oluştur
echo ⚙️ Environment dosyaları hazırlanıyor...

REM Backend .env.local
(
echo # Local Development Environment
echo PORT=5000
echo NODE_ENV=development
echo JWT_SECRET=local-dev-jwt-secret-key
echo SESSION_SECRET=local-dev-session-secret
echo CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
echo LOG_LEVEL=debug
) > backend\.env.local

REM Frontend .env.local
(
echo # Local Development Environment
echo REACT_APP_API_URL=http://localhost:5000/api
echo REACT_APP_ENV=development
echo GENERATE_SOURCEMAP=true
echo FAST_REFRESH=true
) > frontend\.env.local

echo ✅ Environment dosyaları oluşturuldu!
echo.

REM Backend'i başlat
echo 📦 Backend başlatılıyor...
start "MrkTahsilat Backend" cmd /k "cd backend && copy .env.local .env && echo Backend Server: http://localhost:5000 && node index.js"

REM Biraz bekle
timeout /t 3 /nobreak > nul

REM Frontend'i başlat
echo 🎨 Frontend başlatılıyor...
start "MrkTahsilat Frontend" cmd /k "cd frontend && echo Frontend Server: http://localhost:3000 && npm start"

echo.
echo ✅ Local development başlatıldı!
echo.
echo 🌐 URL'ler:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo    API:      http://localhost:5000/api/health
echo.
echo 💡 Not: Tarayıcı otomatik açılacak
echo.
pause
