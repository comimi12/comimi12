# 삼천리 SL&C 브랜드별 SOP 대시보드

매장 교육자료(PPTX)를 **목차 순서 그대로** 옮긴 웹 대시보드. 1차 대상은 **KSC(Kalbi Social Club)** 와 **WASA(Robata Wasa)** 두 브랜드.

## 무엇이 들어있나

| 브랜드 | 문서 | 분량 |
|--------|------|------|
| KSC | 입문 · 서비스 매뉴얼 | 49p / 8개 챕터 |
| KSC | 입문 매뉴얼 (간소화) | 18p |
| KSC | 메뉴 SOP | 54종 (사진 37종) |
| WASA | 입문 · 서비스 매뉴얼 | 52p / 8개 챕터 |
| WASA | 메뉴 SOP | 90종 (사진 88종) |

원본 이미지 184장을 웹용(긴 변 1000px)으로 재인코딩해 포함.

## 화면

- **브랜드 개요** — 챕터 카드, 분량 통계
- **SOP 페이지** — 원본 A4 레이아웃을 12칼럼 그리드로 옮김. 포지션별 ①오픈 ②영업 중 ③마감, ✓ALWAYS / ✕NEVER, 핵심 응대 멘트를 색으로 구분
- **체크리스트** — 오픈/마감 체크박스 목록 (인쇄 가능)
- **표** — 포지션 맵, 알러지 매트릭스, 상황별 응대 등
- **메뉴 SOP** — 사진 카드 그리드 → 클릭 시 구성·설명·추천 스크립트·알레르기 상세
- **검색** — 두 브랜드 전 문서 통합 검색 (`/` 키로 포커스)

## 구조

```
36-삼천리 SL&C  SOP/
├── src/              # 배포되는 사이트 그대로
│   ├── index.html
│   ├── app.js        # 라우팅 · 렌더링 · 검색
│   ├── style.css
│   ├── data.json     # 추출 결과 (약 550KB)
│   └── img/          # 사진 184장
├── build/
│   ├── extract.py    # PPTX → data.json + img/  (원본 수정 시 재실행)
│   ├── verify.py     # 16개 화면 자동 캡처 + 콘솔오류·가로스크롤·깨진이미지 검사
│   ├── deploy.py     # src/ → GitHub Pages 저장소 push
│   └── shots/        # verify.py 캡처 결과
└── _deploy/          # 배포용 클론 (git 무시)
```

## 원본 교육자료

`C:\Users\owner\Desktop\교육팀\4. 신규매장매뉴얼, 교안\오픈매장 매뉴얼\` 아래

- `KSC_US\교육 자료\KSC_BREA_입문매뉴얼.pptx`
- `KSC_US\교육 자료\KSC_BREA_입문매뉴얼_간소화.pptx`
- `KSC_US\교육 자료\KSC_menu_sop_메뉴교육자료.pptx`
- `WASA\WASA_BREA_Training_Manual_A4.pptx`
- `WASA\WASA_menu_manual_전체90종.pptx`

## 갱신 방법

원본 PPTX를 고친 뒤:

```bash
python build/extract.py     # 다시 추출
python -m http.server 8765 --directory src   # 로컬 확인
python build/verify.py      # 화면 자동 검증
python build/deploy.py      # 배포
```

`extract.py`는 원본 덱이 생성기로 만들어져 도형 배치가 일정하다는 점을 이용한다.
레이아웃을 크게 바꾼 PPTX를 넣으면 추출 규칙(카드 밴드 폭, `CL_*` 도형 이름, 챕터 푸터 `CH.0n`)을 함께 손봐야 한다.

## 브랜드 추가하기

`build/extract.py` 상단 `DECKS` 리스트에 항목을 추가하면 된다.
`kind`는 `manual`(챕터형 매뉴얼) 또는 `menu`(메뉴 카드) 중 하나.

## 주의

본 자료는 **SIM US의 자산**이며 원본에 무단 복제·배포·공개·외부 반출 금지가 명시되어 있다.
공개 위치에 배포할 경우 그 범위를 먼저 확인할 것.
