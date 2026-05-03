# ============================================================
# SETUP SCRIPT — Panel Web Prysmian
# Ejecutar desde PowerShell: .\setup.ps1
# ============================================================

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  PRYSMIAN PANEL WEB — Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Instalar dependencias
Write-Host "[1/4] Instalando dependencias..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: npm install falló" -ForegroundColor Red; exit 1 }

# 2. Verificar que el archivo de config existe
Write-Host "[2/4] Verificando configuración Firebase..." -ForegroundColor Yellow
if (Test-Path ".\src\config\firebase.js") {
    Write-Host "  OK: src/config/firebase.js encontrado" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Falta src/config/firebase.js" -ForegroundColor Red
    exit 1
}

# 3. Build para web
Write-Host "[3/4] Generando build de producción..." -ForegroundColor Yellow
npx expo export --platform web
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: build falló" -ForegroundColor Red; exit 1 }
Write-Host "  OK: Build generado en ./dist" -ForegroundColor Green

# 4. Instrucciones finales
Write-Host ""
Write-Host "[4/4] Listo." -ForegroundColor Green
Write-Host ""
Write-Host "Para desarrollo local:" -ForegroundColor White
Write-Host "  npx expo start --web" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para subir a Vercel (requiere Git):" -ForegroundColor White
Write-Host "  git add . && git commit -m 'update' && git push" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL producción: https://prysmian-panelweb.vercel.app" -ForegroundColor Green
Write-Host ""
