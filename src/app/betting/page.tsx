"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import BettingCard from "@/components/BettingCard";
import { Game, Bet, PredictedResult } from "@/types/database";

interface GameWithBet extends Game {
  userBet?: Bet | null;
}

export default function BettingPage() {
  const { data: session } = useSession();
  const [games, setGames] = useState<GameWithBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "available" | "mybets" | "history"
  >("available");

  const fetchGamesWithBets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 예측 API를 재사용하여 경기 목록을 가져옴
      const response = await fetch("/api/predictions/available");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "경기 목록을 불러오는데 실패했습니다");
      }

      // Game 형태로 변환하고 베팅 정보 추가
      const transformedGames: GameWithBet[] = data.games.map((game: any) => ({
        ...game,
        userBet: game.userBet || null,
      }));

      setGames(transformedGames);
    } catch (err) {
      console.error("Error fetching games:", err);
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGamesWithBets();
  }, [fetchGamesWithBets]);

  const handleBetSubmit = async (betData: {
    gameId: string;
    predictedWinner: PredictedResult;
    betAmount: number;
    odds: number;
  }) => {
    if (!session) return;

    try {
      setSubmitting(betData.gameId);

      const response = await fetch("/api/bets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: betData.gameId,
          betAmount: betData.betAmount,
          predictedWinner: betData.predictedWinner,
          odds: betData.odds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "베팅에 실패했습니다");
      }

      // 성공시 게임 목록 다시 불러오기
      await fetchGamesWithBets();
    } catch (err) {
      console.error("Error submitting bet:", err);
      setError(
        err instanceof Error ? err.message : "베팅 중 오류가 발생했습니다"
      );
    } finally {
      setSubmitting(null);
    }
  };

  const availableGames = games.filter(
    (game) => game.status === "SCHEDULED" && !game.userBet
  );

  const myBets = games.filter((game) => game.userBet);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">로딩 중...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">베팅</h1>
          <p className="text-gray-600">
            KBO 경기에 베팅하고 포인트를 획득하세요
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 mb-6 shadow-sm">
          <button
            onClick={() => setActiveTab("available")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "available"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            베팅 가능한 경기 ({availableGames.length})
          </button>
          <button
            onClick={() => setActiveTab("mybets")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "mybets"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            내 베팅 ({myBets.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            베팅 내역
          </button>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* 컨텐츠 */}
        <div className="space-y-6">
          {activeTab === "available" && (
            <>
              {!session && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
                  베팅하려면 로그인이 필요합니다.
                </div>
              )}

              {availableGames.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-4">
                    <svg
                      className="mx-auto h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-lg text-gray-600">
                    베팅 가능한 경기가 없습니다
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    새로운 경기가 등록되면 베팅할 수 있습니다
                  </p>
                </div>
              ) : (
                availableGames.map((game) => (
                  <BettingCard
                    key={game.id}
                    game={game}
                    userBet={game.userBet}
                    onBetSubmit={handleBetSubmit}
                    isSubmitting={submitting === game.id}
                  />
                ))
              )}
            </>
          )}

          {activeTab === "mybets" && (
            <>
              {!session ? (
                <div className="text-center py-12">
                  <p className="text-lg text-gray-600">
                    로그인 후 내 베팅을 확인할 수 있습니다
                  </p>
                </div>
              ) : myBets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-4">
                    <svg
                      className="mx-auto h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-lg text-gray-600">
                    아직 베팅한 경기가 없습니다
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    경기에 베팅하고 포인트를 획득해보세요
                  </p>
                </div>
              ) : (
                myBets.map((game) => (
                  <BettingCard
                    key={game.id}
                    game={game}
                    userBet={game.userBet}
                    isSubmitting={false}
                  />
                ))
              )}
            </>
          )}

          {activeTab === "history" && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-lg text-gray-600">베팅 내역 기능</p>
              <p className="text-sm text-gray-500 mt-2">곧 출시될 예정입니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
