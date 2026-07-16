/**
 * 일자별매출보고(가로) → 대시보드 HTML 생성기
 * - 순매출(실적) 없을 경우 계획/전년 기반 대시보드 표시
 * - 실적 있는 경우 달성률 포함 전체 대시보드
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const INPUT = process.argv[2] || 'C:\\Users\\user\\Downloads\\일자별매출보고(가로)_20260701164251.xlsx';
const OUT_DIR = path.join(__dirname, 'dashboard');

// ── 1. Excel 파싱 ──────────────────────────────────────────────────────────
const wb = XLSX.readFile(INPUT);
const ws = wb.Sheets['sheet'];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

const ROW_STORE = 0, ROW_METRIC = 1, ROW_SUB = 2, ROW_DATA_START = 3;

// ── 2. 헤더 매핑 ─────────────────────────────────────────────────────────
const headers = [];
let currentStore = '';
for (let c = 0; c < raw[ROW_STORE].length; c++) {
  if (raw[ROW_STORE][c] !== '') currentStore = String(raw[ROW_STORE][c]).trim();
  headers.push({
    store: currentStore,
    metric: String(raw[ROW_METRIC][c] || '').trim(),
    sub: String(raw[ROW_SUB][c] || '').trim(),
  });
}

// ── 3. 브랜드 분류 ───────────────────────────────────────────────────────
function getBrand(s) {
  if (!s || s === '매출일자') return null;
  if (s.includes('SL&C')) return 'SL&C';
  if (s.includes('CHAI797')) return 'CHAI797';
  if (s.includes('정육점')) return '정육점';
  if (s.includes('서리재')) return '서리재';
  if (s.includes('호우섬') || s.includes('살롱드호우섬')) return '호우섬';
  if (s.includes('이타마에')) return '이타마에';
  if (s.includes('CHAI ')) return 'CHAI';
  return '기타';
}

// ── 4. 데이터 파싱 ──────────────────────────────────────────────────────
// 일자별/매장별 데이터 맵: data[date][store] = {매출:{전년,계획,순매출,전년대비,계획대비}, 객수:{...}, 객단가:{...}}
const dataMap = {};
const allDates = [];

for (let r = ROW_DATA_START; r < raw.length; r++) {
  const dateRaw = String(raw[r][0] || '').trim();
  if (!dateRaw || dateRaw === 'SALE_DATE' || dateRaw === '매출일자') continue;
  const date = dateRaw.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
  allDates.push(date);
  dataMap[date] = {};

  for (let c = 1; c < raw[r].length; c++) {
    const { store, metric, sub } = headers[c];
    if (!store || store === '매출일자' || !metric || !sub) continue;
    if (!dataMap[date][store]) dataMap[date][store] = {};
    if (!dataMap[date][store][metric]) dataMap[date][store][metric] = {};
    const v = raw[r][c];
    dataMap[date][store][metric][sub] = (v === '' || v === null) ? null : Number(v);
  }
}

const dates = [...new Set(allDates)].sort();

// ── 5. 매장 목록 / 유효 기준일 결정 ────────────────────────────────────
const allStores = [...new Set(Object.values(dataMap).flatMap(d => Object.keys(d)))]
  .filter(s => !s.includes('교육용'));

// 실적 있는 날짜 (순매출 > 0)
const datesWithActual = dates.filter(d => {
  return allStores.some(s => {
    const v = dataMap[d]?.[s]?.['매출']?.['순매출'];
    return v && v > 0;
  });
});

// 기준일: 실적 있는 마지막 날 or 첫 날
const refDate = datesWithActual.length > 0
  ? datesWithActual[datesWithActual.length - 1]
  : dates[0];
const hasActual = datesWithActual.length > 0;
const mode = hasActual ? '실적' : '계획/전년';

console.log(`기준일: ${refDate} | 모드: ${mode} | 실적 있는 날: ${datesWithActual.length}일`);

// ── 6. 기준일 매장별 요약 ───────────────────────────────────────────────
function getV(store, metric, sub, date = refDate) {
  return dataMap[date]?.[store]?.[metric]?.[sub] ?? null;
}

const storeSummary = allStores.map(store => ({
  store,
  brand: getBrand(store),
  label: store.replace(/^\d+\.\s*\[본사\]\s*/, '').replace(/^\d+\.\s*/, '').trim(),
  plan:      getV(store, '매출', '계획'),
  sales:     getV(store, '매출', '순매출'),
  prevYear:  getV(store, '매출', '전년'),
  vsPlan:    getV(store, '매출', '계획대비'),
  vsYear:    getV(store, '매출', '전년대비'),
  custPlan:  getV(store, '객수', '계획'),
  custSales: getV(store, '객수', '실적'),
  custPrev:  getV(store, '객수', '전년'),
  avgPlan:   getV(store, '객단가', '계획'),
  avgSales:  getV(store, '객단가', '실적'),
  avgPrev:   getV(store, '객단가', '전년'),
})).filter(s => s.plan || s.sales || s.prevYear);

