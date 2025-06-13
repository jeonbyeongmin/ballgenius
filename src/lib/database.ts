import { prisma } from "./prisma";
import { PointType, PredictedResult } from "@prisma/client";

/**
 * 사용자의 포인트를 업데이트하고 히스토리를 기록합니다
 */
export async function updateUserPoints(
  userId: string,
  amount: number,
  type: PointType,
  description: string,
  relatedId?: string
) {
  return await prisma.$transaction(async (tx) => {
    // 사용자 포인트 업데이트
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: amount,
        },
      },
    });

    // 포인트 히스토리 기록
    await tx.pointHistory.create({
      data: {
        userId,
        amount,
        type,
        description,
        relatedId,
      },
    });

    return user;
  });
}

/**
 * 예측 결과를 처리하고 포인트를 지급합니다
 */
export async function processPredictionResult(
  gameId: string,
  homeScore: number,
  awayScore: number
) {
  const winner: PredictedResult =
    homeScore > awayScore ? "HOME" : homeScore < awayScore ? "AWAY" : "DRAW";

  // 해당 경기의 모든 예측을 가져옵니다
  const predictions = await prisma.prediction.findMany({
    where: { gameId },
    include: { user: true },
  });

  for (const prediction of predictions) {
    let pointsEarned = 0;
    let status: "WIN" | "LOSE" = "LOSE";

    // 승부 예측이 맞는지 확인
    if (prediction.predictedWinner === winner) {
      status = "WIN";

      // 기본 예측 성공 포인트
      pointsEarned = parseInt(process.env.PREDICTION_WIN_POINTS || "50");

      // 정확한 스코어까지 맞췄는지 확인
      if (
        prediction.predictedHomeScore === homeScore &&
        prediction.predictedAwayScore === awayScore
      ) {
        pointsEarned = parseInt(process.env.PERFECT_PREDICTION_POINTS || "100");
      }

      // 연승 체크 및 보너스
      const newStreak = prediction.user.currentStreak + 1;
      let streakBonus = 0;

      if (newStreak === 3) streakBonus = 25;
      else if (newStreak === 5) streakBonus = 50;
      else if (newStreak === 7) streakBonus = 100;
      else if (newStreak === 10) streakBonus = 200;

      // 사용자 통계 업데이트
      await prisma.user.update({
        where: { id: prediction.userId },
        data: {
          successfulPredictions: { increment: 1 },
          currentStreak: newStreak,
          maxStreak: Math.max(prediction.user.maxStreak, newStreak),
        },
      });

      // 포인트 지급
      await updateUserPoints(
        prediction.userId,
        pointsEarned,
        prediction.predictedHomeScore === homeScore &&
          prediction.predictedAwayScore === awayScore
          ? "PREDICTION_PERFECT"
          : "PREDICTION_WIN",
        `${gameId} 경기 예측 성공`,
        prediction.id
      );

      // 연승 보너스 지급
      if (streakBonus > 0) {
        await updateUserPoints(
          prediction.userId,
          streakBonus,
          "STREAK_BONUS",
          `${newStreak}연승 보너스`,
          prediction.id
        );
      }
    } else {
      // 예측 실패 - 연승 초기화
      await prisma.user.update({
        where: { id: prediction.userId },
        data: {
          currentStreak: 0,
        },
      });
    }

    // 예측 상태 업데이트
    await prisma.prediction.update({
      where: { id: prediction.id },
      data: {
        status,
        pointsEarned,
      },
    });
  }

  return { processedPredictions: predictions.length, winner };
}

/**
 * 배팅 결과를 처리하고 포인트를 분배합니다
 */
