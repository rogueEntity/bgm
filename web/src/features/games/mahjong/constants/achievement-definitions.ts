// web/src/features/games/mahjong/constants/achievement-definitions.ts

export type AchievementCategory =
  | "BEGINNER"
  | "RANK"
  | "AGARI"
  | "DEFENSE"
  | "RIICHI_TENPAI"
  | "YAKU"
  | "RYUUKYOKU"
  | "SCORE";

export type AchievementConditionType =
  | "MAHJONG_COMPLETED_MATCH_COUNT"
  | "MAHJONG_FIRST_PLACE_COUNT"
  | "MAHJONG_TOP_TWO_COUNT"
  | "MAHJONG_NON_LAST_PLACE_COUNT"
  | "MAHJONG_AGARI_COUNT"
  | "MAHJONG_RON_AGARI_COUNT"
  | "MAHJONG_TSUMO_AGARI_COUNT"
  | "MAHJONG_MANGAN_OR_HIGHER_COUNT"
  | "MAHJONG_HANEMAN_OR_HIGHER_COUNT"
  | "MAHJONG_BAIMAN_OR_HIGHER_COUNT"
  | "MAHJONG_YAKUMAN_COUNT"
  | "MAHJONG_NO_DEAL_IN_MATCH_COUNT"
  | "MAHJONG_LOW_DEAL_IN_RATE"
  | "MAHJONG_RIICHI_DECLARED_COUNT"
  | "MAHJONG_DOUBLE_RIICHI_AGARI_COUNT"
  | "MAHJONG_RYUUKYOKU_TENPAI_COUNT"
  | "MAHJONG_SPECIFIC_YAKU_AGARI_COUNT"
  | "MAHJONG_DORA_COUNT_AGARI"
  | "MAHJONG_RYUUKYOKU_PARTICIPATION_COUNT"
  | "MAHJONG_SPECIAL_RYUUKYOKU_COUNT"
  | "MAHJONG_FORCED_END_PARTICIPATION_COUNT"
  | "MAHJONG_FINAL_SCORE_AT_LEAST_COUNT"
  | "MAHJONG_COMEBACK_SURVIVAL_COUNT"
  | "MAHJONG_LAST_ROUND_RANK_UP_COUNT";

export type BadgeDisplayType = "EMOJI" | "TEXT";

export type BadgeRarity =
  | "COMMON"
  | "RARE"
  | "EPIC"
  | "LEGENDARY"
  | "SPECIAL";

export type Badge = {
  id: string;
  name: string;
  description: string;

  /**
   * 배지 칩 안에 표시할 값.
   * 예: "🍗", "역만", "리치", "5만", "TOP"
   */
  display: string;

  /**
   * 이모지/텍스트 스타일 분기용.
   */
  displayType: BadgeDisplayType;

  /**
   * 추후 테두리/배경 강조용.
   * 초기 UI에서는 전부 동일 스타일로 보여줘도 됨.
   */
  rarity: BadgeRarity;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  goal: number;
  badgeId: string;
  conditionType: AchievementConditionType;

  /**
   * 조건 계산에 필요한 추가 값.
   */
  conditionValue?: {
    rank?: number;
    minRank?: number;
    minScore?: number;
    minDora?: number;
    maxDealInRate?: number;
    minMatchCount?: number;
    yakuIds?: string[];
  };
};

