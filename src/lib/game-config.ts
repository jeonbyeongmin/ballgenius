// 게임 상수 정의
export const GAME_CONFIG = {
  INITIAL_USER_POINTS: parseInt(process.env.INITIAL_USER_POINTS || "1000"),
  DAILY_LOGIN_POINTS: parseInt(process.env.DAILY_LOGIN_POINTS || "10"),
  PREDICTION_WIN_POINTS: parseInt(process.env.PREDICTION_WIN_POINTS || "50"),
  PERFECT_PREDICTION_POINTS: parseInt(
    process.env.PERFECT_PREDICTION_POINTS || "100"
  ),
  MINIMUM_BET_AMOUNT: parseInt(process.env.MINIMUM_BET_AMOUNT || "10"),
  MAXIMUM_BET_AMOUNT: parseInt(process.env.MAXIMUM_BET_AMOUNT || "1000"),
  HOUSE_EDGE: parseFloat(process.env.HOUSE_EDGE || "0.05"),
} as const;

// 연승 보너스 계산
export const STREAK_BONUS = {
  3: 25,
  5: 50,
  7: 100,
  10: 200,
  15: 500,
  20: 1000,
} as const;

// 배당률 계산 함수
export function calculateOdds(
  homePool: number,
  awayPool: number,
  houseEdge: number = GAME_CONFIG.HOUSE_EDGE
) {
  const totalPool = homePool + awayPool;
  if (totalPool === 0) return { homeOdds: 1.0, awayOdds: 1.0 };

  const homeOdds = Math.max(1.01, (totalPool * (1 - houseEdge)) / homePool);
  const awayOdds = Math.max(1.01, (totalPool * (1 - houseEdge)) / awayPool);

  return { homeOdds, awayOdds };
}

// 포인트 계산 함수
export function calculatePredictionPoints(
  isCorrect: boolean,
  isPerfectScore: boolean = false,
  currentStreak: number = 0
): number {
  if (!isCorrect) return 0;

  let points = GAME_CONFIG.PREDICTION_WIN_POINTS;

  // 완벽한 점수 예측 보너스
  if (isPerfectScore) {
    points += GAME_CONFIG.PERFECT_PREDICTION_POINTS;
  }

  // 연승 보너스
  const streakBonus =
    STREAK_BONUS[currentStreak as keyof typeof STREAK_BONUS] || 0;
  points += streakBonus;

  return points;
}

// 배팅 수익 계산
export function calculateBetWinnings(betAmount: number, odds: number): number {
  return Math.floor(betAmount * odds);
}
