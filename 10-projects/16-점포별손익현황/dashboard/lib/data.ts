// 데이터 출처: (5월누계)점포별 월별 실적표 v0(260624).pdf + 매장부문 기준정보 v3.xlsx
// 단위: 매출·영업이익·EBITDA → 백만원 / 율 → % / 객수 → 명 / 객단가 → 원
// 갱신 주기: 월 1회 (마감 후 수동 업데이트)

export type Category = "BLACK" | "DINING" | "UCD" | "JUCD" | "ND" | "CD";

export type Store = {
  id: string;
  name: string;
  category: Category;
  leaseExpiry?: string;
  improvement1?: string;
  improvement2?: string;
};

export type MonthData = {
  month: 1 | 2 | 3 | 4 | 5;
  revenue: number;          // 매출 (백만원)
  operatingProfit: number;  // 영업이익 (백만원)
  operatingMargin: number;  // 영업이익율 (%)
  costRate: number;         // 원가율 (%)
  laborRate: number;        // 인건비율 (%)
  rentRate: number;         // 임차관리비율 (%)
  depreciationRate: number; // 감가상각비율 (%)
  otherRate: number;        // 기타경비율 (%)
  ordinaryMargin: number;   // 경상이익율 (%)
  customers: number;        // 객수
  avgSpend: number;         // 객단가 (원)
};

export type StoreData = Store & { monthly: MonthData[] };

// EBITDA 계산: 영업이익 + (매출 × 감가상각비율 / 100)
export function calcEbitda(m: MonthData): number {
  return m.operatingProfit + (m.revenue * m.depreciationRate) / 100;
}