export const BADGES: Badge[] = [
  // BEGINNER
  {
    id: "badge_rookie_player",
    name: "신입 작사",
    description: "마작 대국을 처음 완료한 작사입니다.",
    display: "🔰",
    displayType: "EMOJI",
    rarity: "COMMON",
  },
  {
    id: "badge_chicken_dinner",
    name: "치킨 디너",
    description: "첫 1위를 달성한 작사입니다.",
    display: "🍗",
    displayType: "EMOJI",
    rarity: "COMMON",
  },
  {
    id: "badge_deployed",
    name: "전장 투입",
    description: "작탁에 본격적으로 투입된 작사입니다.",
    display: "투입",
    displayType: "TEXT",
    rarity: "COMMON",
  },
  {
    id: "badge_survivor",
    name: "생존자",
    description: "여러 대국을 버텨낸 작사입니다.",
    display: "생존",
    displayType: "TEXT",
    rarity: "COMMON",
  },
  {
    id: "badge_veteran",
    name: "베테랑",
    description: "노련하게 대국을 쌓아온 작사입니다.",
    display: "베테랑",
    displayType: "TEXT",
    rarity: "RARE",
  },
  {
    id: "badge_table_resident",
    name: "작탁 주민",
    description: "작탁에 자주 출몰하는 작사입니다.",
    display: "주민",
    displayType: "TEXT",
    rarity: "RARE",
  },

  // RANK
  {
    id: "badge_win_rookie",
    name: "승리 루키",
    description: "1위 경험이 쌓이기 시작한 작사입니다.",
    display: "1등",
    displayType: "TEXT",
    rarity: "COMMON",
  },
  {
    id: "badge_winner_angle",
    name: "우승각",
    description: "우승각을 자주 보는 작사입니다.",
    display: "우승각",
    displayType: "TEXT",
    rarity: "RARE",
  },
  {
    id: "badge_lobby_ticket",
    name: "로비행 티켓",
    description: "상대를 로비로 보내는 데 익숙한 작사입니다.",
    display: "로비행",
    displayType: "TEXT",
    rarity: "EPIC",
  },
  {
    id: "badge_safe_zone",
    name: "안정권",
    description: "상위권 진입에 익숙한 작사입니다.",
    display: "안정권",
    displayType: "TEXT",
    rarity: "COMMON",
  },
  {
    id: "badge_high_ranker",
    name: "상위권",
    description: "상위권을 꾸준히 유지하는 작사입니다.",
    display: "TOP",
    displayType: "TEXT",
    rarity: "RARE",
  },
  {
    id: "badge_not_last",
    name: "탈꼴찌",
    description: "꼴찌만은 피하는 생존 본능의 작사입니다.",
    display: "탈꼴",
    displayType: "TEXT",
    rarity: "COMMON",
  },

  // AGARI
  {
    id: "badge_first_agari",
    name: "첫 화료",
    description: "처음으로 화료한 작사입니다.",
    display: "화료",
    displayType: "TEXT",
    rarity: "COMMON",
  },
  {
    id: "badge_valid_hit",
    name: "유효타",
    description: "꾸준히 화료를 기록하는 작사입니다.",
    display: "적중",
    displayType: "TEXT",
    rarity: "COMMON",
  },
  {
    id: "badge_kill_log",
    name: "킬로그",
    description: "화료 기록을 차곡차곡 쌓는 작사입니다.",
    display: "킬로그",
    displayType: "TEXT",
    rarity: "RARE",
  },
  {
    id: "badge_rush_leader",
    name: "돌격대장",
    description: "론 화료에 능한 공격적인 작사입니다.",
    display: "론",
    displayType: "TEXT",
    rarity: "RARE",
  },
  {
    id: "badge_supply_drop",
    name: "보급품",
    description: "쯔모로 보급품을 챙기는 작사입니다.",
    display: "📦",
    displayType: "EMOJI",
    rarity: "RARE",
  },
  {
    id: "badge_headshot",
    name: "헤드샷",
    description: "만관 이상의 강한 일격을 성공시킨 작사입니다.",
    display: "만관",
    displayType: "TEXT",
    rarity: "RARE",
  },
  {
    id: "badge_critical_hit",
    name: "치명타",
    description: "하네만 이상의 치명타를 날린 작사입니다.",
    display: "하네",
    displayType: "TEXT",
    rarity: "EPIC",
  },
  {
    id: "badge_airstrike",
    name: "공습 경보",
    description: "배만 이상의 공습급 화료를 성공시킨 작사입니다.",
    display: "배만",
    displayType: "TEXT",
    rarity: "EPIC",
  },
  {
    id: "badge_not_hack",
    name: "핵 아님",
    description: "역만을 성공시킨 수상할 정도로 강한 작사입니다.",
    display: "역만",
    displayType: "TEXT",
    rarity: "LEGENDARY",
  },

  // DEFENSE
  {
    id: "badge_armor_lv1",
    name: "방탄조끼",
    description: "방총 없이 대국을 마친 작사입니다.",
    display: "방어",
    displayType: "TEXT",
    rarity: "COMMON",
  },
  {
    id: "badge_armor_lv2",
    name: "튼튼한 조끼",
    description: "방총 없는 대국을 여러 번 기록한 작사입니다.",
    display: "철벽",
    displayType: "TEXT",
    rarity: "RARE",
  },
  {
    id: "badge_evasive_movement",
    name: "회피 기동",
    description: "낮은 방총률을 유지하는 방어형 작사입니다.",
    display: "회피",
    displayType: "TEXT",
    rarity: "EPIC",
  },
  {
    id: "badge_survival_king",
    name: "생존왕",
    description: "4등을 피하는 데 능한 작사입니다.",
    display: "생존왕",
    displayType: "TEXT",
    rarity: "RARE",
  },

  // RIICHI / TENPAI
  {
    id: "badge_first_riichi",
    name: "첫 리치",
    description: "처음으로 리치를 선언한 작사입니다.",
    display: "리치",
    displayType: "TEXT",
    rarity: "COMMON",
  },
  {
    id: "badge_riichi_maniac",
    name: "리치광",
    description: "리치를 자주 선언하는 작사입니다.",
    display: "리치광",
    displayType: "TEXT",
    rarity: "RARE",
  },
  {
    id: "badge_double_barrel",
    name: "더블 배럴",
    description: "더블리치로 화료한 작사입니다.",
    display: "더블",
    displayType: "TEXT",
    rarity: "EPIC",
  },
  {
    id: "badge_tenpai_waiting",
    name: "텐파이 대기조",
    description: "유국 시 텐파이를 자주 유지한 작사입니다.",
    display: "텐파이",
    displayType: "TEXT",
    rarity: "COMMON",
  },
  {
    id: "badge_undercover",
    name: "잠복근무",
    description: "끝까지 대기하며 텐파이를 유지하는 작사입니다.",
    display: "잠복",
    displayType: "TEXT",
    rarity: "RARE",
  },

  // YAKU
  {
    id: "badge_fundamental",
    name: "기본기",
    description: "리치 화료를 꾸준히 성공시킨 작사입니다.",
    display: "기본기",
    displayType: "TEXT",
    rarity: "COMMON",
  },
  {
    id: "badge_closed_patrol",
    name: "문전단속",
    description: "멘젠쯔모를 꾸준히 성공시킨 작사입니다.",
    display: "문전",
    displayType: "TEXT",
    rarity: "RARE",
  },
  {
    id: "badge_tanyao_factory",
    name: "탕야오 공장",
    description: "탕야오를 대량 생산하는 작사입니다.",
    display: "탕야",
    displayType: "TEXT",
    rarity: "COMMON",
  },
  {
    id: "badge_pinfu_master",
    name: "핀후 장인",
    description: "핀후를 꾸준히 완성하는 작사입니다.",
    display: "핀후",
    displayType: "TEXT",
    rarity: "COMMON",
  },
  {
    id: "badge_yakuhai_collector",
    name: "역패 수집가",
    description: "역패를 꾸준히 모으는 작사입니다.",
    display: "역패",
    displayType: "TEXT",
    rarity: "RARE",
  },
  {
    id: "badge_dora_thief",
    name: "도라 도둑",
    description: "도라를 훔치듯 챙기는 작사입니다.",
    display: "도라",
    displayType: "TEXT",
    rarity: "RARE",
  },
  {
    id: "badge_golden_hand",
    name: "황금 손패",
    description: "도라가 번쩍이는 손패를 완성한 작사입니다.",
    display: "✨",
    displayType: "EMOJI",
    rarity: "EPIC",
  },

  // RYUUKYOKU / SPECIAL
  {
    id: "badge_ceasefire",
    name: "정전 협정",
    description: "유국을 경험한 작사입니다.",
    display: "유국",
    displayType: "TEXT",
    rarity: "COMMON",
  },
  {
    id: "badge_flip_table",
    name: "판 엎기",
    description: "특수 유국을 경험한 작사입니다.",
    display: "🧨",
    displayType: "EMOJI",
    rarity: "RARE",
  },
  {
    id: "badge_escape_button",
    name: "탈출 버튼",
    description: "강제 종료된 대국을 경험한 작사입니다.",
    display: "탈출",
    displayType: "TEXT",
    rarity: "SPECIAL",
  },

  // SCORE
  {
    id: "badge_30000_club",
    name: "3만점 클럽",
    description: "최종 점수 30,000점 이상을 기록한 작사입니다.",
    display: "3만",
    displayType: "TEXT",
    rarity: "COMMON",
  },
  {
    id: "badge_40000_club",
    name: "4만점 클럽",
    description: "최종 점수 40,000점 이상을 기록한 작사입니다.",
    display: "4만",
    displayType: "TEXT",
    rarity: "RARE",
  },
  {
    id: "badge_50000_club",
    name: "5만점 클럽",
    description: "최종 점수 50,000점 이상을 기록한 작사입니다.",
    display: "5만",
    displayType: "TEXT",
    rarity: "EPIC",
  },
  {
    id: "badge_cliff_survivor",
    name: "벼랑 끝",
    description: "위기 상황에서도 살아남은 작사입니다.",
    display: "벼랑",
    displayType: "TEXT",
    rarity: "EPIC",
  },
  {
    id: "badge_last_circle",
    name: "라스트 서클",
    description: "마지막 국에서 순위를 끌어올린 작사입니다.",
    display: "⭕",
    displayType: "EMOJI",
    rarity: "EPIC",
  },
];

