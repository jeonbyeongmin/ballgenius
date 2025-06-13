import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { createApiResponse, createErrorResponse } from "@/lib/api-helpers";
import { PredictedResult, PredictionStatus, Prisma } from "@prisma/client";

// GET /api/predictions - 사용자의 예측 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse("로그인이 필요합니다", 401);
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "10")),
      50
    );
    const status = searchParams.get("status"); // 'PENDING', 'WIN', 'LOSE', 'VOID'
    const offset = (page - 1) * limit;

    // 상태 필터 검증
    const validStatuses = ["PENDING", "WIN", "LOSE", "VOID"];
    if (status && !validStatuses.includes(status)) {
      return createErrorResponse(
        `잘못된 상태값입니다. 사용 가능한 값: ${validStatuses.join(", ")}`,
        400
      );
    }

    // 필터 조건 구성
    const where: Prisma.PredictionWhereInput = {
      userId: session.user.id,
    };

    if (status) {
      where.status = status as PredictionStatus;
    }

    // 예측 목록 조회
    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        include: {
          game: true,
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.prediction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return createApiResponse({
      predictions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("예측 목록 조회 오류:", error);

    // Prisma 에러 처리
    if (error instanceof Error) {
      if (error.message.includes("P2025")) {
        return createErrorResponse("요청한 데이터를 찾을 수 없습니다.", 404);
      }
      return createErrorResponse(`데이터베이스 오류: ${error.message}`, 500);
    }

    return createErrorResponse("예측 목록을 불러오는데 실패했습니다", 500);
  }
}

// POST /api/predictions - 새로운 예측 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse("로그인이 필요합니다", 401);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return createErrorResponse("유효하지 않은 JSON 데이터입니다", 400);
    }

    const { gameId, predictedWinner, predictedHomeScore, predictedAwayScore } =
      body;

    // 필수 필드 검증
    if (!gameId) {
      return createErrorResponse("경기 ID가 필요합니다", 400);
    }

    if (!predictedWinner) {
      return createErrorResponse("예측 결과가 필요합니다", 400);
    }

    // 예측 결과 값 검증
    const validResults = ["HOME", "AWAY", "DRAW"];
    if (!validResults.includes(predictedWinner)) {
      return createErrorResponse(
        `올바르지 않은 예측 결과입니다. 사용 가능한 값: ${validResults.join(
          ", "
        )}`,
        400
      );
    }

    // 점수 예측 검증 (선택사항)
    if (predictedHomeScore !== undefined && predictedHomeScore !== null) {
      if (
        typeof predictedHomeScore !== "number" ||
        predictedHomeScore < 0 ||
        predictedHomeScore > 50
      ) {
        return createErrorResponse(
          "홈팀 점수는 0-50 사이의 숫자여야 합니다",
          400
        );
      }
    }

    if (predictedAwayScore !== undefined && predictedAwayScore !== null) {
      if (
        typeof predictedAwayScore !== "number" ||
        predictedAwayScore < 0 ||
        predictedAwayScore > 50
      ) {
        return createErrorResponse(
          "어웨이팀 점수는 0-50 사이의 숫자여야 합니다",
          400
        );
      }
    }

    // 경기 정보 확인
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return createErrorResponse("존재하지 않는 경기입니다", 404);
    }

    // 예측 가능 여부 확인
    const isPredictable = (game: {
      status: string;
      time: string;
      date: string;
    }) => {
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
        `${game.date.slice(0, 4)}-${game.date.slice(4, 6)}-${game.date.slice(
          6,
          8
        )} ${game.time}`
      );

      // 경기 시작 1시간 전까지만 예측 가능
      const oneHourBefore = new Date(gameDateTime.getTime() - 60 * 60 * 1000);

      return now < oneHourBefore;
    };

    if (!isPredictable(game)) {
      let message = "예측할 수 없는 경기입니다.";

      if (game.status === "COMPLETED") {
        message = "이미 종료된 경기는 예측할 수 없습니다.";
      } else if (game.status === "CANCELLED") {
        message = "취소된 경기는 예측할 수 없습니다.";
      } else if (game.status === "LIVE") {
        message = "이미 진행중인 경기는 예측할 수 없습니다.";
      } else {
        // 경기 시작 1시간 전 마감
        const gameDateTime = new Date(
          `${game.date.slice(0, 4)}-${game.date.slice(4, 6)}-${game.date.slice(
            6,
            8
          )} ${game.time}`
        );
        const oneHourBefore = new Date(gameDateTime.getTime() - 60 * 60 * 1000);
        message = `예측 마감시간이 지났습니다. (마감: ${oneHourBefore.toLocaleString(
          "ko-KR"
        )})`;
      }

      return createErrorResponse(message, 400);
    }

    // 이미 예측한 경기인지 확인
    const existingPrediction = await prisma.prediction.findUnique({
      where: {
        userId_gameId: {
          userId: session.user.id,
          gameId,
        },
      },
    });

    if (existingPrediction) {
      return createErrorResponse("이미 예측한 경기입니다", 400);
    }

    // 예측 생성
    const prediction = await prisma.prediction.create({
      data: {
        userId: session.user.id,
        gameId,
        predictedWinner: predictedWinner as PredictedResult,
        predictedHomeScore: predictedHomeScore || null,
        predictedAwayScore: predictedAwayScore || null,
      },
      include: {
        game: true,
      },
    });

    // 사용자 총 예측 수 업데이트
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        totalPredictions: { increment: 1 },
      },
    });

    return createApiResponse(
      prediction,
      "예측이 성공적으로 등록되었습니다",
      201
    );
  } catch (error) {
    console.error("예측 생성 오류:", error);

    // Prisma 에러 처리
    if (error instanceof Error) {
      if (error.message.includes("P2002")) {
        return createErrorResponse(
          "이미 이 경기에 대한 예측이 존재합니다.",
          409
        );
      }
      if (error.message.includes("P2025")) {
        return createErrorResponse("요청한 경기를 찾을 수 없습니다.", 404);
      }
      if (error.message.includes("P2003")) {
        return createErrorResponse("잘못된 경기 ID입니다.", 400);
      }
      return createErrorResponse(`데이터베이스 오류: ${error.message}`, 500);
    }

    return createErrorResponse("예측 등록에 실패했습니다", 500);
  }
}
