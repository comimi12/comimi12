# 평일 09:00 팝업 확인형 대시보드 업데이트.
# 팝업 "예" → update_all.py + export_monthly.py 실행 후 완료 알림.
# 주말엔 노트북이 꺼져 있어 평일에만 실행(작업 스케줄 Mon-Fri). 켜져 있지 않았으면 로그인 시 보충 실행.
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms | Out-Null
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$PY   = "C:\Users\owner\AppData\Local\Programs\Python\Python312\python.exe"

# 항상 맨 앞에 뜨도록 TopMost 폼을 owner로 사용
$tm = New-Object System.Windows.Forms.Form
$tm.TopMost = $true; $tm.ShowInTaskbar = $false
$tm.StartPosition = 'CenterScreen'; $tm.Size = '0,0'; $tm.Show(); $tm.Hide()

$msg = "오늘 서비스 리뷰 대시보드를 업데이트할까요?`n`n" +
       "· 네이버 리뷰 · 고객의 소리(VOC) · ECK(CS/QSCS) 수집`n" +
       "· data.js 재생성 → 공유사이트 재배포 (약 2분)`n`n" +
       "[예] 지금 업데이트   ·   [아니오] 오늘은 건너뜀"
$res = [System.Windows.Forms.MessageBox]::Show(
    $tm, $msg, "서비스 리뷰 대시보드 — 평일 자동 업데이트",
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Question)

if ($res -eq [System.Windows.Forms.DialogResult]::Yes) {
    Set-Location $here
    & $PY update_all.py
    & $PY export_monthly.py
    [System.Windows.Forms.MessageBox]::Show(
        $tm,
        "업데이트 완료 ✅`n`n공유 사이트:`nhttps://comimi12.github.io/slnc-review-dashboard/`n`n로그: _logs\update_$(Get-Date -Format yyyy-MM-dd).log",
        "서비스 리뷰 대시보드", 'OK', 'Information') | Out-Null
}
$tm.Close()
