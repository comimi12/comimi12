/* 삼천리 SL&C SOP — 개인 스마트폰용 교육 앱
 *
 * 저장은 전부 기기 안(localStorage). 로그인도 서버도 없다.
 * 직원이 자기 폰에서 학습을 체크하고, 마지막에 트레이너 서명을 받아
 * 6자리 수료코드를 만들어 매니저에게 보내는 구조. */
(function () {
  'use strict';

  var DATA = [], BRANDS = [], INDEX = [];
  var $rail = document.getElementById('rail');
  var $hd = document.getElementById('hd');
  var $main = document.getElementById('main');
  var $sheet = document.getElementById('sheet');
  var $sheetBody = document.getElementById('sheetBody');

  var BRAND_META = {
    KSC: { name: 'KALBI SOCIAL CLUB', kr: '칼비 소셜 클럽 · 코리안 바비큐',
           mark: 'KALBI', tag: '코리안 바비큐' },
    WASA: { name: 'IZAKAYA WASA', kr: '이자카야 와사 · 스시 · 로바타',
            mark: 'WASA', tag: '이자카야 · 스시' }
  };

  /* ── 저장소 ───────────────────────────────────────── */
  var KEY = 'slnc-sop-v1';
  var S = {
    brand: 'KSC', theme: '',
    me: { name: '', phone: '', pos: '', posLabel: '', start: '' },
    done: {},      // "deckId:n" | "menu:deckId:chip"  ->  ISO 날짜
    daily: {},     // "YYYY-MM-DD|deckId:n|g|i"        ->  true
    sign: null,    // { img, by, at }
    team: [],      // 관리자 기기에 모인 팀 수료 보고
    adminOn: 0,
    q: ''
  };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var o = JSON.parse(raw);
      Object.keys(o || {}).forEach(function (k) { S[k] = o[k]; });
    }
  } catch (e) { /* 시크릿 모드 등 — 기본값으로 진행 */ }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        brand: S.brand, theme: S.theme, me: S.me,
        done: S.done, daily: S.daily, sign: S.sign,
        team: S.team, adminOn: S.adminOn
      }));
    } catch (e) { /* 저장 불가여도 화면은 계속 동작 */ }
  }

  /* ── 유틸 ─────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  var HANGUL = /[가-힣]/;
  function splitEnKr(t) {
    var i = t.search(HANGUL);
    if (i < 25) return [t, ''];
    var en = t.slice(0, i).trim(), kr = t.slice(i).trim();
    if (!kr || en.split(/\s+/).length < 4) return [t, ''];
    return [en, kr];
  }
  /** 화면 문구는 영문 위 / 국문 아래로 함께 보여준다 */
  function L(en, kr) {
    return '<span class="l"><span class="l-en">' + esc(en) + '</span>'
      + '<span class="l-kr">' + esc(kr) + '</span></span>';
  }
  /** 한 줄로 붙여 쓸 때 */
  function Li(en, kr) { return esc(en) + ' · ' + esc(kr); }
  /** 메뉴 카드용 축소본 (build/thumbs.py 산출물) */
  function thumb(src) { return src.replace(/^img\/(.+)\.[a-z]+$/, 'img/t/$1.jpg'); }

  function titleMain(t) { return String(t).split('|')[0].trim(); }
  function titleKr(t) { return String(t).split('|').slice(1).join(' · ').trim(); }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      + '-' + String(d.getDate()).padStart(2, '0');
  }
  function ico(p) { return '<svg viewBox="0 0 24 24">' + p + '</svg>'; }
  var I = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.6V21h14V9.6"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/>',
    dish: '<path d="M3 11h18"/><path d="M12 11a7 7 0 0 1 7-7"/><path d="M4 11a8 8 0 0 0 16 0"/><path d="M5 20h14"/>',
    check: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="m8 12 3 3 5-6"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-2.5 5 2.5-1.5-7"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    tick: '<path d="m5 12 5 5 9-10"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
    share: '<path d="M12 15V3"/><path d="m8 7 4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    play: '<path d="M4.5 5.5a2 2 0 0 1 3-1.7l10 6.5a2 2 0 0 1 0 3.4l-10 6.5a2 2 0 0 1-3-1.7z"/>',
    team: '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16.5 5.2a3.4 3.4 0 0 1 0 5.6"/><path d="M18 14.4a6.5 6.5 0 0 1 3.5 5.6"/>'
  };

  /* ── 데이터 헬퍼 ───────────────────────────────────── */
  function decksOf(b) { return DATA.filter(function (d) { return d.brand === b; }); }
  function deckById(id) {
    for (var i = 0; i < DATA.length; i++) if (DATA[i].id === id) return DATA[i];
    return null;
  }
  function mainManual(b) {
    return decksOf(b).filter(function (d) {
      return d.kind === 'manual' && d.id.indexOf('lite') < 0;
    })[0];
  }
  function menuDeck(b) {
    return decksOf(b).filter(function (d) { return d.kind === 'menu'; })[0];
  }
  function pageOf(deck, n) {
    var r = null;
    (deck.pages || []).forEach(function (p) { if (p.n === n) r = p; });
    return r;
  }
  function chaptersOf(deck) {
    var out = [], cur = null;
    (deck.pages || []).forEach(function (p) {
      if (p.divider) { cur = { ch: p.ch, name: p.title, sub: p.sub || '', pages: [] }; out.push(cur); return; }
      if (!cur) { cur = { ch: '00', name: '시작하기', sub: '표지 · 목차', pages: [] }; out.push(cur); }
      cur.pages.push(p);
    });
    return out.filter(function (c) { return c.pages.length; });
  }
  /** 포지션 = CH.03/04/05 안의 직급별 SOP 페이지 */
  function positionsOf(b) {
    var deck = mainManual(b), out = [];
    if (!deck) return out;
    chaptersOf(deck).forEach(function (c) {
      if (['03', '04', '05'].indexOf(c.ch) < 0) return;
      c.pages.forEach(function (p) {
        out.push({ id: deck.id + ':' + p.n, n: p.n, label: titleMain(p.title), kr: titleKr(p.title),
                   group: c.ch === '05' ? 'MGMT' : (c.ch === '03' ? 'FOH' : 'BOH') });
      });
    });
    return out;
  }
  function catsOf(deck) {
    var out = [];
    (deck.items || []).forEach(function (it) { if (it.chip && out.indexOf(it.chip) < 0) out.push(it.chip); });
    return out;
  }

  /* ── 입문 매뉴얼 (간소화) ─────────────────────────────
   * 휴대폰으로 훑는 교육용이라 전체 매뉴얼 대신 꼭 필요한 장만 순서대로 남긴다.
   * 남길 페이지는 원본 제목 앞부분으로 집는다 — 두 브랜드가 같은 생성기 산출물이라 제목이 같다. */
  var COURSE = [
    { g: 'BRAND & STORE', gk: '브랜드 · 매장', t: '브랜드 소개', m: 'THE BRAND' },
    { g: 'BRAND & STORE', gk: '브랜드 · 매장', t: '우리 매장 정보', m: 'STORE FACT SHEET' },
    { g: 'STANDARDS', gk: '기본 기준', t: '용모 · 복장 기준', m: 'GROOMING & UNIFORM' },
    { g: 'STANDARDS', gk: '기본 기준', t: '직급별 역할', m: 'POSITION MAP' },
    { g: 'MY POSITION', gk: '내 포지션', t: '내 포지션 표준 절차', role: true },
    { g: 'SERVICE', gk: '서비스', t: '서비스 10단계', m: 'STEPS OF SERVICE' },
    { g: 'SERVICE', gk: '서비스', t: '상황별 응대', m: 'SITUATIONAL PLAYBOOK' },
    { g: 'SERVICE', gk: '서비스', t: '컴플레인 응대', m: 'RECOVERY & COMPLAINT' }
    // 안전·법규(주류/알러지/위생/비상/근로)와 참고 자료(알러지 표·메뉴 지식)는
    // 사용자 요청으로 과정에서 제외. 오픈·마감 체크리스트는 '체크리스트' 탭에 있다.
  ];

  /** 간소화 과정의 페이지 목록 (순서 = COURSE 순서) */
  function coursePages(b) {
    var deck = mainManual(b), out = [], used = {};
    if (!deck) return out;
    COURSE.forEach(function (c) {
      if (c.role) {
        if (!S.me.pos || S.me.pos.indexOf(deck.id) !== 0) return;
        var rn = parseInt(S.me.pos.split(':')[1], 10), rp = pageOf(deck, rn);
        if (rp) out.push({ k: S.me.pos, kind: 'page', g: c.g, gk: c.gk,
                           label: titleMain(rp.title), sub: titleKr(rp.title),
                           deck: deck.id, n: rn });
        return;
      }
      var hit = null;
      deck.pages.forEach(function (p) {
        if (hit || p.divider || used[p.n]) return;
        if (titleMain(p.title).toUpperCase().indexOf(c.m.toUpperCase()) === 0) hit = p;
      });
      if (hit) {
        used[hit.n] = 1;
        // 어디서든 영문 먼저, 국문 번역이 그 아래
        out.push({ k: deck.id + ':' + hit.n, kind: 'page', g: c.g, gk: c.gk,
                   label: titleMain(hit.title), sub: c.t, deck: deck.id, n: hit.n });
      }
    });
    return out;
  }

  /** 필수 항목: 간소화 과정 페이지 + 메뉴 카테고리 전부 */
  function course(b) {
    var out = coursePages(b).map(function (x) {
      return { k: x.k, kind: 'page', ch: x.g, chName: x.gk || x.g,
               label: x.label, deck: x.deck, n: x.n };
    });
    var md = menuDeck(b);
    if (md) {
      catsOf(md).forEach(function (c) {
        out.push({ k: 'menu:' + md.id + ':' + c, kind: 'menu', ch: 'MENU', chName: '메뉴 SOP',
                   label: c, deck: md.id, cat: c });
      });
    }
    return out;
  }
  function progress(b) {
    var c = course(b), n = 0;
    c.forEach(function (x) { if (S.done[x.k]) n++; });
    return { done: n, total: c.length, pct: c.length ? Math.round(n / c.length * 100) : 0, items: c };
  }
  function isDone(k) { return !!S.done[k]; }
  function toggleDone(k) {
    if (S.done[k]) delete S.done[k];
    else S.done[k] = new Date().toISOString();
    if (S.sign) S.sign.stale = true;   // 서명 후 내용이 바뀌면 표시
    save();
  }

  /** 이름·포지션·진도·서명일로 만드는 6자리 대조코드.
   *  씨앗을 전부 보고서 본문에 싣기 때문에, 관리자 화면에서 코드를 다시 계산해
   *  위·변조 여부를 확인할 수 있다. */
  function codeFrom(name, posLabel, brand, done, total, at) {
    var seed = [name, posLabel, brand, done + '/' + total, at].join('|');
    var h = 5381;
    for (var i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '';
    for (var j = 0; j < 6; j++) { out += A[h % 32]; h = Math.floor(h / 32) + 7919; }
    return out;
  }
  function certCode(b) {
    var p = progress(b);
    return codeFrom(S.me.name, S.me.posLabel, b, p.done, p.total, S.sign ? S.sign.at : '');
  }

  /* ── 라우팅 ───────────────────────────────────────── */
  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean).map(decodeURIComponent);
    return { t: parts[0] || 'sop', a: parts[1] || '', b: parts[2] || '', c: parts[3] || '' };
  }
  function go(p) { location.hash = '#/' + p; }

  var TABS = [
    { id: 'sop', en: 'SOP', kr: '매뉴얼', ic: I.book },
    { id: 'menu', en: 'MENU', kr: '메뉴', ic: I.dish },
    { id: 'grill', en: 'GRILL', kr: '그릴영상', ic: I.play, only: 'KSC' },
    { id: 'check', en: 'CHECK', kr: '체크리스트', ic: I.check },
    { id: 'cert', en: 'CERT', kr: '수료', ic: I.award },
    { id: 'admin', en: 'TEAM', kr: '이수확인', ic: I.team }
  ];

  /* ── 레일 / 헤더 ──────────────────────────────────── */
  function renderRail(active) {
    var p = progress(S.brand);
    // 그릴 영상은 KSC 전용 탭이라 다른 브랜드에서는 숨긴다
    var tabs = TABS.filter(function (t) { return !t.only || t.only === S.brand; });
    $rail.innerHTML =
      '<div class="mark">SL&amp;C</div>'
      + tabs.map(function (t) {
        var badge = '';
        if (t.id === 'cert' && p.total && p.done < p.total) badge = '<span class="dot">' + (p.total - p.done) + '</span>';
        if (t.id === 'admin' && (S.team || []).length) badge = '<span class="dot">' + S.team.length + '</span>';
        return '<a class="nv" href="#/' + t.id + '"' + (active === t.id ? ' aria-current="true"' : '') + '>'
          + ico(t.ic) + '<span class="n-en">' + t.en + '</span>'
          + '<span class="n-kr">' + t.kr + '</span>' + badge + '</a>';
      }).join('')
      + '<div class="sp"></div>'
      + '<button class="tog" id="themeTog" aria-label="화면 모드 전환">' + ico(I.moon) + '</button>';
  }

  function renderHead(title, opts) {
    opts = opts || {};
    var h = '<div class="hd-row">';
    if (opts.back) h += '<a class="back" href="#/' + opts.back + '" aria-label="뒤로">' + ico(I.left) + '</a>';
    h += '<div class="ti"><b>' + esc(title) + '</b>'
      + (opts.kicker ? '<span>' + esc(opts.kicker) + '</span>' : '') + '</div>';
    h += '<a class="ic" href="#/search" aria-label="검색">' + ico(I.search) + '</a></div>';
    if (opts.brands !== false) {
      h += '<div class="hd-sub">';
      h += '<div class="bsw">' + BRANDS.map(function (b) {
        var m = BRAND_META[b] || {};
        return '<button class="b-' + b + '" data-setbrand="' + b + '"'
          + (b === S.brand ? ' aria-current="true"' : '') + '>'
          + '<i class="sw"></i><b>' + esc(m.mark || b) + '</b>'
          + '<span>' + esc(m.tag || '') + '</span></button>';
      }).join('') + '</div></div>';
    }
    $hd.innerHTML = h;
  }

  /* ── 공통 조각 ────────────────────────────────────── */
  function ring(pct) {
    var r = 33, c = 2 * Math.PI * r;
    return '<div class="ring"><svg viewBox="0 0 74 74">'
      + '<circle class="bg" cx="37" cy="37" r="' + r + '"/>'
      + '<circle class="fg" cx="37" cy="37" r="' + r + '" stroke-dasharray="' + c.toFixed(1)
      + '" stroke-dashoffset="' + (c * (1 - pct / 100)).toFixed(1) + '"/>'
      + '</svg><b>' + pct + '%</b></div>';
  }
  function rowHtml(href, n, on, title, sub) {
    return '<a class="row" href="' + href + '">'
      + '<span class="n' + (on ? ' on' : '') + '">' + (on ? ico(I.tick) : n) + '</span>'
      + '<span class="tx"><b>' + esc(title) + '</b>'
      + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</span>'
      + '<span class="go">' + ico(I.right) + '</span></a>';
  }

  /* ── 홈 ───────────────────────────────────────────── */
  function hrefOf(x) {
    return x.kind === 'menu'
      ? '#/menu/' + x.deck + '/' + encodeURIComponent(x.cat)
      : '#/p/' + x.deck + '/' + x.n;
  }

  /* ── SOP ──────────────────────────────────────────── */
  /** SOP = 시작 화면. 내 정보·진도와 학습 목록을 한 화면에 함께 보여준다. */
  function viewSopList() {
    var pages = coursePages(S.brand), h = '', g = '', i = 0;
    if (!pages.length) return '<div class="empty">Could not load the course · 과정을 불러오지 못했습니다.</div>';

    var p = progress(S.brand), next = null;
    p.items.forEach(function (x) { if (!next && !S.done[x.k]) next = x; });

    h += '<div class="card pad"><div class="prog">' + ring(p.pct)
      + '<div class="meta"><b>'
      + (S.me.name ? esc(S.me.name) : L('Register your name', '이름을 등록해 주세요')) + '</b>'
      + '<span>' + esc(S.me.posLabel || 'No position set · 포지션 미설정')
      + (S.me.phone ? ' · ' + esc(S.me.phone) : '') + '</span>'
      + '<span>' + esc(BRAND_META[S.brand].name) + ' · ' + p.done + ' / ' + p.total
      + ' done · 항목 완료</span></div></div>';
    if (!S.me.name || !S.me.pos) {
      h += '<a class="btn" href="#/cert" style="margin-top:14px">'
        + L('Register name & position', '이름 · 포지션 등록하기') + '</a>';
    } else if (next) {
      h += '<a class="btn" href="' + hrefOf(next) + '" style="margin-top:14px">'
        + L('Continue · ' + next.label, '이어서 학습') + '</a>';
    } else {
      h += '<a class="btn" href="#/cert" style="margin-top:14px">'
        + L('View certificate', '수료 확인서 보기') + '</a>';
    }
    h += '</div>';

    var dn = 0;
    pages.forEach(function (x) { if (isDone(x.k)) dn++; });
    h += '<h2 class="sect">ONBOARDING MANUAL · 입문 매뉴얼 &nbsp;' + dn + '/' + pages.length + '</h2>';

    pages.forEach(function (x) {
      if (x.g !== g) {
        g = x.g;
        h += (i ? '</div>' : '') + '<h2 class="sect">' + esc(x.g)
          + ' · ' + esc(x.gk || '') + '</h2><div class="list">';
      }
      i++;
      h += rowHtml('#/p/' + x.deck + '/' + x.n, String(i), isDone(x.k), x.label, x.sub);
    });
    return h + '</div>';
  }

  function viewChapter(deckId, ch) {
    var deck = deckById(deckId);
    if (!deck) return '<div class="empty">문서를 찾을 수 없습니다.</div>';
    var chs = chaptersOf(deck), cur = null;
    chs.forEach(function (c) { if (c.ch === ch) cur = c; });
    if (!cur) cur = chs[0];
    var h = '';
    if (cur.sub) h += '<div class="card pad"><div class="note">' + esc(cur.sub) + '</div></div>';
    h += '<div class="list" style="margin-top:12px">';
    cur.pages.forEach(function (p, i) {
      h += rowHtml('#/p/' + deck.id + '/' + p.n, String(i + 1), isDone(deck.id + ':' + p.n),
        titleMain(p.title), titleKr(p.title));
    });
    return h + '</div>';
  }

  /** 원본은 영문·국문을 한 문단에 붙여 쓰기도 하고, 문단을 나눠 쓰기도 한다.
   *  어느 쪽이든 [영문, 국문] 한 쌍으로 묶어 영문 위 / 국문 아래로 보여준다. */
  function pairLines(lines) {
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i];
      var sp = splitEnKr(t);
      if (sp[1]) { out.push(sp); continue; }
      var next = lines[i + 1];
      if (!HANGUL.test(t) && next && HANGUL.test(next) && next.search(HANGUL) < 12) {
        out.push([t, next]); i++; continue;
      }
      out.push(HANGUL.test(t) ? ['', t] : [t, '']);
    }
    return out;
  }

  /** 영문 위 / 국문 아래로 항상 함께 보여준다 */
  function itemHtml(pair, step, forceInk) {
    var en = pair[0], kr = pair[1];
    var inner = '';
    if (en) inner += '<span class="en">' + esc(en) + '</span>';
    if (kr) inner += '<span class="' + (en && !forceInk ? 'kr' : 'en') + '">' + esc(kr) + '</span>';
    if (!inner) return '';
    return step ? '<li><div>' + inner + '</div></li>' : '<li>' + inner + '</li>';
  }

  var STEP_RX = /^[①②③④⑤⑥⑦⑧⑨]|^\d\s*[).]/;

  function blockHtml(b) {
    // 제목 없는 긴 도입 문단은 현장에서 쓸 내용이 아니라 간소화 화면에서 뺀다
    if (!b.head && b.lines.join(' ').length > 60) return '';
    var cls = 'blk' + (b.kind && b.kind !== 'normal' ? ' ' + b.kind : '');
    if (b.lines.length === 1) cls += ' one';
    if (!b.head) cls += ' lead';
    // ① 오픈 · ② 영업 중 처럼 순서가 있는 절차는 번호를 달아 보여준다
    var step = !!b.head && STEP_RX.test(b.head) && b.lines.length > 1;
    if (step) cls += ' step';
    var meta = b.kind === 'meta';
    var h = '<section class="' + cls + '">';
    if (b.head) h += '<h3>' + esc(b.head) + '</h3>';
    if (b.lines.length) {
      h += '<ul>' + pairLines(b.lines).map(function (p) {
        return itemHtml(p, step, meta);
      }).join('') + '</ul>';
    }
    return h + '</section>';
  }
  function tableHtml(rows) {
    if (!rows || !rows.length) return '';
    var wide = 0;
    rows.forEach(function (r) { wide = Math.max(wide, r.length); });
    var hi = -1;
    rows.forEach(function (r, i) { if (r.length === wide && hi < 0) hi = i; });
    if (hi < 0) hi = 0;
    return '<div class="tbl"><table><thead><tr>'
      + rows[hi].map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('')
      + '</tr></thead><tbody>'
      + rows.slice(hi + 1).map(function (r) {
        if (r.length === 1 && wide > 1) {
          return '<tr class="sep"><td colspan="' + wide + '">' + esc(r[0]) + '</td></tr>';
        }
        return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  /** 체크리스트 — 날짜가 바뀌면 자동으로 초기화된다 */
  function clHtml(deckId, n, list) {
    var d = today();
    return list.map(function (c, gi) {
      var done = 0;
      c.items.forEach(function (_, ii) { if (S.daily[d + '|' + deckId + ':' + n + '|' + gi + '|' + ii]) done++; });
      return '<div class="grp card"><h3>' + esc(c.title)
        + '<span>' + done + '/' + c.items.length + '</span></h3>'
        + c.items.map(function (lines, ii) {
          var key = d + '|' + deckId + ':' + n + '|' + gi + '|' + ii;
          var on = !!S.daily[key];
          return '<button class="ck" data-daily="' + esc(key) + '" aria-pressed="' + on + '">'
            + '<span class="box">' + ico(I.tick) + '</span>'
            + '<span class="tx"><b>' + esc(lines[0] || '') + '</b>'
            + (lines[1] ? '<span>' + esc(lines.slice(1).join(' ')) + '</span>' : '') + '</span></button>';
        }).join('') + '</div>';
    }).join('');
  }

  function viewPage(deckId, n) {
    var deck = deckById(deckId);
    if (!deck) return '<div class="empty">문서를 찾을 수 없습니다.</div>';
    var p = pageOf(deck, n);
    if (!p) return '<div class="empty">페이지를 찾을 수 없습니다.</div>';
    if (p.divider) return '<div class="empty">' + esc(p.title) + '</div>';

    var list = coursePages(S.brand), at = -1;
    list.forEach(function (x, i) { if (x.deck === deck.id && x.n === p.n) at = i; });
    var chName = at >= 0 ? (list[at].g + ' · ' + (at + 1) + '/' + list.length) : '';

    var h = '<div class="eyebrow">' + esc(chName) + '</div>'
      + '<h2 class="ph">' + esc(titleMain(p.title))
      + (titleKr(p.title) ? '<span class="kr">' + esc(titleKr(p.title)) + '</span>' : '') + '</h2>'
      + (p.badge ? '<div class="pb">' + esc(p.badge) + '</div>' : '');

    // 원본 세로 순서를 그대로 따라간다 (같은 줄은 좌→우)
    var items = [];
    (p.blocks || []).forEach(function (b) { items.push({ y: b.y, x: b.x, html: blockHtml(b) }); });
    (p.images || []).forEach(function (im) {
      items.push({ y: im.y, x: im.x, html: '<figure class="shot"><img src="' + esc(im.src)
        + '" alt="" loading="lazy"></figure>' });
    });
    items.sort(function (a, b) { return a.y - b.y; });
    var rows = [];
    items.forEach(function (it) {
      var last = rows[rows.length - 1];
      if (last && it.y - last[0].y < 0.25) last.push(it); else rows.push([it]);
    });
    var out = [];
    rows.forEach(function (r) {
      r.sort(function (a, b) { return a.x - b.x; });
      out = out.concat(r);
    });
    h += '<div class="blocks">' + out.map(function (i) { return i.html; }).join('') + '</div>';

    if ((p.checklist || []).length) h += '<div style="margin-top:12px">' + clHtml(deck.id, p.n, p.checklist) + '</div>';
    (p.tables || []).forEach(function (t) { h += '<div style="margin-top:10px">' + tableHtml(t) + '</div>'; });

    var key = deck.id + ':' + p.n, on = isDone(key);
    h += '<button class="done" data-done="' + esc(key) + '" aria-pressed="' + on + '">'
      + ico(on ? I.tick : I.check)
      + (on ? L('Completed · ' + S.done[key].slice(0, 10), '학습 완료')
            : L('I have studied this', '이 내용을 학습했습니다')) + '</button>';

    var nx = at >= 0 ? list[at + 1] : null;
    if (nx) h += '<a class="btn sec2" style="margin-top:10px" href="#/p/' + nx.deck + '/' + nx.n + '">'
      + L('Next · ' + nx.label, '다음') + '</a>';
    else if (at >= 0) h += '<a class="btn sec2" style="margin-top:10px" href="#/cert">'
      + L('Course complete · go to certificate', '과정 끝 · 수료 확인으로') + '</a>';
    return h;
  }

  /* ── 메뉴 ─────────────────────────────────────────── */
  function viewMenu(cat) {
    var deck = menuDeck(S.brand);
    if (!deck) return '<div class="empty">No menu data · 메뉴 자료가 없습니다.</div>';
    var cats = catsOf(deck);
    var items = deck.items.map(function (it, i) { return { it: it, i: i }; });
    if (cat) items = items.filter(function (x) { return x.it.chip === cat; });

    var h = '<div class="chips"><button data-cat=""' + (cat ? '' : ' aria-pressed="true"') + '>ALL 전체 '
      + deck.items.length + '</button>'
      + cats.map(function (c) {
        var n = deck.items.filter(function (it) { return it.chip === c; }).length;
        var ok = isDone('menu:' + deck.id + ':' + c);
        return '<button data-cat="' + esc(c) + '"' + (cat === c ? ' aria-pressed="true"' : '') + '>'
          + (ok ? '✓ ' : '') + esc(c) + ' ' + n + '</button>';
      }).join('') + '</div>';

    h += '<div class="mg">' + items.map(function (x) {
      var it = x.it;
      return '<button class="mc" data-item="' + x.i + '">'
        + '<span class="im">' + (it.img
          ? '<img src="' + esc(thumb(it.img)) + '" alt="' + esc(it.en)
            + '" loading="lazy" decoding="async">'
          : '<span class="no">PHOTO<br>준비 중</span>') + '</span>'
        + '<span class="bd"><b>' + esc(it.en) + '</b>'
        + (it.kr ? '<span>' + esc(it.kr) + '</span>' : '')
        + (it.price ? '<i>' + esc(it.price) + '</i>' : '') + '</span></button>';
    }).join('') + '</div>';

    if (cat) {
      var k = 'menu:' + deck.id + ':' + cat, on = isDone(k);
      h += '<button class="done" data-done="' + esc(k) + '" aria-pressed="' + on + '">'
        + ico(on ? I.tick : I.check)
        + (on ? L(cat + ' completed', '학습 완료') : L('I have studied ' + cat, '이 메뉴를 학습했습니다'))
        + '</button>';
    }
    return h;
  }

  function openSheet(i) {
    var deck = menuDeck(S.brand), it = deck.items[i];
    if (!it) return;
    var h = it.img ? '<div class="hero"><img src="' + esc(it.img) + '" alt=""></div>' : '';
    h += '<div style="padding:20px 20px 6px">'
      + (it.chip ? '<div class="eyebrow">' + esc(it.chip) + '</div>' : '')
      + '<h2 class="ph" style="font-size:24px">' + esc(it.en)
      + (it.kr ? '<span class="kr">' + esc(it.kr) + '</span>' : '') + '</h2>'
      + (it.price ? '<div style="margin-top:12px;font-size:23px;font-weight:800;color:var(--pri-t);'
        + 'font-family:Archivo,sans-serif">' + esc(it.price) + '</div>' : '')
      + '</div>';
    it.sections.forEach(function (s) {
      var cls = s.en === 'SUGGESTIVE SELLING' ? ' sell' : (s.en === 'ALLERGENS' ? ' alg' : '');
      h += '<div class="sec' + cls + '"><h4>' + esc(s.en) + ' · ' + esc(s.kr) + '</h4>'
        + s.lines.map(function (l) {
          return '<p class="' + (HANGUL.test(l) ? 'kr' : 'en') + '">' + esc(l) + '</p>';
        }).join('') + '</div>';
    });
    $sheetBody.innerHTML = h;
    $sheet.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    $sheet.hidden = true; $sheetBody.innerHTML = ''; document.body.style.overflow = '';
  }

  /* ── 그릴 영상 (KSC 전용) ─────────────────────────── */
  var VIDEOS = null;   // video/index.json 을 처음 열 때 한 번 읽는다

  function viewGrill() {
    if (S.brand !== 'KSC') {
      return '<div class="empty">Grill videos are for KSC only<br>그릴 영상은 KSC 전용입니다.</div>';
    }
    if (!VIDEOS) return '<div class="empty">Loading · 불러오는 중…</div>';
    if (!VIDEOS.length) return '<div class="empty">No videos · 영상이 없습니다.</div>';

    var h = '<div class="card pad"><div class="note">'
      + 'How each cut is grilled. Watch before your first shift, and again at the table.<br>'
      + '부위별 굽는 방법입니다. 첫 근무 전에 보고, 테이블에서 다시 확인하세요.</div></div>';

    h += '<div class="vids">' + VIDEOS.map(function (v) {
      return '<figure class="vid">'
        + '<video controls playsinline preload="none" poster="video/' + esc(v.id) + '.jpg">'
        + '<source src="video/' + esc(v.id) + '.mp4" type="video/mp4">'
        + '</video>'
        + '<figcaption><b>' + esc(v.en) + '</b><span>' + esc(v.kr) + '</span>'
        + '<p>' + esc(v.note) + '</p></figcaption></figure>';
    }).join('') + '</div>';
    return h;
  }

  /* ── 체크리스트 탭 ─────────────────────────────────── */
  function viewCheck() {
    var deck = mainManual(S.brand);
    var pages = (deck.pages || []).filter(function (p) { return (p.checklist || []).length; });
    if (!pages.length) return '<div class="empty">No checklist · 체크리스트가 없습니다.</div>';
    var h = '<div class="card pad"><div class="note">'
      + 'For today (' + today() + '). Resets automatically when the date changes.<br>'
      + '오늘(' + today() + ') 기준입니다. 날짜가 바뀌면 자동으로 초기화됩니다.</div></div>';
    pages.forEach(function (p) {
      h += '<h2 class="sect">' + esc(titleMain(p.title)) + '</h2>' + clHtml(deck.id, p.n, p.checklist);
    });
    return h;
  }

  /* ── 수료 ─────────────────────────────────────────── */
  function viewCert() {
    var p = progress(S.brand), full = p.total && p.done === p.total;
    var poss = positionsOf(S.brand);
    var h = '<div class="card pad">'
      + '<div class="fg"><label class="fl" for="nm">NAME · 이름</label>'
      + '<input class="fi" id="nm" data-me="name" value="' + esc(S.me.name) + '" placeholder="홍길동"></div>'
      + '<div class="fg"><label class="fl" for="ph">LAST 4 DIGITS · 연락처 뒤 4자리</label>'
      + '<input class="fi" id="ph" data-me="phone" inputmode="numeric" maxlength="4" value="'
      + esc(S.me.phone || '') + '" placeholder="동명이인 구분용"></div>'
      + '<div class="fg"><label class="fl" for="ps">POSITION · 포지션</label>'
      + '<select class="fi" id="ps" data-me="pos">'
      + '<option value="">Select · 선택하세요</option>';
    ['FOH', 'BOH', 'MGMT'].forEach(function (g) {
      var sub = poss.filter(function (x) { return x.group === g; });
      if (!sub.length) return;
      h += '<optgroup label="' + g + '">' + sub.map(function (x) {
        return '<option value="' + esc(x.id) + '"' + (S.me.pos === x.id ? ' selected' : '') + '>'
          + esc(x.label) + (x.kr ? ' · ' + esc(x.kr) : '') + '</option>';
      }).join('') + '</optgroup>';
    });
    h += '</select></div>'
      + '<div class="fg" style="margin-bottom:0"><label class="fl">PROGRESS · 진도</label>'
      + '<div style="display:flex;justify-content:space-between;font-size:13px">'
      + '<span>' + p.done + ' / ' + p.total + ' items · 항목</span><b>' + p.pct + '%</b></div>'
      + '<div class="bar"><i style="width:' + p.pct + '%"></i></div></div></div>';

    h += '<h2 class="sect">REMAINING · 남은 항목</h2>';
    var left = p.items.filter(function (x) { return !S.done[x.k]; });
    if (!left.length) {
      h += '<div class="card pad"><div class="note">All required items are complete. '
        + 'Get your trainer signature below.<br>모든 필수 항목을 완료했습니다. '
        + '아래에서 트레이너 서명을 받으세요.</div></div>';
    } else {
      h += '<div class="list">' + left.slice(0, 40).map(function (x) {
        return rowHtml(hrefOf(x), x.ch, false, x.label, x.chName);
      }).join('') + '</div>';
      if (left.length > 40) h += '<div class="note" style="margin-top:8px">외 ' + (left.length - 40) + '개</div>';
    }

    h += '<h2 class="sect">TRAINER SIGN-OFF · 트레이너 확인</h2><div class="card pad">';
    if (S.sign && !S.sign.stale) {
      h += '<img src="' + esc(S.sign.img) + '" alt="서명" style="width:100%;border-radius:10px;background:#fff">'
        + '<div class="note" style="margin-top:8px"><b>' + esc(S.sign.by) + '</b> · ' + esc(S.sign.at) + '</div>'
        + '<button class="btn sec2" style="margin-top:12px" data-sigclear>'
        + L('Sign again', '서명 다시 받기') + '</button>';
    } else {
      if (S.sign && S.sign.stale) {
        h += '<div class="note" style="color:var(--crit);margin-bottom:10px">'
          + 'Items changed after signing, so the signature was voided. Please sign again.<br>'
          + '서명 이후 학습 항목이 변경되어 서명이 무효 처리되었습니다. 다시 받아주세요.</div>';
      }
      h += '<div class="fg"><label class="fl" for="tn">TRAINER NAME · 트레이너 이름</label>'
        + '<input class="fi" id="tn" placeholder="Trainer · 교육 담당자"></div>'
        + '<div class="sigw"><canvas class="sig" id="sig"></canvas>'
        + '<div class="hint" id="sigHint">Sign here with your finger · 여기에 손가락으로 서명</div></div>'
        + '<div style="display:flex;gap:8px;margin-top:10px">'
        + '<button class="btn sec2" data-sigreset>' + L('Clear', '지우기') + '</button>'
        + '<button class="btn" data-sigsave' + (full ? '' : ' disabled') + '>'
        + L('Save signature', '서명 저장') + '</button></div>'
        + (full ? '' : '<div class="note" style="margin-top:8px">Complete every item before signing.<br>'
          + '모든 항목을 완료해야 서명할 수 있습니다.</div>');
    }
    h += '</div>';

    if (S.sign && !S.sign.stale && full && S.me.name) {
      var code = certCode(S.brand);
      h += '<h2 class="sect">CERTIFICATE · 수료 확인서</h2>'
        + '<div class="cert"><div class="ey">삼천리 SL&amp;C · ' + esc(S.brand) + ' BREA</div>'
        + '<h3>' + esc(S.me.name) + '</h3>'
        + '<div class="who">' + esc(S.me.posLabel || '') + ' · ' + p.done + ' items · 항목 이수</div>'
        + '<div class="code">' + code + '</div>'
        + '<div class="cl">VERIFICATION CODE · 확인 코드 — 매니저에게 전달</div></div>'
        + '<button class="btn" style="margin-top:12px" data-share>' + ico(I.share)
        + L('Share my completion', '수료 내용 공유하기') + '</button>'
        + '<button class="btn sec2" style="margin-top:8px" data-copy>' + ico(I.copy)
        + L('Copy as text', '텍스트 복사') + '</button>';
    }

    h += '<h2 class="sect">RECORD · 기록</h2><div class="card pad">'
      + '<div class="note">Your record is stored only on this phone. Clearing browser data erases it, '
      + 'so always send your completion to the manager when you finish.<br>'
      + '학습 기록은 이 휴대폰에만 저장됩니다. 브라우저 데이터를 지우면 사라지니, '
      + '완료 후에는 반드시 수료 내용을 매니저에게 전달하세요.</div>'
      + '<button class="btn sec2" style="margin-top:12px" data-reset>' + ico(I.reset)
      + L('Reset my record', '내 기록 초기화') + '</button></div>';

    return h;
  }

  /* ── 관리자(트레이너) — 팀 수료 현황 ─────────────── */
  function viewAdmin() {
    var team = S.team || [];
    // 코드가 검증된 보고만 수료로 센다
    var full = team.filter(function (r) { return r.ok && r.total && r.done >= r.total; }).length;
    var bad = team.filter(function (r) { return !r.ok; }).length;

    var h = '<div class="card pad"><div class="prog">'
      + ring(team.length ? Math.round(full / team.length * 100) : 0)
      + '<div class="meta"><b>' + full + ' / ' + team.length + '명 수료</b>'
      + '<span>' + esc(BRAND_META[S.brand].name) + '</span>'
      + (bad ? '<span style="color:var(--crit)">확인코드 불일치 ' + bad + '건</span>'
             : '<span>모든 코드 정상</span>') + '</div></div></div>';

    h += '<h2 class="sect">COLLECT REPORTS · 수료 보고 받기</h2><div class="card pad">'
      + '<div class="note">Paste the <b>completion reports</b> staff sent you. '
      + 'Several at once is fine — codes are recalculated to detect tampering.<br>'
      + '직원이 보낸 <b>수료 보고</b>를 그대로 붙여넣으세요. 여러 건을 한꺼번에 붙여넣어도 됩니다. '
      + '확인코드는 자동으로 다시 계산해 위·변조를 검사합니다.</div>'
      + '<textarea class="fi ta" id="paste" placeholder="#SLNC 교육 수료 보고&#10;브랜드: KSC&#10;이름: ..."></textarea>'
      + '<button class="btn" style="margin-top:10px" data-import>'
      + L('Import reports', '보고서 읽어들이기') + '</button></div>';

    h += '<h2 class="sect">TEAM STATUS · 팀 현황 (' + team.length + ')</h2>';
    if (!team.length) {
      h += '<div class="empty">No reports yet · 아직 등록된 보고가 없습니다.</div>';
    } else {
      h += '<div class="tbl"><table><thead><tr>'
        + '<th>이름</th><th>연락처</th><th>포지션</th><th>진도</th><th>서명일</th><th>코드</th><th></th>'
        + '</tr></thead><tbody>'
        + team.map(function (r, i) {
          var done = r.total && r.done >= r.total;
          return '<tr><td>' + esc(r.name) + '</td><td>' + esc(r.phone || '-') + '</td>'
            + '<td>' + esc(r.pos) + '</td>'
            + '<td>' + r.done + '/' + r.total + '</td>'
            + '<td>' + esc(r.at) + '</td>'
            + '<td style="font-family:Archivo,monospace;letter-spacing:.06em">' + esc(r.code) + '</td>'
            + '<td style="white-space:nowrap">'
            + (r.ok ? (done ? '<b style="color:var(--good)">수료</b>' : '<span>진행중</span>')
                    : '<b style="color:var(--crit)">코드 불일치</b>')
            + ' <button data-drop="' + i + '" style="color:var(--mut2);padding:0 4px">✕</button>'
            + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      h += '<button class="btn sec2" style="margin-top:12px" data-teamcopy>' + ico(I.copy)
        + L('Copy table (for Excel)', '현황 표 복사') + '</button>';
    }

    h += '<h2 class="sect">NOTE · 안내</h2><div class="card pad"><div class="note">'
      + 'This status is stored <b>only on this device</b>. Sharing it live between managers '
      + 'would need a shared store.<br>'
      + '이 현황은 <b>이 기기에만</b> 저장됩니다. 여러 매니저가 실시간으로 함께 보려면 공용 저장소가 필요합니다.'
      + '</div><button class="btn sec2" style="margin-top:12px" data-teamreset>'
      + ico(I.reset) + L('Clear team status', '팀 현황 비우기') + '</button></div>';
    return h;
  }

  function teamTsv() {
    return ['이름\t연락처\t포지션\t브랜드\t진도\t트레이너\t서명일\t확인코드\t상태']
      .concat((S.team || []).map(function (r) {
        return [r.name, r.phone || '', r.pos, r.brand, r.done + '/' + r.total, r.by, r.at, r.code,
          r.ok ? (r.done >= r.total ? '수료' : '진행중') : '코드 불일치'].join('\t');
      })).join('\n');
  }

  /** 관리자 화면이 그대로 붙여넣기로 읽어들이는 보고서. 라벨 형식을 바꾸면 파서도 함께 고칠 것. */
  function certText() {
    var p = progress(S.brand);
    return ['#SLNC 교육 수료 보고',
      '브랜드: ' + S.brand,
      '이름: ' + S.me.name,
      '연락처: ' + (S.me.phone || '-'),
      '포지션: ' + (S.me.posLabel || '-'),
      '진도: ' + p.done + '/' + p.total,
      '트레이너: ' + (S.sign ? S.sign.by : '-'),
      '서명일: ' + (S.sign ? S.sign.at : '-'),
      '확인코드: ' + certCode(S.brand)].join('\n');
  }

  /** 카톡으로 받은 보고서를 한꺼번에 붙여넣어도 건별로 잘라 읽는다. */
  function parseReports(txt) {
    var out = [];
    String(txt).split(/#SLNC/).forEach(function (chunk) {
      if (!/이름\s*:/.test(chunk)) return;
      function f(label) {
        var m = new RegExp(label + '\\s*:\\s*(.+)').exec(chunk);
        return m ? m[1].trim() : '';
      }
      var prog = f('진도').split('/');
      var r = {
        brand: f('브랜드'), name: f('이름'), phone: f('연락처'), pos: f('포지션'),
        done: parseInt(prog[0], 10) || 0, total: parseInt(prog[1], 10) || 0,
        by: f('트레이너'), at: f('서명일'), code: f('확인코드').toUpperCase()
      };
      if (!r.name || !r.code) return;
      r.ok = codeFrom(r.name, r.pos, r.brand, r.done, r.total, r.at) === r.code;
      r.id = r.brand + '|' + r.name + '|' + r.phone + '|' + r.pos;
      out.push(r);
    });
    return out;
  }

  /* ── 검색 ─────────────────────────────────────────── */
  function buildIndex() {
    INDEX = [];
    DATA.forEach(function (deck) {
      if (deck.kind === 'menu') {
        deck.items.forEach(function (it, i) {
          var body = it.sections.map(function (s) { return s.lines.join(' '); }).join(' ');
          INDEX.push({ brand: deck.brand, kind: '메뉴 · ' + (it.chip || ''),
            title: it.en + (it.kr ? ' · ' + it.kr : ''), sub: body.slice(0, 120),
            text: (it.en + ' ' + it.kr + ' ' + it.chip + ' ' + body).toLowerCase(),
            href: '#/menu/' + deck.id + '/' + encodeURIComponent(it.chip || '') });
        });
        return;
      }
      // 간소화 과정에서 뺀 장은 검색에도 걸리지 않게 한다
      var keep = {}, role = {};
      chaptersOf(deck).forEach(function (c) {
        if (['03', '04'].indexOf(c.ch) < 0) return;
        c.pages.forEach(function (pg) { role[pg.n] = 1; });
      });
      COURSE.forEach(function (c) {
        if (c.role) return;
        deck.pages.forEach(function (pg) {
          if (!pg.divider && titleMain(pg.title).toUpperCase().indexOf(c.m) === 0) keep[pg.n] = 1;
        });
      });
      deck.pages.forEach(function (p) {
        if (p.divider || !(keep[p.n] || role[p.n])) return;
        var parts = [];
        (p.blocks || []).forEach(function (b) { parts.push(b.head, b.lines.join(' ')); });
        (p.checklist || []).forEach(function (c) {
          parts.push(c.title);
          c.items.forEach(function (l) { parts.push(l.join(' ')); });
        });
        (p.tables || []).forEach(function (t) { t.forEach(function (r) { parts.push(r.join(' ')); }); });
        var body = parts.filter(Boolean).join(' ');
        INDEX.push({ brand: deck.brand, kind: 'SOP · p' + p.n, title: p.title,
          sub: body.slice(0, 130), text: (p.title + ' ' + p.badge + ' ' + body).toLowerCase(),
          href: '#/p/' + deck.id + '/' + p.n });
      });
    });
  }
  function hl(s, terms) {
    var out = esc(s);
    terms.forEach(function (t) {
      if (!t) return;
      out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
    });
    return out;
  }
  function viewSearch() {
    var h = '<div class="fg"><input class="fi" id="sq" placeholder="Search · 메뉴 · 포지션 · 규정 검색"'
      + ' value="' + esc(S.q) + '" autocomplete="off"></div>';
    var q = S.q.trim();
    if (q.length < 1) return h + '<div class="empty">찾을 내용을 입력하세요.</div>';
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    var hits = INDEX.filter(function (e) {
      return terms.every(function (t) { return e.text.indexOf(t) >= 0; });
    });
    hits.sort(function (a, b) { return (a.brand === S.brand ? -1 : 0) - (b.brand === S.brand ? -1 : 0); });
    if (!hits.length) return h + '<div class="empty">No matches · 일치하는 내용이 없습니다.</div>';
    return h + '<div class="res">' + hits.slice(0, 60).map(function (e) {
      return '<a href="' + e.href + '"><div class="k">' + esc(e.brand) + ' · ' + esc(e.kind) + '</div>'
        + '<div class="t">' + hl(e.title, terms) + '</div>'
        + '<div class="s">' + hl(e.sub, terms) + '…</div></a>';
    }).join('') + '</div>';
  }

  /* ── 렌더 ─────────────────────────────────────────── */
  function render() {
    var r = route();
    document.documentElement.dataset.brand = S.brand;
    if (S.theme) document.documentElement.dataset.theme = S.theme;
    else delete document.documentElement.dataset.theme;

    var tab = r.t, body = '', title = '', opts = {};
    if (tab === 'sop') {
      body = viewSopList(); title = 'ONBOARDING MANUAL'; opts.kicker = '입문 매뉴얼 · 간소화';
    }
    else if (tab === 'p') {
      var d2 = deckById(r.a), p2 = d2 && pageOf(d2, parseInt(r.b, 10));
      body = viewPage(r.a, parseInt(r.b, 10));
      title = p2 ? titleMain(p2.title) : 'SOP';
      opts.back = 'sop';
      opts.kicker = '입문 매뉴얼 · 간소화';
      opts.brands = false;   // 본문에서는 제목에 폭을 양보
    }
    else if (tab === 'menu') {
      body = viewMenu(r.b ? decodeURIComponent(r.b) : '');
      title = r.b ? decodeURIComponent(r.b) : 'MENU SOP';
      opts.kicker = r.b ? '메뉴' : '메뉴 SOP';
      if (r.b) opts.back = 'menu';
    }
    else if (tab === 'grill') {
      body = viewGrill(); title = 'GRILL VIDEO'; opts.kicker = '그릴 영상';
      if (!VIDEOS) {
        fetch('video/index.json').then(function (r) { return r.json(); })
          .then(function (j) { VIDEOS = j; render(); })
          .catch(function () { VIDEOS = []; render(); });
      }
    }
    else if (tab === 'check') { body = viewCheck(); title = 'CHECKLIST'; opts.kicker = '오픈 · 마감 체크리스트'; }
    else if (tab === 'cert') { body = viewCert(); title = 'MY CERTIFICATE'; opts.kicker = '내 교육 수료'; }
    else if (tab === 'admin') {
      if (!S.adminOn) { S.adminOn = 1; save(); }
      body = viewAdmin(); title = 'TEAM STATUS'; opts.kicker = '팀 수료 현황 · 관리자';
    }
    else if (tab === 'search') {
      if (r.a) S.q = decodeURIComponent(r.a);   // #/search/갈비 처럼 바로 열 수 있게
      body = viewSearch(); title = 'SEARCH'; opts.kicker = '검색';
    }
    else { body = viewSopList(); tab = 'sop'; title = 'ONBOARDING MANUAL'; opts.kicker = '입문 매뉴얼'; }

    renderRail(tab === 'p' ? 'sop' : tab);
    renderHead(title, opts);
    $main.innerHTML = body;
    if (tab === 'cert') mountSig();
    if (tab === 'search') {
      var el = document.getElementById('sq');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }
  }
  function keepScroll(fn) {
    var y = window.scrollY; fn(); render(); window.scrollTo(0, y);
  }

  /* ── 서명 패드 ────────────────────────────────────── */
  var sigCtx = null, sigDrawn = false;
  function mountSig() {
    var cv = document.getElementById('sig');
    if (!cv) { sigCtx = null; return; }
    var rect = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = rect.width * dpr; cv.height = rect.height * dpr;
    sigCtx = cv.getContext('2d');
    sigCtx.scale(dpr, dpr);
    sigCtx.lineWidth = 2.2; sigCtx.lineCap = 'round'; sigCtx.lineJoin = 'round';
    sigCtx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--ink').trim() || '#16202E';
    sigDrawn = false;
    var drawing = false;
    function pos(e) {
      var r = cv.getBoundingClientRect(), t = e.touches ? e.touches[0] : e;
      return [t.clientX - r.left, t.clientY - r.top];
    }
    function start(e) {
      e.preventDefault(); drawing = true; sigDrawn = true;
      var h = document.getElementById('sigHint'); if (h) h.hidden = true;
      var p = pos(e); sigCtx.beginPath(); sigCtx.moveTo(p[0], p[1]);
    }
    function move(e) { if (!drawing) return; e.preventDefault(); var p = pos(e); sigCtx.lineTo(p[0], p[1]); sigCtx.stroke(); }
    function end() { drawing = false; }
    cv.addEventListener('pointerdown', start);
    cv.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
  }

  /* ── 이벤트 ───────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var t;
    // 주의: <html>에도 data-brand가 있다(CSS용). 클릭 판정은 반드시 data-setbrand로.
    if (t = e.target.closest('[data-setbrand]')) {
      S.brand = t.dataset.setbrand; save();
      var was = location.hash;
      go('sop');
      if (location.hash === was) render();   // 이미 같은 화면이면 hashchange가 안 온다
      return;
    }
    if (e.target.closest('#themeTog')) {
      var cur = S.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      S.theme = cur === 'dark' ? 'light' : 'dark'; save(); render(); return;
    }
    if (t = e.target.closest('[data-done]')) { keepScroll(function () { toggleDone(t.dataset.done); }); return; }
    if (t = e.target.closest('[data-daily]')) {
      var k = t.dataset.daily;
      keepScroll(function () {
        if (S.daily[k]) delete S.daily[k]; else S.daily[k] = 1;
        save();
      });
      return;
    }
    if (t = e.target.closest('[data-cat]')) {
      var c = t.dataset.cat;
      go('menu/' + menuDeck(S.brand).id + (c ? '/' + encodeURIComponent(c) : '')); return;
    }
    if (t = e.target.closest('[data-item]')) { openSheet(parseInt(t.dataset.item, 10)); return; }
    if (e.target.closest('[data-close]')) { closeSheet(); return; }
    if (e.target.closest('[data-sigreset]')) {
      var cv = document.getElementById('sig');
      if (cv && sigCtx) { sigCtx.clearRect(0, 0, cv.width, cv.height); sigDrawn = false; }
      var hh = document.getElementById('sigHint'); if (hh) hh.hidden = false;
      return;
    }
    if (e.target.closest('[data-sigsave]')) {
      var cv2 = document.getElementById('sig');
      var by = (document.getElementById('tn') || {}).value || '';
      if (!sigDrawn) { alert('서명을 입력해 주세요.'); return; }
      if (!by.trim()) { alert('트레이너 이름을 입력해 주세요.'); return; }
      S.sign = { img: cv2.toDataURL('image/png'), by: by.trim(), at: today(), stale: false };
      save(); render(); return;
    }
    if (e.target.closest('[data-sigclear]')) { S.sign = null; save(); render(); return; }
    if (e.target.closest('[data-copy]')) {
      var txt = certText();
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { alert('복사되었습니다.'); });
      else prompt('아래 내용을 복사하세요', txt);
      return;
    }
    if (e.target.closest('[data-share]')) {
      var txt2 = certText();
      if (navigator.share) navigator.share({ title: '교육 수료 보고', text: txt2 }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(txt2).then(function () { alert('복사되었습니다. 카톡에 붙여넣어 주세요.'); });
      else prompt('아래 내용을 복사하세요', txt2);
      return;
    }
    if (e.target.closest('[data-import]')) {
      var ta = document.getElementById('paste');
      var got = parseReports(ta ? ta.value : '');
      if (!got.length) { alert('읽을 수 있는 수료 보고가 없습니다.'); return; }
      S.team = S.team || [];
      var add = 0, upd = 0;
      got.forEach(function (r) {
        var at = -1;
        S.team.forEach(function (x, i) { if (x.id === r.id) at = i; });
        if (at >= 0) { S.team[at] = r; upd++; } else { S.team.push(r); add++; }
      });
      save(); render();
      alert('새로 ' + add + '건, 갱신 ' + upd + '건 반영했습니다.');
      return;
    }
    if (t = e.target.closest('[data-drop]')) {
      S.team.splice(parseInt(t.dataset.drop, 10), 1); save(); render(); return;
    }
    if (e.target.closest('[data-teamcopy]')) {
      var tsv = teamTsv();
      if (navigator.clipboard) navigator.clipboard.writeText(tsv).then(function () { alert('복사되었습니다.'); });
      else prompt('아래 내용을 복사하세요', tsv);
      return;
    }
    if (e.target.closest('[data-teamreset]')) {
      if (!confirm('모아둔 팀 현황을 모두 지웁니다. 계속할까요?')) return;
      S.team = []; save(); render(); return;
    }
    if (e.target.closest('[data-reset]')) {
      if (!confirm('학습 기록과 서명을 모두 지웁니다. 계속할까요?')) return;
      S.done = {}; S.daily = {}; S.sign = null; save(); render(); return;
    }
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.me) {
      if (t.dataset.me === 'pos') {
        S.me.pos = t.value;
        var f = positionsOf(S.brand).filter(function (x) { return x.id === t.value; })[0];
        S.me.posLabel = f ? f.label + (f.kr ? ' · ' + f.kr : '') : '';
        save(); render(); return;
      }
      S.me[t.dataset.me] = t.value;
      if (!S.me.start) S.me.start = today();
      save(); return;
    }
    if (t.id === 'sq') {
      S.q = t.value;
      var y = window.scrollY; render(); window.scrollTo(0, y);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSheet();
  });
  window.addEventListener('hashchange', function () { closeSheet(); render(); window.scrollTo(0, 0); });

  /* ── 시작 ─────────────────────────────────────────── */
  fetch('data.json?v=' + (document.currentScript && document.currentScript.src.split('v=')[1] || '1'))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      DATA = d;
      DATA.forEach(function (x) { if (BRANDS.indexOf(x.brand) < 0) BRANDS.push(x.brand); });
      if (BRANDS.indexOf(S.brand) < 0) S.brand = BRANDS[0];
      buildIndex();
      render();
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
    })
    .catch(function (err) {
      $main.innerHTML = '<div class="empty">자료를 불러오지 못했습니다.<br><small>' + esc(err.message) + '</small></div>';
    });
})();
