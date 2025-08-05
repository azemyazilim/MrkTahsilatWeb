#!/bin/bash

# MrkTahsilatWeb Hızlı Yeniden Başlatma Komutları
# PuTTY'de tek tek çalıştırılabilir komutlar

echo "🚀 MrkTahsilatWeb Hızlı Yeniden Başlatma Komutları"
echo "=================================================="

# 1. Backend'i hızla yeniden başlat
echo ""
echo "📦 1. Backend Yeniden Başlatma:"
echo "pm2 restart mrktahsilatweb-backend"

# 2. Nginx'i yeniden başlat
echo ""
echo "🌐 2. Nginx Yeniden Başlatma:"
echo "sudo nginx -t && sudo systemctl restart nginx"

# 3. SQL Server'ı yeniden başlat
echo ""
echo "🗄️ 3. SQL Server Yeniden Başlatma:"
echo "sudo systemctl restart mssql-server"

# 4. Tüm servisleri sırayla yeniden başlat
echo ""
echo "🔄 4. Tüm Servisleri Yeniden Başlatma:"
echo "pm2 stop mrktahsilatweb-backend"
echo "sudo systemctl restart mssql-server"
echo "sudo systemctl restart nginx"
echo "sleep 10"
echo "pm2 start /var/www/mrktahsilat/backend/index.js --name mrktahsilatweb-backend"

# 5. Durum kontrol komutları
echo ""
echo "📊 5. Durum Kontrol Komutları:"
echo "pm2 status"
echo "sudo systemctl status nginx"
echo "sudo systemctl status mssql-server"
echo "curl http://localhost:5000/api/health"

# 6. Log kontrol komutları
echo ""
echo "📋 6. Log Kontrol Komutları:"
echo "pm2 logs mrktahsilatweb-backend"
echo "sudo tail -f /var/log/nginx/error.log"
echo "sudo journalctl -u mssql-server -f"

# 7. Acil durum komutları
echo ""
echo "🚨 7. Acil Durum Komutları:"
echo "pm2 kill                           # Tüm PM2 processlerini durdur"
echo "sudo systemctl stop nginx          # Nginx'i durdur"
echo "sudo systemctl stop mssql-server   # SQL Server'ı durdur"
echo "sudo reboot                        # Sunucuyu yeniden başlat"
