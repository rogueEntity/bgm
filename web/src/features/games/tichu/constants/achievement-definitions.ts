// web/src/features/games/tichu/constants/achievement-definitions.ts

export type TichuAchievementCategory =
    | "BEGINNER"
    | "WIN"
    | "TICHU"
    | "GRAND_TICHU"
    | "ROUND"
    | "TEAM"
    | "SCORE"
    | "SPECIAL";

export type TichuAchievementConditionType =
    | "TICHU_COMPLETED_MATCH_COUNT"
    | "TICHU_WIN_COUNT"
    | "TICHU_BIG_WIN_COUNT"
    | "TICHU_CLOSE_WIN_COUNT"
    | "TICHU_CALL_COUNT"
    | "TICHU_SUCCESS_COUNT"
    | "TICHU_FAILURE_COUNT"
    | "TICHU_SUCCESS_RATE"
    | "TICHU_GRAND_CALL_COUNT"
    | "TICHU_GRAND_SUCCESS_COUNT"
    | "TICHU_GRAND_FAILURE_COUNT"
    | "TICHU_FIRST_PLACE_COUNT"
    | "TICHU_LAST_PLACE_COUNT"
    | "TICHU_ONE_TWO_SUCCESS_COUNT"
    | "TICHU_ONE_TWO_SUFFERED_COUNT"
    | "TICHU_TOTAL_SCORE_DIFF_AT_LEAST"
    | "TICHU_BEST_SCORE_DIFF_AT_LEAST"
    | "TICHU_WORST_SCORE_DIFF_AT_MOST";

export type TichuBadgeDisplayType = "EMOJI" | "TEXT";

export type TichuBadgeRarity =
    | "COMMON"
    | "RARE"
    | "EPIC"
    | "LEGENDARY"
    | "SPECIAL";

export type TichuBadge = {
    id: string;
    name: string;
    description: string;

    /**
     * 배지 칩 안에 표시할 값.
     * 예: "🃏", "티츄", "GT", "원투"
     */
    display: string;

    /**
     * 이모지/텍스트 스타일 분기용.
     */
    displayType: TichuBadgeDisplayType;

    /**
     * 추후 테두리/배경 강조용.
     * 초기 UI에서는 전부 동일 스타일로 보여줘도 됨.
     */
    rarity: TichuBadgeRarity;
};

export type TichuAchievement = {
    id: string;
    title: string;
    description: string;
    category: TichuAchievementCategory;
    goal: number;
    badgeId: string;
    conditionType: TichuAchievementConditionType;

    /**
     * 조건 계산에 필요한 추가 값.
     */
    conditionValue?: {
        minScoreDiff?: number;
        maxScoreDiff?: number;
        minSuccessRate?: number;
        minCallCount?: number;
    };
};

