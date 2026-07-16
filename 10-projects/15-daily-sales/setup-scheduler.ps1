# 매일 오전 9시 자동 다운로드 작업 스케줄러 등록
# 실행: 이 파일을 마우스 우클릭 → "PowerShell로 실행"

$TaskName    = "DailySalesDashboard"
$ScriptDir   = $PSScriptRoot
$NodePath    = (Get-Command node -ErrorAction SilentlyContinue).Source
$ScriptPath  = Join-Path $ScriptDir "auto-download.js"

if (-not $NodePath) {
    Write-Error "Node.js를 찾을 수 없습니다. Node.js를 먼저 설치해주세요."
    exit 1
}

# 기존 작업 제거 (있으면)
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# 트리거: 매일 09:00
$trigger = New-ScheduledTaskTrigger -Daily -At "09:00"

# 실행 액션
$action = New-ScheduledTaskAction `
    -Execute $NodePath `
    -Argument "`"$ScriptPath`"" `
    -WorkingDirectory $ScriptDir

# 실행 설정: 사용자 로그인 여부 관계없이 실행
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -RunOnlyIfNetworkAvailable `
    -StartWhenAvailable

# 현재 사용자로 등록
$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName $TaskName `
    -Trigger $trigger `
    -Action $action `
    -Settings $settings `
    -Principal $principal `
    -Description "신세계 CloudPOS 일자별매출 자동 다운로드 + 대시보드 갱신" `
    -Force

Write-Host ""
Write-Host "✅ 작업 스케줄러 등록 완료!" -ForegroundColor Green
Write-Host "   작업명: $TaskName"
Write-Host "   실행시간: 매일 오전 09:00"
Write-Host "   스크립트: $ScriptPath"
Write-Host ""
Write-Host "확인: 작업 스케줄러 앱 → 작업 스케줄러 라이브러리 → '$TaskName'"
Write-Host "수동실행: node `"$ScriptPath`""
