// 추천 멘트 문제 점검 — 메뉴 이름이 아닌 말까지 가려진 곳을 찾는다
//   node build/_sell_audit.js
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data.json'), 'utf8'));
const body = src.match(/var SELL_KR[\s\S]*?\n  };\n/)[0] + src.match(/function sellQs[\s\S]*?\n  }\n/)[0];
const HANGUL = /[가-힣]/, shuffle = a => a.slice(), fresh = a => a.slice();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let bad = 0;
for (const d of data.filter(x => x.kind === 'menu')) {
  const menuDeck = () => d;
  eval(body);
  for (const q of sellQs(d.brand, 999)) {
    const it = d.items.find(i => i.en === q.ref);
    const orig = it.sections.find(s => s.en === 'SUGGESTIVE SELLING').lines.find(l => !HANGUL.test(l));
    const m = orig.match(new RegExp('^' + q.quote[0].split('____').map(esc).join('(.+?)') + '$'));
    const hid = m ? m.slice(1) : ['?'];
    const up = q.ref.toUpperCase();
    const nameW = up.split(/[^A-Z0-9]+/).concat(up.split(/\s+/).map(t => t.replace(/[^A-Z0-9]/g, '')));
    const odd = hid.some(h => h.split(/\s+/).some(w => {
      const c = w.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return c && !nameW.includes(c) && !nameW.includes(c.replace(/S$/, ''));
    }));
    if (odd) { bad++; console.log(d.brand, '|', q.ref, '| 가린 말:', JSON.stringify(hid), '|', q.quote[0]); }
  }
}
console.log(bad ? bad + '건' : '이상 없음');