export const TICHU_BADGES: TichuBadge[] = [
    // BEGINNER
    {
        id: "badge_tichu_rookie",
        name: "티츄 신입",
        description: "티츄 게임을 처음 완료한 플레이어입니다.",
        display: "🔰",
        displayType: "EMOJI",
        rarity: "COMMON",
    },
    {
        id: "badge_tichu_table_joined",
        name: "자리 착석",
        description: "티츄 테이블에 본격적으로 앉기 시작한 플레이어입니다.",
        display: "착석",
        displayType: "TEXT",
        rarity: "COMMON",
    },
    {
        id: "badge_tichu_regular",
        name: "티츄 단골",
        description: "티츄 판에 자주 출몰하는 플레이어입니다.",
        display: "단골",
        displayType: "TEXT",
        rarity: "RARE",
    },
    {
        id: "badge_tichu_resident",
        name: "티츄 주민",
        description: "티츄 테이블에 거의 상주하는 플레이어입니다.",
        display: "주민",
        displayType: "TEXT",
        rarity: "EPIC",
    },

    // WIN
    {
        id: "badge_tichu_first_win",
        name: "첫 승리",
        description: "티츄 게임에서 첫 승리를 달성한 플레이어입니다.",
        display: "🏆",
        displayType: "EMOJI",
        rarity: "COMMON",
    },
    {
        id: "badge_tichu_team_player",
        name: "팀플레이어",
        description: "티츄 승리를 꾸준히 쌓아가는 플레이어입니다.",
        display: "팀플",
        displayType: "TEXT",
        rarity: "COMMON",
    },
    {
        id: "badge_tichu_winner",
        name: "승리 수집가",
        description: "티츄 승리를 많이 쌓은 플레이어입니다.",
        display: "승리",
        displayType: "TEXT",
        rarity: "RARE",
    },
    {
        id: "badge_tichu_stomp",
        name: "압도",
        description: "큰 점수 차로 상대 팀을 눌러버린 플레이어입니다.",
        display: "압승",
        displayType: "TEXT",
        rarity: "RARE",
    },
    {
        id: "badge_tichu_clutch",
        name: "클러치",
        description: "아슬아슬한 승부를 가져간 플레이어입니다.",
        display: "클러치",
        displayType: "TEXT",
        rarity: "RARE",
    },

    // TICHU
    {
        id: "badge_tichu_first_call",
        name: "첫 선언",
        description: "처음으로 티츄를 선언한 플레이어입니다.",
        display: "📣",
        displayType: "EMOJI",
        rarity: "COMMON",
    },
    {
        id: "badge_tichu_believer",
        name: "믿음의 선언",
        description: "티츄 선언을 성공시킨 플레이어입니다.",
        display: "티츄",
        displayType: "TEXT",
        rarity: "COMMON",
    },
    {
        id: "badge_tichu_shouter",
        name: "외치는 자",
        description: "티츄를 자주 선언하는 플레이어입니다.",
        display: "외침",
        displayType: "TEXT",
        rarity: "RARE",
    },
    {
        id: "badge_tichu_master",
        name: "티츄 장인",
        description: "티츄 선언 성공을 꾸준히 쌓은 플레이어입니다.",
        display: "장인",
        displayType: "TEXT",
        rarity: "EPIC",
    },
    {
        id: "badge_tichu_sniper",
        name: "선언 저격수",
        description: "높은 티츄 성공률을 기록한 플레이어입니다.",
        display: "저격",
        displayType: "TEXT",
        rarity: "EPIC",
    },
    {
        id: "badge_tichu_oops",
        name: "손이 미끄러졌네",
        description: "티츄 실패도 추억으로 만드는 플레이어입니다.",
        display: "🙃",
        displayType: "EMOJI",
        rarity: "RARE",
    },

    // GRAND_TICHU
    {
        id: "badge_grand_tichu_first_call",
        name: "큰 판",
        description: "처음으로 그랜드 티츄를 선언한 플레이어입니다.",
        display: "🐉",
        displayType: "EMOJI",
        rarity: "RARE",
    },
    {
        id: "badge_grand_tichu_success",
        name: "그랜드 성공",
        description: "그랜드 티츄를 성공시킨 플레이어입니다.",
        display: "GT",
        displayType: "TEXT",
        rarity: "EPIC",
    },
    {
        id: "badge_grand_tichu_gambler",
        name: "배짱 플레이어",
        description: "그랜드 티츄를 자주 선언하는 플레이어입니다.",
        display: "배짱",
        displayType: "TEXT",
        rarity: "EPIC",
    },
    {
        id: "badge_grand_tichu_legend",
        name: "위대한 승부사",
        description: "그랜드 티츄 성공을 여러 번 기록한 플레이어입니다.",
        display: "👑",
        displayType: "EMOJI",
        rarity: "LEGENDARY",
    },
    {
        id: "badge_grand_tichu_disaster",
        name: "대참사",
        description: "그랜드 티츄 실패의 아픔을 아는 플레이어입니다.",
        display: "💣",
        displayType: "EMOJI",
        rarity: "SPECIAL",
    },

    // ROUND
    {
        id: "badge_tichu_first_out",
        name: "첫 1등",
        description: "라운드에서 처음으로 1등으로 나간 플레이어입니다.",
        display: "🥇",
        displayType: "EMOJI",
        rarity: "COMMON",
    },
    {
        id: "badge_tichu_vanguard",
        name: "선봉장",
        description: "라운드 1등을 꾸준히 기록하는 플레이어입니다.",
        display: "선봉",
        displayType: "TEXT",
        rarity: "RARE",
    },
    {
        id: "badge_tichu_ace",
        name: "에이스",
        description: "라운드에서 자주 먼저 나가는 플레이어입니다.",
        display: "ACE",
        displayType: "TEXT",
        rarity: "EPIC",
    },
    {
        id: "badge_tichu_cleaner",
        name: "마무리 담당",
        description: "라운드의 마지막을 자주 담당하는 플레이어입니다.",
        display: "마무리",
        displayType: "TEXT",
        rarity: "RARE",
    },

    // TEAM
    {
        id: "badge_tichu_one_two",
        name: "완벽한 호흡",
        description: "파트너와 함께 원투를 성공시킨 플레이어입니다.",
        display: "원투",
        displayType: "TEXT",
        rarity: "COMMON",
    },
    {
        id: "badge_tichu_one_two_punch",
        name: "원투 펀치",
        description: "원투 성공을 여러 번 기록한 플레이어입니다.",
        display: "🥊",
        displayType: "EMOJI",
        rarity: "RARE",
    },
    {
        id: "badge_tichu_one_two_storm",
        name: "폭풍 원투",
        description: "원투 성공을 많이 쌓은 플레이어입니다.",
        display: "폭풍",
        displayType: "TEXT",
        rarity: "EPIC",
    },
    {
        id: "badge_tichu_got_one_twoed",
        name: "당했다",
        description: "상대 팀의 원투를 경험한 플레이어입니다.",
        display: "🫠",
        displayType: "EMOJI",
        rarity: "COMMON",
    },

    // SCORE
    {
        id: "badge_tichu_score_maker",
        name: "점수 차 제조기",
        description: "누적 점수 차를 크게 벌린 플레이어입니다.",
        display: "📈",
        displayType: "EMOJI",
        rarity: "EPIC",
    },
    {
        id: "badge_tichu_big_bang",
        name: "한 방에 끝냈다",
        description: "한 경기에서 큰 점수 차를 만든 플레이어입니다.",
        display: "🚀",
        displayType: "EMOJI",
        rarity: "EPIC",
    },
    {
        id: "badge_tichu_negative_legend",
        name: "점수는 거들 뿐",
        description: "큰 마이너스 점수 차도 품어본 플레이어입니다.",
        display: "역풍",
        displayType: "TEXT",
        rarity: "SPECIAL",
    },
];

