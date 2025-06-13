import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { createApiResponse, createErrorResponse } from "@/lib/api-helpers";

// GET /api/predictions/stats - 사용자 예측 통계 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse("로그인이 필요합니다", 401);
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all"; // 'all', 'month', 'week'

    // 기간 값 검증
    const validPeriods = ["all", "month", "week"];
    if (!validPeriods.includes(period)) {
      return createErrorResponse(
        `잘못된 기간 값입니다. 사용 가능한 값: ${validPeriods.join(", ")}`,
        400
      );
    }

    // 기간 계산
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

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        points: true,
        totalPredictions: true,
        successfulPredictions: true,
        currentStreak: true,
        maxStreak: true,
      },
    });

    if (!user) {
      return createErrorResponse("사용자를 찾을 수 없습니다", 404);
    }

    // 기간별 예측 통계
    const predictions = await prisma.prediction.findMany({
      where: {
        userId: session.user.id,
        ...dateFilter,
      },
      include: {
        game: true,
      },
    });

    // 통계 계산
    const totalPredictions = predictions.length;
    const winPredictions = predictions.filter((p) => p.status === "WIN").length;
    const losePredictions = predictions.filter(
      (p) => p.status === "LOSE"
    ).length;
    const pendingPredictions = predictions.filter(
      (p) => p.status === "PENDING"
    ).length;
    const voidPredictions = predictions.filter(
      (p) => p.status === "VOID"
    ).length;

    const winRate =
      totalPredictions > 0 ? (winPredictions / totalPredictions) * 100 : 0;

    // 포인트 획득 통계
    const totalPointsEarned = predictions.reduce(
      (sum, p) => sum + p.pointsEarned,
      0
    );

    // 팀별 예측 통계
    const teamStats = predictions.reduce((acc, prediction) => {
      const team = prediction.predictedWinner;
      if (!acc[team]) {
        acc[team] = { total: 0, wins: 0 };
      }
      acc[team].total++;
      if (prediction.status === "WIN") {
        acc[team].wins++;
      }
      return acc;
    }, {} as Record<string, { total: number; wins: number }>);

    // 월별 성과 (최근 6개월)
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const monthPredictions = predictions.filter((p) => {
        const predDate = new Date(p.createdAt);
        return (
          predDate.getFullYear() === year && predDate.getMonth() + 1 === month
        );
      });

      const monthWins = monthPredictions.filter(
        (p) => p.status === "WIN"
      ).length;

      monthlyStats.push({
        year,
        month,
        total: monthPredictions.length,
        wins: monthWins,
        winRate:
          monthPredictions.length > 0
            ? (monthWins / monthPredictions.length) * 100
            : 0,
        points: monthPredictions.reduce((sum, p) => sum + p.pointsEarned, 0),
      });
    }

    // 최근 예측 기록 (최근 10개)
    const recentPredictions = await prisma.prediction.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        game: {
          select: {
            homeTeamName: true,
            awayTeamName: true,
            homeScore: true,
            awayScore: true,
            status: true,
            date: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return createApiResponse({
      overview: {
        totalPredictions: user.totalPredictions,
        successfulPredictions: user.successfulPredictions,
        overallWinRate:
          user.totalPredictions > 0
            ? (user.successfulPredictions / user.totalPredictions) * 100
            : 0,
        currentStreak: user.currentStreak,
        maxStreak: user.maxStreak,
        currentPoints: user.points,
      },
      periodStats: {
        period,
        totalPredictions,
        winPredictions,
        losePredictions,
        pendingPredictions,
        voidPredictions,
        winRate,
        totalPointsEarned,
      },
      teamStats,
      monthlyStats,
      recentPredictions,
    });
  } catch (error) {
    console.error("예측 통계 조회 오류:", error);

    // Prisma 에러 처리
    if (error instanceof Error) {
      if (error.message.includes("P2025")) {
        return createErrorResponse("사용자 정보를 찾을 수 없습니다.", 404);
      }
      return createErrorResponse(`데이터베이스 오류: ${error.message}`, 500);
    }

    return createErrorResponse("예측 통계를 불러오는데 실패했습니다", 500);
  }
}
