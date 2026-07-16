/**
 * 신세계 Cloud POS 일자별매출보고 자동 다운로드 + 대시보드 갱신
 * 실행: node auto-download.js
 * 스케줄: Windows 작업 스케줄러로 매일 09:00에 실행
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// .env 파일에서 환경변수 로드 (dotenv 없이 수동 파싱)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) throw new Error('.env 파일이 없습니다. .env 파일을 생성해주세요.');
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx < 0) return;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  });
}

loadEnv();

const POS_URL    = process.env.POS_URL;
const POS_ID     = process.env.POS_ID;
const POS_PW     = process.env.POS_PW;
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || 'C:\\Users\\user\\Downloads';

const log = (msg) => {
  const ts = new Date().toLocaleTimeString('ko-KR');
  console.log(`[${ts}] ${msg}`);
};

(async () => {
  log('🚀 자동 다운로드 시작');
  let browser;

  try {
    browser = await chromium.launch({
      headless: false,   // true로 바꾸면 창 없이 실행
      slowMo: 500,
    });

    const context = await browser.newContext({
      acceptDownloads: true,
    });
    const page = await context.newPage();

    // ── 1. 로그인 ──────────────────────────────────────────────────────
    log('로그인 페이지 접속 중...');
    await page.goto(POS_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // 아이디/비밀번호 입력 (셀렉터는 사이트 구조에 따라 조정 필요)
    await page.waitForSelector('input[type="text"], input[name*="id"], input[name*="user"]', { timeout: 10000 });

    const idInput = page.locator('input[type="text"], input[name*="id"], input[name*="user"]').first();
    const pwInput = page.locator('input[type="password"]').first();

    await idInput.fill(POS_ID);
    await pwInput.fill(POS_PW);
    await pwInput.press('Enter');

    log('로그인 완료, 메뉴 탐색 중...');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // ── 2. 메뉴 탐색: 영업 → 일자별매출조회 ──────────────────────────
    // 메뉴 구조가 다를 수 있으므로 텍스트 기반으로 찾기
    try {
      // "영업" 메뉴
      await page.getByText('영업', { exact: false }).first().click();
      await page.waitForTimeout(1000);

      // "일자별매출조회" 서브메뉴
      await page.getByText('일자별매출조회', { exact: false }).first().click();
      await page.waitForTimeout(1000);

      // "일자별매출보고(삼천리)" 항목
      await page.getByText('일자별매출보고', { exact: false }).first().click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      log('일자별매출보고 페이지 진입');
    } catch (e) {
      log(`⚠️  메뉴 탐색 실패 (수동으로 화면 확인 필요): ${e.message}`);
      await page.screenshot({ path: path.join(__dirname, 'data', 'menu-error.png') });
      throw e;
    }

    // ── 3. 조회 버튼 클릭 ─────────────────────────────────────────────
    try {
      const searchBtn = page.getByRole('button', { name: /조회/ }).first();
      await searchBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      log('조회 완료');
    } catch (e) {
      log(`⚠️  조회 버튼 클릭 실패: ${e.message}`);
    }

    // ── 4. 엑셀(가로) 다운로드 ───────────────────────────────────────
    log('엑셀(가로) 다운로드 중...');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.getByText('엑셀', { exact: false }).filter({ hasText: /가로/ }).first().click()
        .catch(() => page.getByRole('button', { name: /엑셀.*가로|가로.*엑셀/ }).first().click()),
    ]);

    // 파일 저장
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const timestamp = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
    const fileName = `일자별매출보고(가로)_${today}${timestamp}.xlsx`;
    const savePath = path.join(DOWNLOAD_DIR, fileName);

    await download.saveAs(savePath);
    log(`✅ 다운로드 완료: ${savePath}`);

    // ── 5. 대시보드 자동 갱신 ────────────────────────────────────────
    log('대시보드 갱신 중...');
    const { execSync } = require('child_process');
    execSync(`node "${path.join(__dirname, 'build-dashboard.js')}" "${savePath}"`, {
      cwd: __dirname,
      stdio: 'inherit'
    });

    log('🎉 완료! 대시보드가 갱신되었습니다.');

    // ── 6. Git 커밋 + 푸시 → GitHub Pages 자동 배포 ─────────────────
    try {
      const REPO_ROOT = path.resolve(__dirname, '..', '..');
      const dashboardPath = path.join(__dirname, 'dashboard', 'index.html');
      const relPath = path.relative(REPO_ROOT, dashboardPath).replace(/\\/g, '/');

      execSync(`git -C "${REPO_ROOT}" add "${relPath}"`, { stdio: 'inherit' });
      execSync(
        `git -C "${REPO_ROOT}" commit -m "chore: 매출 대시보드 자동 갱신 (${today})"`,
        { stdio: 'inherit', env: { ...process.env, GIT_AUTHOR_DATE: new Date().toISOString(), GIT_COMMITTER_DATE: new Date().toISOString() } }
      );
      execSync(`git -C "${REPO_ROOT}" push origin main`, { stdio: 'inherit' });
      log('🚀 GitHub 푸시 완료 → GitHub Pages 자동 배포 시작');
    } catch (gitErr) {
      log(`⚠️  Git 푸시 실패 (변경사항 없거나 인증 문제): ${gitErr.message}`);
    }

  } catch (err) {
    log(`❌ 오류: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
