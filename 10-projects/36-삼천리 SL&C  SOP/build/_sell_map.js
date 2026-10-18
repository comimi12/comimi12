// verify_quiz.py 보조 — app.js의 sellQs()를 그대로 돌려 "가린 영문 멘트 → 정답 메뉴" 표를 낸다
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data.json'), 'utf8'));
const body = src.match(/var SELL_KR[\s\S]*?\n  };\n/)[0] + src.match(/function sellQs[\s\S]*?\n  }\n/)[0];
const HANGUL = /[가-힣]/, shuffle = a => a.slice(), fresh = a => a.slice(), out = {};
for (const d of data.filter(x => x.kind === 'menu')) {
  const menuDeck = () => d;
  eval(body);
  for (const q of sellQs(d.brand, 999)) (out[q.quote[0]] = out[q.quote[0]] || []).push(q.ref);
}
process.stdout.write(JSON.stringify(out));
