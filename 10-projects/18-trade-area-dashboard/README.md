# 18 - Trade Area Dashboard (SL&C 상권개발 분석 대시보드)

원본 배포: https://yjcvip-creator.github.io/trade-area-dashboard/
원본 저장소: `yjcvip-creator/trade-area-dashboard` (단일 `index.html`)

## 구성
- `index.html` — 대시보드 본체 (이 파일만 수정하면 됨)

## 2대 PC에서 같이 수정하기 (동기화)

이 폴더는 워크스페이스 저장소(`comimi12/comimi12`)의 일부라서, **워크스페이스 자체의 git push/pull로 두 PC가 동기화**됩니다.

### 처음 세팅 (두 번째 PC에서 1회)
```bash
git clone https://github.com/comimi12/comimi12.git do-better-workspace-v2
```

### 매번 작업 순서 (양쪽 PC 공통)
1. **작업 시작 전** — 최신 내용 받기
   ```bash
   git pull
   ```
2. `index.html` 수정
3. **작업 끝나면** — 올리기
   ```bash
   git add "10-projects/18-trade-area-dashboard/index.html"
   git commit -m "대시보드 수정: (무엇을 바꿨는지)"
   git push
   ```

### 충돌 방지 팁
- 작업 **시작 전 항상 `git pull`** 먼저.
- 한 PC에서 수정 → push → 다른 PC에서 pull 하고 이어서 작업.
- 두 PC에서 동시에 같은 줄을 고치면 충돌(conflict)이 날 수 있음. 그때는 그냥 Claude에게 "충돌 해결해줘" 라고 하면 됩니다.

## 배포(공개 URL) 갱신
현재 공개 사이트(`yjcvip-creator.github.io`)는 **별도 저장소**라서, 여기서 수정해도 자동으로 반영되지 않습니다.
공개 URL도 자동 갱신하려면 별도 설정이 필요합니다. (README 최상단 참고 / Claude에게 요청)
