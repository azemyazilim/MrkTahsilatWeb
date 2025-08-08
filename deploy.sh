#!/bin/bash

# Deployment script for MrkTahsilatWeb

echo "🚀 Starting deployment to mrktahsilat.com..."

# Frontend build
echo "📦 Building Frontend..."
cd frontend
npm install
npm run build

# Backend setup
echo "🔧 Setting up Backend..."
cd ../backend
npm install

# Create necessary directories on remote server
echo "📁 Creating directories on server..."
ssh root@89.252.179.189 "mkdir -p /var/www/mrktahsilat/{frontend,backend,logs}"

# Copy frontend build
echo "📤 Copying frontend build..."
scp -r frontend/build/* root@89.252.179.189:/var/www/mrktahsilat/frontend/

# Copy backend files
echo "📤 Copying backend files..."
scp -r backend/{*.js,package*.json,.env.production} root@89.252.179.189:/var/www/mrktahsilat/backend/

# Install PM2 if not installed
echo "🔧 Setting up PM2..."
ssh root@89.252.179.189 "npm install -g pm2"

# Install backend dependencies and start server
echo "🚀 Starting backend server..."
ssh root@89.252.179.189 "cd /var/www/mrktahsilat/backend && npm install && pm2 restart ecosystem.config.js --env production"

echo "✅ Deployment completed!"
