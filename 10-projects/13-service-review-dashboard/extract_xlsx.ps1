# extract_xlsx.ps1 — 월별 리뷰 엑셀(DRM 포함)을 CSV로 추출해 data/reviews/ 에 저장
#
# 사용법 (PowerShell):
#   .\extract_xlsx.ps1 "C:\경로\review_2026년 6월 리뷰 결과.xlsx"
#   여러 개도 가능: .\extract_xlsx.ps1 "a.xlsx" "b.xlsx"
#
# DRM(사내 보안)으로 잠긴 파일도 Excel을 통해 정상 복호화되어 읽힙니다.
# (SaveAs는 DRM이 재암호화하므로, 셀 값을 직접 읽어 PowerShell이 CSV로 기록합니다.)
param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Files)

$dst = Join-Path $PSScriptRoot "data\reviews"
if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Force $dst | Out-Null }
if (-not $Files) { Write-Output "사용법: .\extract_xlsx.ps1 \"리뷰파일.xlsx\" [추가파일...]"; exit }

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false; $xl.DisplayAlerts = $false
foreach ($path in $Files) {
  if (-not (Test-Path $path)) { Write-Output ("없음: " + $path); continue }
  try {
    $wb = $xl.Workbooks.Open($path, 0, $true)
    $ws = $null
    foreach ($s in $wb.Worksheets) { if ($s.Name -eq '업로드리뷰원본' -or $s.Name -eq '리뷰원본') { $ws = $s } }
    if ($null -eq $ws) {
      $names = ($wb.Worksheets | ForEach-Object { $_.Name }) -join ", "
      Write-Output ("리뷰시트(리뷰원본/업로드리뷰원본) 없음: " + (Split-Path $path -Leaf) + " | 시트: " + $names)
      $wb.Close($false); continue
    }
    $ur = $ws.UsedRange; $data = $ur.Value2; $rn = $ur.Rows.Count; $cn = $ur.Columns.Count
    $sb = New-Object System.Text.StringBuilder
    for ($r=1; $r -le $rn; $r++) {
      $cells = New-Object System.Collections.Generic.List[string]
      for ($c=1; $c -le $cn; $c++) { $v=$data[$r,$c]; if($null -eq $v){$v=""}; $cells.Add('"' + ([string]$v).Replace('"','""') + '"') }
      [void]$sb.AppendLine([string]::Join(",", $cells))
    }
    $base = [System.IO.Path]::GetFileNameWithoutExtension($path)
    $out = Join-Path $dst ($base + ".csv")
    [System.IO.File]::WriteAllText($out, $sb.ToString(), (New-Object System.Text.UTF8Encoding($true)))
    Write-Output ("OK [" + $ws.Name + "] " + $rn + "행 -> data\reviews\" + $base + ".csv")
    $wb.Close($false)
  } catch {
    Write-Output ("실패: " + (Split-Path $path -Leaf) + " :: " + $_.Exception.Message)
  }
}
$xl.Quit(); [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
