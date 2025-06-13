import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/kbo/test-data - 테스트용 더미 경기 생성
export async function POST(request: NextRequest) {
  try {
    // 인증 헤더 확인
    const authHeader = request.headers.get("authorization");
    const apiKey = process.env.SYNC_API_KEY || "default-sync-key";

    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { hours = 2 } = body; // 몇 시간 후 경기인지

    const now = new Date();
    const gameTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const dateString = gameTime.toISOString().slice(0, 10).replace(/-/g, "");
    const timeString = `${String(gameTime.getHours()).padStart(
      2,
      "0"
    )}:${String(gameTime.getMinutes()).padStart(2, "0")}`;

    // 테스트 경기 생성
    const testGame = {
      id: `${dateString}TEST0`,
      date: dateString,
      time: timeString,
      homeTeamId: "OB",
      homeTeamName: "두산",
      awayTeamId: "LG",
      awayTeamName: "LG",
      stadium: "잠실야구장",
      status: "SCHEDULED" as const,
      homeScore: null,
      awayScore: null,
      homePitcherName: "테스트투수",
      awayPitcherName: "테스트투수2",
      homePitcherId: null,
      awayPitcherId: null,
    };

    // 경기 생성
    await prisma.game.upsert({
      where: { id: testGame.id },
      update: testGame,
      create: testGame,
    });

    // 배팅 풀 생성
    await prisma.betPool.upsert({
      where: { gameId: testGame.id },
      update: {},
      create: {
        gameId: testGame.id,
        homePool: 0,
        awayPool: 0,
        totalPool: 0,
        homeOdds: 1.0,
        awayOdds: 1.0,
      },
    });

    console.log(
      `✅ 테스트 경기 생성: ${testGame.awayTeamName} vs ${testGame.homeTeamName} (${hours}시간 후)`
    );

    return NextResponse.json({
      success: true,
      message: "테스트 경기가 생성되었습니다",
      game: testGame,
      hoursLater: hours,
    });
  } catch (error) {
    console.error("❌ 테스트 데이터 생성 오류:", error);
    return NextResponse.json(
      {
        error: "테스트 데이터 생성에 실패했습니다",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE /api/kbo/test-data - 테스트 데이터 삭제
export async function DELETE(request: NextRequest) {
  try {
    // 인증 헤더 확인
    const authHeader = request.headers.get("authorization");
    const apiKey = process.env.SYNC_API_KEY || "default-sync-key";

    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 테스트 경기 삭제 (ID에 TEST가 포함된 경기들)
    const deletedPredictions = await prisma.prediction.deleteMany({
      where: {
        gameId: {
          contains: "TEST",
        },
      },
    });

    const deletedBetPools = await prisma.betPool.deleteMany({
      where: {
        gameId: {
          contains: "TEST",
        },
      },
    });

    const deletedGames = await prisma.game.deleteMany({
      where: {
        id: {
          contains: "TEST",
        },
      },
    });

    console.log(`🧹 테스트 데이터 정리 완료:`);
    console.log(`   - 삭제된 경기: ${deletedGames.count}개`);
    console.log(`   - 삭제된 예측: ${deletedPredictions.count}개`);
    console.log(`   - 삭제된 배팅풀: ${deletedBetPools.count}개`);

    return NextResponse.json({
      success: true,
      message: "테스트 데이터가 삭제되었습니다",
      deleted: {
        games: deletedGames.count,
        predictions: deletedPredictions.count,
        betPools: deletedBetPools.count,
      },
    });
  } catch (error) {
    console.error("❌ 테스트 데이터 정리 오류:", error);
    return NextResponse.json(
      {
        error: "테스트 데이터 정리에 실패했습니다",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
