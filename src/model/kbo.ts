export type KBO_Game = {
  LE_ID: number; // 리그 ID
  SR_ID: number; // 시리즈?
  SEASON_ID: number; // 시즌 ID (yyyy)
  G_DT: string; // 경기 날짜 (yyyymmdd)
  G_DT_TXT: string; // 경기 날짜 텍스트 (yyyy년 mm월 dd일)
  G_ID: string; // 경기 ID (yyyymmddAWAY_IDHOME_ID0)
  HEADER_NO: number; // 헤더 번호
  G_TM: string; // 경기 시간
  S_NM: string; // 구장 이름
  AWAY_ID: string; // 어웨이 팀 ID
  HOME_ID: string; // 홈 팀 ID
  AWAY_NM: string; // 어웨이 팀 이름
  HOME_NM: string; // 홈 팀 이름
  T_PIT_P_ID: number; // 어웨이 선발 투수 ID
  T_PIT_P_NM: string; // 선발 투수 이름
  B_PIT_P_ID: number; // 선발 투수 ID
  B_PIT_P_NM: string; // 선발 투수 이름
  W_PIT_P_ID: number; // 승리 투수 ID
  W_PIT_P_NM: string; // 승리 투수 이름
  SV_PIT_P_ID: number; // 세이브 투수 ID
  SV_PIT_P_NM: string; // 세이브 투수 이름
  L_PIT_P_ID: number; // 패전 투수 ID
  L_PIT_P_NM: string; // 패전 투수 이름
  T_D_PIT_P_ID: string | null; // 어웨이 팀 대체 투수 ID
  T_D_PIT_P_NM: string; // 어웨이 팀 대체 투수 이름
  B_D_PIT_P_ID: string | null; // 홈 팀 대체 투수 ID
  B_D_PIT_P_NM: string; // 홈 팀 대체 투수 이름
  GAME_STATE_SC: string; // 경기 상태 코드
  CANCEL_SC_ID: string; // 취소 상태 코드 ID
  CANCEL_SC_NM: string; // 취소 상태 코드 이름
  GAME_INN_NO: number; // 경기 이닝 번호
  GAME_TB_SC: string; // 경기 팀 코드 (T: 어웨이, B: 홈)
  GAME_TB_SC_NM: string;
  GAME_RESULT_CK: number; // 경기 결과 체크 (1: 경기 종료, 0: 경기 진행 중)
  T_SCORE_CN: string; // 어웨이 팀 점수
  B_SCORE_CN: string; // 홈 팀 점수
  VS_GAME_CN: number;
  B1_BAT_ORDER_NO: number;
  B2_BAT_ORDER_NO: number;
  B3_BAT_ORDER_NO: number;

  GAME_SC_ID: number;
  GAME_SC_NM: string;
  IE_ENTRY_CK: number;
  START_PIT_CK: number;
  T_GROUP_SC: string | null;
  T_RANK_NO: number;
  B_GROUP_SC: string | null;
  B_RANK_NO: number;
  ROUND_SC: string | null;
  DETAIL_SC: string | null;
  GAME_NO: string | null;
  LINEUP_CK: number;
  VOD_CK: number;
  KBOT_SE: number; // KBO 통계 엔트리
  SCORE_CK: string; // 점수 체크  (1: 점수 있음, 0: 점수 없음)
  CHECK_SWING_CK: boolean;
};

export enum KBO_GameState {
  NOT_STARTED = "0", // 경기 예정
  DELAYED = "1", //
  IN_PROGRESS = "2", // 경기 중
  COMPLETED = "3", // 완료
  CANCELLED = "4",
  POSTPONED = "6", // 연기
}
