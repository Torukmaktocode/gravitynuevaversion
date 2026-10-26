#!/usr/bin/env powershell

# SCRIPT DE INICIALIZACION - GRAVITY SYMBIOSIS
Write-Host "INICIANDO GRAVITY SYMBIOSIS..." -ForegroundColor Cyan

# Cerrar procesos Python previos
Write-Host "Limpiando procesos Python anteriores..." -ForegroundColor Yellow
try {
    taskkill /f /im python.exe 2>$null
    taskkill /f /im python3.11.exe 2>$null
} catch {}

Start-Sleep -Seconds 2

# Verificar dependencias
Write-Host "Verificando dependencias..." -ForegroundColor Cyan
try {
    & python -c "import flask; import json; print('Dependencias OK')"
} catch {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    & python -m pip install flask flask-cors python-dotenv openai
}

Write-Host "Iniciando Backend Flask (Puerto 5001)..." -ForegroundColor Yellow

# Crear script temporal para el backend
$backendScript = @"
import sys
import os
sys.path.append('.')
from app import app

if __name__ == '__main__':
    print('Backend Flask iniciado en http://127.0.0.1:5001')
    app.run(host='127.0.0.1', port=5001, debug=False, use_reloader=False)
"@

$backendScript | Out-File -FilePath "temp_backend.py" -Encoding UTF8

# Iniciar backend en proceso separado
$backendProcess = Start-Process -FilePath "python" -ArgumentList "temp_backend.py" -PassThru -WindowStyle Hidden

Write-Host "Esperando que el backend se inicie..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Verificar backend
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:5001/conocimiento?modulo=el-camino-del-lobo" -UseBasicParsing -TimeoutSec 5
    Write-Host "Backend OPERATIVO - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Error en backend: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Iniciando Frontend HTTP Server (Puerto 8000)..." -ForegroundColor Yellow

# Iniciar frontend en proceso separado
$frontendProcess = Start-Process -FilePath "python" -ArgumentList "-m","http.server","8000" -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 3

# Verificar frontend
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000" -UseBasicParsing -TimeoutSec 5
    Write-Host "Frontend OPERATIVO - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Error en frontend: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "GRAVITY SYMBIOSIS INICIADO CORRECTAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "URLs de acceso:" -ForegroundColor Cyan
Write-Host "  Frontend:  http://localhost:8000" -ForegroundColor White
Write-Host "  Backend:   http://localhost:5001" -ForegroundColor White
Write-Host ""

# Verificacion final
Write-Host "Verificacion final de servicios..." -ForegroundColor Cyan
try {
    $backendTest = Invoke-RestMethod -Uri "http://127.0.0.1:5001/conocimiento?modulo=el-camino-del-lobo" -Method GET
    Write-Host "Backend: $($backendTest.Count) conceptos disponibles" -ForegroundColor Green
} catch {
    Write-Host "Backend: Error en verificacion" -ForegroundColor Red
}

try {
    $frontendTest = Invoke-WebRequest -Uri "http://127.0.0.1:8000" -UseBasicParsing -TimeoutSec 3
    Write-Host "Frontend: Status $($frontendTest.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Frontend: Error en verificacion" -ForegroundColor Red
}

Write-Host ""
Write-Host "Sistema listo para usar!" -ForegroundColor Green
Write-Host "Presiona Enter para continuar o Ctrl+C para salir" -ForegroundColor Yellow

# Esperar entrada del usuario
Read-Host

# Limpiar archivo temporal
Remove-Item "temp_backend.py" -ErrorAction SilentlyContinue

Write-Host "Para detener los servidores, cierra las ventanas de Python o usa 'taskkill /f /im python.exe'" -ForegroundColor Yellow
