@echo off
echo Starting GLS Tracking App in Production Mode...
echo =============================================
echo.

:: Check if installation was completed
if not exist "server\node_modules" (
    echo [ERROR] Server dependencies not found!
    echo Please run install.bat first
    pause
    exit /b 1
)

if not exist "client\build" (
    echo [ERROR] Client build not found!
    echo Please run install.bat first
    pause
    exit /b 1
)

echo [INFO] Starting production server...
echo.
echo Frontend will be available at:
echo   - Local:   http://localhost:3000
echo   - Network: http://[YOUR-IP]:3000
echo.
echo Backend API will be available at:
echo   - Local:   http://localhost:3001
echo   - Network: http://[YOUR-IP]:3001
echo.
echo Press Ctrl+C to stop the server
echo.

:: Start the production server
npm run production

pause
