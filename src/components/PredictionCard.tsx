"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
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

interface PredictionCardProps {
  game: GameWithStats;
  onPredictionSubmit: (gameId: string, prediction: PredictionData) => void;
  isSubmitting: boolean;
}

interface PredictionData {
  predictedWinner: PredictedResult;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
}

export default function PredictionCard({
  game,
  onPredictionSubmit,
  isSubmitting,
}: PredictionCardProps) {
  const { data: session } = useSession();
  const [selectedWinner, setSelectedWinner] = useState<PredictedResult | null>(
    game.userPrediction?.predictedWinner || null
  );
  const [homeScore, setHomeScore] = useState<number>(
    game.userPrediction?.predictedHomeScore || 0
  );
  const [awayScore, setAwayScore] = useState<number>(
    game.userPrediction?.predictedAwayScore || 0
  );
  const [showScorePrediction, setShowScorePrediction] = useState(false);

  const handleSubmit = () => {
    if (!selectedWinner) return;

    const predictionData: PredictionData = {
      predictedWinner: selectedWinner,
    };

    if (showScorePrediction) {
      predictionData.predictedHomeScore = homeScore;
      predictionData.predictedAwayScore = awayScore;
    }

    onPredictionSubmit(game.id, predictionData);
  };

  const isAlreadyPredicted = !!game.userPrediction;
  const canPredict = session && game.isPredictable && !isAlreadyPredicted;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 mb-4 border border-gray-200 dark:border-zinc-700">
      {/* 경기 정보 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {game.time} · {game.stadium}
          </span>
          {/* 경기 상태 배지 */}
          {game.status === "COMPLETED" && (
            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
              경기 종료
            </span>
          )}
          {game.status === "CANCELLED" && (
            <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded-full">
              경기 취소
            </span>
          )}
          {game.status === "LIVE" && (
            <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full">
              진행 중
            </span>
          )}
          {game.status === "SCHEDULED" && !game.isPredictable && (
            <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full">
              예측 마감
            </span>
          )}
        </div>
        <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
          {game.predictionStats.total}명 예측
        </div>
      </div>

      {/* 팀 정보 */}
      <div className="flex items-center justify-between mb-6">
        {/* 어웨이 팀 */}
        <div className="flex flex-col items-center flex-1">
          <Image
            width={60}
            height={60}
            src={`https://sports-phinf.pstatic.net/team/kbo/default/${game.awayTeamId}.png?type=f108_108`}
            alt={game.awayTeamName}
            className="mb-2"
          />
          <span className="font-bold text-lg">{game.awayTeamName}</span>
          {game.awayPitcherName && (
            <span className="text-sm text-gray-500">
              {game.awayPitcherName}
            </span>
          )}
        </div>

        {/* VS / 점수 */}
        <div className="flex flex-col items-center px-4">
          {game.status === "COMPLETED" ? (
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {game.awayScore} : {game.homeScore}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                경기 종료
              </div>
            </div>
          ) : game.status === "LIVE" ? (
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {game.awayScore || 0} : {game.homeScore || 0}
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                진행 중
              </div>
            </div>
          ) : game.status === "CANCELLED" ? (
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500 dark:text-red-400">
                취소
              </div>
              <div className="text-sm text-red-500 dark:text-red-400 mt-1">
                경기 취소
              </div>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-2xl font-bold text-gray-400">VS</span>
              {!game.isPredictable && (
                <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  예측 마감
                </div>
              )}
            </div>
          )}
        </div>

        {/* 홈 팀 */}
        <div className="flex flex-col items-center flex-1">
          <Image
            width={60}
            height={60}
            src={`https://sports-phinf.pstatic.net/team/kbo/default/${game.homeTeamId}.png?type=f108_108`}
            alt={game.homeTeamName}
            className="mb-2"
          />
          <span className="font-bold text-lg">{game.homeTeamName}</span>
          {game.homePitcherName && (
            <span className="text-sm text-gray-500">
              {game.homePitcherName}
            </span>
          )}
        </div>
      </div>

      {/* 예측 통계 */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>다른 사용자들의 예측</span>
          <span>{game.predictionStats.total}명</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-blue-500"
              style={{ width: `${game.predictionStats.awayPercentage}%` }}
            />
            <div
              className="bg-red-500"
              style={{ width: `${game.predictionStats.homePercentage}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-blue-600">
            {game.awayTeamName} {game.predictionStats.awayPercentage.toFixed(1)}
            %
          </span>
          <span className="text-red-600">
            {game.homeTeamName} {game.predictionStats.homePercentage.toFixed(1)}
            %
          </span>
        </div>
      </div>

      {/* 기존 예측 표시 */}
      {isAlreadyPredicted && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-green-800 dark:text-green-200 font-medium">
              예측 완료:{" "}
              {game.userPrediction!.predictedWinner === "HOME"
                ? game.homeTeamName
                : game.userPrediction!.predictedWinner === "AWAY"
                ? game.awayTeamName
                : "무승부"}
            </span>
            {game.userPrediction!.status === "WIN" && (
              <span className="text-green-600 font-bold">
                +{game.userPrediction!.pointsEarned}P
              </span>
            )}
          </div>
          {game.userPrediction!.predictedHomeScore !== null && (
            <div className="text-sm text-green-600 dark:text-green-300 mt-1">
              예측 점수: {game.userPrediction!.predictedAwayScore} :{" "}
              {game.userPrediction!.predictedHomeScore}
            </div>
          )}
        </div>
      )}

      {/* 예측 폼 */}
      {canPredict && (
        <div className="space-y-4">
          {/* 승부 예측 */}
          <div>
            <label className="block text-sm font-medium mb-2">승부 예측</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedWinner("AWAY")}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedWinner === "AWAY"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {game.awayTeamName} 승
              </button>
              <button
                onClick={() => setSelectedWinner("DRAW")}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedWinner === "DRAW"
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                무승부
              </button>
              <button
                onClick={() => setSelectedWinner("HOME")}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedWinner === "HOME"
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {game.homeTeamName} 승
              </button>
            </div>
          </div>

          {/* 상세 점수 예측 옵션 */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showScorePrediction}
                onChange={(e) => setShowScorePrediction(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">
                상세 점수 예측 (+50 보너스 포인트)
              </span>
            </label>
          </div>

          {/* 점수 입력 */}
          {showScorePrediction && (
            <div className="grid grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {game.awayTeamName}
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={awayScore}
                  onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <div className="text-center text-lg font-bold">:</div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {game.homeTeamName}
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={homeScore}
                  onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!selectedWinner || isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isSubmitting ? "예측 중..." : "예측하기"}
          </button>
        </div>
      )}

      {/* 예측 마감 메시지 */}
      {session &&
        !canPredict &&
        !isAlreadyPredicted &&
        game.status === "SCHEDULED" && (
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium">
              ⏰ 예측이 마감되었습니다
            </p>
            <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">
              경기 시작 1시간 전까지만 예측 가능합니다
            </p>
          </div>
        )}

      {/* 경기 완료 메시지 */}
      {game.status === "COMPLETED" && (
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-green-800 dark:text-green-200 font-medium">
            🏁 경기가 종료되었습니다
          </p>
          {game.userPrediction && (
            <p className="text-green-600 dark:text-green-400 text-sm mt-1">
              {game.userPrediction.status === "WIN"
                ? "🎉 예측 성공!"
                : game.userPrediction.status === "LOSE"
                ? "😅 예측 실패"
                : "⏳ 결과 처리 중"}
            </p>
          )}
        </div>
      )}

      {/* 경기 취소 메시지 */}
      {game.status === "CANCELLED" && (
        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-800 dark:text-red-200 font-medium">
            ❌ 경기가 취소되었습니다
          </p>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">
            날씨 또는 기타 사유로 경기가 취소되었습니다
          </p>
        </div>
      )}

      {/* 로그인 필요 메시지 */}
      {!session && game.isPredictable && (
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            예측하려면 로그인이 필요합니다
          </p>
          <button
            onClick={() => (window.location.href = "/auth/signin")}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            로그인하기
          </button>
        </div>
      )}
    </div>
  );
}
