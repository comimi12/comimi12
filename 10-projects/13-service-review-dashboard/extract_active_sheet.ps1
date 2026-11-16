# extract_active_sheet.ps1 — DRM 잠긴 xlsx 의 첫 시트를 Excel COM 으로 읽어 평문 CSV(UTF-8 BOM)로 기록
# 사용: powershell -File extract_active_sheet.ps1 "<xlsx>" "<out.csv>"
# (SaveAs 는 DRM 재암호화되므로 셀 값을 직접 읽어 기록. 날짜 셀은 yyyy-MM-dd 로 변환)
param([string]$Src, [string]$Out)
$ErrorActionPreference = 'Stop'
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false; $xl.DisplayAlerts = $false
try {
  $wb = $xl.Workbooks.Open($Src, 0, $true)
  $ws = $wb.Worksheets.Item(1)
  $ur = $ws.UsedRange
  $data = $ur.Value2; $rn = $ur.Rows.Count; $cn = $ur.Columns.Count
  $dateCols = @{}
  for ($c = 1; $c -le $cn; $c++) {
    $h = [string]$data[1, $c]
    if ($h -match '일자|날짜|date') { $dateCols[$c] = $true }
  }
  $sb = New-Object System.Text.StringBuilder
  for ($r = 1; $r -le $rn; $r++) {
    $cells = New-Object System.Collections.Generic.List[string]
    for ($c = 1; $c -le $cn; $c++) {
      $v = $data[$r, $c]
      if ($null -eq $v) { $v = "" }
      elseif ($r -gt 1 -and $dateCols.ContainsKey($c) -and ($v -is [double])) { $v = [DateTime]::FromOADate($v).ToString('yyyy-MM-dd') }
      $cells.Add('"' + ([string]$v).Replace('"', '""') + '"')
    }
    [void]$sb.AppendLine([string]::Join(",", $cells))
  }
  [System.IO.File]::WriteAllText($Out, $sb.ToString(), (New-Object System.Text.UTF8Encoding($true)))
  Write-Output ("OK " + $rn + " rows")
  $wb.Close($false)
} finally {
  $xl.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
}
