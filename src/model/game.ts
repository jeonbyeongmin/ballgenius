import { KBO_GameState } from "./kbo";

export type Game = {
  time: string;
  awayTeamName: string;
  awayTeamId: string;
  homeTeamName: string;
  homeTeamId: string;
  stadium: string;
  awayScore: string;
  homeScore: string;
  state: KBO_GameState;
  awayPitcherName: string;
  awayPitcherId: string;
  homePitcherName: string;
  homePitcherId: string;
};
