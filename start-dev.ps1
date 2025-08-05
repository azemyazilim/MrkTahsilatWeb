Write-Host "🚀 MrkTahsilatWeb Local Development Starting..." -ForegroundColor Green
Write-Host ""

Write-Host "📦 Starting Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm start"

Start-Sleep -Seconds 3

Write-Host "🌐 Starting Frontend..." -ForegroundColor Cyan  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"

Write-Host ""
Write-Host "✅ Development servers started!" -ForegroundColor Green
Write-Host "📡 Backend: http://localhost:5000" -ForegroundColor Yellow
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