// 메인 지표: 실적 있으면 순매출, 없으면 계획 vs 전년
storeSummary.sort((a, b) =>
  (b.sales || b.plan || 0) - (a.sales || a.plan || 0)
);

// ── 7. 브랜드 집계 ──────────────────────────────────────────────────────
const BRANDS = ['CHAI797', '호우섬', '서리재', '이타마에', '정육점', 'SL&C', 'CHAI'];
const brandSummary = BRANDS.map(brand => {
  const group = storeSummary.filter(s => s.brand === brand);
  const sum = (key) => group.reduce((t, s) => t + (s[key] || 0), 0);
  return {
    brand,
    plan: sum('plan'),
    sales: sum('sales'),
    prevYear: sum('prevYear'),
    custPlan: sum('custPlan'),
    custSales: sum('custSales'),
    custPrev: sum('custPrev'),
    storeCount: group.length,
    activeCount: group.filter(s => s.plan > 0 || s.sales > 0).length,
  };
}).filter(b => b.plan > 0 || b.prevYear > 0);

// ── 8. 일별 추이 (월간) ─────────────────────────────────────────────────
const dailySeries = dates.map(d => {
  const dayStores = Object.keys(dataMap[d] || {});
  const sumBy = (metric, sub) =>
    dayStores.reduce((t, s) => t + (dataMap[d][s]?.[metric]?.[sub] || 0), 0);
  return {
    date: d.slice(5),
    fullDate: d,
    sales: sumBy('매출', '순매출'),
    plan: sumBy('매출', '계획'),
    prevYear: sumBy('매출', '전년'),
    hasActual: datesWithActual.includes(d),
  };
}).filter(d => d.plan > 0 || d.prevYear > 0);

// ── 9. 집계 수치 ────────────────────────────────────────────────────────
const totalPlan = brandSummary.reduce((t, b) => t + b.plan, 0);
const totalSales = brandSummary.reduce((t, b) => t + b.sales, 0);
const totalPrevYear = brandSummary.reduce((t, b) => t + b.prevYear, 0);
const totalCustPlan = brandSummary.reduce((t, b) => t + b.custPlan, 0);
const totalCustSales = brandSummary.reduce((t, b) => t + b.custSales, 0);
const achRate = (totalPlan > 0 && totalSales > 0) ? ((totalSales / totalPlan) * 100).toFixed(1) : '-';
const yoyRate = (totalPrevYear > 0 && totalSales > 0) ? ((totalSales / totalPrevYear) * 100).toFixed(1) : '-';

// ── 10. 월간 누계 계획 (refDate까지 합산) ──────────────────────────────
const monthlyPlanTotal = dates.reduce((t, d) =>
  t + allStores.reduce((s2, st) => s2 + (dataMap[d]?.[st]?.['매출']?.['계획'] || 0), 0), 0);
const monthlyPrevTotal = dates.reduce((t, d) =>
  t + allStores.reduce((s2, st) => s2 + (dataMap[d]?.[st]?.['매출']?.['전년'] || 0), 0), 0);

// ── 11. Helper ───────────────────────────────────────────────────────────
const M = (n) => n ? Math.round(n / 10000).toLocaleString() : '0';
const P = (n) => n ? n.toFixed(1) + '%' : '-';
const N = (n) => n ? Math.round(n).toLocaleString() : '0';

const BRAND_COLORS = {
  'CHAI797': '#8B6F5A', '호우섬': '#5A8FAD', '서리재': '#6B8C4A',
  '이타마에': '#C4854A', '정육점': '#A05050', 'SL&C': '#7070A0', 'CHAI': '#9C8A5A'
};
const bc = (b) => BRAND_COLORS[b] || '#888';

