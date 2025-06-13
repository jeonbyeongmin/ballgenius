import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { KBO_Game } from "@/model/kbo";

// POST /api/kbo/sync - KBO API 데이터를 데이터베이스에 동기화
export async function POST(request: NextRequest) {
  try {
    // 인증 헤더 확인 (크론 작업이나 관리자만 접근 가능)
    const authHeader = request.headers.get("authorization");
    const apiKey = process.env.SYNC_API_KEY || "default-sync-key";

    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { date } = body;

    // 날짜가 지정되지 않았다면 오늘 날짜 사용
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const targetDate = date || `${yyyy}${mm}${dd}`;

    // 날짜 형식 검증
    if (!/^\d{8}$/.test(targetDate)) {
      return NextResponse.json(
        { error: "잘못된 날짜 형식입니다. YYYYMMDD 형식으로 입력해주세요." },
        { status: 400 }
      );
    }

    console.log(`🔄 KBO 데이터 동기화 시작: ${targetDate}`);

    // KBO API 호출
    const apiUrl = "https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList";
    const requestBody = JSON.stringify({
      leId: "1",
      srId: "0,1,3,4,5,7,9",
      date: targetDate,
    });

    const kboResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Referer: "https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx",
        Origin: "https://www.koreabaseball.com",
        "User-Agent": "Mozilla/5.0 (compatible; BallGeniusBot/1.0)",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: requestBody,
    });

    if (!kboResponse.ok) {
      console.error(`❌ KBO API 요청 실패: ${kboResponse.status}`);
      return NextResponse.json(
        { error: "KBO API 요청에 실패했습니다", status: kboResponse.status },
        { status: 502 }
      );
    }

    const raw = await kboResponse.text();

    // JSON 파싱
    let parsed;
    try {
      let onlyJson = raw;
      const htmlIdx = raw.indexOf("<!DOCTYPE html>");
      if (htmlIdx !== -1) {
        onlyJson = raw.substring(0, htmlIdx);
      }

      const jsonStart = onlyJson.indexOf('{"game":');
      const jsonEnd = onlyJson.lastIndexOf("}") + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        onlyJson = onlyJson.substring(jsonStart, jsonEnd);
      }

      parsed = JSON.parse(onlyJson);
    } catch (error) {
      console.error("❌ JSON 파싱 실패:", error);
      return NextResponse.json(
        { error: "KBO API 응답 파싱에 실패했습니다" },
        { status: 500 }
      );
    }

    if (!parsed.game || !Array.isArray(parsed.game)) {
      console.log(`ℹ️ ${targetDate}에 경기가 없습니다`);
      return NextResponse.json({
        success: true,
        message: "해당 날짜에 경기가 없습니다",
        date: targetDate,
        gamesCreated: 0,
        gamesUpdated: 0,
      });
    }

    let gamesCreated = 0;
    let gamesUpdated = 0;

    // 각 경기 데이터를 데이터베이스에 저장/업데이트
    for (const kboGame of parsed.game) {
      const game: KBO_Game = kboGame;

      // 게임 ID 생성 (KBO API의 G_ID 사용하거나 자체 생성)
      const gameId =
        game.G_ID || `${targetDate}${game.AWAY_ID}${game.HOME_ID}0`;

      // 경기 상태 매핑
      let status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED" =
        "SCHEDULED";
      if (game.GAME_RESULT_CK === 1) {
        status = "COMPLETED";
      } else if (game.CANCEL_SC_ID && game.CANCEL_SC_ID !== "0") {
        status = "CANCELLED";
      } else if (game.GAME_STATE_SC && game.GAME_STATE_SC !== "0") {
        status = "LIVE";
      }

      const gameData = {
        id: gameId,
        date: targetDate,
        time: game.G_TM || "18:30",
        homeTeamId: game.HOME_ID,
        homeTeamName: game.HOME_NM,
        awayTeamId: game.AWAY_ID,
        awayTeamName: game.AWAY_NM,
        stadium: game.S_NM,
        status,
        homeScore: game.B_SCORE_CN ? parseInt(game.B_SCORE_CN) : null,
        awayScore: game.T_SCORE_CN ? parseInt(game.T_SCORE_CN) : null,
        homePitcherId: game.B_PIT_P_ID ? String(game.B_PIT_P_ID) : null,
        homePitcherName: game.B_PIT_P_NM || null,
        awayPitcherId: game.T_PIT_P_ID ? String(game.T_PIT_P_ID) : null,
        awayPitcherName: game.T_PIT_P_NM || null,
      };

      try {
        // upsert를 사용해서 존재하면 업데이트, 없으면 생성
        const result = await prisma.game.upsert({
          where: { id: gameId },
          update: {
            time: gameData.time,
            stadium: gameData.stadium,
            status: gameData.status,
            homeScore: gameData.homeScore,
            awayScore: gameData.awayScore,
            homePitcherName: gameData.homePitcherName,
            awayPitcherName: gameData.awayPitcherName,
            updatedAt: new Date(),
          },
          create: gameData,
        });

        // 생성인지 업데이트인지 확인 (생성된 경우 createdAt이 최근)
        const isNewGame =
          new Date(result.createdAt).getTime() > Date.now() - 5000;
        if (isNewGame) {
          gamesCreated++;
          console.log(`✅ 새 경기 생성: ${game.AWAY_NM} vs ${game.HOME_NM}`);

          // 새 경기에 대한 배팅 풀도 생성
          await prisma.betPool.upsert({
            where: { gameId },
            update: {},
            create: {
              gameId,
              homePool: 0,
              awayPool: 0,
              totalPool: 0,
              homeOdds: 1.0,
              awayOdds: 1.0,
            },
          });
        } else {
          gamesUpdated++;
          console.log(
            `🔄 경기 업데이트: ${game.AWAY_NM} vs ${game.HOME_NM} (${status})`
          );
        }
      } catch (error) {
        console.error(`❌ 경기 저장 실패 (${gameId}):`, error);
        continue;
      }
    }

    console.log(
      `✅ KBO 데이터 동기화 완료: ${gamesCreated}개 생성, ${gamesUpdated}개 업데이트`
    );

    return NextResponse.json({
      success: true,
      message: "KBO 데이터 동기화가 완료되었습니다",
      date: targetDate,
      gamesCreated,
      gamesUpdated,
      totalGames: parsed.game.length,
    });
  } catch (error) {
    console.error("❌ KBO 데이터 동기화 오류:", error);
    return NextResponse.json(
      {
        error: "KBO 데이터 동기화에 실패했습니다",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET /api/kbo/sync - 동기화 상태 확인
export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const todayGames = await prisma.game.findMany({
      where: { date: today },
      orderBy: { time: "asc" },
    });

    return NextResponse.json({
      success: true,
      date: today,
      gamesCount: todayGames.length,
      games: todayGames.map((game) => ({
        id: game.id,
        teams: `${game.awayTeamName} vs ${game.homeTeamName}`,
        time: game.time,
        status: game.status,
        score:
          game.homeScore !== null && game.awayScore !== null
            ? `${game.awayScore}:${game.homeScore}`
            : null,
      })),
      lastSync: todayGames.length > 0 ? todayGames[0].updatedAt : null,
    });
  } catch (error) {
    console.error("❌ 동기화 상태 확인 오류:", error);
    return NextResponse.json(
      { error: "동기화 상태 확인에 실패했습니다" },
      { status: 500 }
    );
  }
}
