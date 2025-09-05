@echo off
echo Starting GLS Tracking App in Development Mode...
echo ===============================================
echo.

:: Check if installation was completed
if not exist "server\node_modules" (
    echo [ERROR] Server dependencies not found!
    echo Please run install.bat first
    pause
    exit /b 1
)

if not exist "client\node_modules" (
    echo [ERROR] Client dependencies not found!
    echo Please run install.bat first
    pause
    exit /b 1
)

echo [INFO] Starting development server...
echo.
echo Frontend will be available at:
echo   - Local:   http://localhost:3000
echo.
echo Backend API will be available at:
echo   - Local:   http://localhost:3001
echo.
echo Hot reload is enabled for development
echo Press Ctrl+C to stop the server
echo.

:: Start the development server
npm run dev

pause
