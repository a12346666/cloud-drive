# Cloud Drive API 测试脚本
# 测试所有主要功能

$baseUrl = "http://localhost:3001/api"
$testResults = @()

function Test-Api {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    
    try {
        $uri = "$baseUrl$Endpoint"
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body -and ($Method -eq "POST" -or $Method -eq "PUT" -or $Method -eq "PATCH")) {
            $params.Body = ($Body | ConvertTo-Json)
        }
        
        $response = Invoke-RestMethod @params -ErrorAction Stop
        $result = [PSCustomObject]@{
            Test = $Name
            Status = "PASS"
            Response = ($response | ConvertTo-Json -Compress)
        }
        $script:testResults += $result
        Write-Host "[PASS] $Name" -ForegroundColor Green
        return $response
    }
    catch {
        $result = [PSCustomObject]@{
            Test = $Name
            Status = "FAIL"
            Response = $_.Exception.Message
        }
        $script:testResults += $result
        Write-Host "[FAIL] $Name : $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cloud Drive API Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Health check
Write-Host "Basic Tests:" -ForegroundColor Yellow
Test-Api -Name "Health Check" -Method "GET" -Endpoint "/health"

# 2. Captcha
Test-Api -Name "Get Captcha" -Method "GET" -Endpoint "/auth/captcha"

# 3. Login
Write-Host ""
Write-Host "Auth Tests:" -ForegroundColor Yellow
$loginBody = @{
    email = "2316244587@qq.com"
    password = "1234567890Rt"
    captchaId = "test"
    captchaCode = "1234"
}
$loginResponse = Test-Api -Name "User Login" -Method "POST" -Endpoint "/auth/login" -Body $loginBody

$token = $null
if ($loginResponse -and $loginResponse.data) {
    $token = $loginResponse.data.token
}

$headers = @{}
if ($token) {
    $headers["Authorization"] = "Bearer $token"
}

# 4. Get user info
if ($token) {
    Test-Api -Name "Get User Info" -Method "GET" -Endpoint "/auth/me" -Headers $headers
}

# 5. File tests
Write-Host ""
Write-Host "File Tests:" -ForegroundColor Yellow
if ($token) {
    Test-Api -Name "Get Files" -Method "GET" -Endpoint "/files" -Headers $headers
    Test-Api -Name "Get Storage Stats" -Method "GET" -Endpoint "/files/stats" -Headers $headers
}

# 6. Folder tests
Write-Host ""
Write-Host "Folder Tests:" -ForegroundColor Yellow
if ($token) {
    Test-Api -Name "Get Folders" -Method "GET" -Endpoint "/folders" -Headers $headers
    
    $folderBody = @{
        name = "TestFolder"
    }
    Test-Api -Name "Create Folder" -Method "POST" -Endpoint "/folders" -Headers $headers -Body $folderBody
}

# 7. Share tests
Write-Host ""
Write-Host "Share Tests:" -ForegroundColor Yellow
if ($token) {
    Test-Api -Name "Get Shares" -Method "GET" -Endpoint "/shares" -Headers $headers
}

# 8. Trash tests
Write-Host ""
Write-Host "Trash Tests:" -ForegroundColor Yellow
if ($token) {
    Test-Api -Name "Get Trash" -Method "GET" -Endpoint "/trash" -Headers $headers
}

# 9. Admin tests
Write-Host ""
Write-Host "Admin Tests:" -ForegroundColor Yellow
if ($token) {
    Test-Api -Name "Get Users (Admin)" -Method "GET" -Endpoint "/admin/users" -Headers $headers
    Test-Api -Name "Get System Stats (Admin)" -Method "GET" -Endpoint "/admin/stats" -Headers $headers
}

# Report
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Report" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0
foreach ($result in $testResults) {
    if ($result.Status -eq "PASS") {
        $passed++
    } else {
        $failed++
    }
}

Write-Host "Total: $($testResults.Count) tests" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host ""

foreach ($result in $testResults) {
    $color = if ($result.Status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "$($result.Status): $($result.Test)" -ForegroundColor $color
}

# Save report
$report = @()
$report += "Cloud Drive API Test Report"
$report += "==========================="
$report += "Total: $($testResults.Count) tests"
$report += "Passed: $passed"
$report += "Failed: $failed"
$report += ""
$report += "Details:"
foreach ($result in $testResults) {
    $report += "$($result.Status): $($result.Test)"
    if ($result.Status -eq "FAIL") {
        $report += "  Error: $($result.Response)"
    }
}

$reportPath = "e:\ai工作空间\cloud-drive\test-report.txt"
$report | Out-File -FilePath $reportPath -Encoding UTF8
Write-Host ""
Write-Host "Report saved to: $reportPath" -ForegroundColor Cyan
