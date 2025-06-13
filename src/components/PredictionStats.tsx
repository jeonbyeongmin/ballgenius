"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface UserStats {
  overview: {
    totalPredictions: number;
    successfulPredictions: number;
    overallWinRate: number;
    currentStreak: number;
    maxStreak: number;
    currentPoints: number;
  };
  periodStats: {
    period: string;
    totalPredictions: number;
    winPredictions: number;
    losePredictions: number;
    pendingPredictions: number;
    winRate: number;
    totalPointsEarned: number;
  };
  monthlyStats: Array<{
    year: number;
    month: number;
    total: number;
    wins: number;
    winRate: number;
    points: number;
  }>;
}

export default function PredictionStats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    if (!session) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/predictions/stats?period=${period}`);
        const data = await response.json();

        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error("통계 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [session, period]);

  if (!session) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-bold mb-2">나의 예측 통계</h3>
          <p className="text-gray-600 dark:text-gray-400">
            로그인 후 통계를 확인할 수 있습니다
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-bold mb-2">나의 예측 통계</h3>
          <p className="text-gray-600 dark:text-gray-400">
            통계를 불러올 수 없습니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h3 className="text-lg font-bold mb-2 sm:mb-0">나의 예측 통계</h3>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
        >
          <option value="all">전체</option>
          <option value="month">최근 한 달</option>
          <option value="week">최근 일주일</option>
        </select>
      </div>

      {/* 주요 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.periodStats.totalPredictions}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            총 예측
          </div>
        </div>

        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.periodStats.winRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">승률</div>
        </div>

        <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.overview.currentStreak}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            현재 연승
          </div>
        </div>

        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats.overview.currentPoints.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">포인트</div>
        </div>
      </div>

      {/* 상세 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* 예측 결과 분포 */}
        <div>
          <h4 className="text-md font-semibold mb-3">예측 결과 분포</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-green-600">성공</span>
              <div className="flex-1 mx-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.periodStats.totalPredictions > 0
                        ? (stats.periodStats.winPredictions /
                            stats.periodStats.totalPredictions) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-sm font-medium">
                {stats.periodStats.winPredictions}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-red-600">실패</span>
              <div className="flex-1 mx-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.periodStats.totalPredictions > 0
                        ? (stats.periodStats.losePredictions /
                            stats.periodStats.totalPredictions) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-sm font-medium">
                {stats.periodStats.losePredictions}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">대기중</span>
              <div className="flex-1 mx-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gray-500 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.periodStats.totalPredictions > 0
                        ? (stats.periodStats.pendingPredictions /
                            stats.periodStats.totalPredictions) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-sm font-medium">
                {stats.periodStats.pendingPredictions}
              </span>
            </div>
          </div>
        </div>

        {/* 전체 기록 */}
        <div>
          <h4 className="text-md font-semibold mb-3">전체 기록</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>총 예측 수:</span>
              <span className="font-medium">
                {stats.overview.totalPredictions}회
              </span>
            </div>
            <div className="flex justify-between">
              <span>성공한 예측:</span>
              <span className="font-medium text-green-600">
                {stats.overview.successfulPredictions}회
              </span>
            </div>
            <div className="flex justify-between">
              <span>전체 승률:</span>
              <span className="font-medium">
                {stats.overview.overallWinRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>최대 연승:</span>
              <span className="font-medium text-yellow-600">
                {stats.overview.maxStreak}회
              </span>
            </div>
            <div className="flex justify-between">
              <span>획득 포인트:</span>
              <span className="font-medium text-blue-600">
                +{stats.periodStats.totalPointsEarned.toLocaleString()}P
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 월별 성과 차트 */}
      <div>
        <h4 className="text-md font-semibold mb-3">월별 성과 (최근 6개월)</h4>
        <div className="overflow-x-auto">
          <div className="flex space-x-4 min-w-max">
            {stats.monthlyStats.map((month) => (
              <div
                key={`${month.year}-${month.month}`}
                className="text-center min-w-[80px]"
              >
                <div className="text-xs text-gray-500 mb-1">
                  {month.year}.{month.month.toString().padStart(2, "0")}
                </div>
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg relative overflow-hidden">
                  {month.total > 0 && (
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-blue-500"
                      style={{
                        height: `${Math.max(10, (month.winRate / 100) * 100)}%`,
                      }}
                    />
                  )}
                </div>
                <div className="text-xs mt-1">
                  <div className="font-medium">{month.winRate.toFixed(0)}%</div>
                  <div className="text-gray-500">{month.total}전</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
