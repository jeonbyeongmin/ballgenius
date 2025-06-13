"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  points: number;
  totalPredictions: number;
  successfulPredictions: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  type: string;
  period: string;
  total: number;
}

export default function Leaderboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("winRate");
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/predictions/leaderboard?type=${type}&period=${period}&limit=50`
        );
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("리더보드 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [type, period]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "winRate":
        return "승률";
      case "streak":
        return "연승";
      case "points":
        return "포인트";
      case "total":
        return "예측 수";
      default:
        return "승률";
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "all":
        return "전체";
      case "month":
        return "이번 달";
      case "week":
        return "이번 주";
      default:
        return "전체";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return null;
    }
  };

  const isCurrentUser = (userId: string) => {
    return session?.user?.id === userId;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h3 className="text-lg font-bold mb-4 sm:mb-0">
          🏆 리더보드 - {getTypeLabel(type)} ({getPeriodLabel(period)})
        </h3>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value="winRate">승률 순</option>
            <option value="streak">연승 순</option>
            <option value="points">포인트 순</option>
            <option value="total">예측 수 순</option>
          </select>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value="all">전체 기간</option>
            <option value="month">이번 달</option>
            <option value="week">이번 주</option>
          </select>
        </div>
      </div>

      {/* 리더보드 목록 */}
      <div className="space-y-2">
        {data?.leaderboard.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
              isCurrentUser(entry.id)
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750"
            }`}
          >
            {/* 순위와 사용자 정보 */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10">
                {getRankIcon(entry.rank) ? (
                  <span className="text-2xl">{getRankIcon(entry.rank)}</span>
                ) : (
                  <span className="text-lg font-bold text-gray-500">
                    #{entry.rank}
                  </span>
                )}
              </div>

              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {entry.name}
                  {isCurrentUser(entry.id) && (
                    <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                      나
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {entry.totalPredictions}전 {entry.successfulPredictions}승
                </div>
              </div>
            </div>

            {/* 통계 정보 */}
            <div className="text-right">
              {type === "winRate" && (
                <div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {entry.winRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">승률</div>
                </div>
              )}

              {type === "streak" && (
                <div>
                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    {entry.currentStreak}연승
                  </div>
                  <div className="text-sm text-gray-500">
                    최대 {entry.maxStreak}연승
                  </div>
                </div>
              )}

              {type === "points" && (
                <div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {entry.points.toLocaleString()}P
                  </div>
                  <div className="text-sm text-gray-500">포인트</div>
                </div>
              )}

              {type === "total" && (
                <div>
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {entry.totalPredictions}
                  </div>
                  <div className="text-sm text-gray-500">예측 수</div>
                </div>
              )}
            </div>
          </div>
        ))}

        {(!data?.leaderboard || data.leaderboard.length === 0) && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>아직 리더보드에 표시할 데이터가 없습니다</p>
            <p className="text-sm mt-2">첫 번째 예측을 해보세요!</p>
          </div>
        )}
      </div>

      {/* 최소 참여 조건 안내 */}
      {type === "winRate" && (
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          * 승률 리더보드는 {period === "all" ? "10경기" : "5경기"} 이상 참여한
          사용자만 표시됩니다
        </div>
      )}
    </div>
  );
}