export const AchievementDefinitions: Achievement[] = [
  // BEGINNER
  {
    id: "mahjong_training_complete",
    title: "훈련소 수료",
    description: "마작 대국을 1회 완료하세요.",
    category: "BEGINNER",
    goal: 1,
    badgeId: "badge_rookie_player",
    conditionType: "MAHJONG_COMPLETED_MATCH_COUNT",
  },
  {
    id: "mahjong_first_chicken",
    title: "첫 치킨",
    description: "마작 대국에서 처음으로 1위를 달성하세요.",
    category: "BEGINNER",
    goal: 1,
    badgeId: "badge_chicken_dinner",
    conditionType: "MAHJONG_FIRST_PLACE_COUNT",
  },
  {
    id: "mahjong_deployed",
    title: "전장 투입",
    description: "마작 대국에 5회 참여하세요.",
    category: "BEGINNER",
    goal: 5,
    badgeId: "badge_deployed",
    conditionType: "MAHJONG_COMPLETED_MATCH_COUNT",
  },
  {
    id: "mahjong_survival_expert",
    title: "생존 전문가",
    description: "마작 대국에 10회 참여하세요.",
    category: "BEGINNER",
    goal: 10,
    badgeId: "badge_survivor",
    conditionType: "MAHJONG_COMPLETED_MATCH_COUNT",
  },
  {
    id: "mahjong_veteran_survivor",
    title: "노련한 생존자",
    description: "마작 대국에 30회 참여하세요.",
    category: "BEGINNER",
    goal: 30,
    badgeId: "badge_veteran",
    conditionType: "MAHJONG_COMPLETED_MATCH_COUNT",
  },
  {
    id: "mahjong_table_resident",
    title: "작탁의 주민",
    description: "마작 대국에 50회 참여하세요.",
    category: "BEGINNER",
    goal: 50,
    badgeId: "badge_table_resident",
    conditionType: "MAHJONG_COMPLETED_MATCH_COUNT",
  },

  // RANK
  {
    id: "mahjong_no_top_ten",
    title: "탑텐은 없다",
    description: "1위를 3회 달성하세요.",
    category: "RANK",
    goal: 3,
    badgeId: "badge_win_rookie",
    conditionType: "MAHJONG_FIRST_PLACE_COUNT",
  },
  {
    id: "mahjong_winner_angle",
    title: "우승각",
    description: "1위를 10회 달성하세요.",
    category: "RANK",
    goal: 10,
    badgeId: "badge_winner_angle",
    conditionType: "MAHJONG_FIRST_PLACE_COUNT",
  },
  {
    id: "mahjong_send_to_lobby",
    title: "로비로 보내버렸다",
    description: "1위를 30회 달성하세요.",
    category: "RANK",
    goal: 30,
    badgeId: "badge_lobby_ticket",
    conditionType: "MAHJONG_FIRST_PLACE_COUNT",
  },
  {
    id: "mahjong_safe_zone",
    title: "안정권 확보",
    description: "2등 이상을 5회 달성하세요.",
    category: "RANK",
    goal: 5,
    badgeId: "badge_safe_zone",
    conditionType: "MAHJONG_TOP_TWO_COUNT",
    conditionValue: {
      minRank: 2,
    },
  },
  {
    id: "mahjong_high_rank_fixed",
    title: "상위권 고정",
    description: "2등 이상을 20회 달성하세요.",
    category: "RANK",
    goal: 20,
    badgeId: "badge_high_ranker",
    conditionType: "MAHJONG_TOP_TWO_COUNT",
    conditionValue: {
      minRank: 2,
    },
  },
  {
    id: "mahjong_not_last",
    title: "꼴찌만은 안 돼",
    description: "4등을 하지 않고 대국을 5회 완료하세요.",
    category: "RANK",
    goal: 5,
    badgeId: "badge_not_last",
    conditionType: "MAHJONG_NON_LAST_PLACE_COUNT",
  },

  // AGARI
  {
    id: "mahjong_ready_to_fire",
    title: "발포 준비 완료",
    description: "처음으로 화료하세요.",
    category: "AGARI",
    goal: 1,
    badgeId: "badge_first_agari",
    conditionType: "MAHJONG_AGARI_COUNT",
  },
  {
    id: "mahjong_valid_hit",
    title: "유효타 적중",
    description: "화료를 10회 달성하세요.",
    category: "AGARI",
    goal: 10,
    badgeId: "badge_valid_hit",
    conditionType: "MAHJONG_AGARI_COUNT",
  },
  {
    id: "mahjong_kill_log_spam",
    title: "킬로그 도배",
    description: "화료를 30회 달성하세요.",
    category: "AGARI",
    goal: 30,
    badgeId: "badge_kill_log",
    conditionType: "MAHJONG_AGARI_COUNT",
  },
  {
    id: "mahjong_rush_leader",
    title: "무지성 돌격대장",
    description: "론 화료를 10회 달성하세요.",
    category: "AGARI",
    goal: 10,
    badgeId: "badge_rush_leader",
    conditionType: "MAHJONG_RON_AGARI_COUNT",
  },
  {
    id: "mahjong_supply_drop",
    title: "보급품 강탈",
    description: "쯔모 화료를 10회 달성하세요.",
    category: "AGARI",
    goal: 10,
    badgeId: "badge_supply_drop",
    conditionType: "MAHJONG_TSUMO_AGARI_COUNT",
  },
  {
    id: "mahjong_headshot",
    title: "헤드샷",
    description: "만관 이상으로 화료하세요.",
    category: "AGARI",
    goal: 1,
    badgeId: "badge_headshot",
    conditionType: "MAHJONG_MANGAN_OR_HIGHER_COUNT",
  },
  {
    id: "mahjong_critical_hit",
    title: "치명타",
    description: "하네만 이상으로 화료하세요.",
    category: "AGARI",
    goal: 1,
    badgeId: "badge_critical_hit",
    conditionType: "MAHJONG_HANEMAN_OR_HIGHER_COUNT",
  },
  {
    id: "mahjong_airstrike_warning",
    title: "공습 경보",
    description: "배만 이상으로 화료하세요.",
    category: "AGARI",
    goal: 1,
    badgeId: "badge_airstrike",
    conditionType: "MAHJONG_BAIMAN_OR_HIGHER_COUNT",
  },
  {
    id: "mahjong_not_hack",
    title: "핵이 아니고 실력",
    description: "역만으로 화료하세요.",
    category: "AGARI",
    goal: 1,
    badgeId: "badge_not_hack",
    conditionType: "MAHJONG_YAKUMAN_COUNT",
  },

  // DEFENSE
  {
    id: "mahjong_armor_lv1",
    title: "방탄조끼 Lv.1",
    description: "방총 없이 대국을 1회 완료하세요.",
    category: "DEFENSE",
    goal: 1,
    badgeId: "badge_armor_lv1",
    conditionType: "MAHJONG_NO_DEAL_IN_MATCH_COUNT",
  },
  {
    id: "mahjong_armor_lv2",
    title: "방탄조끼 Lv.2",
    description: "방총 없이 대국을 3회 완료하세요.",
    category: "DEFENSE",
    goal: 3,
    badgeId: "badge_armor_lv2",
    conditionType: "MAHJONG_NO_DEAL_IN_MATCH_COUNT",
  },
  {
    id: "mahjong_if_you_dont_get_hit",
    title: "안 맞으면 된다",
    description: "방총률을 낮게 유지하며 10회 이상 대국하세요.",
    category: "DEFENSE",
    goal: 1,
    badgeId: "badge_evasive_movement",
    conditionType: "MAHJONG_LOW_DEAL_IN_RATE",
    conditionValue: {
      minMatchCount: 10,
      maxDealInRate: 0.12,
    },
  },
  {
    id: "mahjong_survivor_is_strong",
    title: "살아남은 자가 강한 자",
    description: "4등을 피하고 대국을 10회 완료하세요.",
    category: "DEFENSE",
    goal: 10,
    badgeId: "badge_survival_king",
    conditionType: "MAHJONG_NON_LAST_PLACE_COUNT",
  },

  // RIICHI / TENPAI
  {
    id: "mahjong_raise_hand",
    title: "손 들고 간다",
    description: "리치를 1회 선언하세요.",
    category: "RIICHI_TENPAI",
    goal: 1,
    badgeId: "badge_first_riichi",
    conditionType: "MAHJONG_RIICHI_DECLARED_COUNT",
  },
  {
    id: "mahjong_shout_it",
    title: "소리 질러",
    description: "리치를 10회 선언하세요.",
    category: "RIICHI_TENPAI",
    goal: 10,
    badgeId: "badge_riichi_maniac",
    conditionType: "MAHJONG_RIICHI_DECLARED_COUNT",
  },
  {
    id: "mahjong_double_barrel",
    title: "더블 배럴",
    description: "더블리치로 화료하세요.",
    category: "RIICHI_TENPAI",
    goal: 1,
    badgeId: "badge_double_barrel",
    conditionType: "MAHJONG_DOUBLE_RIICHI_AGARI_COUNT",
  },
  {
    id: "mahjong_at_the_door",
    title: "문 앞까지 왔다",
    description: "유국 시 텐파이 상태로 5회 종료하세요.",
    category: "RIICHI_TENPAI",
    goal: 5,
    badgeId: "badge_tenpai_waiting",
    conditionType: "MAHJONG_RYUUKYOKU_TENPAI_COUNT",
  },
  {
    id: "mahjong_hold_breath",
    title: "숨 참고 대기",
    description: "유국 시 텐파이 상태로 20회 종료하세요.",
    category: "RIICHI_TENPAI",
    goal: 20,
    badgeId: "badge_undercover",
    conditionType: "MAHJONG_RYUUKYOKU_TENPAI_COUNT",
  },

  // YAKU
  {
    id: "mahjong_fundamentals",
    title: "기본기가 생명",
    description: "리치로 5회 화료하세요.",
    category: "YAKU",
    goal: 5,
    badgeId: "badge_fundamental",
    conditionType: "MAHJONG_SPECIFIC_YAKU_AGARI_COUNT",
    conditionValue: {
      yakuIds: ["riichi"],
    },
  },
  {
    id: "mahjong_closed_patrol",
    title: "문전 단속",
    description: "멘젠쯔모로 5회 화료하세요.",
    category: "YAKU",
    goal: 5,
    badgeId: "badge_closed_patrol",
    conditionType: "MAHJONG_SPECIFIC_YAKU_AGARI_COUNT",
    conditionValue: {
      yakuIds: ["menzen_tsumo"],
    },
  },
  {
    id: "mahjong_tanyao_factory",
    title: "탕야오 공장",
    description: "탕야오로 10회 화료하세요.",
    category: "YAKU",
    goal: 10,
    badgeId: "badge_tanyao_factory",
    conditionType: "MAHJONG_SPECIFIC_YAKU_AGARI_COUNT",
    conditionValue: {
      yakuIds: ["tanyao"],
    },
  },
  {
    id: "mahjong_pinfu_master",
    title: "핀후 장인",
    description: "핀후로 10회 화료하세요.",
    category: "YAKU",
    goal: 10,
    badgeId: "badge_pinfu_master",
    conditionType: "MAHJONG_SPECIFIC_YAKU_AGARI_COUNT",
    conditionValue: {
      yakuIds: ["pinfu"],
    },
  },
  {
    id: "mahjong_yakuhai_collector",
    title: "역패 수집가",
    description: "역패로 10회 화료하세요.",
    category: "YAKU",
    goal: 10,
    badgeId: "badge_yakuhai_collector",
    conditionType: "MAHJONG_SPECIFIC_YAKU_AGARI_COUNT",
    conditionValue: {
      yakuIds: [
        "yakuhai_dragon_white",
        "yakuhai_dragon_green",
        "yakuhai_dragon_red",
        "yakuhai_prevailing",
        "yakuhai_player",
      ],
    },
  },
  {
    id: "mahjong_dora_thief",
    title: "도라 도둑",
    description: "도라를 3개 이상 포함해 화료하세요.",
    category: "YAKU",
    goal: 1,
    badgeId: "badge_dora_thief",
    conditionType: "MAHJONG_DORA_COUNT_AGARI",
    conditionValue: {
      minDora: 3,
    },
  },
  {
    id: "mahjong_shiny_hand",
    title: "반짝이는 손패",
    description: "도라를 5개 이상 포함해 화료하세요.",
    category: "YAKU",
    goal: 1,
    badgeId: "badge_golden_hand",
    conditionType: "MAHJONG_DORA_COUNT_AGARI",
    conditionValue: {
      minDora: 5,
    },
  },

  // RYUUKYOKU / SPECIAL
  {
    id: "mahjong_nobody_ate",
    title: "아무도 못 먹었다",
    description: "일반 유국을 1회 경험하세요.",
    category: "RYUUKYOKU",
    goal: 1,
    badgeId: "badge_ceasefire",
    conditionType: "MAHJONG_RYUUKYOKU_PARTICIPATION_COUNT",
  },
  {
    id: "mahjong_flip_the_table",
    title: "판 엎습니다",
    description: "특수 유국을 1회 발생시키세요.",
    category: "RYUUKYOKU",
    goal: 1,
    badgeId: "badge_flip_table",
    conditionType: "MAHJONG_SPECIAL_RYUUKYOKU_COUNT",
  },
  {
    id: "mahjong_force_quit_button",
    title: "강제 종료 버튼",
    description: "강제 종료된 대국에 참여하세요.",
    category: "RYUUKYOKU",
    goal: 1,
    badgeId: "badge_escape_button",
    conditionType: "MAHJONG_FORCED_END_PARTICIPATION_COUNT",
  },

  // SCORE
  {
    id: "mahjong_30000_club",
    title: "3만점 클럽",
    description: "최종 점수 30,000점 이상으로 대국을 완료하세요.",
    category: "SCORE",
    goal: 1,
    badgeId: "badge_30000_club",
    conditionType: "MAHJONG_FINAL_SCORE_AT_LEAST_COUNT",
    conditionValue: {
      minScore: 30000,
    },
  },
  {
    id: "mahjong_40000_club",
    title: "4만점 클럽",
    description: "최종 점수 40,000점 이상으로 대국을 완료하세요.",
    category: "SCORE",
    goal: 1,
    badgeId: "badge_40000_club",
    conditionType: "MAHJONG_FINAL_SCORE_AT_LEAST_COUNT",
    conditionValue: {
      minScore: 40000,
    },
  },
  {
    id: "mahjong_50000_club",
    title: "5만점 클럽",
    description: "최종 점수 50,000점 이상으로 대국을 완료하세요.",
    category: "SCORE",
    goal: 1,
    badgeId: "badge_50000_club",
    conditionType: "MAHJONG_FINAL_SCORE_AT_LEAST_COUNT",
    conditionValue: {
      minScore: 50000,
    },
  },
  {
    id: "mahjong_cliff_survival",
    title: "벼랑 끝 생존",
    description: "10,000점 미만까지 떨어진 대국에서 4등을 피하세요.",
    category: "SCORE",
    goal: 1,
    badgeId: "badge_cliff_survivor",
    conditionType: "MAHJONG_COMEBACK_SURVIVAL_COUNT",
    conditionValue: {
      minScore: 10000,
    },
  },
  {
    id: "mahjong_last_circle",
    title: "라스트 서클",
    description: "오라스에서 순위를 올려 대국을 종료하세요.",
    category: "SCORE",
    goal: 1,
    badgeId: "badge_last_circle",
    conditionType: "MAHJONG_LAST_ROUND_RANK_UP_COUNT",
  },
];

