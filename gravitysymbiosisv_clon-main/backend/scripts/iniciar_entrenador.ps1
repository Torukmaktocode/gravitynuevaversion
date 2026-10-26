# Script para iniciar GRAVITY SYMBIOSIS con Entrenador
Write-Host "🚀 INICIANDO GRAVITY SYMBIOSIS COMPLETO..." -ForegroundColor Cyan

# Matar procesos Python previos
taskkill /f /im python.exe 2>$null
taskkill /f /im python3.11.exe 2>$null
Start-Sleep -Seconds 2

# Cambiar al directorio del proyecto
cd "c:\Users\joseh\OneDrive\Documentos\MIS APP DEMO"



Start-Sleep -Seconds 3

Write-Host "🤖 Iniciando Backend Entrenador (Puerto 5000)..." -ForegroundColor Yellow
Write-Host "--- UNA NUEVA VENTANA DE CONSOLA SE ABRIRÁ PARA ESTE SERVIDOR. NO LA CIERRES. ---" -ForegroundColor Red
Start-Process -FilePath "python" -ArgumentList "app.py" -WorkingDirectory "c:\Users\joseh\OneDrive\Documentos\MIS APP DEMO\gravity-trainer\backend"

Start-Sleep -Seconds 3

Write-Host "🌐 Iniciando Frontend (Puerto 8000)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "python", "-m", "http.server", "8000" -WorkingDirectory "c:\Users\joseh\OneDrive\Documentos\MIS APP DEMO\gravity-trainer\frontend"

Start-Sleep -Seconds 5

# Verificar que todo esté funcionando
Write-Host "🔍 Verificando servicios..." -ForegroundColor Green

try {
    $backend1 = Invoke-WebRequest -Uri "http://127.0.0.1:5001/conocimiento?modulo=el-camino-del-lobo" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend Principal: OPERATIVO" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend Principal: ERROR" -ForegroundColor Red
}

try {
    $backend2 = Invoke-WebRequest -Uri "http://127.0.0.1:5000/" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend Entrenador: OPERATIVO" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend Entrenador: ERROR" -ForegroundColor Red
}

try {
    $frontend = Invoke-WebRequest -Uri "http://127.0.0.1:8000" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Frontend: OPERATIVO" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend: ERROR" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 SISTEMA LISTO!" -ForegroundColor Cyan
Write-Host "🌐 URL: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "🎤 Para entrenar: Ir a Gravity Entrenador y presionar 'Iniciar llamada'" -ForegroundColor White
Write-Host ""
Write-Host "Presiona cualquier tecla para abrir el navegador..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Abrir navegador
Start-Process "http://127.0.0.1:8000"