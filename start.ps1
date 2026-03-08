# Cloud Drive One-Click Startup Script
# Starts both frontend and backend servers

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"

# Color definitions
$Green = "`e[32m"
$Blue = "`e[34m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Reset = "`e[0m"

Write-Host "$Green========================================$Reset"
Write-Host "$Green  Cloud Drive Startup Script$Reset"
Write-Host "$Green========================================$Reset"
Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Start backend
function Start-Backend {
    Write-Host "$Blue[1/2] Starting backend server...$Reset"
    
    Set-Location "$ScriptDir\backend"
    
    # Check node_modules
    if (-not (Test-Path "node_modules")) {
        Write-Host "$Yellow   Installing backend dependencies...$Reset"
        npm install
    }
    
    # Check database
    if (-not (Test-Path "prisma\dev.db")) {
        Write-Host "$Yellow   Initializing database...$Reset"
        npx prisma migrate dev --name init
        npx tsx prisma/seed.ts
    }
    
    # Start backend
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\backend'; npm run dev" -WindowStyle Normal
    
    Write-Host "$Green   Backend server started: http://localhost:3001$Reset"
    Start-Sleep -Seconds 2
}

# Start frontend
function Start-Frontend {
    Write-Host "$Blue[2/2] Starting frontend server...$Reset"
    
    Set-Location "$ScriptDir\frontend"
    
    # Check node_modules
    if (-not (Test-Path "node_modules")) {
        Write-Host "$Yellow   Installing frontend dependencies...$Reset"
        npm install
    }
    
    # Start frontend
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\frontend'; npm run dev" -WindowStyle Normal
    
    Write-Host "$Green   Frontend server started: http://localhost:5173$Reset"
}

# Launch based on parameters
try {
    if ($BackendOnly) {
        Start-Backend
    } elseif ($FrontendOnly) {
        Start-Frontend
    } else {
        Start-Backend
        Start-Frontend
    }
    
    Write-Host ""
    Write-Host "$Green========================================$Reset"
    Write-Host "$Green  All services started!$Reset"
    Write-Host "$Green========================================$Reset"
    Write-Host ""
    Write-Host "Access URLs:"
    if (-not $BackendOnly) {
        Write-Host "  Frontend: $Blue http://localhost:5173 $Reset"
    }
    if (-not $FrontendOnly) {
        Write-Host "  Backend: $Blue http://localhost:3001 $Reset"
        Write-Host "  API Docs: $Blue http://localhost:3001/api/health $Reset"
    }
    Write-Host ""
    Write-Host "Default Accounts:"
    Write-Host "  Admin: $Yellow admin / admin123 $Reset"
    Write-Host "  Test User: $Yellow testuser / user123 $Reset"
    Write-Host ""
    Write-Host "Press Ctrl+C to stop services"
} catch {
    Write-Host "$Red Error: $_$Reset" -ForegroundColor Red
    Read-Host "Press Enter to exit"
}
