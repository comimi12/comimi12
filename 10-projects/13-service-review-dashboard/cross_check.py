# -*- coding: utf-8 -*-
"""
교차 검증: 자동 수집(naver_collected_*) vs 수동(매크로 내보내기) 리뷰 파일 월별 대조.
사용자가 data/reviews/ 에 매크로 원본 CSV를 넣으면, 자동 수집분과 비교해 누락/초과를 보고한다.

사용:
  python cross_check.py            # 콘솔 리포트
  python cross_check.py --json     # JSON (update_all 로깅용)

판정: 같은 (매장·방문일·내용) 키로 비교.
  - coverage = 양쪽공통 / 수동  (자동이 수동을 얼마나 커버하나)
  - 수동만(=자동 누락)이 많으면 ⚠, 자동만(=자동 신규/최신)도 표시.
"""
import sys, io, os, glob, json, re, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
import build  # normalize_reviews_file 재사용

CUR_MONTH = datetime.date.today().strftime("%Y-%m")

HERE = os.path.dirname(os.path.abspath(__file__))
REVIEW_DIR = os.path.join(HERE, "data", "reviews")
AS_JSON = "--json" in sys.argv


def norm_text(t):
    return re.sub(r"\s+", "", (t or ""))[:40]


def key(r):
    return (r.get("store", ""), r.get("date", ""), norm_text(r.get("text", "")))


def main():
    auto, manual = {}, {}            # month -> set(keys)
    auto_files, manual_files, skipped = [], [], []
    for path in sorted(glob.glob(os.path.join(REVIEW_DIR, "*.csv"))):
        name = os.path.basename(path)
        is_auto = name.startswith("naver_collected")
        try:
            rows = build.normalize_reviews_file(path)
        except Exception:
            rows = []
        if not rows:
            skipped.append(name)        # merged(캐치테이블) 등 양식 외
            continue
        (auto_files if is_auto else manual_files).append(name)
        bucket = auto if is_auto else manual
        for r in rows:
            bucket.setdefault(r["month"], set()).add(key(r))

    months = sorted(set(auto) | set(manual))
    report = {"auto_files": auto_files, "manual_files": manual_files,
              "skipped": skipped, "months": [], "flags": []}
    for m in months:
        a, mn = auto.get(m, set()), manual.get(m, set())
        both = a & mn
        cov = round(len(both) / len(mn) * 100, 1) if mn else None
        row = {"month": m, "auto": len(a), "manual": len(mn), "both": len(both),
               "auto_only": len(a - mn), "manual_only": len(mn - a), "coverage_pct": cov}
        report["months"].append(row)
        # ⚠ 판정은 '당월'만 (자동은 당월 기준일로만 수집 → 과거월 낮은 커버리지는 정상)
        if m == CUR_MONTH and mn and cov is not None and cov < 90:
            report["flags"].append(f"{m}(당월): 자동이 수동의 {cov}%만 커버 (수동만 {len(mn-a)}건) — 당월 자동 수집 점검 필요")

    if AS_JSON:
        print(json.dumps(report, ensure_ascii=False))
        return

    print("=" * 64)
    print("리뷰 교차 검증 (자동 수집 vs 수동 매크로)")
    print("=" * 64)
    print(f"자동 파일: {auto_files or '없음'}")
    print(f"수동 파일: {manual_files or '없음'}")
    if skipped:
        print(f"양식 외(캐치테이블 merged 등, 비교 제외): {skipped}")
    print("-" * 64)
    print(f"{'월':<9}{'자동':>7}{'수동':>7}{'공통':>7}{'자동만':>7}{'수동만':>7}{'커버리지':>9}")
    for r in report["months"]:
        cov = f"{r['coverage_pct']}%" if r["coverage_pct"] is not None else "-"
        print(f"{r['month']:<9}{r['auto']:>7}{r['manual']:>7}{r['both']:>7}"
              f"{r['auto_only']:>7}{r['manual_only']:>7}{cov:>9}")
    print("-" * 64)
    if report["flags"]:
        print("⚠ 점검 필요:")
        for f in report["flags"]:
            print("   -", f)
    else:
        print(f"✅ 당월({CUR_MONTH}) 자동 수집 정상 (또는 당월 수동 비교본 없음).")
    print("\n해석:")
    print(" - 자동은 '당월 기준일' 위주 수집 → 과거월의 낮은 커버리지는 정상(과거는 수동이 정답).")
    print(" - '수동만'=자동 미수집(과거월/캐치테이블 포함), '자동만'=자동이 더 받은 최신분.")
    print(" - build.py 가 자동+수동을 합쳐 (매장·날짜·내용) 중복제거하므로 대시보드는 합집합을 사용.")
    print(" - 특정 과거월을 자동으로 받으려면: python collect.py YYYY-MM-01")


if __name__ == "__main__":
    main()