export const stores: StoreData[] = [
  {
    id: "black-serae",
    name: "Black점(서래)",
    category: "BLACK",
    improvement1: "비용효율화",
    improvement2: "인건비",
    monthly: [
      { month: 1, revenue: 250, operatingProfit: 38, operatingMargin: 15.4, costRate: 20.3, laborRate: 36.6, rentRate: 0.0, depreciationRate: 9.4, otherRate: 18.3, ordinaryMargin: 9.9, customers: 4691, avgSpend: 53238 },
      { month: 2, revenue: 236, operatingProfit: 35, operatingMargin: 14.9, costRate: 20.3, laborRate: 36.0, rentRate: 0.0, depreciationRate: 9.9, otherRate: 18.8, ordinaryMargin: 7.8, customers: 4578, avgSpend: 51641 },
      { month: 3, revenue: 231, operatingProfit: 24, operatingMargin: 10.2, costRate: 20.0, laborRate: 41.0, rentRate: 0.0, depreciationRate: 10.2, otherRate: 18.6, ordinaryMargin: 5.1, customers: 4411, avgSpend: 52385 },
      { month: 4, revenue: 226, operatingProfit: 28, operatingMargin: 12.6, costRate: 20.0, laborRate: 37.8, rentRate: 0.0, depreciationRate: 10.4, otherRate: 19.1, ordinaryMargin: 6.0, customers: 4072, avgSpend: 55404 },
      { month: 5, revenue: 251, operatingProfit: 45, operatingMargin: 18.1, costRate: 20.5, laborRate: 36.6, rentRate: 0.0, depreciationRate: 9.2, otherRate: 15.7, ordinaryMargin: 12.9, customers: 4770, avgSpend: 52587 },
    ],
  },
  {
    id: "sfc",
    name: "SFC점",
    category: "DINING",
    leaseExpiry: "2028-03-19",
    improvement1: "매출활성화",
    improvement2: "비용효율화 인건비",
    monthly: [
      { month: 1, revenue: 160, operatingProfit: 1, operatingMargin: 0.8, costRate: 24.4, laborRate: 31.4, rentRate: 9.4, depreciationRate: 9.6, otherRate: 24.4, ordinaryMargin: -4.7, customers: 4058, avgSpend: 39433 },
      { month: 2, revenue: 139, operatingProfit: 7, operatingMargin: 5.1, costRate: 13.1, laborRate: 35.6, rentRate: 10.8, depreciationRate: 11.1, otherRate: 24.3, ordinaryMargin: -2.1, customers: 3480, avgSpend: 40030 },
      { month: 3, revenue: 141, operatingProfit: -11, operatingMargin: -8.1, costRate: 19.7, laborRate: 41.5, rentRate: 10.7, depreciationRate: 10.9, otherRate: 25.3, ordinaryMargin: -13.3, customers: 3614, avgSpend: 39069 },
      { month: 4, revenue: 144, operatingProfit: -4, operatingMargin: -3.0, costRate: 19.3, laborRate: 34.5, rentRate: 10.7, depreciationRate: 10.7, otherRate: 27.7, ordinaryMargin: -9.7, customers: 3535, avgSpend: 40649 },
      { month: 5, revenue: 136, operatingProfit: -6, operatingMargin: -4.2, costRate: 19.7, laborRate: 36.1, rentRate: 11.3, depreciationRate: 11.3, otherRate: 25.7, ordinaryMargin: -9.4, customers: 3493, avgSpend: 38978 },
    ],
  },
  {
    id: "cheonggyecheon",
    name: "청계천점",
    category: "UCD",
    leaseExpiry: "2029-06-30",
    improvement1: "조기폐점 4분기내",
    improvement2: "비용효율화 인건비",
    monthly: [
      { month: 1, revenue: 135, operatingProfit: 20, operatingMargin: 14.4, costRate: 19.2, laborRate: 33.0, rentRate: 12.2, depreciationRate: 0.7, otherRate: 20.5, ordinaryMargin: 9.0, customers: 3908, avgSpend: 34672 },
      { month: 2, revenue: 94, operatingProfit: -12, operatingMargin: -12.3, costRate: 21.7, laborRate: 43.0, rentRate: 17.6, depreciationRate: 1.0, otherRate: 29.1, ordinaryMargin: -19.5, customers: 2764, avgSpend: 34080 },
      { month: 3, revenue: 97, operatingProfit: -12, operatingMargin: -12.8, costRate: 17.7, laborRate: 50.9, rentRate: 17.0, depreciationRate: 1.0, otherRate: 26.3, ordinaryMargin: -18.0, customers: 2889, avgSpend: 33611 },
      { month: 4, revenue: 107, operatingProfit: -1, operatingMargin: -1.2, costRate: 19.1, laborRate: 40.9, rentRate: 15.4, depreciationRate: 0.9, otherRate: 25.0, ordinaryMargin: -7.9, customers: 2927, avgSpend: 36724 },
      { month: 5, revenue: 89, operatingProfit: -15, operatingMargin: -16.8, costRate: 17.6, laborRate: 50.2, rentRate: 18.6, depreciationRate: 1.0, otherRate: 29.3, ordinaryMargin: -22.0, customers: 2615, avgSpend: 33991 },
    ],
  },
  {
    id: "jamsil-worldmall",
    name: "잠실롯데월드몰점",
    category: "JUCD",
    improvement1: "매출활성화 객수",
    improvement2: "비용효율화 인건비",
    monthly: [
      { month: 1, revenue: 255, operatingProfit: 55, operatingMargin: 21.4, costRate: 20.6, laborRate: 31.6, rentRate: 15.0, depreciationRate: 0.6, otherRate: 10.9, ordinaryMargin: 16.0, customers: 11679, avgSpend: 21815 },
      { month: 2, revenue: 223, operatingProfit: 41, operatingMargin: 18.4, costRate: 19.4, laborRate: 34.5, rentRate: 15.5, depreciationRate: 0.5, otherRate: 11.7, ordinaryMargin: 11.2, customers: 10473, avgSpend: 21272 },
      { month: 3, revenue: 193, operatingProfit: 26, operatingMargin: 13.3, costRate: 19.6, laborRate: 36.8, rentRate: 15.5, depreciationRate: 0.6, otherRate: 14.2, ordinaryMargin: 8.2, customers: 8793, avgSpend: 21918 },
      { month: 4, revenue: 191, operatingProfit: 36, operatingMargin: 18.9, costRate: 18.1, laborRate: 33.9, rentRate: 15.0, depreciationRate: 0.6, otherRate: 13.6, ordinaryMargin: 12.2, customers: 8544, avgSpend: 22327 },
      { month: 5, revenue: 226, operatingProfit: 50, operatingMargin: 22.3, costRate: 18.2, laborRate: 32.2, rentRate: 15.5, depreciationRate: 0.5, otherRate: 11.3, ordinaryMargin: 17.1, customers: 10298, avgSpend: 21956 },
    ],
  },
  {
    id: "jamsil-castle",
    name: "잠실롯데캐슬점",
    category: "JUCD",
    leaseExpiry: "2026-06-30",
    improvement1: "매출활성화",
    improvement2: "비용효율화",
    monthly: [
      { month: 1, revenue: 131, operatingProfit: 19, operatingMargin: 14.3, costRate: 21.0, laborRate: 35.0, rentRate: 14.9, depreciationRate: 0.8, otherRate: 14.0, ordinaryMargin: 8.9, customers: 4869, avgSpend: 26932 },
      { month: 2, revenue: 112, operatingProfit: 11, operatingMargin: 10.2, costRate: 19.4, laborRate: 40.3, rentRate: 15.0, depreciationRate: 0.7, otherRate: 14.4, ordinaryMargin: 3.0, customers: 4143, avgSpend: 27088 },
      { month: 3, revenue: 130, operatingProfit: 22, operatingMargin: 16.9, costRate: 19.8, laborRate: 35.3, rentRate: 14.8, depreciationRate: 0.6, otherRate: 12.5, ordinaryMargin: 11.7, customers: 4712, avgSpend: 27567 },
      { month: 4, revenue: 132, operatingProfit: 23, operatingMargin: 17.6, costRate: 18.3, laborRate: 36.4, rentRate: 14.5, depreciationRate: 0.6, otherRate: 12.7, ordinaryMargin: 10.9, customers: 4565, avgSpend: 28841 },
      { month: 5, revenue: 124, operatingProfit: 15, operatingMargin: 11.9, costRate: 19.8, laborRate: 40.1, rentRate: 14.9, depreciationRate: 0.6, otherRate: 12.6, ordinaryMargin: 6.7, customers: 4434, avgSpend: 27868 },
    ],
  },
  {
    id: "yeouido",
    name: "여의도점",
    category: "JUCD",
    leaseExpiry: "2028-05-15",
    improvement1: "비용효율화 인건비",
    improvement2: "매출활성화 객단가",
    monthly: [
      { month: 1, revenue: 105, operatingProfit: 11, operatingMargin: 10.9, costRate: 21.2, laborRate: 38.3, rentRate: 4.1, depreciationRate: 0.6, otherRate: 24.8, ordinaryMargin: 5.5, customers: 3253, avgSpend: 32315 },
      { month: 2, revenue: 83, operatingProfit: 0, operatingMargin: -0.2, costRate: 21.6, laborRate: 42.6, rentRate: 5.2, depreciationRate: 0.5, otherRate: 30.3, ordinaryMargin: -7.4, customers: 2778, avgSpend: 29979 },
      { month: 3, revenue: 96, operatingProfit: 8, operatingMargin: 7.9, costRate: 21.0, laborRate: 39.8, rentRate: 12.3, depreciationRate: 0.4, otherRate: 18.5, ordinaryMargin: 2.7, customers: 3086, avgSpend: 31257 },
      { month: 4, revenue: 103, operatingProfit: 12, operatingMargin: 11.6, costRate: 18.6, laborRate: 38.8, rentRate: 11.5, depreciationRate: 0.4, otherRate: 19.0, ordinaryMargin: 5.0, customers: 3280, avgSpend: 31417 },
      { month: 5, revenue: 89, operatingProfit: 4, operatingMargin: 4.6, costRate: 19.1, laborRate: 42.0, rentRate: 13.5, depreciationRate: 0.4, otherRate: 20.4, ordinaryMargin: -0.6, customers: 2800, avgSpend: 31877 },
    ],
  },
  {
    id: "yeoksam-gfc",
    name: "역삼GFC점",
    category: "JUCD",
    leaseExpiry: "2028-06-30",
    improvement1: "비용효율화 인건비",
    improvement2: "조기폐점 4분기내",
    monthly: [
      { month: 1, revenue: 101, operatingProfit: 14, operatingMargin: 14.3, costRate: 23.5, laborRate: 32.7, rentRate: 9.4, depreciationRate: 0.5, otherRate: 19.6, ordinaryMargin: 8.9, customers: 3525, avgSpend: 28658 },
      { month: 2, revenue: 73, operatingProfit: 3, operatingMargin: 3.9, costRate: 17.3, laborRate: 42.0, rentRate: 12.2, depreciationRate: 0.4, otherRate: 24.3, ordinaryMargin: -3.2, customers: 2635, avgSpend: 27824 },
      { month: 3, revenue: 81, operatingProfit: 6, operatingMargin: 6.8, costRate: 18.0, laborRate: 43.0, rentRate: 8.1, depreciationRate: 0.3, otherRate: 23.7, ordinaryMargin: 1.7, customers: 2868, avgSpend: 28133 },
      { month: 4, revenue: 64, operatingProfit: -5, operatingMargin: -7.9, costRate: 17.3, laborRate: 50.4, rentRate: 21.9, depreciationRate: 0.4, otherRate: 17.9, ordinaryMargin: -14.5, customers: 2182, avgSpend: 29545 },
      { month: 5, revenue: 60, operatingProfit: -5, operatingMargin: -8.3, costRate: 19.4, laborRate: 49.4, rentRate: 20.8, depreciationRate: 0.5, otherRate: 18.3, ordinaryMargin: -13.5, customers: 2207, avgSpend: 27196 },
    ],
  },
  {
    id: "euljiro",
    name: "을지로점",
    category: "JUCD",
    leaseExpiry: "2026-07-03",
    improvement1: "조기폐점 7월",
    improvement2: "비용효율화 인건비",
    monthly: [
      { month: 1, revenue: 76, operatingProfit: -3, operatingMargin: -4.6, costRate: 20.1, laborRate: 39.9, rentRate: 21.2, depreciationRate: 0.8, otherRate: 22.6, ordinaryMargin: -10.0, customers: 2741, avgSpend: 27587 },
      { month: 2, revenue: 53, operatingProfit: -13, operatingMargin: -25.0, costRate: 21.1, laborRate: 54.5, rentRate: 19.9, depreciationRate: 0.7, otherRate: 28.9, ordinaryMargin: -32.2, customers: 1905, avgSpend: 27560 },
      { month: 3, revenue: 63, operatingProfit: -7, operatingMargin: -10.3, costRate: 19.3, laborRate: 51.9, rentRate: 14.1, depreciationRate: 0.6, otherRate: 24.4, ordinaryMargin: -15.5, customers: 2165, avgSpend: 29165 },
      { month: 4, revenue: 61, operatingProfit: -8, operatingMargin: -13.2, costRate: 20.1, laborRate: 52.2, rentRate: 14.6, depreciationRate: 0.6, otherRate: 25.7, ordinaryMargin: -19.8, customers: 2159, avgSpend: 28249 },
      { month: 5, revenue: 36, operatingProfit: -42, operatingMargin: -116.7, costRate: 40.3, laborRate: 109.0, rentRate: 24.5, depreciationRate: 1.0, otherRate: 41.9, ordinaryMargin: -121.9, customers: 1322, avgSpend: 27459 },
    ],
  },
  {
    id: "siheung",
    name: "시청점",
    category: "JUCD",
    leaseExpiry: "2029-05-15",
    improvement1: "비용효율화 인건비",
    improvement2: "매출활성화 객수",
    monthly: [
      { month: 1, revenue: 113, operatingProfit: 25, operatingMargin: 22.0, costRate: 20.9, laborRate: 26.6, rentRate: 7.8, depreciationRate: 1.0, otherRate: 21.8, ordinaryMargin: 16.5, customers: 3394, avgSpend: 33229 },
      { month: 2, revenue: 88, operatingProfit: 2, operatingMargin: 2.2, costRate: 19.2, laborRate: 43.9, rentRate: 10.0, depreciationRate: 1.0, otherRate: 23.8, ordinaryMargin: -5.0, customers: 2611, avgSpend: 33548 },
      { month: 3, revenue: 99, operatingProfit: 0, operatingMargin: 0.1, costRate: 20.7, laborRate: 45.2, rentRate: 8.8, depreciationRate: 0.9, otherRate: 24.4, ordinaryMargin: -5.1, customers: 2931, avgSpend: 33909 },
      { month: 4, revenue: 105, operatingProfit: 14, operatingMargin: 13.6, costRate: 19.0, laborRate: 36.8, rentRate: 8.3, depreciationRate: 0.8, otherRate: 21.4, ordinaryMargin: 6.9, customers: 3134, avgSpend: 33556 },
      { month: 5, revenue: 84, operatingProfit: -6, operatingMargin: -6.8, costRate: 19.6, laborRate: 46.8, rentRate: 10.4, depreciationRate: 1.1, otherRate: 28.8, ordinaryMargin: -12.0, customers: 2636, avgSpend: 32026 },
    ],
  },
  {
    id: "olympic",
    name: "올림픽공원점",
    category: "ND",
    leaseExpiry: "2028-07-19",
    improvement1: "매출활성화 객수",
    improvement2: "비용효율화 인건비",
    monthly: [
      { month: 1, revenue: 143, operatingProfit: -24, operatingMargin: -17.0, costRate: 23.4, laborRate: 45.7, rentRate: 19.1, depreciationRate: 8.3, otherRate: 20.4, ordinaryMargin: -22.5, customers: 5769, avgSpend: 24342 },
      { month: 2, revenue: 152, operatingProfit: 1, operatingMargin: 0.6, costRate: 22.6, laborRate: 36.2, rentRate: 17.9, depreciationRate: 7.8, otherRate: 14.8, ordinaryMargin: -6.5, customers: 5377, avgSpend: 22982 },
      { month: 3, revenue: 157, operatingProfit: 2, operatingMargin: 1.5, costRate: 22.4, laborRate: 36.7, rentRate: 17.3, depreciationRate: 7.5, otherRate: 14.6, ordinaryMargin: -3.6, customers: 5318, avgSpend: 22958 },
      { month: 4, revenue: 147, operatingProfit: -15, operatingMargin: -9.9, costRate: 24.5, laborRate: 39.9, rentRate: 18.6, depreciationRate: 8.0, otherRate: 19.0, ordinaryMargin: -16.5, customers: 4337, avgSpend: 23844 },
      { month: 5, revenue: 159, operatingProfit: -2, operatingMargin: -1.0, costRate: 23.4, laborRate: 37.9, rentRate: 17.2, depreciationRate: 7.5, otherRate: 15.0, ordinaryMargin: -6.2, customers: 5710, avgSpend: 23585 },
    ],
  },
  {
    id: "gimpo-lotte",
    name: "김포롯데몰점",
    category: "CD",
    leaseExpiry: "2027-01-31",
    monthly: [
      { month: 1, revenue: 212, operatingProfit: 61, operatingMargin: 28.7, costRate: 20.7, laborRate: 27.0, rentRate: 13.0, depreciationRate: 0.3, otherRate: 10.3, ordinaryMargin: 23.3, customers: 10968, avgSpend: 19365 },
      { month: 2, revenue: 212, operatingProfit: 62, operatingMargin: 29.1, costRate: 20.1, laborRate: 26.8, rentRate: 12.9, depreciationRate: 0.2, otherRate: 10.8, ordinaryMargin: 21.9, customers: 10983, avgSpend: 19310 },
      { month: 3, revenue: 194, operatingProfit: 42, operatingMargin: 21.6, costRate: 19.9, laborRate: 34.1, rentRate: 13.0, depreciationRate: 0.2, otherRate: 11.1, ordinaryMargin: 16.5, customers: 10090, avgSpend: 19233 },
      { month: 4, revenue: 149, operatingProfit: 23, operatingMargin: 15.1, costRate: 20.6, laborRate: 37.3, rentRate: 12.5, depreciationRate: 0.3, otherRate: 14.1, ordinaryMargin: 8.5, customers: 7548, avgSpend: 19802 },
      { month: 5, revenue: 187, operatingProfit: 47, operatingMargin: 25.2, costRate: 20.1, laborRate: 29.9, rentRate: 13.0, depreciationRate: 0.3, otherRate: 11.6, ordinaryMargin: 20.0, customers: 9585, avgSpend: 19515 },
    ],
  },
  {
    id: "pami-station",
    name: "파미에스테이션점",
    category: "CD",
    leaseExpiry: "2028-05-01",
    monthly: [
      { month: 1, revenue: 129, operatingProfit: 14, operatingMargin: 11.1, costRate: 20.9, laborRate: 31.6, rentRate: 12.3, depreciationRate: 7.7, otherRate: 16.5, ordinaryMargin: 5.6, customers: 0, avgSpend: 0 },
      { month: 2, revenue: 124, operatingProfit: 16, operatingMargin: 12.8, costRate: 20.6, laborRate: 29.1, rentRate: 12.3, depreciationRate: 8.0, otherRate: 17.2, ordinaryMargin: 5.6, customers: 0, avgSpend: 0 },
      { month: 3, revenue: 125, operatingProfit: 14, operatingMargin: 10.8, costRate: 20.1, laborRate: 33.5, rentRate: 12.3, depreciationRate: 7.9, otherRate: 15.4, ordinaryMargin: 5.7, customers: 0, avgSpend: 0 },
      { month: 4, revenue: 109, operatingProfit: 2, operatingMargin: 2.0, costRate: 20.9, laborRate: 37.4, rentRate: 12.5, depreciationRate: 9.1, otherRate: 18.1, ordinaryMargin: -4.7, customers: 0, avgSpend: 0 },
      { month: 5, revenue: 122, operatingProfit: 14, operatingMargin: 11.2, costRate: 21.0, laborRate: 31.9, rentRate: 12.4, depreciationRate: 8.1, otherRate: 15.5, ordinaryMargin: 5.9, customers: 0, avgSpend: 0 },
    ],
  },
  {
    id: "hyundai-mia",
    name: "현대미아점",
    category: "CD",
    leaseExpiry: "2026-07-31",
    improvement1: "비용효율화",
    monthly: [
      { month: 1, revenue: 124, operatingProfit: 20, operatingMargin: 16.5, costRate: 19.6, laborRate: 29.3, rentRate: 12.0, depreciationRate: 5.6, otherRate: 17.0, ordinaryMargin: 11.0, customers: 0, avgSpend: 0 },
      { month: 2, revenue: 132, operatingProfit: 30, operatingMargin: 22.7, costRate: 19.8, laborRate: 30.1, rentRate: 12.0, depreciationRate: 0.4, otherRate: 15.0, ordinaryMargin: 15.5, customers: 0, avgSpend: 0 },
      { month: 3, revenue: 117, operatingProfit: 17, operatingMargin: 14.7, costRate: 19.9, laborRate: 35.9, rentRate: 12.0, depreciationRate: 0.4, otherRate: 17.1, ordinaryMargin: 9.5, customers: 0, avgSpend: 0 },
      { month: 4, revenue: 106, operatingProfit: 14, operatingMargin: 13.0, costRate: 19.9, laborRate: 35.0, rentRate: 11.7, depreciationRate: 0.4, otherRate: 19.9, ordinaryMargin: 6.4, customers: 0, avgSpend: 0 },
      { month: 5, revenue: 139, operatingProfit: 29, operatingMargin: 20.5, costRate: 20.1, laborRate: 31.2, rentRate: 12.0, depreciationRate: 0.3, otherRate: 15.8, ordinaryMargin: 15.3, customers: 0, avgSpend: 0 },
    ],
  },
  {
    id: "hyundai-jungdong",
    name: "현대중동점",
    category: "CD",
    leaseExpiry: "2026-07-31",
    improvement1: "비용효율화 인건비",
    monthly: [
      { month: 1, revenue: 140, operatingProfit: 26, operatingMargin: 18.3, costRate: 20.4, laborRate: 28.6, rentRate: 11.9, depreciationRate: 4.3, otherRate: 16.6, ordinaryMargin: 12.8, customers: 0, avgSpend: 0 },
      { month: 2, revenue: 124, operatingProfit: 20, operatingMargin: 16.1, costRate: 19.1, laborRate: 31.6, rentRate: 11.9, depreciationRate: 4.7, otherRate: 16.6, ordinaryMargin: 8.9, customers: 0, avgSpend: 0 },
      { month: 3, revenue: 122, operatingProfit: 14, operatingMargin: 11.7, costRate: 18.9, laborRate: 36.2, rentRate: 11.9, depreciationRate: 4.8, otherRate: 16.5, ordinaryMargin: 6.5, customers: 0, avgSpend: 0 },
      { month: 4, revenue: 103, operatingProfit: 2, operatingMargin: 2.2, costRate: 20.7, laborRate: 37.9, rentRate: 11.5, depreciationRate: 5.7, otherRate: 22.0, ordinaryMargin: -4.5, customers: 0, avgSpend: 0 },
      { month: 5, revenue: 135, operatingProfit: 21, operatingMargin: 15.7, costRate: 19.9, laborRate: 33.6, rentRate: 12.0, depreciationRate: 4.4, otherRate: 14.5, ordinaryMargin: 10.5, customers: 0, avgSpend: 0 },
    ],
  },
];