// 매장 테이블 (상위 40)
const storeRows = storeSummary.slice(0, 40).map((s, i) => {
  const primary = s.sales || s.plan || 0;
  const compare = s.sales ? s.plan : s.prevYear;
  const achNum = compare > 0 ? ((primary / compare) * 100) : null;
  const achStr = achNum ? achNum.toFixed(1) + '%' : '-';
  const achCls = achNum >= 100 ? 'g' : achNum >= 80 ? 'o' : 'r';

  const custMain = s.custSales || s.custPlan || 0;
  const avgMain  = s.avgSales  || s.avgPlan  || 0;

  return `<tr>
    <td>${i + 1}</td>
    <td><span class="badge" style="background:${bc(s.brand)}">${s.brand}</span>${s.label}</td>
    <td class="n">${M(primary)}만</td>
    <td class="n">${M(s.prevYear)}만</td>
    <td class="n">${M(s.plan)}만</td>
    <td class="n ${achCls}">${achStr}</td>
    <td class="n">${N(custMain)}</td>
    <td class="n">${N(avgMain)}</td>
  </tr>`;
}).join('');

// 차트 데이터
const chartBrand = JSON.stringify({
  labels: brandSummary.map(b => b.brand),
  datasets: [
    {
      label: hasActual ? '순매출(만)' : '계획(만)',
      data: brandSummary.map(b => Math.round((hasActual ? b.sales : b.plan) / 10000)),
      backgroundColor: brandSummary.map(b => bc(b.brand)),
    },
    {
      label: '전년(만)',
      data: brandSummary.map(b => Math.round(b.prevYear / 10000)),
      backgroundColor: brandSummary.map(b => bc(b.brand) + '55'),
    },
  ]
});

const chartDaily = JSON.stringify({
  labels: dailySeries.map(d => d.date),
  datasets: [
    ...(hasActual ? [{
      label: '순매출', type: 'bar',
      data: dailySeries.map(d => Math.round(d.sales / 10000)),
      backgroundColor: '#8B6F5A99',
    }] : []),
    {
      label: '계획', type: 'line',
      data: dailySeries.map(d => Math.round(d.plan / 10000)),
      borderColor: '#5A8FAD', borderWidth: 2, borderDash: [4, 4],
      fill: false, tension: 0.3, pointRadius: 2,
    },
    {
      label: '전년', type: 'line',
      data: dailySeries.map(d => Math.round(d.prevYear / 10000)),
      borderColor: '#9C9C9C', borderWidth: 1.5, borderDash: [2, 2],
      fill: false, tension: 0.3, pointRadius: 2,
    },
  ]
});

// 브랜드 바 섹션
const brandBars = brandSummary.map(b => {
  const primary = hasActual ? b.sales : b.plan;
  const maxPrimary = Math.max(...brandSummary.map(x => hasActual ? x.sales : x.plan));
  const barW = maxPrimary > 0 ? Math.round((primary / maxPrimary) * 100) : 0;
  const prevW = maxPrimary > 0 ? Math.round((b.prevYear / maxPrimary) * 100) : 0;
  const achNum = (hasActual && b.plan > 0) ? ((b.sales / b.plan) * 100) : null;
  const achStr = achNum ? achNum.toFixed(1) + '%' : '';
  const achCls = achNum >= 100 ? '#6BAF7D' : achNum >= 80 ? '#F5A623' : '#E05C5C';

  return `
  <div class="brand-item">
    <div class="bi-head">
      <span class="badge" style="background:${bc(b.brand)};font-size:12px;padding:3px 10px">${b.brand}</span>
      <span style="margin-left:8px;font-size:12px;color:var(--muted)">${b.storeCount}개 매장</span>
      ${achStr ? `<span style="margin-left:auto;font-weight:700;color:${achCls}">${achStr}</span>` : ''}
    </div>
    <div class="bi-row">
      <span class="bi-label">${hasActual ? '순매출' : '계획'}</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${barW}%;background:${bc(b.brand)}"></div></div>
      <span class="bi-val">${M(primary)}만</span>
    </div>
    <div class="bi-row">
      <span class="bi-label">전년</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${prevW}%;background:${bc(b.brand)}55"></div></div>
      <span class="bi-val">${M(b.prevYear)}만</span>
    </div>
  </div>`;
}).join('');