export const ACHIEVEMENT_CATEGORY_LABELS: Record<
  AchievementCategory,
  string
> = {
  BEGINNER: "입문",
  RANK: "순위",
  AGARI: "화료",
  DEFENSE: "방어",
  RIICHI_TENPAI: "리치/텐파이",
  YAKU: "역",
  RYUUKYOKU: "유국/특수",
  SCORE: "점수/역전",
};

export const BADGE_RARITY_LABELS: Record<BadgeRarity, string> = {
  COMMON: "일반",
  RARE: "희귀",
  EPIC: "영웅",
  LEGENDARY: "전설",
  SPECIAL: "특별",
};

export const BADGE_MAP: Record<string, Badge> = BADGES.reduce(
  (acc, badge) => {
    acc[badge.id] = badge;
    return acc;
  },
  {} as Record<string, Badge>
);

export const ACHIEVEMENT_MAP: Record<string, Achievement> =
  AchievementDefinitions.reduce(
    (acc, achievement) => {
      acc[achievement.id] = achievement;
      return acc;
    },
    {} as Record<string, Achievement>
  );

export const ACHIEVEMENTS_BY_CATEGORY: Record<
  AchievementCategory,
  Achievement[]
> = AchievementDefinitions.reduce(
  (acc, achievement) => {
    acc[achievement.category].push(achievement);
    return acc;
  },
  {
    BEGINNER: [],
    RANK: [],
    AGARI: [],
    DEFENSE: [],
    RIICHI_TENPAI: [],
    YAKU: [],
    RYUUKYOKU: [],
    SCORE: [],
  } as Record<AchievementCategory, Achievement[]>
);