export const MONTHS = [1, 2, 3, 4, 5] as const;
export const CATEGORIES: Category[] = ["BLACK", "DINING", "UCD", "JUCD", "ND", "CD"];

export type KpiKey =
  | "revenue"
  | "operatingProfit"
  | "operatingMargin"
  | "costRate"
  | "laborRate"
  | "rentRate"
  | "depreciationRate"
  | "otherRate"
  | "customers"
  | "avgSpend"
  | "ebitda";

export const KPI_LABELS: Record<KpiKey, string> = {
  revenue: "매출 (백만원)",
  operatingProfit: "영업이익 (백만원)",
  operatingMargin: "영업이익율 (%)",
  costRate: "원가율 (%)",
  laborRate: "인건비율 (%)",
  rentRate: "임차료율 (%)",
  depreciationRate: "감가상각비율 (%)",
  otherRate: "기타경비율 (%)",
  customers: "객수 (명)",
  avgSpend: "객단가 (원)",
  ebitda: "EBITDA (백만원)",
};

export function getKpiValue(m: MonthData, key: KpiKey): number {
  if (key === "ebitda") return calcEbitda(m);
  return m[key as keyof MonthData] as number;
}

// 이상 탐지 임계값
export const THRESHOLDS = {
  laborRate: { warn: 40, danger: 45 },
  costRate: { warn: 23, danger: 25 },
  rentRate: { warn: 15, danger: 20 },
  operatingMargin: { warn: 0, danger: -5 },
};

export function getAnomalyLevel(
  key: "laborRate" | "costRate" | "rentRate" | "operatingMargin",
  value: number
): "danger" | "warn" | "ok" {
  const t = THRESHOLDS[key];
  if (key === "operatingMargin") {
    if (value <= t.danger) return "danger";
    if (value <= t.warn) return "warn";
    return "ok";
  }
  if (value >= t.danger) return "danger";
  if (value >= t.warn) return "warn";
  return "ok";
}

export function getTotalByMonth(month: number) {
  const filtered = stores.flatMap((s) =>
    s.monthly.filter((m) => m.month === month)
  );
  const totalRevenue = filtered.reduce((s, m) => s + m.revenue, 0);
  const totalProfit = filtered.reduce((s, m) => s + m.operatingProfit, 0);
  return {
    revenue: totalRevenue,
    operatingProfit: totalProfit,
    operatingMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
  };
}
