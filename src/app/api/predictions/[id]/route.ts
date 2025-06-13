import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { createApiResponse, createErrorResponse } from "@/lib/api-helpers";
import { PredictedResult } from "@prisma/client";

// GET /api/predictions/[id] - 특정 예측 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse("로그인이 필요합니다", 401);
    }

    const prediction = await prisma.prediction.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        game: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!prediction) {
      return createErrorResponse("예측을 찾을 수 없습니다", 404);
    }

    return createApiResponse(prediction);
  } catch (error) {
    console.error("예측 조회 오류:", error);
    return createErrorResponse("예측 조회에 실패했습니다", 500);
  }
}

// PUT /api/predictions/[id] - 예측 수정 (경기 시작 전에만 가능)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse("로그인이 필요합니다", 401);
    }

    const body = await request.json();
    const { predictedWinner, predictedHomeScore, predictedAwayScore } = body;

    // 예측 조회
    const prediction = await prisma.prediction.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        game: true,
      },
    });

    if (!prediction) {
      return createErrorResponse("예측을 찾을 수 없습니다", 404);
    }

    // 경기 상태 확인
    if (prediction.game.status !== "SCHEDULED") {
      return createErrorResponse(
        "이미 시작되었거나 종료된 경기의 예측은 수정할 수 없습니다",
        400
      );
    }

    // 예측 상태 확인
    if (prediction.status !== "PENDING") {
      return createErrorResponse("이미 처리된 예측은 수정할 수 없습니다", 400);
    }

    // 입력 검증
    if (
      predictedWinner &&
      !["HOME", "AWAY", "DRAW"].includes(predictedWinner)
    ) {
      return createErrorResponse("올바르지 않은 예측 결과입니다", 400);
    }

    // 예측 수정
    const updatedPrediction = await prisma.prediction.update({
      where: { id: params.id },
      data: {
        ...(predictedWinner && {
          predictedWinner: predictedWinner as PredictedResult,
        }),
        ...(predictedHomeScore !== undefined && { predictedHomeScore }),
        ...(predictedAwayScore !== undefined && { predictedAwayScore }),
      },
      include: {
        game: true,
      },
    });

    return createApiResponse(
      updatedPrediction,
      "예측이 성공적으로 수정되었습니다"
    );
  } catch (error) {
    console.error("예측 수정 오류:", error);
    return createErrorResponse("예측 수정에 실패했습니다", 500);
  }
}

// DELETE /api/predictions/[id] - 예측 삭제 (경기 시작 전에만 가능)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse("로그인이 필요합니다", 401);
    }

    // 예측 조회
    const prediction = await prisma.prediction.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        game: true,
      },
    });

    if (!prediction) {
      return createErrorResponse("예측을 찾을 수 없습니다", 404);
    }

    // 경기 상태 확인
    if (prediction.game.status !== "SCHEDULED") {
      return createErrorResponse(
        "이미 시작되었거나 종료된 경기의 예측은 삭제할 수 없습니다",
        400
      );
    }

    // 예측 상태 확인
    if (prediction.status !== "PENDING") {
      return createErrorResponse("이미 처리된 예측은 삭제할 수 없습니다", 400);
    }

    // 예측 삭제
    await prisma.prediction.delete({
      where: { id: params.id },
    });

    // 사용자 총 예측 수 업데이트
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        totalPredictions: { decrement: 1 },
      },
    });

    return createApiResponse(null, "예측이 성공적으로 삭제되었습니다");
  } catch (error) {
    console.error("예측 삭제 오류:", error);
    return createErrorResponse("예측 삭제에 실패했습니다", 500);
  }
}
