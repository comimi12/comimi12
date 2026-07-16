# 평일 09:00 팝업 확인형 대시보드 업데이트.
# 팝업 "예" → 진행률 창 1개(숨김 실행)로 update_all.py + export_monthly.py 진행 후 완료 알림.
# 주말엔 노트북이 꺼져 있어 평일에만 실행(작업 스케줄 Mon-Fri). 켜져 있지 않았으면 로그인 시 보충 실행.
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms | Out-Null
Add-Type -AssemblyName System.Drawing | Out-Null
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

    # ── 진행률 창 1개 (숨김 실행, 단계 표시) ────────────────────────────
    $pf = New-Object System.Windows.Forms.Form
    $pf.Text = "서비스 리뷰 대시보드 — 업데이트 진행 중"
    $pf.Size = New-Object System.Drawing.Size(470, 180)
    $pf.StartPosition = 'CenterScreen'; $pf.TopMost = $true
    $pf.FormBorderStyle = 'FixedDialog'; $pf.MaximizeBox = $false; $pf.MinimizeBox = $false
    $pf.ControlBox = $false

    $lbl = New-Object System.Windows.Forms.Label
    $lbl.Location = New-Object System.Drawing.Point(20, 22)
    $lbl.Size = New-Object System.Drawing.Size(430, 44)
    $lbl.Font = New-Object System.Drawing.Font("맑은 고딕", 10)
    $lbl.Text = "시작하는 중…"

    $bar = New-Object System.Windows.Forms.ProgressBar
    $bar.Location = New-Object System.Drawing.Point(20, 78)
    $bar.Size = New-Object System.Drawing.Size(430, 22)
    $bar.Style = 'Marquee'; $bar.MarqueeAnimationSpeed = 30

    $sub = New-Object System.Windows.Forms.Label
    $sub.Location = New-Object System.Drawing.Point(20, 110)
    $sub.Size = New-Object System.Drawing.Size(430, 22)
    $sub.ForeColor = [System.Drawing.Color]::Gray
    $sub.Text = "이 창은 자동으로 닫힙니다. 닫지 말고 기다려 주세요 (약 2분)."

    $pf.Controls.AddRange(@($lbl, $bar, $sub))
    $pf.Show(); $pf.Refresh()

    # 로그의 "▶ 단계명:" 을 사람이 읽기 좋은 문구로
    $stepText = @{
        'VOC 수집'        = '① 고객의 소리(VOC) 수집 중…'
        'ECK 수집'        = '② ECK CS/QSCS 다운로드 중…'
        'ECK 집계'        = '③ ECK 데이터 집계 중…'
        '리뷰 수집'       = '④ 네이버 리뷰 수집 중… (가장 오래 걸려요)'
        'build (data.js)' = '⑤ 대시보드 데이터 생성 중…'
        '공유파일'        = '⑥ 공유 파일 생성 중…'
        '사이트 배포'     = '⑦ 공유 사이트 배포 중…'
    }

    $log = Join-Path $here ("_logs\update_{0}.log" -f (Get-Date -Format yyyy-MM-dd))
    $startLen = 0
    if (Test-Path $log) { $startLen = (Get-Item $log).Length }

    # update_all.py 를 창 없이 실행
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $PY; $psi.Arguments = "update_all.py"
    $psi.WorkingDirectory = $here
    $psi.UseShellExecute = $false; $psi.CreateNoWindow = $true
    $p = [System.Diagnostics.Process]::Start($psi)

    while (-not $p.HasExited) {
        Start-Sleep -Milliseconds 400
        [System.Windows.Forms.Application]::DoEvents()
        if (Test-Path $log) {
            try {
                $fs = [System.IO.File]::Open($log, 'Open', 'Read', 'ReadWrite')
                $fs.Seek($startLen, 'Begin') | Out-Null
                $sr = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
                $new = $sr.ReadToEnd(); $sr.Close(); $fs.Close()
            } catch { $new = "" }
            $last = ($new -split "`n" | Where-Object { $_ -match '▶ (.+?):' } | Select-Object -Last 1)
            if ($last -and $last -match '▶ (.+?):') {
                $k = $matches[1].Trim()
                if ($stepText.ContainsKey($k)) { $lbl.Text = $stepText[$k] } else { $lbl.Text = $k }
                $pf.Refresh()
            }
        }
    }
    $p.WaitForExit()

    # 분석 엑셀(export_monthly.py) — 창 없이
    $lbl.Text = "⑧ 분석 엑셀 생성 중…"; $pf.Refresh()
    $psi2 = New-Object System.Diagnostics.ProcessStartInfo
    $psi2.FileName = $PY; $psi2.Arguments = "export_monthly.py"
    $psi2.WorkingDirectory = $here
    $psi2.UseShellExecute = $false; $psi2.CreateNoWindow = $true
    $p2 = [System.Diagnostics.Process]::Start($psi2); $p2.WaitForExit()

    $pf.Close()

    [System.Windows.Forms.MessageBox]::Show(
        $tm,
        "업데이트 완료 ✅`n`n공유 사이트:`nhttps://comimi12.github.io/slnc-review-dashboard/`n`n로그: _logs\update_$(Get-Date -Format yyyy-MM-dd).log",
        "서비스 리뷰 대시보드", 'OK', 'Information') | Out-Null
}
$tm.Close()
