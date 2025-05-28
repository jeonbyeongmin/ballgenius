"use client";

import { Game } from "@/model/game";
import { KBO_GameState } from "@/model/kbo";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/kbo/schedule")
      .then((res) => res.json())
      .then((data) => {
        console.log("🚀 ~ .then ~ data:", data);
        if (data.games) setGames(data.games);
        else setError(data.error || "경기 정보를 불러올 수 없습니다.");
      })
      .catch(() => setError("경기 정보를 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid grid-rows-[60px_1fr_40px] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-gray-50 dark:bg-black">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-2xl">
        <section
          id="predict"
          className="w-full bg-white dark:bg-zinc-900 rounded-xl shadow p-6 mb-4"
        >
          <h2 className="text-xl font-bold mb-2">오늘의 KBO 경기 예측</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            경기 결과를 예측하고 포인트를 획득하세요!
          </p>
          <div className="flex flex-col gap-2 min-h-[60px]">
            {loading && (
              <div className="text-center text-gray-400">
                경기 정보를 불러오는 중...
              </div>
            )}
            {error && <div className="text-center text-red-500">{error}</div>}
            {!loading && !error && games.length === 0 && (
              <div className="text-center text-gray-400">
                오늘 예정된 경기가 없습니다.
              </div>
            )}
            {!loading &&
              !error &&
              games.map((game, idx) => {
                if (game.state === KBO_GameState.CANCELLED) {
                  return (
                    <div
                      key={idx}
                      className="w-full bg-gradient-to-br from-gray-200/80 to-white dark:from-zinc-800 dark:to-zinc-900 rounded-xl shadow flex flex-col gap-2 p-4 mb-2 border-2 border-dashed border-red-400 dark:border-red-600 opacity-70"
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex flex-col items-center flex-1">
                          <Image
                            width={44}
                            height={44}
                            src={`https://sports-phinf.pstatic.net/team/kbo/default/${game.homeTeamId}.png?type=f108_108`}
                            alt={game.homeTeamName}
                            className="mb-1 grayscale"
                          />
                          <span className="font-bold text-base text-gray-400 dark:text-gray-500">
                            {game.homeTeamName}
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-4 py-1 rounded-full bg-gray-300 text-gray-500 font-bold text-sm shadow border border-gray-400 cursor-not-allowed select-none">
                            경기 취소
                          </span>
                        </div>
                        <div className="flex flex-col items-center flex-1">
                          <Image
                            width={44}
                            height={44}
                            src={`https://sports-phinf.pstatic.net/team/kbo/default/${game.awayTeamId}.png?type=f108_108`}
                            alt={game.awayTeamName}
                            className="mb-1 grayscale"
                          />
                          <span className="font-bold text-base text-gray-400 dark:text-gray-500">
                            {game.awayTeamName}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-center items-center mt-2 text-xs text-gray-400 dark:text-gray-500 gap-2">
                        <span>{game.time}</span>
                        <span>·</span>
                        <span>{game.stadium}</span>
                      </div>
                    </div>
                  );
                }
                if (game.state === KBO_GameState.COMPLETED) {
                  return (
                    <div
                      key={idx}
                      className="w-full bg-gradient-to-br from-gray-100/80 to-white dark:from-zinc-900 dark:to-zinc-800 rounded-xl shadow flex flex-col gap-2 p-4 mb-2 border border-green-200 dark:border-green-700"
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        {/* 홈팀 */}
                        <div className="flex flex-col items-center flex-1">
                          <Image
                            width={44}
                            height={44}
                            src={`https://sports-phinf.pstatic.net/team/kbo/default/${game.homeTeamId}.png?type=f108_108`}
                            alt={game.homeTeamName}
                            className="mb-1"
                          />
                          <span className="font-bold text-base text-blue-900 dark:text-blue-100">
                            {game.homeTeamName}
                          </span>
                        </div>
                        {/* 점수 */}
                        <div className="flex flex-col items-center gap-1 min-w-[70px]">
                          <span className="px-4 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 font-bold text-lg shadow border border-green-300 dark:border-green-700">
                            {game.homeScore} : {game.awayScore}
                          </span>
                          <span className="text-xs text-gray-400">
                            경기 종료
                          </span>
                        </div>
                        {/* 어웨이팀 */}
                        <div className="flex flex-col items-center flex-1">
                          <Image
                            width={44}
                            height={44}
                            src={`https://sports-phinf.pstatic.net/team/kbo/default/${game.awayTeamId}.png?type=f108_108`}
                            alt={game.awayTeamName}
                            className="mb-1"
                          />
                          <span className="font-bold text-base text-blue-900 dark:text-blue-100">
                            {game.awayTeamName}
                          </span>
                        </div>
                      </div>
                      {/* 선발투수 정보 */}
                      <div className="flex items-center justify-between w-full mt-2 gap-2">
                        <div className="flex items-center gap-1 flex-1 justify-center">
                          <span className="text-blue-700 dark:text-blue-200 font-bold text-xs">
                            선발
                          </span>
                          <Image
                            width={28}
                            height={28}
                            src={`https://sports-phinf.pstatic.net/player/kbo/default/${game.homePitcherId}.png?type=w150`}
                            alt={game.homePitcherName}
                            className="inline w-7 h-7 rounded-full border-2 border-blue-400 bg-white shadow"
                            onError={(e) =>
                              (e.currentTarget.style.display = "none")
                            }
                          />
                          <span className="ml-1 text-xs font-bold text-blue-900 dark:text-blue-100">
                            {game.homePitcherName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 flex-1 justify-center">
                          <span className="text-blue-700 dark:text-blue-200 font-bold text-xs">
                            선발
                          </span>
                          <Image
                            width={28}
                            height={28}
                            src={`https://sports-phinf.pstatic.net/player/kbo/default/${game.awayPitcherId}.png?type=w150`}
                            alt={game.awayPitcherName}
                            className="inline w-7 h-7 rounded-full border-2 border-blue-400 bg-white shadow"
                            onError={(e) =>
                              (e.currentTarget.style.display = "none")
                            }
                          />
                          <span className="ml-1 text-xs font-bold text-blue-900 dark:text-blue-100">
                            {game.awayPitcherName}
                          </span>
                        </div>
                      </div>
                      {/* 경기 정보 */}
                      <div className="flex justify-center items-center mt-2 text-xs text-gray-500 dark:text-gray-300 gap-2">
                        <span>{game.time}</span>
                        <span>·</span>
                        <span>{game.stadium}</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={idx}
                    className="w-full bg-gradient-to-br from-blue-50/80 to-white dark:from-zinc-900 dark:to-zinc-800 rounded-xl shadow flex flex-col gap-2 p-4 mb-2 border border-blue-100 dark:border-zinc-700"
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      {/* 홈팀 */}
                      <div className="flex flex-col items-center flex-1">
                        <Image
                          width={44}
                          height={44}
                          src={`https://sports-phinf.pstatic.net/team/kbo/default/${game.homeTeamId}.png?type=f108_108`}
                          alt={game.homeTeamName}
                          className="mb-1"
                        />
                        <span className="font-bold text-base text-blue-900 dark:text-blue-100">
                          {game.homeTeamName}
                        </span>
                      </div>
                      {/* 예측 버튼/무승부 */}
                      <div className="flex flex-col items-center gap-1">
                        <button className="px-4 py-1 rounded-full bg-blue-500 text-white font-bold text-sm shadow hover:bg-blue-600 transition">
                          {game.homeTeamName} 승
                        </button>
                        <button className="px-4 py-1 rounded-full bg-gray-300 text-gray-700 font-bold text-sm shadow hover:bg-gray-400 transition">
                          무승부
                        </button>
                        <button className="px-4 py-1 rounded-full bg-red-500 text-white font-bold text-sm shadow hover:bg-red-600 transition">
                          {game.awayTeamName} 승
                        </button>
                      </div>
                      {/* 어웨이팀 */}
                      <div className="flex flex-col items-center flex-1">
                        <Image
                          width={44}
                          height={44}
                          src={`https://sports-phinf.pstatic.net/team/kbo/default/${game.awayTeamId}.png?type=f108_108`}
                          alt={game.awayTeamName}
                          className="mb-1"
                        />
                        <span className="font-bold text-base text-blue-900 dark:text-blue-100">
                          {game.awayTeamName}
                        </span>
                      </div>
                    </div>
                    {/* 선발투수 정보 */}
                    <div className="flex items-center justify-between w-full mt-2 gap-2">
                      <div className="flex items-center gap-1 flex-1 justify-center">
                        <span className="text-blue-700 dark:text-blue-200 font-bold text-xs">
                          선발
                        </span>
                        <Image
                          width={28}
                          height={28}
                          src={`https://sports-phinf.pstatic.net/player/kbo/default/${game.homePitcherId}.png?type=w150`}
                          alt={game.homePitcherName}
                          className="inline w-7 h-7 rounded-full border-2 border-blue-400 bg-white shadow"
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />
                        <span className="ml-1 text-xs font-bold text-blue-900 dark:text-blue-100">
                          {game.homePitcherName}
                        </span>
                      </div>
                      <span className="text-blue-400 font-bold text-lg">|</span>
                      <div className="flex items-center gap-1 flex-1 justify-center">
                        <span className="text-blue-700 dark:text-blue-200 font-bold text-xs">
                          선발
                        </span>
                        <Image
                          width={28}
                          height={28}
                          src={`https://sports-phinf.pstatic.net/player/kbo/default/${game.awayPitcherId}.png?type=w150`}
                          alt={game.awayPitcherName}
                          className="inline w-7 h-7 rounded-full border-2 border-blue-400 bg-white shadow"
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />
                        <span className="ml-1 text-xs font-bold text-blue-900 dark:text-blue-100">
                          {game.awayPitcherName}
                        </span>
                      </div>
                    </div>
                    {/* 경기 정보 */}
                    <div className="flex justify-center items-center mt-2 text-xs text-gray-500 dark:text-gray-300 gap-2">
                      <span>{game.time}</span>
                      <span>·</span>
                      <span>{game.stadium}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </main>
      <footer className="row-start-3 flex gap-4 flex-wrap items-center justify-center text-xs text-gray-500 dark:text-gray-400">
        <span>© 2025 BallGenius. KBO 예측 플랫폼</span>
      </footer>
    </div>
  );
}
