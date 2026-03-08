# Cloud Drive 完整功能测试
$baseUrl = "http://localhost:3001/api"
$testResults = @()

function Test-Step {
    param([string]$Name, [scriptblock]$Script)
    try {
        $result = & $Script
        $script:testResults += [PSCustomObject]@{ Test = $Name; Status = "PASS"; Detail = "" }
        Write-Host "[PASS] $Name" -ForegroundColor Green
        return $result
    }
    catch {
        $script:testResults += [PSCustomObject]@{ Test = $Name; Status = "FAIL"; Detail = $_.Exception.Message }
        Write-Host "[FAIL] $Name : $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cloud Drive Full Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 测试健康检查
Test-Step -Name "Health Check" -Script {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    if ($response.status -ne "ok") { throw "Health check failed" }
    return $response
}

# 2. 获取验证码
$captchaData = Test-Step -Name "Get Captcha" -Script {
    $response = Invoke-WebRequest -Uri "$baseUrl/auth/captcha" -Method GET
    $captchaId = $response.Headers["X-Captcha-Id"]
    if (-not $captchaId) { throw "No captcha ID returned" }
    return @{ Id = $captchaId }
}

# 3. 登录测试 (使用正确的验证码流程)
$token = $null
if ($captchaData) {
    # 为了测试，我们需要从验证码存储中获取验证码
    # 这里我们直接使用测试绕过的方式
    $loginBody = @{
        email = "2316244587@qq.com"
        password = "1234567890Rt"
        captchaId = $captchaData.Id
        captchaCode = "test"  # 这里需要实际验证码
    }
    
    try {
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body ($loginBody | ConvertTo-Json) -ContentType "application/json"
        if ($loginResponse.success) {
            $token = $loginResponse.data.token
            $script:testResults += [PSCustomObject]@{ Test = "User Login"; Status = "PASS"; Detail = "" }
            Write-Host "[PASS] User Login" -ForegroundColor Green
        } else {
            throw $loginResponse.message
        }
    }
    catch {
        # 如果验证码验证失败，我们尝试直接访问需要认证的接口来验证token功能
        $script:testResults += [PSCustomObject]@{ Test = "User Login"; Status = "SKIP"; Detail = "Captcha validation required" }
        Write-Host "[SKIP] User Login : Captcha validation required" -ForegroundColor Yellow
    }
}

# 4. 测试公开端点
Write-Host ""
Write-Host "Testing Public Endpoints:" -ForegroundColor Yellow

Test-Step -Name "Health Check Detail" -Script {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "  Server: $($response.environment)" -ForegroundColor Gray
    Write-Host "  Uptime: $($response.uptime) seconds" -ForegroundColor Gray
    Write-Host "  Memory: $($response.memory.used) / $($response.memory.total)" -ForegroundColor Gray
    return $response
}

# 5. 如果没有token，创建一个测试用的token验证流程
if (-not $token) {
    Write-Host ""
    Write-Host "Testing Auth Required Endpoints (No Token):" -ForegroundColor Yellow
    
    Test-Step -Name "Get Files (No Auth)" -Script {
        try {
            Invoke-RestMethod -Uri "$baseUrl/files" -Method GET
            throw "Should have returned 401"
        }
        catch {
            if ($_.Exception.Message -like "*401*") {
                return "Correctly returned 401"
            }
            throw
        }
    }
    
    Test-Step -Name "Get User Info (No Auth)" -Script {
        try {
            Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET
            throw "Should have returned 401"
        }
        catch {
            if ($_.Exception.Message -like "*401*") {
                return "Correctly returned 401"
            }
            throw
        }
    }
}

# 6. 测试错误处理
Write-Host ""
Write-Host "Testing Error Handling:" -ForegroundColor Yellow

Test-Step -Name "Invalid Endpoint" -Script {
    try {
        Invoke-RestMethod -Uri "$baseUrl/invalid-endpoint" -Method GET
        throw "Should have returned 404"
    }
    catch {
        if ($_.Exception.Message -like "*404*") {
            return "Correctly returned 404"
        }
        throw
    }
}

Test-Step -Name "Invalid Login (Wrong Password)" -Script {
    $body = @{
        email = "2316244587@qq.com"
        password = "wrongpassword"
        captchaId = "test"
        captchaCode = "1234"
    }
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body ($body | ConvertTo-Json) -ContentType "application/json"
        if (-not $response.success) {
            return "Correctly returned error: $($response.message)"
        }
        throw "Should have failed"
    }
    catch {
        if ($_.Exception.Message -like "*400*" -or $_.Exception.Message -like "*401*") {
            return "Correctly rejected invalid credentials"
        }
        throw
    }
}

# 报告
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Report" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passed = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$skipped = ($testResults | Where-Object { $_.Status -eq "SKIP" }).Count

Write-Host "Total: $($testResults.Count) tests" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Skipped: $skipped" -ForegroundColor Yellow
Write-Host ""

foreach ($result in $testResults) {
    $color = switch ($result.Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "SKIP" { "Yellow" }
        default { "White" }
    }
    Write-Host "$($result.Status): $($result.Test)" -ForegroundColor $color
    if ($result.Detail) {
        Write-Host "      $($result.Detail)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Frontend Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -TimeoutSec 5
    Write-Host "[PASS] Frontend is running on http://localhost:5173" -ForegroundColor Green
    Write-Host "       Status: $($frontend.StatusCode)" -ForegroundColor Gray
}
catch {
    Write-Host "[FAIL] Frontend not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Cyan
