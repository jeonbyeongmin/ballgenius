"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import PredictionCard from "@/components/PredictionCard";
import PredictionStats from "@/components/PredictionStats";
import Leaderboard from "@/components/Leaderboard";
import { Game, Prediction, PredictedResult } from "@/types/database";

interface GameWithStats extends Game {
  userPrediction: Prediction | null;
  isPredictable?: boolean;
  predictionStats: {
    total: number;
    home: number;
    away: number;
    homePercentage: number;
    awayPercentage: number;
  };
}

interface PredictionData {
  predictedWinner: PredictedResult;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
}

export default function PredictionsPage() {
  const { data: session } = useSession();
  const [games, setGames] = useState<GameWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "predict" | "stats" | "leaderboard"
  >("predict");

  const fetchAvailableGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 로그인 상태에 관계없이 데이터베이스 기반 API 호출
      const response = await fetch("/api/predictions/available");
      const data = await response.json();

      if (data.success) {
        setGames(data.data.games || []);
      } else {
        setError(data.error || "경기 정보를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("경기 목록 조회 실패:", error);
      setError("경기 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableGames();
  }, [fetchAvailableGames]);

  const handlePredictionSubmit = async (
    gameId: string,
    predictionData: PredictionData
  ) => {
    if (!session) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      setSubmitting(gameId);

      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId,
          ...predictionData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 성공적으로 예측이 등록되면 경기 목록 새로고침
        await fetchAvailableGames();
        alert("예측이 성공적으로 등록되었습니다!");
      } else {
        alert(data.error || "예측 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error("예측 등록 실패:", error);
      alert("예측 등록에 실패했습니다.");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            ⚾ BallGenius - KBO 예측 게임
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            오늘의 KBO 경기 결과를 예측하고 포인트를 획득하세요!
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("predict")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "predict"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              경기 예측
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "stats"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              내 통계
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "leaderboard"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              리더보드
            </button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 메인 컨텐츠 */}
          <div className="lg:col-span-2">
            {activeTab === "predict" && (
              <div>
                <h2 className="text-xl font-bold mb-6">🎯 오늘의 KBO 경기</h2>

                {loading && (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse"
                      >
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                    <button
                      onClick={fetchAvailableGames}
                      className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      다시 시도
                    </button>
                  </div>
                )}

                {!loading && !error && games.length === 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
                    <div className="mb-4">
                      <div className="text-4xl mb-2">⚾</div>
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        오늘 예정된 KBO 경기가 없습니다.
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        경기 일정을 확인하고 내일 다시 방문해주세요!
                      </p>
                    </div>
                    <button
                      onClick={fetchAvailableGames}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      새로고침
                    </button>
                  </div>
                )}

                {!loading && !error && games.length > 0 && (
                  <div className="space-y-8">
                    {/* 예측 가능한 경기 */}
                    {games.filter((game) => game.isPredictable).length > 0 ? (
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            🎯 예측 가능한 경기
                          </h3>
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 text-xs font-medium rounded-full">
                            {games.filter((game) => game.isPredictable).length}
                            경기
                          </span>
                        </div>
                        <div className="space-y-4">
                          {games
                            .filter((game) => game.isPredictable)
                            .map((game) => (
                              <PredictionCard
                                key={game.id}
                                game={game}
                                onPredictionSubmit={handlePredictionSubmit}
                                isSubmitting={submitting === game.id}
                              />
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6 text-center">
                        <div className="text-3xl mb-2">⏰</div>
                        <p className="text-orange-700 dark:text-orange-300 font-medium mb-2">
                          현재 예측 가능한 경기가 없습니다
                        </p>
                        <p className="text-sm text-orange-600 dark:text-orange-400">
                          모든 경기가 예측 마감(시작 1시간 전) 되었거나 이미
                          진행중입니다.
                        </p>
                      </div>
                    )}

                    {/* 진행중/완료/취소된 경기 */}
                    {games.filter((game) => !game.isPredictable).length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            📊 진행중/완료된 경기
                          </h3>
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 text-xs font-medium rounded-full">
                            {games.filter((game) => !game.isPredictable).length}
                            경기
                          </span>
                        </div>
                        <div className="space-y-4">
                          {games
                            .filter((game) => !game.isPredictable)
                            .map((game) => (
                              <PredictionCard
                                key={game.id}
                                game={game}
                                onPredictionSubmit={handlePredictionSubmit}
                                isSubmitting={submitting === game.id}
                              />
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "stats" && <PredictionStats />}
            {activeTab === "leaderboard" && <Leaderboard />}
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 빠른 통계 */}
            {session && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold mb-4">🎮 빠른 정보</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>현재 포인트:</span>
                    <span className="font-bold text-blue-600">1,000P</span>
                  </div>
                  <div className="flex justify-between">
                    <span>현재 연승:</span>
                    <span className="font-bold text-yellow-600">3회</span>
                  </div>
                  <div className="flex justify-between">
                    <span>전체 승률:</span>
                    <span className="font-bold text-green-600">72.5%</span>
                  </div>
                </div>
              </div>
            )}

            {/* 게임 규칙 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">📋 게임 규칙</h3>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    기본 예측:
                  </span>
                  <br />
                  승부 결과만 맞추면 50포인트
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    완벽 예측:
                  </span>
                  <br />
                  점수까지 정확히 맞추면 100포인트
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    연승 보너스:
                  </span>
                  <br />
                  3연승: +25P, 5연승: +50P, 7연승: +100P
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    예측 마감:
                  </span>
                  <br />
                  경기 시작 1시간 전까지 예측 가능
                </div>
              </div>
            </div>

            {/* 오늘의 하이라이트 */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-4">✨ 오늘의 하이라이트</h3>
              <div className="space-y-2 text-sm">
                <p>🏆 현재 1위: 야구매니아 (95.2% 승률)</p>
                <p>🔥 최고 연승: 홈런왕 (15연승)</p>
                <p>🎯 오늘 경기: {games.length}경기</p>
                <p>👥 참여자 수: 1,247명</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
