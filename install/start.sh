#!/bin/bash

echo "Starting GLS Tracking App in Production Mode..."
echo "============================================="
echo

# Check if installation was completed
if [ ! -d "server/node_modules" ]; then
    echo "[ERROR] Server dependencies not found!"
    echo "Please run ./install.sh first"
    exit 1
fi

if [ ! -d "client/build" ]; then
    echo "[ERROR] Client build not found!"
    echo "Please run ./install.sh first"
    exit 1
fi

echo "[INFO] Starting production server..."
echo
echo "Frontend will be available at:"
echo "  - Local:   http://localhost:3000"
echo "  - Network: http://[YOUR-IP]:3000"
echo
echo "Backend API will be available at:"
echo "  - Local:   http://localhost:3001"
echo "  - Network: http://[YOUR-IP]:3001"
echo
echo "Press Ctrl+C to stop the server"
echo

# Start the production server
npm run production
