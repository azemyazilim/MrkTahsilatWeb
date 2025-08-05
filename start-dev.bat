@echo off
echo 🚀 MrkTahsilatWeb Local Development Starting...
echo.

echo 📦 Starting Backend...
start "Backend Server" cmd /k "cd backend & npm start"

timeout /t 3 /nobreak > nul

echo 🌐 Starting Frontend...
start "Frontend Dev Server" cmd /k "cd frontend & npm start"

echo.
echo ✅ Development servers started!
echo 📡 Backend: http://localhost:5000
echo 🌐 Frontend: http://localhost:3000
echo.
pause
