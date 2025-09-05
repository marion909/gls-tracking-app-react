#!/bin/bash

echo "GLS Tracking App - Linux Installation"
echo "====================================="
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org"
    echo "Or use your package manager:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  CentOS/RHEL:   sudo yum install nodejs npm"
    echo "  Arch:          sudo pacman -S nodejs npm"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm is not installed!"
    echo "Please install npm along with Node.js"
    exit 1
fi

echo "[INFO] Node.js and npm are installed"
echo

# Install dependencies for server
echo "[STEP 1/4] Installing server dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install server dependencies"
    exit 1
fi

# Install dependencies for client
echo "[STEP 2/4] Installing client dependencies..."
cd ../client
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install client dependencies"
    exit 1
fi

# Build the client application
echo "[STEP 3/4] Building client application..."
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to build client application"
    exit 1
fi

# Setup database
echo "[STEP 4/4] Setting up database..."
cd ../server
npx prisma generate
npx prisma db push
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to setup database"
    exit 1
fi

echo
echo "[SUCCESS] Installation completed successfully!"
echo
echo "To start the application, run:"
echo "  ./start.sh (for production)"
echo "  or"
echo "  ./dev.sh (for development)"
echo
echo "Make sure to make the scripts executable:"
echo "  chmod +x start.sh dev.sh"
echo
