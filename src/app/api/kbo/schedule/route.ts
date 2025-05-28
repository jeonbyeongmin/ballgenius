import { KBO_Game } from "@/model/kbo";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const today = `${yyyy}${mm}${dd}`;

    const apiUrl = "https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList";
    const body = JSON.stringify({
      leId: "1",
      srId: "0,1,3,4,5,7,9",
      date: today,
    });
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Referer: "https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx",
        Origin: "https://www.koreabaseball.com",
        "User-Agent": "Mozilla/5.0 (compatible; BallGeniusBot/1.0)",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
      },
      body,
    });

    const raw = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: "KBO API 요청 실패", status: res.status, raw, body },
        { status: 502 }
      );
    }

    let parsed;
    try {
      let onlyJson = raw;
      const htmlIdx = raw.indexOf("<!DOCTYPE html>");
      if (htmlIdx !== -1) {
        onlyJson = raw.substring(0, htmlIdx);
      }
      // game만 추출
      const jsonStart = onlyJson.indexOf('{"game":');
      const jsonEnd = onlyJson.lastIndexOf("}") + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        onlyJson = onlyJson.substring(jsonStart, jsonEnd);
      }
      parsed = JSON.parse(onlyJson);
    } catch {
      return NextResponse.json(
        { error: "JSON 파싱 실패", raw, body },
        { status: 500 }
      );
    }
    if (!parsed.game || !Array.isArray(parsed.game)) {
      return NextResponse.json(
        { games: [], parsed, raw, body },
        { status: 200 }
      );
    }

    const games = parsed.game.map((g: KBO_Game) => ({
      time: g.G_TM,
      awayTeamName: g.AWAY_NM,
      awayTeamId: g.AWAY_ID,
      homeTeamName: g.HOME_NM,
      homeTeamId: g.HOME_ID,
      stadium: g.S_NM,
      awayScore: g.T_SCORE_CN,
      homeScore: g.B_SCORE_CN,
      state: g.GAME_STATE_SC,
      awayPitcherName: g.T_PIT_P_NM,
      awayPitcherId: g.T_PIT_P_ID,
      homePitcherName: g.B_PIT_P_NM,
      homePitcherId: g.B_PIT_P_ID,
    }));

    return NextResponse.json({ games });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
