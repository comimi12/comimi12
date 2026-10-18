// 메뉴 시험 내용 점검 — app.js 출제 로직을 그대로 돌려 시험을 여러 번 뽑아 보고 문제를 찾는다
//   node build/quiz_audit.js [회수=300]
// 점검: 문항 수·유형 비율, 영문/국문 병기, 보기 4개·정답 1개·보기 중복, 사진 파일, 사진 보기 중복,
//       추천 멘트(영문이 비었는지·같은 분류 보기로 답이 애매한지), 연속 응시 간 겹침
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', 'src');
const src = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(SRC, 'data.json'), 'utf8'));
const QUIZ_BANK = JSON.parse(fs.readFileSync(path.join(SRC, 'quiz.json'), 'utf8'));
const block = src.slice(src.indexOf('  var QUIZ = null, QZ = null;'), src.indexOf('  function quizRight('));
const N = +process.argv[2] || 300;

const HANGUL = /[가-힣]/;
function thumb(s) { return s.replace(/^img\/(.+)\.[a-z]+$/, 'img/t/$1.jpg'); }
function save() {}
let S = { brand: 'KSC', qseen: {} };
function menuDeck(b) { return data.filter(d => d.kind === 'menu' && d.brand === b)[0]; }
eval(block);
QUIZ = QUIZ_BANK;

const probs = {}, amb = [];
function bad(b, kind, msg) { const k = b + ' | ' + kind + ' | ' + msg; probs[k] = (probs[k] || 0) + 1; }

for (const b of ['KSC', 'WASA']) {
  S = { brand: b, qseen: {} };
  const deck = menuDeck(b), chipOf = {};
  deck.items.forEach(it => { if (!(it.en in chipOf)) chipOf[it.en] = it.chip; });
  let prev = null, overlapMax = 0, missingKr = new Set();
  for (let r = 0; r < N; r++) {
    startQuiz(b);
    const qs = QZ.qs, cnt = { photo: 0, sell: 0, mc: 0 };
    if (qs.length !== 30) bad(b, 'count', '문항 수 ' + qs.length);
    const keys = qs.map(q => (q.img ? 'p:' : q.sell ? 's:' : 'm:') + (q.img || q.sell ? q.ref : q.q[0]));
    if (new Set(keys).size !== keys.length) bad(b, 'dup', '한 시험 안에 같은 문항');
    if (prev) overlapMax = Math.max(overlapMax, keys.filter(k => prev.has(k)).length);
    prev = new Set(keys);
    qs.forEach(q => {
      const t = q.img ? 'photo' : q.sell ? 'sell' : 'mc';
      cnt[t]++;
      if (!q.q[0] || HANGUL.test(q.q[0]) || !HANGUL.test(q.q[1] || '')) bad(b, t, '질문 영문/국문 병기 오류: ' + q.q[0]);
      if (q.opts.length !== 4) bad(b, t, '보기 ' + q.opts.length + '개: ' + (q.ref || q.q[0]));
      if (q.opts.filter(o => o.ok).length !== 1) bad(b, t, '정답 수 오류: ' + (q.ref || q.q[0]));
      if (new Set(q.opts.map(o => o.en.toUpperCase())).size !== q.opts.length) bad(b, t, '보기 이름 중복: ' + (q.ref || q.q[0]));
      q.opts.forEach(o => {
        if (HANGUL.test(o.en)) bad(b, t, '보기 영문에 한글: ' + o.en);
        if (!o.kr) missingKr.add(o.en);
      });
      if (q.img && !fs.existsSync(path.join(SRC, q.img))) bad(b, t, '사진 없음: ' + q.img);
      if (q.img) {
        // 오답 보기 메뉴가 (어느 분류에서든) 문제 사진과 같은 사진 파일을 쓰면 그 보기도 정답처럼 보인다
        q.opts.filter(o => !o.ok).forEach(o => {
          const same = deck.items.filter(i => i.en.toUpperCase() === o.en.toUpperCase() && i.img && thumb(i.img) === q.img);
          if (same.length) bad(b, t, '오답 보기가 같은 사진을 씀: ' + q.ref + ' vs ' + o.en);
        });
      }
      if (q.sell) {
        const en = q.quote[0], kr = q.quote[1];
        if (!en || HANGUL.test(en)) bad(b, t, '멘트 영문 오류: ' + q.ref);
        if (!HANGUL.test(kr || '')) bad(b, t, '멘트 국문 없음: ' + q.ref);
        if (en.replace(/____|[^A-Za-z]/g, '').length < 15) bad(b, t, '영문 멘트가 거의 다 가려짐: ' + q.ref + ' → ' + en);
        const ans = q.opts.filter(o => o.ok)[0].en;
        const lineOf = n => deck.items.find(i => i.en === n).sections
          .find(x => x.en === 'SUGGESTIVE SELLING').lines.find(l => !HANGUL.test(l));
        const cs = cuesOf(lineOf(ans));
        q.opts.forEach(o => {
          if (o.ok) return;
          if (sellGroup(chipOf[o.en]) === sellGroup(chipOf[ans])) bad(b, t, '비슷한 분류 보기(답이 애매할 수 있음): ' + ans + ' vs ' + o.en);
          const sh = cuesOf(lineOf(o.en)).filter(r => cs.indexOf(r) >= 0);
          if (sh.length) amb.push(ans + ' vs ' + o.en);
        });
      }
    });
    // 메뉴 지식 문항이 묻는 메뉴(ref)가 추천 멘트·사진 문제의 정답으로도 나오면 답이 새어 나간다
    const refs = qs.filter(q => !q.img && !q.sell).map(q => String(q.ref || '').toUpperCase()).filter(Boolean);
    qs.filter(q => q.img || q.sell).forEach(q => {
      const k = q.ref.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
      if (refs.some(r => k.indexOf(r) === 0)) bad(b, q.img ? 'photo' : 'sell', '메뉴 지식 문항과 같은 메뉴가 정답: ' + q.ref);
    });
    if (cnt.photo !== 15 || cnt.sell !== 10 || cnt.mc !== 5) bad(b, 'count', '유형 비율 ' + JSON.stringify(cnt));
  }
  console.log('[' + b + '] 시험 ' + N + '회 생성 · 연속 응시 간 최대 겹침 ' + overlapMax + '문항');
  if (missingKr.size) console.log('  국문 이름 없는 보기: ' + [...missingKr].join(', '));
}
// 상황어가 겹친 보기 — 조건을 다 맞추는 보기가 3개가 안 될 때만 생긴다(완화 단계). 0이 목표.
if (amb.length) console.log('  상황어가 겹친 보기 ' + amb.length + '건: ' + [...new Set(amb)].slice(0, 10).join(' / '));
const ks = Object.keys(probs).sort();
console.log(ks.length ? ks.map(k => '  ✕ ' + k + ' (' + probs[k] + '회)').join('\n') : '  문제 없음');
process.exit(ks.length ? 1 : 0);
