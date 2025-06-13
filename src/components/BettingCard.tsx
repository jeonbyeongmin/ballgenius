"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Game, Bet, PredictedResult } from "@/types/database";

interface BettingCardProps {
  game: Game;
  userBet?: Bet | null;
  onBetSubmit?: (betData: {
    gameId: string;
    predictedWinner: PredictedResult;
    betAmount: number;
    odds: number;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const BettingCard = ({
  game,
  userBet,
  onBetSubmit,
  isSubmitting = false,
}: BettingCardProps) => {
  const { data: session } = useSession();
  const [betAmount, setBetAmount] = useState(100);
  const [selectedWinner, setSelectedWinner] = useState<PredictedResult | "">(
    ""
  );
  const [showBetForm, setShowBetForm] = useState(false);

  // 임시 배당률 계산 (실제로는 서버에서 계산되어야 함)
  const getOdds = (winner: PredictedResult) => {
    switch (winner) {
      case "HOME":
        return 1.8;
      case "AWAY":
        return 2.2;
      default:
        return 2.0;
    }
  };

  const handleBetSubmit = async () => {
    if (!session || !selectedWinner || !onBetSubmit) return;

    const odds = getOdds(selectedWinner);

    await onBetSubmit({
      gameId: game.id,
      predictedWinner: selectedWinner,
      betAmount,
      odds,
    });

    setShowBetForm(false);
    setSelectedWinner("");
  };

  const formatDate = (dateString: string) => {
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  const getWinnerDisplayText = (winner: PredictedResult) => {
    switch (winner) {
      case "HOME":
        return `${game.homeTeamName} 승리`;
      case "AWAY":
        return `${game.awayTeamName} 승리`;
      default:
        return "무승부";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      {/* 경기 정보 헤더 */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">
              {formatDate(game.date)} {formatTime(game.time)}
            </span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {game.status}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="font-semibold text-lg">{game.homeTeamName}</div>
              <div className="text-sm text-gray-600">홈</div>
            </div>

            <div className="mx-4 text-center">
              <div className="text-2xl font-bold text-gray-400">VS</div>
            </div>

            <div className="text-center flex-1">
              <div className="font-semibold text-lg">{game.awayTeamName}</div>
              <div className="text-sm text-gray-600">원정</div>
            </div>
          </div>
        </div>
      </div>

      {/* 기존 베팅 정보 */}
      {userBet && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">내 베팅: </span>
              <span className="text-blue-600">
                {getWinnerDisplayText(userBet.predictedWinner)}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">베팅 금액</div>
              <div className="font-semibold">
                {userBet.betAmount.toLocaleString()}P
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="text-sm text-gray-600">
              배당률: {userBet.odds}배
            </div>
            <div className="text-sm">
              예상 수익: {userBet.potentialWin.toLocaleString()}P
            </div>
          </div>
        </div>
      )}

      {/* 베팅 폼 */}
      {session && game.status === "SCHEDULED" && !userBet && (
        <div className="space-y-4">
          {!showBetForm ? (
            <button
              onClick={() => setShowBetForm(true)}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              베팅하기
            </button>
          ) : (
            <div className="space-y-4 border-t pt-4">
              {/* 승부 예측 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  승부 예측
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedWinner("HOME")}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      selectedWinner === "HOME"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                    }`}
                  >
                    {game.homeTeamName} 승리 ({getOdds("HOME")}배)
                  </button>
                  <button
                    onClick={() => setSelectedWinner("AWAY")}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      selectedWinner === "AWAY"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                    }`}
                  >
                    {game.awayTeamName} 승리 ({getOdds("AWAY")}배)
                  </button>
                </div>
              </div>

              {/* 베팅 금액 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  베팅 금액
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    min="10"
                    step="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">
                    P
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <div className="flex space-x-2">
                    {[100, 500, 1000, 5000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setBetAmount(amount)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                      >
                        {amount}P
                      </button>
                    ))}
                  </div>
                </div>
                {selectedWinner && (
                  <div className="mt-2 text-sm text-gray-600">
                    예상 수익:{" "}
                    {Math.round(
                      betAmount * getOdds(selectedWinner)
                    ).toLocaleString()}
                    P
                  </div>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowBetForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleBetSubmit}
                  disabled={!selectedWinner || isSubmitting}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? "베팅 중..." : "베팅 확정"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 로그인 필요 메시지 */}
      {!session && (
        <div className="text-center text-gray-500 py-4">
          베팅하려면 로그인이 필요합니다
        </div>
      )}

      {/* 베팅 불가 상태 */}
      {session && game.status !== "SCHEDULED" && (
        <div className="text-center text-gray-500 py-4">
          이 경기는 베팅이 마감되었습니다
        </div>
      )}
    </div>
  );
};

export default BettingCard;