export async function processBettingResult(
  gameId: string,
  homeScore: number,
  awayScore: number
) {
  const winner: PredictedResult =
    homeScore > awayScore ? "HOME" : homeScore < awayScore ? "AWAY" : "DRAW";

  // 배팅 풀 정보 가져오기
  const betPool = await prisma.betPool.findUnique({
    where: { gameId },
  });

  if (!betPool) return;

  // 해당 경기의 모든 배팅 가져오기
  const bets = await prisma.bet.findMany({
    where: { gameId },
  });

  // 승리한 배팅들과 패배한 배팅들 분리
  const winningBets = bets.filter((bet) => bet.predictedWinner === winner);
  const losingBets = bets.filter((bet) => bet.predictedWinner !== winner);

  // 총 패배 배팅 금액 (수수료 제외)
  const totalLosingAmount = losingBets.reduce(
    (sum, bet) => sum + bet.betAmount,
    0
  );
  const houseEdge = parseFloat(process.env.HOUSE_EDGE || "0.05");
  const totalWinPool = totalLosingAmount * (1 - houseEdge);

  // 총 승리 배팅 금액
  const totalWinningAmount = winningBets.reduce(
    (sum, bet) => sum + bet.betAmount,
    0
  );

  for (const bet of bets) {
    if (bet.predictedWinner === winner) {
      // 승리 배팅 - 비례 분배
      const winRatio =
        totalWinningAmount > 0 ? bet.betAmount / totalWinningAmount : 0;
      const winAmount = Math.floor(bet.betAmount + totalWinPool * winRatio);

      await prisma.bet.update({
        where: { id: bet.id },
        data: {
          status: "WIN",
          actualWin: winAmount,
        },
      });

      // 포인트 지급 (원금 + 수익)
      await updateUserPoints(
        bet.userId,
        winAmount,
        "BET_WIN",
        `${gameId} 배팅 승리`,
        bet.id
      );

      // 사용자 통계 업데이트
      await prisma.user.update({
        where: { id: bet.userId },
        data: {
          successfulBets: { increment: 1 },
        },
      });
    } else {
      // 패배 배팅
      await prisma.bet.update({
        where: { id: bet.id },
        data: {
          status: "LOSE",
          actualWin: 0,
        },
      });
    }
  }

  return {
    totalBets: bets.length,
    winningBets: winningBets.length,
    losingBets: losingBets.length,
    totalWinPool,
    winner,
  };
}

/**
 * 배당률을 계산합니다
 */
export function calculateOdds(
  homePool: number,
  awayPool: number
): { homeOdds: number; awayOdds: number } {
  if (homePool === 0 && awayPool === 0) {
    return { homeOdds: 2.0, awayOdds: 2.0 };
  }

  const totalPool = homePool + awayPool;
  const houseEdge = parseFloat(process.env.HOUSE_EDGE || "0.05");
  const effectivePool = totalPool * (1 - houseEdge);

  const homeOdds = homePool > 0 ? effectivePool / homePool : 2.0;
  const awayOdds = awayPool > 0 ? effectivePool / awayPool : 2.0;

  // 최소 배당률 1.1, 최대 배당률 10.0으로 제한
  return {
    homeOdds: Math.max(1.1, Math.min(10.0, homeOdds)),
    awayOdds: Math.max(1.1, Math.min(10.0, awayOdds)),
  };
}

/**
 * 사용자의 통계를 계산합니다
 */
export async function calculateUserStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      predictions: true,
      bets: true,
      pointHistory: true,
    },
  });

  if (!user) return null;

  const totalPredictions = user.predictions.length;
  const successfulPredictions = user.predictions.filter(
    (p) => p.status === "WIN"
  ).length;
  const predictionWinRate =
    totalPredictions > 0 ? (successfulPredictions / totalPredictions) * 100 : 0;

  const totalBets = user.bets.length;
  const successfulBets = user.bets.filter((b) => b.status === "WIN").length;
  const bettingWinRate = totalBets > 0 ? (successfulBets / totalBets) * 100 : 0;

  const totalPointsEarned = user.pointHistory
    .filter((ph) => ph.amount > 0)
    .reduce((sum, ph) => sum + ph.amount, 0);

  const totalPointsSpent = user.pointHistory
    .filter((ph) => ph.amount < 0)
    .reduce((sum, ph) => sum + Math.abs(ph.amount), 0);

  return {
    totalPredictions,
    successfulPredictions,
    predictionWinRate,
    totalBets,
    successfulBets,
    bettingWinRate,
    totalPointsEarned,
    totalPointsSpent,
    currentPoints: user.points,
    currentStreak: user.currentStreak,
    maxStreak: user.maxStreak,
  };
}