export const TichuAchievementDefinitions: TichuAchievement[] = [
    // BEGINNER
    {
        id: "tichu_training_complete",
        title: "티츄 입문",
        description: "티츄 게임을 1회 완료하세요.",
        category: "BEGINNER",
        goal: 1,
        badgeId: "badge_tichu_rookie",
        conditionType: "TICHU_COMPLETED_MATCH_COUNT",
    },
    {
        id: "tichu_table_joined",
        title: "자리에 앉았습니다",
        description: "티츄 게임을 5회 완료하세요.",
        category: "BEGINNER",
        goal: 5,
        badgeId: "badge_tichu_table_joined",
        conditionType: "TICHU_COMPLETED_MATCH_COUNT",
    },
    {
        id: "tichu_regular_player",
        title: "티츄 단골",
        description: "티츄 게임을 20회 완료하세요.",
        category: "BEGINNER",
        goal: 20,
        badgeId: "badge_tichu_regular",
        conditionType: "TICHU_COMPLETED_MATCH_COUNT",
    },
    {
        id: "tichu_table_resident",
        title: "테이블 주민",
        description: "티츄 게임을 50회 완료하세요.",
        category: "BEGINNER",
        goal: 50,
        badgeId: "badge_tichu_resident",
        conditionType: "TICHU_COMPLETED_MATCH_COUNT",
    },

    // WIN
    {
        id: "tichu_first_win",
        title: "첫 승리",
        description: "티츄 게임에서 처음 승리하세요.",
        category: "WIN",
        goal: 1,
        badgeId: "badge_tichu_first_win",
        conditionType: "TICHU_WIN_COUNT",
    },
    {
        id: "tichu_team_player",
        title: "팀 게임 장인",
        description: "티츄 게임에서 10승을 달성하세요.",
        category: "WIN",
        goal: 10,
        badgeId: "badge_tichu_team_player",
        conditionType: "TICHU_WIN_COUNT",
    },
    {
        id: "tichu_win_collector",
        title: "승리 수집가",
        description: "티츄 게임에서 30승을 달성하세요.",
        category: "WIN",
        goal: 30,
        badgeId: "badge_tichu_winner",
        conditionType: "TICHU_WIN_COUNT",
    },
    {
        id: "tichu_overwhelming_win",
        title: "압도적 승리",
        description: "500점 이상 차이로 승리하세요.",
        category: "WIN",
        goal: 1,
        badgeId: "badge_tichu_stomp",
        conditionType: "TICHU_BIG_WIN_COUNT",
        conditionValue: {
            minScoreDiff: 500,
        },
    },
    {
        id: "tichu_close_win",
        title: "아슬아슬한 승리",
        description: "100점 이하 차이로 승리하세요.",
        category: "WIN",
        goal: 1,
        badgeId: "badge_tichu_clutch",
        conditionType: "TICHU_CLOSE_WIN_COUNT",
        conditionValue: {
            maxScoreDiff: 100,
        },
    },

    // TICHU
    {
        id: "tichu_first_call",
        title: "첫 선언",
        description: "티츄를 처음 선언하세요.",
        category: "TICHU",
        goal: 1,
        badgeId: "badge_tichu_first_call",
        conditionType: "TICHU_CALL_COUNT",
    },
    {
        id: "tichu_first_success",
        title: "믿음의 선언",
        description: "티츄 선언에 처음 성공하세요.",
        category: "TICHU",
        goal: 1,
        badgeId: "badge_tichu_believer",
        conditionType: "TICHU_SUCCESS_COUNT",
    },
    {
        id: "tichu_shout_it",
        title: "일단 외쳐",
        description: "티츄를 10회 선언하세요.",
        category: "TICHU",
        goal: 10,
        badgeId: "badge_tichu_shouter",
        conditionType: "TICHU_CALL_COUNT",
    },
    {
        id: "tichu_master",
        title: "티츄 장인",
        description: "티츄 선언 성공을 10회 달성하세요.",
        category: "TICHU",
        goal: 10,
        badgeId: "badge_tichu_master",
        conditionType: "TICHU_SUCCESS_COUNT",
    },
    {
        id: "tichu_sniper",
        title: "선언 저격수",
        description: "티츄 선언 10회 이상, 성공률 70% 이상을 달성하세요.",
        category: "TICHU",
        goal: 1,
        badgeId: "badge_tichu_sniper",
        conditionType: "TICHU_SUCCESS_RATE",
        conditionValue: {
            minCallCount: 10,
            minSuccessRate: 0.7,
        },
    },
    {
        id: "tichu_oops",
        title: "아이고 손이 미끄러졌네",
        description: "티츄 선언에 5회 실패하세요.",
        category: "TICHU",
        goal: 5,
        badgeId: "badge_tichu_oops",
        conditionType: "TICHU_FAILURE_COUNT",
    },

    // GRAND_TICHU
    {
        id: "grand_tichu_first_call",
        title: "큰 판을 여는 자",
        description: "그랜드 티츄를 처음 선언하세요.",
        category: "GRAND_TICHU",
        goal: 1,
        badgeId: "badge_grand_tichu_first_call",
        conditionType: "TICHU_GRAND_CALL_COUNT",
    },
    {
        id: "grand_tichu_first_success",
        title: "그랜드 성공",
        description: "그랜드 티츄에 처음 성공하세요.",
        category: "GRAND_TICHU",
        goal: 1,
        badgeId: "badge_grand_tichu_success",
        conditionType: "TICHU_GRAND_SUCCESS_COUNT",
    },
    {
        id: "grand_tichu_gambler",
        title: "배짱 플레이어",
        description: "그랜드 티츄를 5회 이상 선언하세요.",
        category: "GRAND_TICHU",
        goal: 5,
        badgeId: "badge_grand_tichu_gambler",
        conditionType: "TICHU_GRAND_CALL_COUNT",
    },
    {
        id: "grand_tichu_legend",
        title: "위대한 승부사",
        description: "그랜드 티츄 성공을 3회 달성하세요.",
        category: "GRAND_TICHU",
        goal: 3,
        badgeId: "badge_grand_tichu_legend",
        conditionType: "TICHU_GRAND_SUCCESS_COUNT",
    },
    {
        id: "grand_tichu_disaster",
        title: "대참사",
        description: "그랜드 티츄에 3회 실패하세요.",
        category: "GRAND_TICHU",
        goal: 3,
        badgeId: "badge_grand_tichu_disaster",
        conditionType: "TICHU_GRAND_FAILURE_COUNT",
    },

    // ROUND
    {
        id: "tichu_first_out",
        title: "첫 1등",
        description: "라운드에서 처음 1등으로 나가세요.",
        category: "ROUND",
        goal: 1,
        badgeId: "badge_tichu_first_out",
        conditionType: "TICHU_FIRST_PLACE_COUNT",
    },
    {
        id: "tichu_vanguard",
        title: "선봉장",
        description: "라운드 1등을 10회 달성하세요.",
        category: "ROUND",
        goal: 10,
        badgeId: "badge_tichu_vanguard",
        conditionType: "TICHU_FIRST_PLACE_COUNT",
    },
    {
        id: "tichu_ace",
        title: "에이스",
        description: "라운드 1등을 30회 달성하세요.",
        category: "ROUND",
        goal: 30,
        badgeId: "badge_tichu_ace",
        conditionType: "TICHU_FIRST_PLACE_COUNT",
    },
    {
        id: "tichu_cleaner",
        title: "마무리 담당",
        description: "라운드 꼴등을 10회 달성하세요.",
        category: "ROUND",
        goal: 10,
        badgeId: "badge_tichu_cleaner",
        conditionType: "TICHU_LAST_PLACE_COUNT",
    },

    // TEAM
    {
        id: "tichu_one_two_first",
        title: "완벽한 호흡",
        description: "같은 팀이 1등, 2등으로 라운드를 끝내세요.",
        category: "TEAM",
        goal: 1,
        badgeId: "badge_tichu_one_two",
        conditionType: "TICHU_ONE_TWO_SUCCESS_COUNT",
    },
    {
        id: "tichu_one_two_punch",
        title: "원투 펀치",
        description: "원투 성공을 5회 달성하세요.",
        category: "TEAM",
        goal: 5,
        badgeId: "badge_tichu_one_two_punch",
        conditionType: "TICHU_ONE_TWO_SUCCESS_COUNT",
    },
    {
        id: "tichu_one_two_storm",
        title: "숨 쉴 틈도 없이",
        description: "원투 성공을 20회 달성하세요.",
        category: "TEAM",
        goal: 20,
        badgeId: "badge_tichu_one_two_storm",
        conditionType: "TICHU_ONE_TWO_SUCCESS_COUNT",
    },
    {
        id: "tichu_got_one_twoed",
        title: "당했다",
        description: "상대 팀에게 원투를 처음 당하세요.",
        category: "TEAM",
        goal: 1,
        badgeId: "badge_tichu_got_one_twoed",
        conditionType: "TICHU_ONE_TWO_SUFFERED_COUNT",
    },

    // SCORE
    {
        id: "tichu_score_maker",
        title: "점수 차 제조기",
        description: "누적 점수 차 +1000점을 달성하세요.",
        category: "SCORE",
        goal: 1000,
        badgeId: "badge_tichu_score_maker",
        conditionType: "TICHU_TOTAL_SCORE_DIFF_AT_LEAST",
        conditionValue: {
            minScoreDiff: 1000,
        },
    },
    {
        id: "tichu_big_bang",
        title: "한 방에 끝냈다",
        description: "한 경기에서 600점 이상 점수 차로 승리하세요.",
        category: "SCORE",
        goal: 600,
        badgeId: "badge_tichu_big_bang",
        conditionType: "TICHU_BEST_SCORE_DIFF_AT_LEAST",
        conditionValue: {
            minScoreDiff: 600,
        },
    },
    {
        id: "tichu_negative_legend",
        title: "점수는 거들 뿐",
        description: "한 경기에서 -500점 이하의 점수 차를 기록하세요.",
        category: "SCORE",
        goal: 1,
        badgeId: "badge_tichu_negative_legend",
        conditionType: "TICHU_WORST_SCORE_DIFF_AT_MOST",
        conditionValue: {
            maxScoreDiff: -500,
        },
    },
];

