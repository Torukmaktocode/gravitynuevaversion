# Script corregido para iniciar GRAVITY SYMBIOSIS completo
Write-Host "🚀 INICIANDO SISTEMA GRAVITY COMPLETO (CORREGIDO)..." -ForegroundColor Cyan

# Definir rutas absolutas para evitar problemas
$projectRoot = "c:\Users\joseh\OneDrive\Documentos\MIS APP DEMO"
$backendDir = Join-Path $projectRoot "gravity-trainer\backend"

# Matar procesos Python previos para asegurar un inicio limpio
Write-Host "🧹 Limpiando procesos anteriores..."
taskkill /f /im python.exe 2>$null
taskkill /f /im python3.11.exe 2>$null
Start-Sleep -Seconds 1

# Iniciar Backend Entrenador (Puerto 5000)
Write-Host "🤖 Iniciando Backend Entrenador (Puerto 5000) en una nueva ventana..." -ForegroundColor Yellow
Start-Process -FilePath "python" -ArgumentList "app.py" -WorkingDirectory $backendDir

# Iniciar Frontend (Puerto 8000) desde la carpeta raíz
Write-Host "🌐 Iniciando Frontend (Puerto 8000) en una nueva ventana..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "python", "-m", "http.server", "8000" -WorkingDirectory $projectRoot

# Esperar a que los servidores inicien
Write-Host "⏳ Esperando que los servicios se inicien..."
Start-Sleep -Seconds 5

# Verificar que todo esté funcionando
Write-Host "🔍 Verificando servicios..." -ForegroundColor Green

$backendOk = $false
$frontendOk = $false

try {
    $backendResponse = Invoke-WebRequest -Uri "http://127.0.0.1:5000/" -UseBasicParsing -TimeoutSec 5
    if ($backendResponse.StatusCode -eq 200) {
        Write-Host "✅ Backend Entrenador (5000): OPERATIVO" -ForegroundColor Green
        $backendOk = $true
    } else {
        Write-Host "❌ Backend Entrenador (5000): Respondió pero con error." -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Backend Entrenador (5000): NO RESPONDE. Asegúrate de que no hay errores en su consola." -ForegroundColor Red
}

try {
    $frontendResponse = Invoke-WebRequest -Uri "http://127.0.0.1:8000" -UseBasicParsing -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend (8000): OPERATIVO" -ForegroundColor Green
        $frontendOk = $true
    } else {
        Write-Host "❌ Frontend (8000): Respondió pero con error." -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Frontend (8000): NO RESPONDE. Revisa la ventana de su consola (la que se queda abierta)." -ForegroundColor Red
}

Write-Host ""

if ($backendOk -and $frontendOk) {
    Write-Host "🎯 SISTEMA LISTO!" -ForegroundColor Cyan
    Write-Host "🌐 URL Principal: http://127.0.0.1:8000/diagnostico.html" -ForegroundColor White
    Write-Host ""
    Write-Host "Presiona cualquier tecla para abrir la aplicación en el navegador..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

    # Abrir la página de diagnóstico que parece ser la principal
    Start-Process "http://127.0.0.1:8000/diagnostico.html"
} else {
    Write-Host "🔥 ERROR: Uno o más servicios no pudieron iniciarse. Revisa los mensajes de error de arriba." -ForegroundColor Red
    Write-Host "Presiona cualquier tecla para salir..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
