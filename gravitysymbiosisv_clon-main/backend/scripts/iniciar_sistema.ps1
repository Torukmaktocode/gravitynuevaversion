# GRAVITY SYMBIOSIS - Script de Inicio Completo
# Ejecuta este archivo en PowerShell: .\iniciar_sistema.ps1

Write-Host "🚀 GRAVITY SYMBIOSIS - Iniciando Sistema Completo" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Yellow

# Paso 1: Cerrar procesos previos
Write-Host "🧹 Cerrando procesos Python previos..." -ForegroundColor Yellow
try {
    Get-Process python* | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Procesos cerrados" -ForegroundColor Green
} catch {
    Write-Host "⚠️ No hay procesos Python ejecutándose" -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

# Paso 2: Iniciar Backend
Write-Host "🔧 Iniciando Backend Flask (Puerto 5000)..." -ForegroundColor Yellow
$backendPath = "c:\Users\joseh\OneDrive\Documentos\MIS APP DEMO\gravity-trainer\backend"
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:backendPath
    python app.py
}

Start-Sleep -Seconds 3

# Paso 3: Iniciar Frontend  
Write-Host "🌐 Iniciando Frontend HTTP (Puerto 8000)..." -ForegroundColor Yellow
$frontendPath = "c:\Users\joseh\OneDrive\Documentos\MIS APP DEMO"
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:frontendPath  
    python -m http.server 8000
}

Start-Sleep -Seconds 3

# Paso 4: Verificar conexiones
Write-Host "🔍 Verificando conexiones..." -ForegroundColor Yellow

try {
    $backendTest = Invoke-WebRequest -Uri "http://127.0.0.1:5000/conocimiento?modulo=el-camino-del-lobo" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend responde: $($backendTest.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend no responde: $_" -ForegroundColor Red
}

try {
    $frontendTest = Invoke-WebRequest -Uri "http://127.0.0.1:8000" -UseBasicParsing -TimeoutSec 5  
    Write-Host "✅ Frontend responde: $($frontendTest.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend no responde: $_" -ForegroundColor Red
}

# Paso 5: Abrir navegador
Write-Host "🚀 Abriendo aplicación..." -ForegroundColor Cyan
Start-Process "http://127.0.0.1:8000"

Write-Host "" 
Write-Host "🎉 SISTEMA INICIADO" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Yellow
Write-Host "📋 URLs importantes:" -ForegroundColor Cyan
Write-Host "   🌐 Aplicación principal: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "   🔧 Test de conexión:     http://127.0.0.1:8000/test_conexion.html" -ForegroundColor White  
Write-Host "   🐍 Backend API:          http://127.0.0.1:5000" -ForegroundColor White
Write-Host ""
Write-Host "⏹️  Para detener: Presiona Ctrl+C" -ForegroundColor Yellow
Write-Host "📝 Jobs ejecutándose: Backend ($($backendJob.Id)), Frontend ($($frontendJob.Id))" -ForegroundColor Gray

# Mantener el script ejecutándose
try {
    Write-Host "⌚ Manteniendo servidores activos... (Ctrl+C para salir)" -ForegroundColor Yellow
    while ($true) {
        Start-Sleep -Seconds 10
        
        # Verificar estado de jobs
        if ($backendJob.State -eq "Failed") {
            Write-Host "❌ Backend falló - Reiniciando..." -ForegroundColor Red
            $backendJob = Start-Job -ScriptBlock {
                Set-Location $using:backendPath
                python app.py
            }
        }
        
        if ($frontendJob.State -eq "Failed") {
            Write-Host "❌ Frontend falló - Reiniciando..." -ForegroundColor Red  
            $frontendJob = Start-Job -ScriptBlock {
                Set-Location $using:frontendPath
                python -m http.server 8000
            }
        }
        
        Write-Host "✅ Sistema funcionando..." -ForegroundColor Green
    }
} finally {
    Write-Host "🛑 Cerrando servidores..." -ForegroundColor Red
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
}
