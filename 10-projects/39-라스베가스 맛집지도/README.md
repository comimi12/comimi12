# 39-라스베가스 맛집지도

- 원본(받아온 대시보드): https://yjcvip-creator.github.io/vegas-food-map/ → `원본/index.html` (2026-11-22 그대로 보관)
- 개선본: `index.html` — 캐치테이블(app.catchtable.co.kr) UI 벤치마킹 레이아웃
- 빌드: `build/template.html`의 `/*__DATA__*/` 자리에 원본의 `CATS·SRC·R` 데이터를 넣어 `index.html` 생성 (데이터 수정은 원본 쪽 또는 index.html에서 직접)

## 요구사항 (원 제작 의도)
카테고리별 구분 · 객단가 · 영업시간 · 시그니처 메뉴 · 라스베가스 전체 지도상 위치 · Yelp 평점
출처 인스타 8건(S1~S8): 차이나타운 20 / 오프스트립 가성비 20 / 미쉐린 셀렉티드 17 / 오프스트립 5 / 한국인 추천 13 / 브런치 5 / 호수뷰 브런치 릴스 / Lamaii 릴스

## 캐치테이블에서 가져온 패턴
- 상단 검색바 + 카테고리 아이콘 레일 + 필터 칩(지역·가격대·미쉐린·한국인 추천·심야·가성비·4.5↑)
- 홈 큐레이션 컬렉션 캐러셀(순위 배지): 미쉐린 / 한국인 추천 / 가성비 / 브런치 / 심야
- 매장 리스트(썸네일·평점·객단가·시그니처·영업시간·배지·♡저장)
- 매장 상세 시트(대표메뉴·매장정보·출처 + 하단 CTA "구글맵 길찾기 / Yelp에서 보기")
- 데스크톱: 왼쪽 앱 패널 + 오른쪽 지도 / 모바일: 하단 탭바(홈·지도·저장), 지도 위 카드 캐러셀
- ♡ 저장은 브라우저 localStorage에만 저장

## 주의
- 객단가·영업시간·Yelp 평점은 2026-11 기준 추정치(원본 그대로)
- 대표 이미지 없는 매장은 카테고리 색 + 이모지 썸네일
- Leaflet 지도는 모바일에서 처음에 숨겨진 상태로 생성되므로 `#map`의 `position:fixed!important` 필요(Leaflet가 position:relative를 인라인으로 넣음)

## 대표 이미지 (2026-11-22 · 69/69)
- `build/images.json`: 매장별 home·img·kind·credit·credit_url
- kind=official (47곳): 매장 공식 홈페이지 사진 핫링크 — "사진: 매장 공식 홈페이지" 표기. Monta는 운영사(Mon Restaurant Group) 사이트 사진
- kind=commons (3곳): Pho Kim Long·Raku·In-N-Out — Wikimedia Commons 실제 매장 사진, 작성자·라이선스 표기(CC BY/BY-SA)
- kind=ref (19곳): 매장 사진을 구할 수 없어 **시그니처 메뉴 참고 이미지**(Commons 자유 라이선스) 사용 — 카드에 "참고 이미지" 배지, 상세에 "실제 매장 사진 아님 · 작성자 · 라이선스" 링크
  - 대상: China Mama, Big Dan, Sushi Neko, Ramen Boys, Xiao Long Dumplings, Magic Noodle, Yui, Chengdu Taste, Shanghai Taste, John Mull's, Bob Taylor's, Gymkhana, Ping Pang Pong, Morimoto, Red Plate, The Henry, Salt & Ivy, Lago, Wicked Spoon
  - 사유: 공식 사이트 없음/폐쇄, 또는 MGM·Gold Coast·Gymkhana·Yui 사이트 봇 차단(우회하지 않음)
- 불러오기 실패 시 이모지 썸네일로 자동 대체

## 빌드·배포
- `python build/build.py` → index.html 생성
- 공유 링크(claude.ai 아티팩트): https://claude.ai/artifact/52xeCL5ATxosUTueUUv2RE — `build/artifact.html`(Leaflet CSS 인라인본)을 게시
- 공개 배포: https://comimi12.github.io/vegas-food-map/ — `python build/build.py` 후 `python build/deploy.py` (comimi12/vegas-food-map public 저장소에 index.html 푸시, 커밋 작성자는 GitHub noreply)
