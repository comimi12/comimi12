# VOC 대시보드 월간 업데이트 안내 — 매일 09:00 실행, 이번 달 "알림일"에만 1회 표시
# 알림일 = 매월 3일. 단 토/일/공휴일이면 "다음 영업일"로 미룸.
# 또한 등록된 공휴일이 없는 해가 되면 연 1회 "공휴일 갱신" 알림.
$dir = "C:\Users\owner\do-better-workspace-v2\10-projects\13-service-review-dashboard"
$today = (Get-Date).Date
$coveredYears = @(2026, 2027)
$holidays = @(
  '2026-01-01','2026-02-16','2026-02-17','2026-02-18','2026-03-01','2026-03-02',
  '2026-05-05','2026-05-24','2026-05-25','2026-06-06','2026-08-15','2026-08-17',
  '2026-09-24','2026-09-25','2026-09-26','2026-09-28','2026-10-03','2026-10-05',
  '2026-10-09','2026-12-25',
  '2027-01-01','2027-02-06','2027-02-07','2027-02-08','2027-02-09','2027-03-01',
  '2027-05-05','2027-05-13','2027-06-06','2027-08-15','2027-08-16','2027-09-14',
  '2027-09-15','2027-09-16','2027-10-03','2027-10-04','2027-10-09','2027-10-11','2027-12-25'
)
Add-Type -AssemblyName System.Windows.Forms | Out-Null

# (A) 연 1회: 올해 공휴일 미등록 시 갱신 안내
$hstamp = Join-Path $dir '.holiday_alert'
$hlast = ''
if (Test-Path $hstamp) { $hlast = (Get-Content $hstamp -Raw).Trim() }
if (($coveredYears -notcontains $today.Year) -and ($hlast -ne $today.Year.ToString())) {
  [System.Windows.Forms.MessageBox]::Show(
    "$($today.Year)년 공휴일이 아직 등록되지 않았습니다.`r`n`r`nClaude Code에 '공휴일 업데이트해줘'라고 요청하세요.`r`n(그래야 주말·공휴일 알림 날짜가 정확합니다.)",
    "공휴일 목록 갱신 안내", 'OK', 'Warning') | Out-Null
  Set-Content -Path $hstamp -Value $today.Year.ToString() -Encoding utf8
}

# (B) 월간 업데이트 알림 — 알림일(3일, 주말·공휴일이면 다음 영업일)에 1회
$target = Get-Date -Year $today.Year -Month $today.Month -Day 3
while ($target.DayOfWeek -eq [DayOfWeek]::Saturday -or $target.DayOfWeek -eq [DayOfWeek]::Sunday -or ($holidays -contains $target.ToString('yyyy-MM-dd'))) {
  $target = $target.AddDays(1)
}
$stamp = Join-Path $dir '.reminder_last'
$key = $today.ToString('yyyy-MM')
$last = ''
if (Test-Path $stamp) { $last = (Get-Content $stamp -Raw).Trim() }
if ($today -ge $target.Date -and $last -ne $key) {
  $msg = "이번 달 VOC 리뷰 대시보드를 업데이트할 시간입니다.`r`n`r`n" +
         "1) 새 월별 리뷰 엑셀 파일을 준비하세요.`r`n" +
         "2) Claude Code에 다음과 같이 입력:`r`n" +
         "     'VOC 대시보드 업데이트해줘' + 새 파일 경로`r`n`r`n" +
         "지금 대시보드 폴더를 열까요?"
  $r = [System.Windows.Forms.MessageBox]::Show($msg, "VOC 대시보드 업데이트 안내", 'YesNo', 'Information')
  Set-Content -Path $stamp -Value $key -Encoding utf8
  if ($r -eq 'Yes') { Start-Process explorer.exe $dir }
}
