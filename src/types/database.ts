// Prisma 생성 타입들을 재exports
export type {
  User,
  Game,
  Prediction,
  Bet,
  BetPool,
  ShopItem,
  Purchase,
  UserInventory,
  PointHistory,
  GameStatus,
  PredictedResult,
  PredictionStatus,
  BetStatus,
  ItemCategory,
  PointType,
} from "@prisma/client";

// 커스텀 타입들
export interface UserWithStats extends User {
  winRate: number;
  totalEarnings: number;
}

export interface GameWithBets extends Game {
  betPool?: BetPool;
  userPrediction?: Prediction;
  userBet?: Bet;
}

export interface PredictionWithGame extends Prediction {
  game: Game;
}

export interface BetWithGame extends Bet {
  game: Game;
}

export interface CreatePredictionData {
  gameId: string;
  predictedWinner: PredictedResult;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
}

export interface CreateBetData {
  gameId: string;
  betAmount: number;
  predictedWinner: PredictedResult;
}

export interface GameResult {
  gameId: string;
  homeScore: number;
  awayScore: number;
  winner: PredictedResult;
}

export interface BetOdds {
  homeOdds: number;
  awayOdds: number;
  homePool: number;
  awayPool: number;
  totalPool: number;
}
