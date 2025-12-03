# Güvenlik Test Senaryoları
# PowerShell script - Tüm güvenlik özelliklerini test eder

Write-Host "`n🔒 GÜVENLİK TEST SENARYOLARI`n" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

$baseUrl = "http://localhost:5001"

# Test 1: Register endpoint admin-only kontrolü
Write-Host "`n[TEST 1] Register endpoint admin-only kontrolü" -ForegroundColor Yellow
try {
    $body = @{
        email = "test@test.com"
        password = "test123"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body
    Write-Host "❌ BAŞARISIZ: Register endpoint token olmadan çalıştı!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "✅ BAŞARILI: Register endpoint token gerektiriyor (401)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Beklenmeyen hata: $statusCode" -ForegroundColor Yellow
    }
}

# Test 2: Setup-first-admin endpoint (admin zaten var)
Write-Host "`n[TEST 2] Setup-first-admin endpoint (admin zaten var)" -ForegroundColor Yellow
try {
    $body = @{
        email = "newadmin@test.com"
        password = "admin123"
        name = "New Admin"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/setup-first-admin" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body
    Write-Host "❌ BAŞARISIZ: Setup-first-admin admin varken çalıştı!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorMessage = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($statusCode -eq 403 -and $errorMessage.message -like "*zaten oluşturulmuş*") {
        Write-Host "✅ BAŞARILI: Setup-first-admin admin varken çalışmıyor (403)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Beklenmeyen hata: $statusCode - $($errorMessage.message)" -ForegroundColor Yellow
    }
}

# Test 3: Rate limiting - Login endpoint
Write-Host "`n[TEST 3] Rate limiting - Login endpoint (6 deneme)" -ForegroundColor Yellow
$rateLimitHit = $false
for ($i=1; $i -le 6; $i++) {
    try {
        $body = @{
            email = "wrong@test.com"
            password = "wrong123"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
            -Method POST `
            -Headers @{"Content-Type"="application/json"} `
            -Body $body
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($statusCode -eq 429) {
            Write-Host "✅ BAŞARILI: Rate limit devreye girdi (429) - Deneme $i" -ForegroundColor Green
            Write-Host "   Mesaj: $($errorMessage.message)" -ForegroundColor Gray
            $rateLimitHit = $true
            break
        } elseif ($statusCode -eq 400) {
            Write-Host "   Deneme $i : 400 (Normal)" -ForegroundColor Gray
        }
    }
    Start-Sleep -Milliseconds 200
}
if (-not $rateLimitHit) {
    Write-Host "❌ BAŞARISIZ: Rate limit devreye girmedi!" -ForegroundColor Red
}

# Test 4: Input validation - Geçersiz email
Write-Host "`n[TEST 4] Input validation - Geçersiz email" -ForegroundColor Yellow
try {
    $body = @{
        email = "gecersiz-email"
        password = "123456"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body
    Write-Host "❌ BAŞARISIZ: Geçersiz email kabul edildi!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorMessage = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($statusCode -eq 400 -and $errorMessage.errors) {
        Write-Host "✅ BAŞARILI: Geçersiz email reddedildi (400)" -ForegroundColor Green
        Write-Host "   Hata: $($errorMessage.errors[0].message)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Beklenmeyen hata: $statusCode" -ForegroundColor Yellow
    }
}

# Test 5: Input validation - Kısa şifre
Write-Host "`n[TEST 5] Input validation - Kısa şifre" -ForegroundColor Yellow
try {
    $body = @{
        email = "test@test.com"
        password = "123"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body
    Write-Host "❌ BAŞARISIZ: Kısa şifre kabul edildi!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorMessage = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($statusCode -eq 400 -and $errorMessage.errors) {
        Write-Host "✅ BAŞARILI: Kısa şifre reddedildi (400)" -ForegroundColor Green
        Write-Host "   Hata: $($errorMessage.errors[0].message)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Beklenmeyen hata: $statusCode" -ForegroundColor Yellow
    }
}

# Test 6: Helmet.js - Security headers
Write-Host "`n[TEST 6] Helmet.js - Security headers kontrolü" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET
    $headers = $response.Headers
    
    $requiredHeaders = @(
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Content-Security-Policy"
    )
    
    $allPresent = $true
    foreach ($header in $requiredHeaders) {
        if ($headers[$header]) {
            Write-Host "   ✅ $header : $($headers[$header])" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $header : YOK" -ForegroundColor Red
            $allPresent = $false
        }
    }
    
    if ($allPresent) {
        Write-Host "✅ BAŞARILI: Tüm güvenlik header'ları mevcut" -ForegroundColor Green
    } else {
        Write-Host "❌ BAŞARISIZ: Bazı güvenlik header'ları eksik" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ BAŞARISIZ: Health endpoint'e erişilemedi" -ForegroundColor Red
}

# Test 7: JWT Token ve Refresh Token
Write-Host "`n[TEST 7] JWT Token ve Refresh Token" -ForegroundColor Yellow
try {
    # Login
    $loginBody = @{
        email = "admin@pos.com"
        password = "admin123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $loginBody
    
    if ($loginResponse.token -and $loginResponse.refreshToken) {
        Write-Host "✅ BAŞARILI: Access token ve refresh token alındı" -ForegroundColor Green
        Write-Host "   Access Token: $($loginResponse.token.Substring(0, 30))..." -ForegroundColor Gray
        Write-Host "   Refresh Token: $($loginResponse.refreshToken.Substring(0, 30))..." -ForegroundColor Gray
        
        # Refresh token ile yeni access token al
        $body = @{
            refreshToken = $loginResponse.refreshToken
        } | ConvertTo-Json
        
        $refreshResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/refresh" `
            -Method POST `
            -Headers @{"Content-Type"="application/json"} `
            -Body $body
        
        if ($refreshResponse.token) {
            Write-Host "✅ BAŞARILI: Refresh token ile yeni access token alındı" -ForegroundColor Green
        } else {
            Write-Host "❌ BAŞARISIZ: Refresh token çalışmadı" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ BAŞARISIZ: Token'lar alınamadı" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ BAŞARISIZ: Token testi başarısız - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Register endpoint admin token ile
Write-Host "`n[TEST 8] Register endpoint admin token ile" -ForegroundColor Yellow
try {
    # Önce login yap
    $loginBody = @{
        email = "admin@pos.com"
        password = "admin123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $loginBody
    
    $token = $loginResponse.token
    
    # Register endpoint'ini test et
    $registerBody = @{
        email = "newuser@test.com"
        password = "newuser123"
        name = "New User"
        role = "garson"
    } | ConvertTo-Json
    
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" `
        -Method POST `
        -Headers @{
            "Content-Type"="application/json"
            "Authorization"="Bearer $token"
        } `
        -Body $registerBody
    
    if ($registerResponse.user) {
        Write-Host "✅ BAŞARILI: Admin token ile yeni kullanıcı oluşturuldu" -ForegroundColor Green
        Write-Host "   Email: $($registerResponse.user.email)" -ForegroundColor Gray
        Write-Host "   Rol: $($registerResponse.user.role)" -ForegroundColor Gray
    } else {
        Write-Host "❌ BAŞARISIZ: Kullanıcı oluşturulamadı" -ForegroundColor Red
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ BAŞARISIZ: Register testi başarısız ($statusCode)" -ForegroundColor Red
    Write-Host "   Hata: $($_.ErrorDetails.Message)" -ForegroundColor Gray
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "✅ TÜM TESTLER TAMAMLANDI`n" -ForegroundColor Cyan

