/* 삼천리 SL&C 브랜드별 SOP 대시보드
 * 원본 교육자료(PPTX)에서 추출한 data.json을 목차 순서 그대로 렌더링한다. */
(function () {
  'use strict';

  var DATA = [], BRANDS = [], INDEX = [];
  var $main = document.getElementById('main');
  var $toc = document.getElementById('toc');
  var $brands = document.getElementById('brands');
  var $q = document.getElementById('q');
  var $qclear = document.getElementById('qclear');
  var $sheet = document.getElementById('sheet');
  var $sheetBody = document.getElementById('sheetBody');

  var BRAND_META = {
    KSC: { name: 'KALBI SOCIAL CLUB', short: 'KSC', kr: '칼비 소셜 클럽 · 코리안 바비큐' },
    WASA: { name: 'ROBATA WASA', short: 'WASA', kr: '로바타 와사 · 이자카야 · 스시' }
  };

  /* ── 유틸 ─────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  var HANGUL = /[가-힣]/;

  /** "English sentence. 한국어 문장." -> EN / KR 두 줄로 분리.
   *  "LA 갈비"처럼 짧은 혼합 표기는 자르지 않는다. */
  function splitEnKr(t) {
    var i = t.search(HANGUL);
    if (i < 25) return [t, ''];
    var en = t.slice(0, i).trim();
    var kr = t.slice(i).trim();
    if (!kr || en.split(/\s+/).length < 4) return [t, ''];
    return [en, kr];
  }

  function lineHtml(t) {
    var p = splitEnKr(t);
    if (!p[1]) return '<li class="' + (HANGUL.test(t) ? '' : 'en') + '">' + esc(t) + '</li>';
    return '<li><span class="en">' + esc(p[0]) + '</span><br>' + esc(p[1]) + '</li>';
  }

  function slug(s) { return String(s).replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase(); }
  function titleMain(t) { return String(t).split('|')[0].trim(); }
  function titleKr(t) {
    var p = String(t).split('|').slice(1).join(' · ').trim();
    return p;
  }

  /* ── 라우팅 ───────────────────────────────────────── */
  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    var qi = h.indexOf('?');
    var query = qi >= 0 ? h.slice(qi + 1) : '';
    if (qi >= 0) h = h.slice(0, qi);
    var parts = h.split('/').filter(Boolean).map(decodeURIComponent);
    return { brand: parts[0] || '', view: parts[1] || '', arg: parts[2] || '', query: query };
  }
  function go(path) { location.hash = '#/' + path; }

  function currentBrand() {
    var b = route().brand;
    if (b === 'search') return sessionStorage.getItem('brand') || BRANDS[0];
    return BRANDS.indexOf(b) >= 0 ? b : BRANDS[0];
  }

  /* ── 데이터 헬퍼 ───────────────────────────────────── */
  function decksOf(brand) { return DATA.filter(function (d) { return d.brand === brand; }); }
  function deckById(id) {
    for (var i = 0; i < DATA.length; i++) if (DATA[i].id === id) return DATA[i];
    return null;
  }
  /** 매뉴얼 덱을 챕터 단위로 묶는다 (표지 페이지 = 챕터 시작). */
  function chaptersOf(deck) {
    var out = [], cur = null;
    deck.pages.forEach(function (p) {
      if (p.divider) {
        cur = { ch: p.ch, name: p.title, sub: p.sub || '', pages: [] };
        out.push(cur);
        return;
      }
      if (!cur) {
        cur = { ch: '', name: '표지 · 목차', sub: '', pages: [] };
        out.push(cur);
      }
      cur.pages.push(p);
    });
    return out.filter(function (c) { return c.pages.length; });
  }

  /* ── 목차 ─────────────────────────────────────────── */
  function renderBrands() {
    $brands.innerHTML = BRANDS.map(function (b) {
      return '<button data-brand="' + esc(b) + '">' + esc(BRAND_META[b] ? BRAND_META[b].short : b) + '</button>';
    }).join('');
    $brands.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-brand]');
      if (btn) go(btn.dataset.brand);
    });
  }

  function renderToc(brand, active) {
    var html = '';
    decksOf(brand).forEach(function (deck) {
      if (deck.kind === 'menu') {
        html += '<div class="toc-sep"></div><div class="toc-group"><div class="toc-h">'
          + '<span class="ch">M</span>' + esc(deck.title) + '</div><div class="toc">';
        html += '<a href="#/' + brand + '/' + deck.id + '"' + (active === deck.id ? ' aria-current="true"' : '')
          + '>전체 보기<span class="pg">' + deck.items.length + '</span></a>';
        var cats = [];
        deck.items.forEach(function (it) { if (it.chip && cats.indexOf(it.chip) < 0) cats.push(it.chip); });
        cats.forEach(function (c) {
          var n = deck.items.filter(function (it) { return it.chip === c; }).length;
          html += '<a href="#/' + brand + '/' + deck.id + '/' + encodeURIComponent(c) + '"'
            + (active === deck.id + '/' + c ? ' aria-current="true"' : '')
            + '>' + esc(c) + '<span class="pg">' + n + '</span></a>';
        });
        html += '</div></div>';
        return;
      }
      html += '<div class="toc-sep"></div>';
      chaptersOf(deck).forEach(function (ch) {
        html += '<div class="toc-group"><div class="toc-h">'
          + (ch.ch ? '<span class="ch">' + esc(ch.ch) + '</span>' : '')
          + esc(ch.name) + '</div><div class="toc">';
        ch.pages.forEach(function (p) {
          var key = deck.id + '/' + p.n;
          html += '<a href="#/' + brand + '/' + deck.id + '/' + p.n + '"'
            + (active === key ? ' aria-current="true"' : '') + '>'
            + esc(titleMain(p.title)) + '<span class="pg">' + p.n + '</span></a>';
        });
        html += '</div></div>';
      });
    });
    $toc.innerHTML = '<div class="toc-group"><div class="toc"><a href="#/' + brand + '"'
      + (active === 'home' ? ' aria-current="true"' : '') + '>브랜드 개요</a></div></div>' + html;
  }

  /* ── 블록 렌더 ────────────────────────────────────── */
  function span(w, cw) {
    if (!w || !cw) return 12;
    var s = Math.round(w / cw * 12);
    return Math.max(3, Math.min(12, s));
  }

  function blockHtml(b, cw) {
    var cls = 'blk' + (b.kind && b.kind !== 'normal' ? ' ' + b.kind : '');
    if (b.lines.length === 1) cls += ' one';
    if (!b.head) cls += ' lead';   // 제목 없는 블록 = 도입 문단, 불릿 없이
    var h = '<section class="' + cls + '" style="grid-column:span ' + span(b.w, cw) + '">';
    if (b.head) h += '<h3>' + esc(b.head) + '</h3>';
    if (b.lines.length) h += '<ul>' + b.lines.map(lineHtml).join('') + '</ul>';
    return h + '</section>';
  }

  function shotHtml(im, cw) {
    return '<figure class="shot" style="grid-column:span ' + span(im.w, cw) + '">'
      + '<img src="' + esc(im.src) + '" alt="" loading="lazy"></figure>';
  }

  function tableHtml(rows) {
    if (!rows || !rows.length) return '';
    var wide = 0;
    rows.forEach(function (r) { wide = Math.max(wide, r.length); });
    var hi = -1;
    rows.forEach(function (r, i) { if (r.length === wide && hi < 0) hi = i; });
    if (hi < 0) hi = 0;
    var head = rows[hi], body = rows.slice(hi + 1);
    return '<div class="tbl-wrap"><table><thead><tr>'
      + head.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('')
      + '</tr></thead><tbody>'
      + body.map(function (r) {
        // 표 중간의 구분 띠는 한 칸짜리 행으로 들어온다
        if (r.length === 1 && wide > 1) {
          return '<tr class="sep"><td colspan="' + wide + '">' + esc(r[0]) + '</td></tr>';
        }
        return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>';
      }).join('')
      + '</tbody></table></div>';
  }

  function checklistHtml(c) {
    return '<section class="cl"><h3>' + esc(c.title) + '</h3><ol>'
      + c.items.map(function (lines) {
        var en = lines[0] || '', kr = lines.slice(1).join(' ');
        return '<li><div><span class="en">' + esc(en) + '</span>'
          + (kr ? '<span class="kr">' + esc(kr) + '</span>' : '') + '</div></li>';
      }).join('')
      + '</ol></section>';
  }

  /* ── 매뉴얼 페이지 ────────────────────────────────── */
  function renderPage(brand, deck, p) {
    var chs = chaptersOf(deck), chName = '';
    chs.forEach(function (c) {
      c.pages.forEach(function (x) { if (x.n === p.n) chName = (c.ch ? 'CH.' + c.ch + ' · ' : '') + c.name; });
    });

    var h = '<div class="crumb"><b>' + esc(BRAND_META[brand] ? BRAND_META[brand].name : brand) + '</b>'
      + ' &nbsp;·&nbsp; ' + esc(deck.title) + (chName ? ' &nbsp;·&nbsp; ' + esc(chName) : '') + '</div>';

    if (p.divider) {
      h += '<div class="grid"><div class="divider"><div class="n">' + esc(p.ch || '') + '</div>'
        + '<h2>' + esc(p.title) + '</h2>'
        + (p.sub ? '<div class="sub">' + esc(p.sub) + '</div>' : '')
        + (p.intro ? '<p>' + esc(p.intro) + '</p>' : '') + '</div></div>';
      return h + pagerHtml(brand, deck, p);
    }

    h += '<div class="page-h"><h1>' + esc(titleMain(p.title))
      + (titleKr(p.title) ? ' <span class="kr">' + esc(titleKr(p.title)) + '</span>' : '') + '</h1>'
      + (p.badge ? '<span class="badge">' + esc(p.badge) + '</span>' : '') + '</div>';

    // 원본 배치를 12칼럼 그리드로 옮긴다: 세로 위치 순서대로, 폭에 비례한 span.
    var items = [];
    var minX = Infinity, maxR = 0;
    (p.blocks || []).forEach(function (b) {
      minX = Math.min(minX, b.x); maxR = Math.max(maxR, b.x + b.w);
    });
    (p.images || []).forEach(function (im) {
      minX = Math.min(minX, im.x); maxR = Math.max(maxR, im.x + im.w);
    });
    var cw = (isFinite(minX) && maxR > minX) ? maxR - minX : 0;

    (p.blocks || []).forEach(function (b) { items.push({ y: b.y, x: b.x, html: blockHtml(b, cw) }); });
    (p.images || []).forEach(function (im) { items.push({ y: im.y, x: im.x, html: shotHtml(im, cw) }); });

    // 같은 줄에 놓인 요소들은 원본에서 상단이 몇 mm씩 어긋나 있다.
    // 0.25in 안쪽이면 한 줄로 묶어 좌→우 순서를 지킨다.
    items.sort(function (a, b) { return a.y - b.y; });
    var rows = [];
    items.forEach(function (it) {
      var last = rows[rows.length - 1];
      if (last && it.y - last[0].y < 0.25) last.push(it);
      else rows.push([it]);
    });
    items = [];
    rows.forEach(function (row) {
      row.sort(function (a, b) { return a.x - b.x; });
      items = items.concat(row);
    });

    var grid = items.map(function (i) { return i.html; }).join('');
    (p.checklist || []).forEach(function (c) { grid += checklistHtml(c); });
    (p.tables || []).forEach(function (t) { grid += tableHtml(t); });

    h += '<div class="grid">' + grid + '</div>';
    return h + pagerHtml(brand, deck, p);
  }

  function pagerHtml(brand, deck, p) {
    var i = deck.pages.indexOf(p);
    var prev = deck.pages[i - 1], next = deck.pages[i + 1], h = '<div class="pager">';
    if (prev) h += '<a href="#/' + brand + '/' + deck.id + '/' + prev.n + '"><span>← 이전</span><b>'
      + esc(titleMain(prev.title)) + '</b></a>';
    if (next) h += '<a class="next" href="#/' + brand + '/' + deck.id + '/' + next.n + '"><span>다음 →</span><b>'
      + esc(titleMain(next.title)) + '</b></a>';
    return h + '</div>' + footHtml(deck);
  }

  function footHtml(deck) {
    return '<div class="foot"><b>출처</b> · ' + esc(deck.source)
      + ' — 원본 교육자료의 목차와 순서를 그대로 옮긴 화면입니다.<br>'
      + '본 자료는 SIM US의 자산으로, 무단 복제·배포·외부 반출을 금합니다.</div>';
  }

  /* ── 메뉴 ─────────────────────────────────────────── */
  function allergenOf(it) {
    for (var i = 0; i < it.sections.length; i++) {
      if (it.sections[i].en === 'ALLERGENS') {
        var l = it.sections[i].lines;
        return l[l.length - 1] || l[0] || '';
      }
    }
    return '';
  }

  function menuCardHtml(deck, it, i) {
    var h = '<button class="mcard" data-deck="' + esc(deck.id) + '" data-i="' + i + '">'
      + '<div class="ph">';
    h += it.img
      ? '<img src="' + esc(it.img) + '" alt="' + esc(it.en) + '" loading="lazy">'
      : '<div class="none"><b>PHOTO</b><span>촬영 예정</span></div>';
    if (it.chip) h += '<span class="chip">' + esc(it.chip) + '</span>';
    h += '</div><div class="body"><span class="en">' + esc(it.en) + '</span>'
      + (it.kr ? '<span class="kr">' + esc(it.kr) + '</span>' : '')
      + (it.price ? '<span class="price">' + esc(it.price) + '</span>' : '');
    var a = allergenOf(it);
    if (a) h += '<span class="alg">알레르기 · ' + esc(a) + '</span>';
    return h + '</div></button>';
  }

  function renderMenu(brand, deck, cat) {
    var items = deck.items.map(function (it, i) { return { it: it, i: i }; });
    if (cat) items = items.filter(function (x) { return x.it.chip === cat; });

    var cats = [];
    deck.items.forEach(function (it) { if (it.chip && cats.indexOf(it.chip) < 0) cats.push(it.chip); });

    var withPhoto = items.filter(function (x) { return x.it.img; }).length;
    var h = '<div class="crumb"><b>' + esc(BRAND_META[brand].name) + '</b> &nbsp;·&nbsp; '
      + esc(deck.title) + '</div>'
      + '<div class="page-h"><h1>' + esc(cat || '전체 메뉴')
      + ' <span class="kr">' + items.length + '종</span></h1>'
      + '<span class="badge">사진 ' + withPhoto + ' / ' + items.length + '</span></div>';

    h += '<div class="filters"><button data-cat=""' + (cat ? '' : ' aria-pressed="true"') + '>전체 '
      + deck.items.length + '</button>'
      + cats.map(function (c) {
        var n = deck.items.filter(function (it) { return it.chip === c; }).length;
        return '<button data-cat="' + esc(c) + '"' + (cat === c ? ' aria-pressed="true"' : '') + '>'
          + esc(c) + ' ' + n + '</button>';
      }).join('') + '</div>';

    h += '<div class="menu-grid">'
      + items.map(function (x) { return menuCardHtml(deck, x.it, x.i); }).join('')
      + '</div>';
    return h + footHtml(deck);
  }

  function openSheet(deck, i) {
    var it = deck.items[i];
    if (!it) return;
    var h = '';
    h += it.img
      ? '<div class="sheet-hero"><img src="' + esc(it.img) + '" alt="' + esc(it.en) + '"></div>'
      : '<div class="sheet-hero"><div class="ph"></div></div>';
    h += '<div class="pad">'
      + (it.chip ? '<div class="crumb"><b>' + esc(it.chip) + '</b></div>' : '')
      + '<h2>' + esc(it.en) + '</h2>'
      + (it.kr ? '<div class="krname">' + esc(it.kr) + '</div>' : '')
      + '<div class="row">' + (it.price ? '<span class="price">' + esc(it.price) + '</span>' : '')
      + '<span class="badge">' + esc(deck.brand) + ' · p' + it.page + '</span></div>';

    it.sections.forEach(function (s) {
      var cls = s.en === 'SUGGESTIVE SELLING' ? ' selling' : (s.en === 'ALLERGENS' ? ' allerg' : '');
      h += '<div class="sec' + cls + '"><h4>' + esc(s.en) + ' · ' + esc(s.kr) + '</h4>'
        + s.lines.map(function (l) {
          return '<p class="' + (HANGUL.test(l) ? '' : 'en') + '">' + esc(l) + '</p>';
        }).join('') + '</div>';
    });
    $sheetBody.innerHTML = h + '</div>';
    $sheet.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    $sheet.hidden = true;
    $sheetBody.innerHTML = '';
    document.body.style.overflow = '';
  }

  /* ── 브랜드 개요 ──────────────────────────────────── */
  function renderHome(brand) {
    var meta = BRAND_META[brand] || { name: brand, kr: '' };
    var ds = decksOf(brand);
    var pages = 0, items = 0, photos = 0, chapters = 0;
    ds.forEach(function (d) {
      if (d.kind === 'menu') {
        items += d.items.length;
        photos += d.items.filter(function (i) { return i.img; }).length;
      } else {
        pages += d.pages.length;
        chapters += chaptersOf(d).filter(function (c) { return c.ch; }).length;
        d.pages.forEach(function (p) { photos += (p.images || []).length; });
      }
    });

    var h = '<div class="hero"><div class="eyebrow">삼천리 SL&amp;C · BREA MALL, CALIFORNIA</div>'
      + '<h1>' + esc(meta.name) + '</h1><p>' + esc(meta.kr)
      + ' — 매장 교육자료(입문 매뉴얼 · 메뉴 SOP)를 목차 순서 그대로 옮긴 표준운영절차 대시보드입니다. '
      + '왼쪽 목차에서 챕터를 선택하거나, 상단 검색으로 포지션·메뉴·규정을 바로 찾을 수 있습니다.</p>'
      + '<div class="stats">'
      + '<div class="stat"><b>' + chapters + '</b><span>CHAPTERS</span></div>'
      + '<div class="stat"><b>' + pages + '</b><span>SOP PAGES</span></div>'
      + '<div class="stat"><b>' + items + '</b><span>MENU ITEMS</span></div>'
      + '<div class="stat"><b>' + photos + '</b><span>PHOTOS</span></div>'
      + '</div></div>';

    ds.forEach(function (deck) {
      if (deck.kind === 'menu') {
        h += '<div class="sec-title">' + esc(deck.title) + '</div><div class="cards">'
          + '<a href="#/' + brand + '/' + deck.id + '"><div class="k">MENU SOP</div>'
          + '<h3>전체 ' + deck.items.length + '종</h3><p>메뉴별 설명 · 추천 스크립트 · 알레르기 정보</p></a>';
        var cats = [];
        deck.items.forEach(function (it) { if (it.chip && cats.indexOf(it.chip) < 0) cats.push(it.chip); });
        cats.slice(0, 5).forEach(function (c) {
          var n = deck.items.filter(function (it) { return it.chip === c; }).length;
          h += '<a href="#/' + brand + '/' + deck.id + '/' + encodeURIComponent(c) + '">'
            + '<div class="k">CATEGORY</div><h3>' + esc(c) + '</h3><p>' + n + '종</p></a>';
        });
        h += '</div>';
        return;
      }
      h += '<div class="sec-title">' + esc(deck.title) + '</div><div class="cards">';
      var chs = chaptersOf(deck);
      chs.forEach(function (c) {
        var first = c.pages[0];
        h += '<a href="#/' + brand + '/' + deck.id + '/' + first.n + '">'
          + '<div class="k">' + (c.ch ? 'CH.' + esc(c.ch) : 'START') + '</div>'
          + '<h3>' + esc(c.name) + '</h3><p>' + esc(c.sub || (c.pages.length + '개 항목')) + '</p></a>';
      });
      h += '</div>';
    });
    return h;
  }

  /* ── 검색 ─────────────────────────────────────────── */
  function buildIndex() {
    INDEX = [];
    DATA.forEach(function (deck) {
      if (deck.kind === 'menu') {
        deck.items.forEach(function (it, i) {
          var body = it.sections.map(function (s) { return s.lines.join(' '); }).join(' ');
          INDEX.push({
            brand: deck.brand, kind: '메뉴 · ' + (it.chip || ''),
            title: it.en + (it.kr ? ' · ' + it.kr : ''),
            sub: (it.price ? it.price + '  ' : '') + body.slice(0, 160),
            text: (it.en + ' ' + it.kr + ' ' + it.chip + ' ' + body).toLowerCase(),
            href: '#/' + deck.brand + '/' + deck.id + '?item=' + i,
            deck: deck.id, item: i
          });
        });
        return;
      }
      deck.pages.forEach(function (p) {
        var parts = [];
        (p.blocks || []).forEach(function (b) { parts.push(b.head, b.lines.join(' ')); });
        (p.checklist || []).forEach(function (c) {
          parts.push(c.title);
          c.items.forEach(function (l) { parts.push(l.join(' ')); });
        });
        (p.tables || []).forEach(function (t) { t.forEach(function (r) { parts.push(r.join(' ')); }); });
        var body = parts.filter(Boolean).join(' ');
        INDEX.push({
          brand: deck.brand, kind: deck.title + ' · p' + p.n,
          title: p.title, sub: body.slice(0, 180),
          text: (p.title + ' ' + p.badge + ' ' + body).toLowerCase(),
          href: '#/' + deck.brand + '/' + deck.id + '/' + p.n
        });
      });
    });
  }

  function hl(s, terms) {
    var out = esc(s);
    terms.forEach(function (t) {
      if (t.length < 1) return;
      out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
    });
    return out;
  }

  function renderSearch(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    var hits = INDEX.filter(function (e) {
      return terms.every(function (t) { return e.text.indexOf(t) >= 0; });
    });
    var brand = currentBrand();
    hits.sort(function (a, b) { return (a.brand === brand ? -1 : 0) - (b.brand === brand ? -1 : 0); });

    var h = '<div class="page-h"><h1>검색 <span class="kr">' + esc(q) + '</span></h1>'
      + '<span class="badge">' + hits.length + '건</span></div>';
    if (!hits.length) {
      return h + '<div class="empty">일치하는 내용이 없습니다. 다른 표현으로 검색해 보세요.</div>';
    }
    h += '<div class="res">' + hits.slice(0, 120).map(function (e) {
      return '<a href="' + e.href + '"><div class="k">' + esc(e.brand) + ' · ' + esc(e.kind) + '</div>'
        + '<div class="t">' + hl(e.title, terms) + '</div>'
        + '<div class="s">' + hl(e.sub, terms) + '…</div></a>';
    }).join('') + '</div>';
    if (hits.length > 120) h += '<div class="empty">상위 120건만 표시합니다.</div>';
    return h;
  }

  /* ── 렌더 ─────────────────────────────────────────── */
  function render() {
    var r = route();
    closeSheet();

    if (r.brand === 'search') {
      var q = decodeURIComponent(r.view || '');
      $q.value = q;
      $qclear.hidden = !q;
      var brand = currentBrand();
      document.body.dataset.brand = brand;
      markBrand(brand);
      renderToc(brand, '');
      $main.innerHTML = renderSearch(q);
      window.scrollTo(0, 0);
      return;
    }

    var brand = currentBrand();
    sessionStorage.setItem('brand', brand);
    document.body.dataset.brand = brand;
    markBrand(brand);

    var deck = r.view ? deckById(r.view) : null;
    if (!deck || deck.brand !== brand) {
      renderToc(brand, 'home');
      $main.innerHTML = renderHome(brand);
      window.scrollTo(0, 0);
      return;
    }

    if (deck.kind === 'menu') {
      var cat = r.arg || '';
      renderToc(brand, deck.id + (cat ? '/' + cat : ''));
      $main.innerHTML = renderMenu(brand, deck, cat);
      var m = /(?:^|&)item=(\d+)/.exec(r.query);
      if (m) openSheet(deck, parseInt(m[1], 10));
    } else {
      var n = parseInt(r.arg, 10);
      var p = null;
      deck.pages.forEach(function (x) { if (x.n === n) p = x; });
      if (!p) p = deck.pages[0];
      renderToc(brand, deck.id + '/' + p.n);
      $main.innerHTML = renderPage(brand, deck, p);
    }
    window.scrollTo(0, 0);
    document.body.classList.remove('nav-open');
  }

  function markBrand(brand) {
    Array.prototype.forEach.call($brands.children, function (b) {
      if (b.dataset.brand === brand) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  /* ── 이벤트 ───────────────────────────────────────── */
  function bind() {
    window.addEventListener('hashchange', render);

    $main.addEventListener('click', function (e) {
      var card = e.target.closest('.mcard');
      if (card) { openSheet(deckById(card.dataset.deck), parseInt(card.dataset.i, 10)); return; }
      var f = e.target.closest('.filters button');
      if (f) {
        var r = route();
        go(r.brand + '/' + r.view + (f.dataset.cat ? '/' + encodeURIComponent(f.dataset.cat) : ''));
      }
    });

    $sheet.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeSheet(); });

    var t;
    $q.addEventListener('input', function () {
      clearTimeout(t);
      var v = $q.value.trim();
      $qclear.hidden = !v;
      t = setTimeout(function () {
        if (v.length >= 1) go('search/' + encodeURIComponent(v));
        else if (route().brand === 'search') go(currentBrand());
      }, 220);
    });
    $qclear.addEventListener('click', function () {
      $q.value = ''; $qclear.hidden = true; go(currentBrand()); $q.focus();
    });

    document.getElementById('burger').addEventListener('click', function () {
      document.body.classList.toggle('nav-open');
    });
    document.getElementById('scrim').addEventListener('click', function () {
      document.body.classList.remove('nav-open');
    });
    $toc.addEventListener('click', function (e) {
      if (e.target.closest('a')) document.body.classList.remove('nav-open');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeSheet(); document.body.classList.remove('nav-open'); }
      if (e.key === '/' && document.activeElement !== $q) { e.preventDefault(); $q.focus(); $q.select(); }
    });
  }

  /* ── 시작 ─────────────────────────────────────────── */
  fetch('data.json?v=' + (window.__BUILD__ || '1'))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      DATA = d;
      DATA.forEach(function (x) { if (BRANDS.indexOf(x.brand) < 0) BRANDS.push(x.brand); });
      buildIndex();
      renderBrands();
      bind();
      render();
    })
    .catch(function (err) {
      $main.innerHTML = '<div class="empty">데이터를 불러오지 못했습니다.<br><small>'
        + esc(err.message) + '</small></div>';
    });
})();
