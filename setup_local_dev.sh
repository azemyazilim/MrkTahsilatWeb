#!/bin/bash

# MrkTahsilatWeb Local Development Kurulum Scripti
# Windows, macOS ve Linux için local development environment

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Header
echo -e "${BLUE}"
echo "================================================================="
echo "          MrkTahsilatWeb Local Development Setup"
echo "          Platform: $(uname -s)"
echo "================================================================="
echo -e "${NC}"

# Proje dizinini belirle
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash)
    PROJECT_DIR="$(pwd)"
    info "Windows ortamı tespit edildi"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    PROJECT_DIR="$(pwd)"
    info "macOS ortamı tespit edildi"
else
    # Linux
    PROJECT_DIR="$(pwd)"
    info "Linux ortamı tespit edildi"
fi

info "Proje dizini: $PROJECT_DIR"

# 1. Node.js ve npm kontrolü
echo ""
log "1/8 Node.js ve npm kontrol ediliyor..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    info "✅ Node.js kurulu - Versiyon: $NODE_VERSION"
    
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        info "✅ npm kurulu - Versiyon: $NPM_VERSION"
    else
        error "❌ npm kurulu değil"
        echo "Node.js ile birlikte npm kurulmalıdır"
        exit 1
    fi
else
    error "❌ Node.js kurulu değil"
    echo ""
    info "Node.js kurulum talimatları:"
    echo "  • Windows: https://nodejs.org/en/download/"
    echo "  • macOS: brew install node"
    echo "  • Linux: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

# 2. Backend dependencies kurulumu
echo ""
log "2/8 Backend dependencies kuruluyor..."

if [ -d "$PROJECT_DIR/backend" ]; then
    cd "$PROJECT_DIR/backend"
    
    if [ -f "package.json" ]; then
        info "Backend package.json bulundu"
        npm install
        info "✅ Backend dependencies kuruldu"
    else
        error "❌ Backend package.json bulunamadı"
        exit 1
    fi
else
    error "❌ Backend dizini bulunamadı"
    exit 1
fi

# 3. Frontend dependencies kurulumu
echo ""
log "3/8 Frontend dependencies kuruluyor..."

if [ -d "$PROJECT_DIR/frontend" ]; then
    cd "$PROJECT_DIR/frontend"
    
    if [ -f "package.json" ]; then
        info "Frontend package.json bulundu"
        npm install
        info "✅ Frontend dependencies kuruldu"
    else
        error "❌ Frontend package.json bulunamadı"
        exit 1
    fi
else
    error "❌ Frontend dizini bulunamadı"
    exit 1
fi

# 4. Local SQL Server alternatifi (SQLite) kurulumu
echo ""
log "4/8 Local veritabanı ayarları..."

cd "$PROJECT_DIR/backend"

# SQLite için backend'i güncelleyelim (geliştirme için)
info "Local development için SQLite kullanılacak"

# Local .env dosyası oluştur
cat > .env.local << 'EOF'
# Local Development Environment
DB_TYPE=sqlite
DB_FILE=./local_database.sqlite

# Alternatif olarak SQL Server kullanmak isterseniz:
# DB_USER=sa
# DB_PASSWORD=LocalDev123!
# DB_SERVER=localhost
# DB_PORT=1433
# DB_DATABASE=MrkTahsilatDB_Local

PORT=5000
NODE_ENV=development

JWT_SECRET=local-dev-jwt-secret-key
SESSION_SECRET=local-dev-session-secret

CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000

LOG_LEVEL=debug
LOG_FILE=./logs/app.log
EOF

info "✅ Local environment dosyası oluşturuldu"

# 5. Local database initialization script oluştur
echo ""
log "5/8 Local database initialization script hazırlanıyor..."

cat > init_local_db.js << 'EOF'
// Local SQLite Database Initialization
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'local_database.sqlite');

// Create database
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS Users (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Username TEXT UNIQUE NOT NULL,
        Password TEXT NOT NULL,
        Role TEXT DEFAULT 'user',
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tahsilat table
    db.run(`CREATE TABLE IF NOT EXISTS Tahsilat (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        MusteriAdi TEXT NOT NULL,
        Tutar REAL NOT NULL,
        TahsilatTarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
        Durum TEXT DEFAULT 'pending',
        Notlar TEXT,
        CreatedBy INTEGER,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (CreatedBy) REFERENCES Users(Id)
    )`);

    // Insert test data
    db.run(`INSERT OR IGNORE INTO Users (Id, Username, Password, Role) 
            VALUES (1, 'admin', 'admin123', 'admin')`);

    db.run(`INSERT OR IGNORE INTO Tahsilat (MusteriAdi, Tutar, Durum, CreatedBy) 
            VALUES ('Test Müşteri', 1000.00, 'completed', 1)`);

    console.log('✅ Local SQLite database initialized');
});

db.close();
EOF

# SQLite package ekle
if ! grep -q "sqlite3" package.json; then
    info "SQLite3 package ekleniyor..."
    npm install sqlite3 --save-dev
