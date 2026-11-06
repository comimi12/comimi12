# 매일 09:00 무인 자동 업데이트 — 팝업/창 없이 조용히 실행.
# (기존 prompt-update.ps1 = 팝업 확인형. 수동으로 돌리고 싶을 때만 사용하고, 스케줄은 이 파일을 쓴다.)
# 수행: update_all.py (VOC·ECK·네이버 리뷰 → data.js → 공유파일 → 사이트 배포) + export_monthly.py
# 로그: _logs\update_YYYY-MM-DD.log (update_all.py 가 직접 기록) + _logs\silent_YYYY-MM-DD.log (이 래퍼)
$ErrorActionPreference = 'SilentlyContinue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$PY   = "C:\Users\owner\AppData\Local\Programs\Python\Python312\python.exe"
if (-not (Test-Path $PY)) { $PY = "python.exe" }

$logDir = Join-Path $here '_logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$log = Join-Path $logDir ("silent_{0}.log" -f (Get-Date -Format yyyy-MM-dd))

function Write-Log($m) {
    Add-Content -Path $log -Value ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $m) -Encoding utf8
}

function Invoke-Hidden($script) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName         = $PY
    $psi.Arguments        = $script
    $psi.WorkingDirectory = $here
    $psi.UseShellExecute  = $false      # 셸 경유 안 함 → 콘솔 창 안 뜸
    $psi.CreateNoWindow   = $true       # 자식 프로세스 창 숨김
    $p = [System.Diagnostics.Process]::Start($psi)
    $p.WaitForExit()
    return $p.ExitCode
}

Set-Location $here
Write-Log "===== 무인 자동 업데이트 시작 ====="

$rc1 = Invoke-Hidden 'update_all.py'
Write-Log ("update_all.py 종료 (exit {0})" -f $rc1)

$rc2 = Invoke-Hidden 'export_monthly.py'
Write-Log ("export_monthly.py 종료 (exit {0})" -f $rc2)

Write-Log "===== 무인 자동 업데이트 종료 ====="
