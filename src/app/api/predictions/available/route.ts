import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { createApiResponse, createErrorResponse } from "@/lib/api-helpers";

// GET /api/predictions/available - 예측 가능한 경기 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYYMMDD 형식

    // 날짜가 지정되지 않았다면 오늘 날짜 사용 (KBO API와 동일한 방식)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const targetDate = date || `${yyyy}${mm}${dd}`;

    // 날짜 형식 검증
    if (!/^\d{8}$/.test(targetDate)) {
      return createErrorResponse(
        "잘못된 날짜 형식입니다. YYYYMMDD 형식으로 입력해주세요.",
        400
      );
    }

    // 모든 경기 조회 (예정, 진행중, 완료 포함)
    const games = await prisma.game.findMany({
      where: {
        date: targetDate,
      },
      include: {
        predictions: session?.user?.id
          ? {
              where: {
                userId: session.user.id,
              },
            }
          : false,
        _count: {
          select: {
            predictions: true,
          },
        },
      },
      orderBy: { time: "asc" },
    });

    // 경기가 없을 때 빈 배열 반환 (KBO API와 동일한 방식)
    if (!games || games.length === 0) {
      return createApiResponse({
        games: [],
        date: targetDate,
        total: 0,
        message: "해당 날짜에 예측 가능한 경기가 없습니다.",
      });
    }

    // 예측 가능 여부를 계산하는 함수
    const isPredictable = (game: { status: string; time: string }) => {
      // 경기가 진행중, 완료되었거나 취소된 경우 예측 불가
      if (
        game.status === "COMPLETED" ||
        game.status === "CANCELLED" ||
        game.status === "LIVE"
      ) {
        return false;
      }

      // 현재 시간 계산
      const now = new Date();
      const gameDateTime = new Date(
        `${targetDate.slice(0, 4)}-${targetDate.slice(4, 6)}-${targetDate.slice(
          6,
          8
        )} ${game.time}`
      );

      // 경기 시작 1시간 전까지만 예측 가능
      const oneHourBefore = new Date(gameDateTime.getTime() - 60 * 60 * 1000);

      return now < oneHourBefore;
    };

    // 각 경기에 대한 예측 통계 계산
    const gamesWithStats = await Promise.all(
      games.map(async (game) => {
        const predictionStats = await prisma.prediction.groupBy({
          by: ["predictedWinner"],
          where: {
            gameId: game.id,
          },
          _count: {
            predictedWinner: true,
          },
        });

        const totalPredictions = predictionStats.reduce(
          (sum, stat) => sum + stat._count.predictedWinner,
          0
        );

        const homeCount =
          predictionStats.find((s) => s.predictedWinner === "HOME")?._count
            .predictedWinner || 0;
        const awayCount =
          predictionStats.find((s) => s.predictedWinner === "AWAY")?._count
            .predictedWinner || 0;
        const drawCount =
          predictionStats.find((s) => s.predictedWinner === "DRAW")?._count
            .predictedWinner || 0;

        return {
          ...game,
          userPrediction: session?.user?.id
            ? game.predictions?.[0] || null
            : null,
          isPredictable: isPredictable(game),
          predictionStats: {
            total: totalPredictions,
            home: homeCount,
            away: awayCount,
            draw: drawCount,
            homePercentage:
              totalPredictions > 0 ? (homeCount / totalPredictions) * 100 : 0,
            awayPercentage:
              totalPredictions > 0 ? (awayCount / totalPredictions) * 100 : 0,
            drawPercentage:
              totalPredictions > 0 ? (drawCount / totalPredictions) * 100 : 0,
          },
        };
      })
    );

    // 예측 가능한 경기와 전체 경기 분리
    const predictableGames = gamesWithStats.filter(
      (game) => game.isPredictable
    );
    const completedGames = gamesWithStats.filter(
      (game) => game.status === "COMPLETED"
    );
    const cancelledGames = gamesWithStats.filter(
      (game) => game.status === "CANCELLED"
    );
    const liveGames = gamesWithStats.filter((game) => game.status === "LIVE");

    return createApiResponse({
      games: gamesWithStats,
      predictableGames,
      completedGames,
      cancelledGames,
      liveGames,
      date: targetDate,
      total: gamesWithStats.length,
      predictableCount: predictableGames.length,
      completedCount: completedGames.length,
      cancelledCount: cancelledGames.length,
      liveCount: liveGames.length,
    });
  } catch (error) {
    console.error("예측 가능한 경기 조회 오류:", error);

    // Prisma 에러 처리
    if (error instanceof Error) {
      if (error.message.includes("P2002")) {
        return createErrorResponse("데이터 중복 오류가 발생했습니다.", 409);
      }
      if (error.message.includes("P2025")) {
        return createErrorResponse("요청한 데이터를 찾을 수 없습니다.", 404);
      }
      return createErrorResponse(`데이터베이스 오류: ${error.message}`, 500);
    }

    return createErrorResponse(
      "예측 가능한 경기 목록을 불러오는데 실패했습니다",
      500
    );
  }
}
