param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
try {
    $taskNode = (Get-Command node -ErrorAction Stop).Source
    $taskPort = 8123
    $taskReuse = $false
    while ($taskPort -lt 8140) {
        try {
            $taskResponse = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$taskPort/cp-designer_with%20constraints.html" -TimeoutSec 1
            if ($taskResponse.Headers['X-Origami-Project'] -eq [Uri]::EscapeDataString($taskRoot)) { $taskReuse = $true; break }
        } catch {}
        $taskSocket = [Net.Sockets.TcpClient]::new()
        try { $taskSocket.Connect('127.0.0.1', $taskPort); $taskOccupied = $true } catch { $taskOccupied = $false } finally { $taskSocket.Dispose() }
        if (-not $taskOccupied) { break }
        $taskPort++
    }
    if ($taskPort -ge 8140) { throw 'Ports 8123-8139 are busy. Run: node tools/serve.mjs 8140' }
    if (-not $taskReuse) {
        Start-Process -FilePath $taskNode -ArgumentList @('tools/serve.mjs', [string]$taskPort) -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $env:TEMP "origami-$taskPort.log") -RedirectStandardError (Join-Path $env:TEMP "origami-$taskPort-error.log")
    }
    $taskReady = $false
    for ($taskAttempt = 0; $taskAttempt -lt 30; $taskAttempt++) {
        try { $taskResponse = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$taskPort/cp-designer_with%20constraints.html" -TimeoutSec 1; if ($taskResponse.StatusCode -eq 200) { $taskReady = $true; break } } catch {}
        Start-Sleep -Milliseconds 200
    }
    if (-not $taskReady) { throw "Server startup failed. See TEMP/origami-$taskPort-error.log" }
    Write-Output "http://127.0.0.1:$taskPort/cp-designer_with%20constraints.html"
    if (-not $NoBrowser) { Start-Process "http://127.0.0.1:$taskPort/cp-designer_with%20constraints.html" }
} catch {
    Write-Host "Unable to start Origami: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Node.js is required. Alternatively run: node tools/serve.mjs 8123'
    exit 1
}
