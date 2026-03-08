# Cloud Drive One-Click Stop Script
# Stops all related processes

$ErrorActionPreference = "SilentlyContinue"

# Color definitions
$Green = "`e[32m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Reset = "`e[0m"

Write-Host "$Green========================================$Reset"
Write-Host "$Green  Cloud Drive Stop Script$Reset"
Write-Host "$Green========================================$Reset"
Write-Host ""

# Stop Node processes
Write-Host "$Yellow Stopping Node.js processes...$Reset"

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
$tsxProcesses = Get-Process -Name "tsx" -ErrorAction SilentlyContinue

$count = 0

if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        try {
            # Check if it's a Cloud Drive related process
            $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId=$($proc.Id)").CommandLine
            if ($cmdLine -match "cloud-drive" -or $cmdLine -match "vite" -or $cmdLine -match "tsx") {
                Stop-Process -Id $proc.Id -Force
                $count++
            }
        } catch {
            # Ignore errors
        }
    }
}

if ($tsxProcesses) {
    foreach ($proc in $tsxProcesses) {
        try {
            Stop-Process -Id $proc.Id -Force
            $count++
        } catch {
            # Ignore errors
        }
    }
}

# Stop PowerShell windows
Write-Host "$Yellow Closing service windows...$Reset"
$powershellProcesses = Get-Process -Name "powershell" -ErrorAction SilentlyContinue
if ($powershellProcesses) {
    foreach ($proc in $powershellProcesses) {
        try {
            $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId=$($proc.Id)").CommandLine
            if ($cmdLine -match "npm run dev" -or $cmdLine -match "cloud-drive") {
                Stop-Process -Id $proc.Id -Force
            }
        } catch {
            # Ignore errors
        }
    }
}

Write-Host ""
Write-Host "$Green========================================$Reset"
if ($count -gt 0) {
    Write-Host "$Green  Stopped $count service process(es)$Reset"
} else {
    Write-Host "$Yellow  No running services found$Reset"
}
Write-Host "$Green========================================$Reset"
Write-Host ""

Start-Sleep -Seconds 2