// ── 12. HTML 생성 ────────────────────────────────────────────────────────
const nowStr = new Date().toLocaleString('ko-KR');
const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>일자별 매출 대시보드</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
:root {
  --bg:#0f1117; --sur:#1a1d27; --sur2:#22263a;
  --bdr:#2d3148; --txt:#e8eaf6; --muted:#8c93c0;
  --g:#6BAF7D; --r:#E05C5C; --o:#F5A623;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--txt);font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;font-size:14px}
header{background:var(--sur);border-bottom:1px solid var(--bdr);padding:14px 24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
header h1{font-size:18px;font-weight:700}
.tag{background:var(--sur2);color:var(--muted);padding:3px 12px;border-radius:20px;font-size:12px}
.mode-tag{padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600;
  background:${hasActual ? '#6BAF7D22' : '#F5A62322'};
  color:${hasActual ? '#6BAF7D' : '#F5A623'};
  border:1px solid ${hasActual ? '#6BAF7D55' : '#F5A62355'}}
.container{max-width:1600px;margin:0 auto;padding:20px 24px}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.kpi{background:var(--sur);border:1px solid var(--bdr);border-radius:12px;padding:20px}
.kpi label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
.kpi .val{font-size:26px;font-weight:700;margin:8px 0 4px;line-height:1}
.kpi .sub{font-size:12px;color:var(--muted)}
.pb{background:var(--sur2);border-radius:4px;height:5px;margin-top:8px}
.pf{height:5px;border-radius:4px;transition:width .4s}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
.card{background:var(--sur);border:1px solid var(--bdr);border-radius:12px;padding:20px}
.card h2{font-size:13px;font-weight:600;color:var(--muted);margin-bottom:16px;text-transform:uppercase;letter-spacing:.5px}
.chart-wrap{position:relative;height:280px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:var(--sur2);color:var(--muted);font-weight:500;padding:9px 12px;text-align:left;border-bottom:1px solid var(--bdr);position:sticky;top:0;z-index:1}
td{padding:8px 12px;border-bottom:1px solid var(--bdr)}
tr:hover td{background:var(--sur2)}
td.n{text-align:right;font-variant-numeric:tabular-nums}
.g{color:var(--g);font-weight:600}
.o{color:var(--o);font-weight:600}
.r{color:var(--r);font-weight:600}
.badge{display:inline-block;padding:2px 7px;border-radius:10px;color:#fff;font-size:11px;margin-right:4px}
.tw{max-height:560px;overflow-y:auto;border-radius:8px}
.brand-item{border-bottom:1px solid var(--bdr);padding:14px 0}
.brand-item:last-child{border-bottom:none}
.bi-head{display:flex;align-items:center;margin-bottom:8px}
.bi-row{display:flex;align-items:center;gap:10px;margin-bottom:4px}
.bi-label{width:46px;font-size:11px;color:var(--muted);flex-shrink:0}
.bar-bg{flex:1;background:var(--sur2);border-radius:4px;height:8px}
.bar-fill{height:8px;border-radius:4px;transition:width .4s}
.bi-val{width:80px;text-align:right;font-size:13px;font-variant-numeric:tabular-nums}
.notice{background:#F5A62311;border:1px solid #F5A62344;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:var(--o)}
@media(max-width:1024px){.kpi-grid{grid-template-columns:repeat(2,1fr)}.grid2{grid-template-columns:1fr}}
</style>
</head>
<body>
<header>
  <h1>📊 일자별 매출 대시보드</h1>
  <span class="tag">기준일: ${refDate}</span>
  <span class="mode-tag">${hasActual ? '✅ 실적 집계 중' : '⏳ 계획/전년 기준 (실적 미집계)'}</span>
  <span class="tag" style="margin-left:auto">생성: ${nowStr}</span>
</header>

<div class="container">

${!hasActual ? `
<div class="notice">
  ⚠️ <strong>오늘(${refDate}) 실적 아직 미집계</strong> — 순매출이 0원입니다. POS 집계 후 재다운로드하면 실적이 반영됩니다.
  현재는 <strong>계획</strong> 및 <strong>전년 실적</strong>을 기준으로 표시합니다.
</div>` : ''}

<!-- KPI -->
<div class="kpi-grid">
  <div class="kpi">
    <label>${hasActual ? '오늘 순매출' : '오늘 계획 매출'}</label>
    <div class="val">${M(hasActual ? totalSales : totalPlan)}<small style="font-size:15px"> 만원</small></div>
    <div class="sub">전년 동일일: ${M(totalPrevYear)}만원</div>
  </div>
  <div class="kpi">
    <label>${hasActual ? '계획 달성률' : '전년 대비 계획'}</label>
    <div class="val" style="color:${achRate !== '-' ? (parseFloat(achRate) >= 100 ? 'var(--g)' : parseFloat(achRate) >= 80 ? 'var(--o)' : 'var(--r)') : (totalPrevYear > 0 ? (totalPlan / totalPrevYear >= 1 ? 'var(--g)' : 'var(--r)') : 'var(--txt)')}">
      ${hasActual ? achRate + '%' : (totalPrevYear > 0 ? ((totalPlan / totalPrevYear) * 100).toFixed(1) + '%' : '-')}
    </div>
    <div class="pb"><div class="pf" style="width:${Math.min(hasActual ? (parseFloat(achRate) || 0) : (totalPrevYear > 0 ? (totalPlan / totalPrevYear * 100) : 0), 100)}%;background:var(--g)"></div></div>
  </div>
  <div class="kpi">
    <label>월간 계획 합계 (7월 전체)</label>
    <div class="val">${Math.round(monthlyPlanTotal / 100000000).toLocaleString()}<small style="font-size:15px"> 억원</small></div>
    <div class="sub">전년 동월: ${Math.round(monthlyPrevTotal / 100000000).toLocaleString()}억원</div>
  </div>
  <div class="kpi">
    <label>집계 매장 수</label>
    <div class="val">${storeSummary.filter(s => s.plan > 0 || s.prevYear > 0).length}<small style="font-size:16px"> 개</small></div>
    <div class="sub">${brandSummary.length}개 브랜드</div>
  </div>
</div>

<!-- 차트 -->
<div class="grid2">
  <div class="card">
    <h2>브랜드별 ${hasActual ? '순매출 vs 전년' : '계획 vs 전년'} (만원)</h2>
    <div class="chart-wrap"><canvas id="brandChart"></canvas></div>
  </div>
  <div class="card">
    <h2>7월 일별 계획 vs 전년 추이 (만원)</h2>
    <div class="chart-wrap"><canvas id="dailyChart"></canvas></div>
  </div>
</div>

<!-- 브랜드 상세 -->
<div class="card" style="margin-bottom:24px">
  <h2>브랜드 상세</h2>
  ${brandBars}
</div>

<!-- 매장 테이블 -->
<div class="card">
  <h2>매장별 현황 (상위 40개) — ${hasActual ? '순매출/계획/전년' : '계획 vs 전년'}</h2>
  <div class="tw">
    <table>
      <thead>
        <tr>
          <th>#</th><th>매장</th>
          <th style="text-align:right">${hasActual ? '순매출' : '계획'}(만)</th>
          <th style="text-align:right">전년(만)</th>
          <th style="text-align:right">${hasActual ? '계획(만)' : '전년계획(만)'}</th>
          <th style="text-align:right">${hasActual ? '달성률' : '계획/전년'}</th>
          <th style="text-align:right">객수</th>
          <th style="text-align:right">객단가</th>
        </tr>
      </thead>
      <tbody>${storeRows}</tbody>
    </table>
  </div>
</div>

</div><!-- /container -->

<script>
const CHARTJS = true;
const opts = {
  responsive:true, maintainAspectRatio:false,
  plugins:{ legend:{ labels:{ color:'#8c93c0', font:{size:11} } } },
  scales:{
    x:{ ticks:{color:'#8c93c0',font:{size:11}}, grid:{color:'#2d3148'} },
    y:{ ticks:{color:'#8c93c0',font:{size:11}}, grid:{color:'#2d3148'} }
  }
};
new Chart(document.getElementById('brandChart'), {
  type:'bar', data:${chartBrand}, options:opts
});
new Chart(document.getElementById('dailyChart'), {
  type:'bar', data:${chartDaily},
  options:{...opts, scales:{...opts.scales, x:{...opts.scales.x, ticks:{...opts.scales.x.ticks,maxRotation:45}}}}
});
</script>
</body>
</html>`;

fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html, 'utf8');

// data.json도 저장
const jsonOut = { refDate, hasActual, mode, totalPlan, totalSales, totalPrevYear, monthlyPlanTotal, monthlyPrevTotal, brandSummary, storeSummary: storeSummary.slice(0, 30), dailySeries };
fs.writeFileSync(path.join(OUT_DIR, 'data.json'), JSON.stringify(jsonOut, null, 2), 'utf8');

console.log(`\n✅ 대시보드 생성 완료!`);
console.log(`   파일: ${path.join(OUT_DIR, 'index.html')}`);
console.log(`   기준일: ${refDate} | 모드: ${mode}`);
console.log(`   오늘 계획: ${M(totalPlan)}만원 | 전년: ${M(totalPrevYear)}만원`);
console.log(`   7월 총계획: ${Math.round(monthlyPlanTotal / 100000000)}억원 | 전년동월: ${Math.round(monthlyPrevTotal / 100000000)}억원`);
console.log(`   매장수: ${storeSummary.length}개 | 브랜드: ${brandSummary.length}개`);
