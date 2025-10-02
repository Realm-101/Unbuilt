@echo off
REM Production Deployment Script for Windows
REM This script provides a simple interface to the Node.js deployment script

setlocal enabledelayedexpansion

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm first.
    exit /b 1
)

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

REM Change to project root
cd /d "%PROJECT_ROOT%"

echo ================================
echo 🚀 Production Deployment
echo ================================

REM Check if .env file exists
if not exist ".env" (
    echo [WARN] .env file not found
    echo [INFO] Copying production environment template...
    
    if exist "deployment\production.env.example" (
        copy "deployment\production.env.example" ".env" >nul
        echo [WARN] Please edit .env file with your actual configuration before proceeding
        echo [INFO] Template copied to .env - edit it and run this script again
        exit /b 1
    ) else (
        echo [ERROR] Environment template not found at deployment\production.env.example
        exit /b 1
    )
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    npm ci
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        exit /b 1
    )
)

REM Execute the Node.js deployment script with all arguments
echo [INFO] Starting deployment process...
node "%SCRIPT_DIR%deploy.js" %*

REM Check exit code
if %errorlevel% equ 0 (
    echo ================================
    echo ✅ Deployment Successful
    echo ================================
    echo [INFO] Your application is now running in production mode
    echo [INFO] Check the health endpoint: curl http://localhost:5000/health
) else (
    echo ================================
    echo ❌ Deployment Failed
    echo ================================
    echo [ERROR] Please check the error messages above and fix any issues
    exit /b 1
)

endlocal