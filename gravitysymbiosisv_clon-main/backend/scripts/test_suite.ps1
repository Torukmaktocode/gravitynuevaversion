# GRAVITY SYMBIOSIS - Suite de Pruebas Completa
# Ejecuta todas las pruebas del sistema

Write-Host "🚀 GRAVITY SYMBIOSIS - SUITE DE PRUEBAS COMPLETA" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Función para colorear resultados
function Write-TestResult($test, $result, $details) {
    if ($result -eq "PASS") {
        Write-Host "✅ $test" -ForegroundColor Green
    } elseif ($result -eq "FAIL") {
        Write-Host "❌ $test" -ForegroundColor Red
    } else {
        Write-Host "⚠️  $test" -ForegroundColor Yellow
    }
    if ($details) {
        Write-Host "   $details" -ForegroundColor Gray
    }
}

Write-Host "`n🔍 1. VERIFICACIÓN DE SERVIDORES" -ForegroundColor Yellow

# Test 1: Verificar servidor frontend
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:8000" -UseBasicParsing -TimeoutSec 5
    if ($frontend.StatusCode -eq 200) {
        Write-TestResult "Servidor Frontend (puerto 8000)" "PASS" "Respuesta HTTP 200"
    } else {
        Write-TestResult "Servidor Frontend (puerto 8000)" "FAIL" "Código: $($frontend.StatusCode)"
    }
} catch {
    Write-TestResult "Servidor Frontend (puerto 8000)" "FAIL" "No responde - $($_.Exception.Message)"
}

# Test 2: Verificar servidor backend
try {
    $backend = Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing -TimeoutSec 5
    Write-TestResult "Servidor Backend (puerto 5000)" "PASS" "Flask respondiendo"
} catch {
    Write-TestResult "Servidor Backend (puerto 5000)" "FAIL" "No responde - $($_.Exception.Message)"
}

Write-Host "`n🧠 2. PRUEBAS DE CLOSER ELITE X (Análisis de Objeciones)" -ForegroundColor Yellow

# Test 3: Análisis de objeción de precio
try {
    $body = @{objecion = "No tengo dinero para esto ahora"} | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:5000/analizar" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
    
    if ($response.tipo_objecion -and $response.arquetipo_cliente) {
        Write-TestResult "Análisis de objeción de precio" "PASS" "Tipo: $($response.tipo_objecion), Arquetipo: $($response.arquetipo_cliente)"
    } else {
        Write-TestResult "Análisis de objeción de precio" "FAIL" "Respuesta incompleta"
    }
} catch {
    Write-TestResult "Análisis de objeción de precio" "FAIL" "Error: $($_.Exception.Message)"
}

# Test 4: Análisis de objeción de tiempo
try {
    $body = @{objecion = "No tengo tiempo para revisar esto"} | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:5000/analizar" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
    
    if ($response.tipo_objecion -eq "Tiempo") {
        Write-TestResult "Análisis de objeción de tiempo" "PASS" "Detectado correctamente como objeción de tiempo"
    } else {
        Write-TestResult "Análisis de objeción de tiempo" "WARN" "Clasificación: $($response.tipo_objecion)"
    }
} catch {
    Write-TestResult "Análisis de objeción de tiempo" "FAIL" "Error: $($_.Exception.Message)"
}

Write-Host "`n📚 3. PRUEBAS DE BASE DE CONOCIMIENTO" -ForegroundColor Yellow

# Test 5: Obtener módulo "El Camino del Lobo"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/conocimiento?modulo=el-camino-del-lobo" -Method GET -TimeoutSec 10
    
    if ($response.nombre -and $response.conceptos.Count -gt 0) {
        Write-TestResult "Módulo 'El Camino del Lobo'" "PASS" "$($response.conceptos.Count) conceptos cargados"
    } else {
        Write-TestResult "Módulo 'El Camino del Lobo'" "FAIL" "Datos incompletos"
    }
} catch {
    Write-TestResult "Módulo 'El Camino del Lobo'" "FAIL" "Error: $($_.Exception.Message)"
}

# Test 6: Obtener módulo "Rompe la Barrera del No"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/conocimiento?modulo=rompe-la-barrera-del-no" -Method GET -TimeoutSec 10
    
    if ($response.nombre -and $response.conceptos.Count -gt 0) {
        Write-TestResult "Módulo 'Rompe la Barrera del No'" "PASS" "$($response.conceptos.Count) conceptos cargados"
    } else {
        Write-TestResult "Módulo 'Rompe la Barrera del No'" "FAIL" "Datos incompletos"
    }
} catch {
    Write-TestResult "Módulo 'Rompe la Barrera del No'" "FAIL" "Error: $($_.Exception.Message)"
}

# Test 7: Verificar manejo de módulo inexistente
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/conocimiento?modulo=inexistente" -Method GET -TimeoutSec 5
    Write-TestResult "Manejo de módulo inexistente" "FAIL" "Debería devolver error 404"
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-TestResult "Manejo de módulo inexistente" "PASS" "Error 404 manejado correctamente"
    } else {
        Write-TestResult "Manejo de módulo inexistente" "WARN" "Error diferente al esperado"
    }
}

Write-Host "`n🎤 4. PRUEBAS DE ENTRENADOR DE VOZ" -ForegroundColor Yellow

# Test 8: Verificar endpoint de entrenamiento
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/entrenar" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 405) {
        Write-TestResult "Endpoint de entrenamiento" "PASS" "Endpoint existe (requiere POST)"
    } else {
        Write-TestResult "Endpoint de entrenamiento" "WARN" "Respuesta inesperada: $($response.StatusCode)"
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 405) {
        Write-TestResult "Endpoint de entrenamiento" "PASS" "Endpoint existe (requiere POST)"
    } else {
        Write-TestResult "Endpoint de entrenamiento" "FAIL" "No responde correctamente"
    }
}

Write-Host "`n🌐 5. PRUEBAS DE INTERFAZ WEB" -ForegroundColor Yellow

# Test 9: Verificar archivos estáticos
$staticFiles = @(
    @{file="style.css"; desc="Hoja de estilos"},
    @{file="script.js"; desc="JavaScript principal"},
    @{file="videos/VIDEO BANNER GRAVITY.mp4"; desc="Video banner"}
)

foreach ($file in $staticFiles) {
    try {
        $url = "http://localhost:8000/$($file.file)"
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-TestResult $file.desc "PASS" "Archivo cargado correctamente"
        } else {
            Write-TestResult $file.desc "FAIL" "Código: $($response.StatusCode)"
        }
    } catch {
        Write-TestResult $file.desc "FAIL" "No encontrado"
    }
}

Write-Host "`n📊 RESUMEN DE PRUEBAS COMPLETADO" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

Write-Host "`n✨ Para probar manualmente la interfaz completa:" -ForegroundColor Green
Write-Host "   🌐 Abrir: http://localhost:8000" -ForegroundColor White
Write-Host "   🧠 Probar CLOSER ELITE con cualquier objeción" -ForegroundColor White
Write-Host "   📚 Probar Base de Conocimiento con los módulos" -ForegroundColor White
Write-Host "   🎤 Probar Entrenador de Voz (requiere micrófono)" -ForegroundColor White

Write-Host "`n🔥 GRAVITY SYMBIOSIS está listo para usar!" -ForegroundColor Magenta
