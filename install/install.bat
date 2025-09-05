@echo off
echo GLS Tracking App - Windows Installation
echo =====================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [INFO] Node.js and npm are installed
echo.

:: Install dependencies for server
echo [STEP 1/4] Installing server dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install server dependencies
    pause
    exit /b 1
)

:: Install dependencies for client
echo [STEP 2/4] Installing client dependencies...
cd ..\client
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install client dependencies
    pause
    exit /b 1
)

:: Build the client application
echo [STEP 3/4] Building client application...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build client application
    pause
    exit /b 1
)

:: Setup database
echo [STEP 4/4] Setting up database...
cd ..\server
call npx prisma generate
call npx prisma db push
if %errorlevel% neq 0 (
    echo [ERROR] Failed to setup database
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Installation completed successfully!
echo.
echo To start the application, run:
echo   start.bat (for production)
echo   or
echo   dev.bat (for development)
echo.
pause
