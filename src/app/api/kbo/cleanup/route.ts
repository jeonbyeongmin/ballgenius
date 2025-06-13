import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/kbo/cleanup - 시드 데이터 경기 삭제
export async function DELETE(request: NextRequest) {
  try {
    // 인증 헤더 확인
    const authHeader = request.headers.get("authorization");
    const apiKey = process.env.SYNC_API_KEY || "default-sync-key";

    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    // 시드 데이터로 생성된 더미 경기들 삭제
    // 시드 데이터의 경기 ID 패턴: ${date}SKWO0, ${date}LGOB0, ${date}KTSS0
    const seedGameIds = [`${today}SKWO0`, `${today}LGOB0`, `${today}KTSS0`];

    console.log(`🧹 시드 데이터 경기 삭제 시작: ${seedGameIds.join(", ")}`);

    // 관련 예측 데이터 먼저 삭제
    const deletedPredictions = await prisma.prediction.deleteMany({
      where: {
        gameId: {
          in: seedGameIds,
        },
      },
    });

    // 관련 배팅 풀 삭제
    const deletedBetPools = await prisma.betPool.deleteMany({
      where: {
        gameId: {
          in: seedGameIds,
        },
      },
    });

    // 경기 데이터 삭제
    const deletedGames = await prisma.game.deleteMany({
      where: {
        id: {
          in: seedGameIds,
        },
      },
    });

    console.log(`✅ 시드 데이터 정리 완료:`);
    console.log(`   - 삭제된 경기: ${deletedGames.count}개`);
    console.log(`   - 삭제된 예측: ${deletedPredictions.count}개`);
    console.log(`   - 삭제된 배팅풀: ${deletedBetPools.count}개`);

    return NextResponse.json({
      success: true,
      message: "시드 데이터 경기가 삭제되었습니다",
      deleted: {
        games: deletedGames.count,
        predictions: deletedPredictions.count,
        betPools: deletedBetPools.count,
      },
    });
  } catch (error) {
    console.error("❌ 시드 데이터 정리 오류:", error);
    return NextResponse.json(
      {
        error: "시드 데이터 정리에 실패했습니다",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET /api/kbo/cleanup - 정리할 시드 데이터 확인
export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const seedGameIds = [`${today}SKWO0`, `${today}LGOB0`, `${today}KTSS0`];

    const seedGames = await prisma.game.findMany({
      where: {
        id: {
          in: seedGameIds,
        },
      },
      include: {
        _count: {
          select: {
            predictions: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      seedGames: seedGames.map((game) => ({
        id: game.id,
        teams: `${game.awayTeamName} vs ${game.homeTeamName}`,
        stadium: game.stadium,
        status: game.status,
        predictions: game._count.predictions,
      })),
      total: seedGames.length,
    });
  } catch (error) {
    console.error("❌ 시드 데이터 확인 오류:", error);
    return NextResponse.json(
      { error: "시드 데이터 확인에 실패했습니다" },
      { status: 500 }
    );
  }
}
