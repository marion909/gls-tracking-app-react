# GLS Tracking App - Installation Guide

This directory contains installation and startup scripts for easy deployment of the GLS Tracking App on Windows and Linux systems.

## Files Overview

### Installation Scripts
- `install.bat` - Windows installation script
- `install.sh` - Linux installation script

### Startup Scripts
- `start.bat` / `start.sh` - Production mode startup
- `dev.bat` / `dev.sh` - Development mode startup

## Quick Start

### Windows
1. **Install dependencies and build:**
   ```cmd
   install.bat
   ```

2. **Start in production mode:**
   ```cmd
   start.bat
   ```

3. **Start in development mode:**
   ```cmd
   dev.bat
   ```

### Linux
1. **Make scripts executable:**
   ```bash
   chmod +x install.sh start.sh dev.sh
   ```

2. **Install dependencies and build:**
   ```bash
   ./install.sh
   ```

3. **Start in production mode:**
   ```bash
   ./start.sh
   ```

4. **Start in development mode:**
   ```bash
   ./dev.sh
   ```

## Prerequisites

- **Node.js** (version 14 or higher)
- **npm** (comes with Node.js)

### Installing Node.js

#### Windows
Download from: https://nodejs.org

#### Linux
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm

# CentOS/RHEL
sudo yum install nodejs npm

# Arch Linux
sudo pacman -S nodejs npm
```

## What the Installation Does

1. **Checks prerequisites** (Node.js and npm)
2. **Installs server dependencies** (`server/package.json`)
3. **Installs client dependencies** (`client/package.json`)
4. **Builds the client application** for production
5. **Sets up the database** (Prisma migration)

## Application Access

After starting the application:

### Production Mode
- **Frontend:** http://localhost:3000 or http://YOUR-IP:3000
- **Backend API:** http://localhost:3001 or http://YOUR-IP:3001

### Development Mode
- **Frontend:** http://localhost:3000 (with hot reload)
- **Backend API:** http://localhost:3001

## Troubleshooting

### Common Issues

1. **"Node.js not found"**
   - Install Node.js from https://nodejs.org
   - Restart your terminal/command prompt

2. **"Permission denied" (Linux)**
   - Make scripts executable: `chmod +x *.sh`

3. **"Port already in use"**
   - Stop any running instances of the app
   - Check if other applications are using ports 3000 or 3001

4. **Database errors**
   - Ensure the server directory has write permissions
   - The database file will be created automatically

### Getting Help

If you encounter issues:
1. Check that Node.js version is 14 or higher: `node --version`
2. Ensure npm is working: `npm --version`
3. Check the console output for specific error messages

## Production Deployment

For production deployment on a server:
1. Run the installation script once
2. Use the production startup script
3. Consider using a process manager like PM2 for automatic restarts
4. Configure a reverse proxy (nginx/Apache) for better performance
5. Set up SSL certificates for HTTPS

## Environment Configuration

The application will automatically detect if it's running in development or production mode and configure API endpoints accordingly.
