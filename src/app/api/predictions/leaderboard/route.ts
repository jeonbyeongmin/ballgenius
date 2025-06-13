import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createApiResponse, createErrorResponse } from "@/lib/api-helpers";

// GET /api/predictions/leaderboard - 예측 리더보드 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "winRate"; // 'winRate', 'streak', 'points', 'total'
    const period = searchParams.get("period") || "all"; // 'all', 'month', 'week'
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
      100
    );

    // 타입 값 검증
    const validTypes = ["winRate", "streak", "points", "total"];
    if (!validTypes.includes(type)) {
      return createErrorResponse(
        `잘못된 타입 값입니다. 사용 가능한 값: ${validTypes.join(", ")}`,
        400
      );
    }

    // 기간 값 검증
    const validPeriods = ["all", "month", "week"];
    if (!validPeriods.includes(period)) {
      return createErrorResponse(
        `잘못된 기간 값입니다. 사용 가능한 값: ${validPeriods.join(", ")}`,
        400
      );
    }

    // 기간 필터 계산
    let dateFilter = {};
    const now = new Date();

    if (period === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = {
        createdAt: {
          gte: weekAgo,
        },
      };
    } else if (period === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = {
        createdAt: {
          gte: monthAgo,
        },
      };
    }

    let orderBy = {};
    let whereCondition = {};

    if (type === "winRate") {
      // 승률 기준 (최소 10경기 이상 참여자만)
      whereCondition = {
        totalPredictions: {
          gte: 10,
        },
      };
      orderBy = [
        { successfulPredictions: "desc" },
        { totalPredictions: "desc" },
      ];
    } else if (type === "streak") {
      // 연승 기준
      orderBy = [{ currentStreak: "desc" }, { maxStreak: "desc" }];
    } else if (type === "points") {
      // 포인트 기준
      orderBy = { points: "desc" };
    } else if (type === "total") {
      // 총 예측 수 기준
      orderBy = { totalPredictions: "desc" };
    }

    // 사용자 목록 조회
    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        points: true,
        totalPredictions: true,
        successfulPredictions: true,
        currentStreak: true,
        maxStreak: true,
        createdAt: true,
      },
      orderBy,
      take: limit,
    });

    // 기간별 통계가 필요한 경우 추가 계산
    let leaderboard = users;

    if (period !== "all") {
      // 기간별 통계를 별도로 계산
      const userStats = await Promise.all(
        users.map(async (user) => {
          const predictions = await prisma.prediction.findMany({
            where: {
              userId: user.id,
              ...dateFilter,
            },
          });

          const totalPredictions = predictions.length;
          const successfulPredictions = predictions.filter(
            (p) => p.status === "WIN"
          ).length;
          const winRate =
            totalPredictions > 0
              ? (successfulPredictions / totalPredictions) * 100
              : 0;
          const pointsEarned = predictions.reduce(
            (sum, p) => sum + p.pointsEarned,
            0
          );

          return {
            ...user,
            periodStats: {
              totalPredictions,
              successfulPredictions,
              winRate,
              pointsEarned,
            },
          };
        })
      );

      // 기간별 통계로 재정렬
      if (type === "winRate") {
        leaderboard = userStats
          .filter((u) => u.periodStats.totalPredictions >= 5) // 기간별은 최소 5경기
          .sort((a, b) => {
            if (b.periodStats.winRate !== a.periodStats.winRate) {
              return b.periodStats.winRate - a.periodStats.winRate;
            }
            return (
              b.periodStats.totalPredictions - a.periodStats.totalPredictions
            );
          });
      } else if (type === "points") {
        leaderboard = userStats.sort(
          (a, b) => b.periodStats.pointsEarned - a.periodStats.pointsEarned
        );
      } else if (type === "total") {
        leaderboard = userStats.sort(
          (a, b) =>
            b.periodStats.totalPredictions - a.periodStats.totalPredictions
        );
      } else {
        leaderboard = userStats; // streak는 전체 기간 기준 유지
      }
    }

    // 순위 추가
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      rank: index + 1,
      ...user,
      winRate:
        user.totalPredictions > 0
          ? (user.successfulPredictions / user.totalPredictions) * 100
          : 0,
    }));

    return createApiResponse({
      leaderboard: rankedLeaderboard,
      type,
      period,
      total: rankedLeaderboard.length,
    });
  } catch (error) {
    console.error("리더보드 조회 오류:", error);

    // Prisma 에러 처리
    if (error instanceof Error) {
      return createErrorResponse(`데이터베이스 오류: ${error.message}`, 500);
    }

    return createErrorResponse("리더보드를 불러오는데 실패했습니다", 500);
  }
}
