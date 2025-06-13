import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { createApiResponse, createErrorResponse } from "@/lib/api-helpers";
import { PredictedResult } from "@prisma/client";

// POST /api/predictions/process-results - 경기 결과 처리 (관리자용)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse("로그인이 필요합니다", 401);
    }

    // TODO: 관리자 권한 체크 로직 추가
    // const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    // if (!user?.isAdmin) {
    //   return createErrorResponse('관리자 권한이 필요합니다', 403);
    // }

    const body = await request.json();
    const { gameId, homeScore, awayScore } = body;

    // 입력 검증
    if (!gameId || homeScore === undefined || awayScore === undefined) {
      return createErrorResponse("필수 정보가 누락되었습니다", 400);
    }

    if (
      typeof homeScore !== "number" ||
      typeof awayScore !== "number" ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      return createErrorResponse("올바르지 않은 점수입니다", 400);
    }

    // 경기 정보 확인
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return createErrorResponse("존재하지 않는 경기입니다", 404);
    }

    // 승자 결정
    const winner: PredictedResult =
      homeScore > awayScore ? "HOME" : homeScore < awayScore ? "AWAY" : "DRAW";

    // 트랜잭션으로 모든 예측 처리
    const result = await prisma.$transaction(async (tx) => {
      // 경기 결과 업데이트
      await tx.game.update({
        where: { id: gameId },
        data: {
          homeScore,
          awayScore,
          status: "COMPLETED",
        },
      });

      // 해당 경기의 모든 예측 조회
      const predictions = await tx.prediction.findMany({
        where: { gameId },
        include: { user: true },
      });

      let processedCount = 0;
      let winCount = 0;
      let loseCount = 0;
      let totalPointsAwarded = 0;

      for (const prediction of predictions) {
        let pointsEarned = 0;
        let status: "WIN" | "LOSE" = "LOSE";

        // 승부 예측이 맞는지 확인
        if (prediction.predictedWinner === winner) {
          status = "WIN";
          winCount++;

          // 기본 예측 성공 포인트
          pointsEarned = parseInt(process.env.PREDICTION_WIN_POINTS || "50");

          // 정확한 스코어까지 맞췄는지 확인
          if (
            prediction.predictedHomeScore === homeScore &&
            prediction.predictedAwayScore === awayScore
          ) {
            pointsEarned = parseInt(
              process.env.PERFECT_PREDICTION_POINTS || "100"
            );
          }

          // 연승 체크 및 보너스
          const newStreak = prediction.user.currentStreak + 1;
          let streakBonus = 0;

          if (newStreak === 3) streakBonus = 25;
          else if (newStreak === 5) streakBonus = 50;
          else if (newStreak === 7) streakBonus = 100;
          else if (newStreak === 10) streakBonus = 200;
          else if (newStreak === 15) streakBonus = 500;

          // 사용자 통계 업데이트
          await tx.user.update({
            where: { id: prediction.userId },
            data: {
              successfulPredictions: { increment: 1 },
              currentStreak: newStreak,
              maxStreak: Math.max(prediction.user.maxStreak, newStreak),
              points: { increment: pointsEarned + streakBonus },
            },
          });

          // 포인트 히스토리 기록
          await tx.pointHistory.create({
            data: {
              userId: prediction.userId,
              amount: pointsEarned,
              type:
                prediction.predictedHomeScore === homeScore &&
                prediction.predictedAwayScore === awayScore
                  ? "PREDICTION_PERFECT"
                  : "PREDICTION_WIN",
              description: `${game.awayTeamName} vs ${game.homeTeamName} 예측 성공`,
              relatedId: prediction.id,
            },
          });

          // 연승 보너스 기록
          if (streakBonus > 0) {
            await tx.pointHistory.create({
              data: {
                userId: prediction.userId,
                amount: streakBonus,
                type: "STREAK_BONUS",
                description: `${newStreak}연승 보너스`,
                relatedId: prediction.id,
              },
            });
          }

          totalPointsAwarded += pointsEarned + streakBonus;
        } else {
          // 예측 실패 - 연승 초기화
          loseCount++;
          await tx.user.update({
            where: { id: prediction.userId },
            data: {
              currentStreak: 0,
            },
          });
        }

        // 예측 상태 업데이트
        await tx.prediction.update({
          where: { id: prediction.id },
          data: {
            status,
            pointsEarned,
          },
        });

        processedCount++;
      }

      return {
        gameId,
        winner,
        homeScore,
        awayScore,
        processedPredictions: processedCount,
        winPredictions: winCount,
        losePredictions: loseCount,
        totalPointsAwarded,
      };
    });

    return createApiResponse(result, "경기 결과가 성공적으로 처리되었습니다");
  } catch (error) {
    console.error("경기 결과 처리 오류:", error);
    return createErrorResponse("경기 결과 처리에 실패했습니다", 500);
  }
}