export const TICHU_ACHIEVEMENT_CATEGORY_LABELS: Record<
    TichuAchievementCategory,
    string
> = {
    BEGINNER: "입문",
    WIN: "승리",
    TICHU: "티츄",
    GRAND_TICHU: "그랜드 티츄",
    ROUND: "라운드",
    TEAM: "팀플레이",
    SCORE: "점수",
    SPECIAL: "특수",
};

export const TICHU_BADGE_RARITY_LABELS: Record<TichuBadgeRarity, string> = {
    COMMON: "일반",
    RARE: "희귀",
    EPIC: "영웅",
    LEGENDARY: "전설",
    SPECIAL: "특별",
};

export const TICHU_BADGE_MAP: Record<string, TichuBadge> =
    TICHU_BADGES.reduce(
        (acc, badge) => {
            acc[badge.id] = badge;
            return acc;
        },
        {} as Record<string, TichuBadge>,
    );

export const TICHU_ACHIEVEMENT_MAP: Record<string, TichuAchievement> =
    TichuAchievementDefinitions.reduce(
        (acc, achievement) => {
            acc[achievement.id] = achievement;
            return acc;
        },
        {} as Record<string, TichuAchievement>,
    );

export const TICHU_ACHIEVEMENTS_BY_CATEGORY: Record<
    TichuAchievementCategory,
    TichuAchievement[]
> = TichuAchievementDefinitions.reduce(
    (acc, achievement) => {
        acc[achievement.category].push(achievement);
        return acc;
    },
    {
        BEGINNER: [],
        WIN: [],
        TICHU: [],
        GRAND_TICHU: [],
        ROUND: [],
        TEAM: [],
        SCORE: [],
        SPECIAL: [],
    } as Record<TichuAchievementCategory, TichuAchievement[]>,
);