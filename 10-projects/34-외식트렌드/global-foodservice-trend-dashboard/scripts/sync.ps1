# 34-외식트렌드 대시보드 — 커밋 → 푸시 → Vercel 배포를 한 번에 실행한다.
#
#   npm run sync                      # 기본 메시지로
#   npm run sync -- "메시지"          # 커밋 메시지 지정
#   npm run sync -- "메시지" -NoDeploy # 배포 없이 커밋·푸시만
#
# 이 워크스페이스에는 이 프로젝트와 무관한 변경이 함께 있을 수 있으므로
# 반드시 34-외식트렌드 폴더만 스테이징한다.

param(
  [switch]$NoDeploy,
  # npm run sync -- 뒤의 나머지 인자를 커밋 메시지로 합친다.
  # (괄호가 포함된 메시지도 안전하게 받기 위해 ValueFromRemainingArguments 사용)
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Rest
)

$ErrorActionPreference = 'Stop'

# Windows PowerShell 콘솔에서 한글이 깨지지 않도록 출력 인코딩을 UTF-8로 고정
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}

$Message = if ($Rest) { ($Rest -join ' ').Trim() } else { '' }

$AppDir   = Split-Path -Parent $PSScriptRoot
$Project  = Split-Path -Parent $AppDir
$RepoRoot = (git -C $AppDir rev-parse --show-toplevel)

# PS 5.1 호환: repo 루트 기준 상대경로를 직접 계산한다.
$RepoFull    = (Resolve-Path $RepoRoot).Path.TrimEnd('\', '/')
$ProjectFull = (Resolve-Path $Project).Path
$Scope       = $ProjectFull.Substring($RepoFull.Length).TrimStart('\', '/').Replace('\', '/')

Write-Host "repo   : $RepoRoot"
Write-Host "scope  : $Scope"

Push-Location $RepoRoot
try {
  # ---- 1) 커밋 (이 프로젝트 폴더만) ----------------------------------------
  git add -- $Scope
  $staged = git diff --cached --name-only -- $Scope

  if (-not $staged) {
    Write-Host "커밋할 변경 없음 — 커밋 건너뜀" -ForegroundColor Yellow
  }
  else {
    if (-not $Message) {
      $Message = "chore(34-외식트렌드): 대시보드 업데이트 $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }
    $body = @"
$Message

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
"@
    git commit -m $body
    Write-Host "커밋 완료: $(($staged | Measure-Object).Count) 파일" -ForegroundColor Green
  }

  # ---- 2) 푸시 -------------------------------------------------------------
  $branch = git rev-parse --abbrev-ref HEAD
  git push origin $branch
  Write-Host "푸시 완료: origin/$branch" -ForegroundColor Green
}
finally {
  Pop-Location
}

# ---- 3) Vercel 프로덕션 배포 ------------------------------------------------
if ($NoDeploy) {
  Write-Host "-NoDeploy 지정됨 — 배포 건너뜀" -ForegroundColor Yellow
  exit 0
}

Push-Location $AppDir
try {
  npx vercel deploy --prod --yes
  Write-Host "배포 완료: https://global-foodservice-trend-dashboard.vercel.app" -ForegroundColor Green
}
finally {
  Pop-Location
}
