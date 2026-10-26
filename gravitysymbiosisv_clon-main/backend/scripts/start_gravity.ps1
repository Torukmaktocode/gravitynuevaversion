#!/usr/bin/env powershell

# ==============================================================================
# SCRIPT DE INICIALIZACIÓN ROBUSTA - GRAVITY SYMBIOSIS
# ==============================================================================

Write-Host "🚀 INICIANDO GRAVITY SYMBIOSIS..." -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor DarkCyan

# Función para cerrar procesos Python previos
function Stop-PythonProcesses {
    Write-Host "🧹 Limpiando procesos Python anteriores..." -ForegroundColor Yellow
    try {
        Get-Process -Name "python*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "✅ Procesos Python cerrados" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ No hay procesos Python activos" -ForegroundColor Yellow
    }
}

# Función para verificar puerto disponible
function Test-PortAvailable {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("127.0.0.1", $Port)
        $connection.Close()
        return $false
    } catch {
        return $true
    }
}

# Función para esperar hasta que un servicio esté disponible
function Wait-ForService {
    param([string]$Url, [string]$ServiceName, [int]$MaxAttempts = 10)
    
    Write-Host "⏳ Esperando que $ServiceName esté disponible..." -ForegroundColor Yellow
    
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            Write-Host "✅ $ServiceName responde correctamente (Status: $($response.StatusCode))" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "   Intento $i/$MaxAttempts..." -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Host "❌ $ServiceName no responde después de $MaxAttempts intentos" -ForegroundColor Red
    return $false
}

# Limpiar procesos anteriores
Stop-PythonProcesses

# Verificar disponibilidad de puertos
Write-Host "🔍 Verificando disponibilidad de puertos..." -ForegroundColor Cyan

if (-not (Test-PortAvailable -Port 5001)) {
    Write-Host "❌ Puerto 5001 ocupado" -ForegroundColor Red
    netstat -ano | findstr ":5001" | ForEach-Object {
        $processId = ($_ -split '\s+')[-1]
        if ($processId -match '^\d+$') {
            Write-Host "   Cerrando proceso $processId en puerto 5001..." -ForegroundColor Yellow
            taskkill /f /pid $processId 2>$null
        }
    }
    Start-Sleep -Seconds 2
}

if (-not (Test-PortAvailable -Port 8000)) {
    Write-Host "❌ Puerto 8000 ocupado" -ForegroundColor Red
    netstat -ano | findstr ":8000" | ForEach-Object {
        $processId = ($_ -split '\s+')[-1]
        if ($processId -match '^\d+$') {
            Write-Host "   Cerrando proceso $processId en puerto 8000..." -ForegroundColor Yellow
            taskkill /f /pid $processId 2>$null
        }
    }
    Start-Sleep -Seconds 2
}

Write-Host "✅ Puertos liberados" -ForegroundColor Green

# Verificar dependencias
Write-Host "🔧 Verificando dependencias..." -ForegroundColor Cyan
try {
    & python -c "import flask; import json; print('✅ Dependencias OK')"
} catch {
    Write-Host "❌ Error en dependencias Python" -ForegroundColor Red
    Write-Host "   Instalando Flask..." -ForegroundColor Yellow
    & python -m pip install flask flask-cors python-dotenv openai
}

Write-Host "🚀 Iniciando servidores..." -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor DarkCyan

# Iniciar Backend Flask (Puerto 5001)
Write-Host "🔧 Iniciando Backend Flask (Puerto 5001)..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    & python -c "
from app import app
print('🚀 Backend Flask iniciado en http://127.0.0.1:5001')
app.run(host='127.0.0.1', port=5001, debug=False, use_reloader=False)
"
}

# Esperar a que el backend esté disponible
Start-Sleep -Seconds 5
if (-not (Wait-ForService -Url "http://127.0.0.1:5001/conocimiento?modulo=el-camino-del-lobo" -ServiceName "Backend Flask")) {
    Write-Host "❌ Error iniciando Backend" -ForegroundColor Red
    Receive-Job $backendJob
    exit 1
}

# Iniciar Frontend HTTP Server (Puerto 8000)
Write-Host "🌐 Iniciando Frontend HTTP Server (Puerto 8000)..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    & python -m http.server 8000 2>&1
}

# Esperar a que el frontend esté disponible
Start-Sleep -Seconds 3
if (-not (Wait-ForService -Url "http://127.0.0.1:8000" -ServiceName "Frontend HTTP Server")) {
    Write-Host "❌ Error iniciando Frontend" -ForegroundColor Red
    Receive-Job $frontendJob
    exit 1
}

Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
Write-Host "🎉 GRAVITY SYMBIOSIS INICIADO CORRECTAMENTE" -ForegroundColor Green
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "📍 URLs de acceso:" -ForegroundColor Cyan
Write-Host "   🌐 Frontend:  http://localhost:8000" -ForegroundColor White
Write-Host "   🔧 Backend:   http://localhost:5001" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Funcionalidades disponibles:" -ForegroundColor Cyan
Write-Host "   • Closer Elite X - Análisis de objeciones" -ForegroundColor White
Write-Host "   • Entrenador de Ventas - 120 conceptos" -ForegroundColor White
Write-Host "   • Zona de Conocimiento - 3 módulos educativos" -ForegroundColor White
Write-Host ""

# Verificación final de servicios
Write-Host "🔍 Verificación final de servicios..." -ForegroundColor Cyan
try {
    $backendTest = Invoke-RestMethod -Uri "http://127.0.0.1:5001/conocimiento?modulo=el-camino-del-lobo" -Method GET
    Write-Host "✅ Backend: $($backendTest.Count) conceptos disponibles" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend: Error en verificación" -ForegroundColor Red
}

try {
    $frontendTest = Invoke-WebRequest -Uri "http://127.0.0.1:8000" -UseBasicParsing -TimeoutSec 3
    Write-Host "✅ Frontend: Status $($frontendTest.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend: Error en verificación" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 Sistema listo para usar!" -ForegroundColor Green
Write-Host "   Presiona Ctrl+C para detener los servidores" -ForegroundColor Yellow
Write-Host ""

# Mantener los trabajos corriendo y mostrar logs
try {
    while ($true) {
        # Verificar si los trabajos siguen activos
        if ($backendJob.State -ne "Running") {
            Write-Host "❌ Backend se ha detenido inesperadamente" -ForegroundColor Red
            Receive-Job $backendJob
            break
        }
        
        if ($frontendJob.State -ne "Running") {
            Write-Host "❌ Frontend se ha detenido inesperadamente" -ForegroundColor Red
            Receive-Job $frontendJob
            break
        }
        
        Start-Sleep -Seconds 5
    }
} catch {
    Write-Host "🛑 Deteniendo servidores..." -ForegroundColor Yellow
} finally {
    # Limpiar trabajos
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    
    Write-Host "🧹 Servidores detenidos" -ForegroundColor Gray
}
