# MusicDS C++ Backend — Setup Script
# Run this once from the backend/ directory to download required single-header libraries

Write-Host "[MusicDS] Downloading cpp-httplib..." -ForegroundColor Cyan
Invoke-WebRequest `
    -Uri "https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h" `
    -OutFile "httplib.h"

Write-Host "[MusicDS] Downloading nlohmann/json..." -ForegroundColor Cyan
Invoke-WebRequest `
    -Uri "https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp" `
    -OutFile "json.hpp"

Write-Host "[MusicDS] Creating build directory..." -ForegroundColor Cyan
if (-not (Test-Path "build")) { New-Item -ItemType Directory -Name "build" | Out-Null }

Write-Host "[MusicDS] Running CMake configure..." -ForegroundColor Cyan
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release

Write-Host "[MusicDS] Building..." -ForegroundColor Cyan
cmake --build build --config Release

Write-Host ""
Write-Host "[MusicDS] Build complete!" -ForegroundColor Green
Write-Host "To start the backend server, run:" -ForegroundColor Yellow
Write-Host "  .\build\Release\musicds-backend.exe" -ForegroundColor White
Write-Host "  (or .\build\musicds-backend.exe on MinGW)" -ForegroundColor White
