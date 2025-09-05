#!/bin/bash

echo "Starting GLS Tracking App in Development Mode..."
echo "==============================================="
echo

# Check if installation was completed
if [ ! -d "server/node_modules" ]; then
    echo "[ERROR] Server dependencies not found!"
    echo "Please run ./install.sh first"
    exit 1
fi

if [ ! -d "client/node_modules" ]; then
    echo "[ERROR] Client dependencies not found!"
    echo "Please run ./install.sh first"
    exit 1
fi

echo "[INFO] Starting development server..."
echo
echo "Frontend will be available at:"
echo "  - Local:   http://localhost:3000"
echo
echo "Backend API will be available at:"
echo "  - Local:   http://localhost:3001"
echo
echo "Hot reload is enabled for development"
echo "Press Ctrl+C to stop the server"
echo

# Start the development server
npm run dev