fi

# Database'i initialize et
node init_local_db.js

info "✅ Local database hazırlandı"

# 6. Frontend local environment
echo ""
log "6/8 Frontend local environment ayarlanıyor..."

cd "$PROJECT_DIR/frontend"

cat > .env.local << 'EOF'
# Local Development Environment
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
GENERATE_SOURCEMAP=true
FAST_REFRESH=true
EOF

info "✅ Frontend local environment dosyası oluşturuldu"

# 7. Development scripts oluştur
echo ""
log "7/8 Development scripts hazırlanıyor..."

cd "$PROJECT_DIR"

# Backend start script
cat > start_backend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Backend Server..."
cd backend
cp .env.local .env
node index.js
EOF

# Frontend start script
cat > start_frontend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Frontend Development Server..."
cd frontend
npm start
EOF

# Combined start script
cat > start_dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting MrkTahsilatWeb Development Environment..."

# Backend'i background'da başlat
echo "📦 Starting Backend..."
cd backend
cp .env.local .env
node index.js &
BACKEND_PID=$!

# Frontend'i başlat
echo "🎨 Starting Frontend..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Development servers started!"
echo "📦 Backend: http://localhost:5000"
echo "🎨 Frontend: http://localhost:3000"
echo "🗄️ Database: SQLite (local_database.sqlite)"
echo ""
echo "Press Ctrl+C to stop all servers"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

trap cleanup SIGINT

# Wait for processes
wait
EOF

# Windows için batch files
cat > start_backend.bat << 'EOF'
@echo off
echo 🚀 Starting Backend Server...
cd backend
copy .env.local .env
node index.js
pause
EOF

cat > start_frontend.bat << 'EOF'
@echo off
echo 🚀 Starting Frontend Development Server...
cd frontend
npm start
pause
EOF

cat > start_dev.bat << 'EOF'
@echo off
echo 🚀 Starting MrkTahsilatWeb Development Environment...
echo 📦 Starting Backend...
start "Backend" cmd /k "cd backend && copy .env.local .env && node index.js"
timeout /t 3
echo 🎨 Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm start"
echo.
echo ✅ Development servers started!
echo 📦 Backend: http://localhost:5000
echo 🎨 Frontend: http://localhost:3000
echo 🗄️ Database: SQLite (local_database.sqlite)
echo.
echo Press any key to close this window...
pause
EOF

# Make scripts executable
chmod +x start_backend.sh start_frontend.sh start_dev.sh

info "✅ Development scripts hazırlandı"

# 8. Final setup
echo ""
log "8/8 Final setup yapılıyor..."

# Log dizini oluştur
mkdir -p "$PROJECT_DIR/backend/logs"

# .gitignore güncelle
cd "$PROJECT_DIR"
if [ -f ".gitignore" ]; then
    echo "" >> .gitignore
    echo "# Local development files" >> .gitignore
    echo "*.local" >> .gitignore
    echo "local_database.sqlite" >> .gitignore
    echo "backend/logs/" >> .gitignore
    echo "init_local_db.js" >> .gitignore
fi

info "✅ .gitignore güncellendi"

# Özet rapor
echo ""
echo -e "${GREEN}"
echo "================================================================="
echo "          LOCAL DEVELOPMENT SETUP TAMAMLANDI"
echo "================================================================="
echo -e "${NC}"

echo ""
info "🚀 Başlatma Komutları:"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    echo "   • Tümü (Windows): start_dev.bat"
    echo "   • Backend (Windows): start_backend.bat"
    echo "   • Frontend (Windows): start_frontend.bat"
else
    echo "   • Tümü: ./start_dev.sh"
    echo "   • Backend: ./start_backend.sh"
    echo "   • Frontend: ./start_frontend.sh"
fi

echo ""
info "🌐 Local URL'ler:"
echo "   • Frontend: http://localhost:3000"
echo "   • Backend API: http://localhost:5000"
echo "   • Health Check: http://localhost:5000/api/health"

echo ""
info "🗄️ Database:"
echo "   • Type: SQLite"
echo "   • File: backend/local_database.sqlite"
echo "   • Test User: admin / admin123"

echo ""
info "📋 Manuel Başlatma:"
echo "   1. Backend: cd backend && cp .env.local .env && node index.js"
echo "   2. Frontend: cd frontend && npm start"

echo ""
info "🔧 Development Tools:"
echo "   • Backend logs: backend/logs/app.log"
echo "   • Environment: .env.local files"
echo "   • Database viewer: SQLite browser extension"

echo ""
warning "💡 Not:"
echo "   • Frontend otomatik olarak http://localhost:3000'de açılacak"
echo "   • Backend http://localhost:5000'de çalışacak"
echo "   • Database otomatik olarak oluşturuldu"
echo "   • Değişiklikler otomatik olarak yenilenecek"

echo ""
log "🎉 Local development environment hazır!"
