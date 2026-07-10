# KPI 취합 엑셀 '서비스' 시트를 Excel COM으로 추출 → TSV (DRM 파일 복호화용).
# openpyxl이 DRM(9b204452)로 못 읽을 때 kpi_build.py가 호출.
# 출력: 조직 \t 운영담당 \t (1월점수 \t 1월등급 \t ... 12월점수 \t 12월등급)
param(
  [string]$Path = "C:\Users\owner\Desktop\교육팀\0. 온라인리뷰\VOC 평가 자료(우수매장, KPI, 영업직군)\(26년) KPI 평가 자료\※ 2026 월별 KPI 취합_취합용(5월).xlsx",
  [string]$Out  = "$PSScriptRoot\kpi_service_raw.tsv"
)
$ErrorActionPreference = "Stop"
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false; $xl.DisplayAlerts = $false
try {
  $wb = $xl.Workbooks.Open($Path, $false, $true)   # ReadOnly
  $ws = $wb.Worksheets.Item("서비스")
  $n  = $ws.UsedRange.Rows.Count
  $lines = New-Object System.Collections.Generic.List[string]
  for ($r = 5; $r -le $n; $r++) {
    $org = [string]$ws.Cells.Item($r, 2).Value2
    if ([string]::IsNullOrWhiteSpace($org) -or $org -eq "조직" -or $org.StartsWith("▣")) { continue }
    $cells = @($org, [string]$ws.Cells.Item($r, 3).Value2)   # 조직, 운영담당
    for ($c = 4; $c -le 27; $c++) {                          # D..AA = 1~12월(점수,등급)
      $v = $ws.Cells.Item($r, $c).Value2
      if ($null -eq $v) { $cells += "" } else { $cells += [string]$v }
    }
    $lines.Add(($cells -join "`t"))
  }
  $wb.Close($false)
  [System.IO.File]::WriteAllLines($Out, $lines, (New-Object System.Text.UTF8Encoding($false)))
  Write-Output "OK $($lines.Count) rows -> $Out"
} finally {
  $xl.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
