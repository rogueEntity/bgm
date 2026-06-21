// web/src/constants/yaku.ts
export interface Yaku {
  id: string;
  name: string;
  han: {
    closed: number; // 멘젠
    open: number;   // 오픈 (0이면 성립 불가)
  };
  isMengenOnly: boolean;
  isYakuman?: boolean;
  exclusive?: string[]; // 함께 선택 불가한 역 ID들
}

export const NORMAL_YAKU: Yaku[] = [
    // --- 1판 역 ---
    { id: "pinfu", name: "핑후", han: { closed: 1, open: 0 }, isMengenOnly: true, exclusive: ["yakuhai_dragon_white", "yakuhai_dragon_green", "yakuhai_dragon_red", "yakuhai_prevailing", "yakuhai_player", "chiitoitsu", "toitoi", "sankantsu", "sanshoku_doukou", "sanankou", "shousangen"] },
    { id: "tanyao", name: "탕야오", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["yakuhai_dragon_white", "yakuhai_dragon_green", "yakuhai_dragon_red", "yakuhai_prevailing", "yakuhai_player", "ittsuu", "chanta", "shousangen", "honroutou", "honitsu", "junchan"] },
    { id: "iipeikou", name: "이페코", han: { closed: 1, open: 0 }, isMengenOnly: true, exclusive: ["toitoi", "ryanpeikou"] },
    { id: "yakuhai_dragon_white", name: "역패(백)", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["pinfu", "tanyao"] },
    { id: "yakuhai_dragon_green", name: "역패(발)", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["pinfu", "tanyao"] },
    { id: "yakuhai_dragon_red", name: "역패(중)", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["pinfu", "tanyao"] },
    { id: "yakuhai_prevailing", name: "장풍패", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["pinfu", "tanyao"] },
    { id: "yakuhai_player", name: "자풍패", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["pinfu", "tanyao"] },

    // --- 2판 역 ---
    { id: "sanshoku", name: "삼색동순", han: { closed: 2, open: 1 }, isMengenOnly: false, exclusive: ["ittsuu", "toitoi", "chinitsu"] },
    { id: "ittsuu", name: "일기통관", han: { closed: 2, open: 1 }, isMengenOnly: false, exclusive: ["tanyao", "sanshoku", "toitoi"] },
    { id: "chanta", name: "찬타", han: { closed: 2, open: 1 }, isMengenOnly: false, exclusive: ["tanyao", "toitoi", "honroutou", "junchan"] },
    { id: "chiitoitsu", name: "치또이쯔", han: { closed: 2, open: 0 }, isMengenOnly: true, exclusive: ["pinfu", "iipeikou", "sanshoku", "ittsuu", "chanta", "toitoi", "sankantsu", "sanshoku_doukou", "sanankou", "junchan", "ryanpeikou"] },
    { id: "toitoi", name: "또이또이", han: { closed: 2, open: 2 }, isMengenOnly: false, exclusive: ["pinfu", "iipeikou", "ryanpeikou", "sanshoku", "ittsuu", "chanta", "junchan"] },
    { id: "sankantsu", name: "삼깡쯔", han: { closed: 2, open: 2 }, isMengenOnly: false, exclusive: ["pinfu"] },
    { id: "sanshoku_doukou", name: "삼색동각", han: { closed: 2, open: 2 }, isMengenOnly: false, exclusive: ["pinfu", "chinitsu"] },
    { id: "sanankou", name: "산안커", han: { closed: 2, open: 2 }, isMengenOnly: false, exclusive: ["pinfu"] },
    { id: "shousangen", name: "소삼원", han: { closed: 2, open: 2 }, isMengenOnly: false, exclusive: ["pinfu", "tanyao"] },
    { id: "honroutou", name: "혼노두", han: { closed: 2, open: 2 }, isMengenOnly: false, exclusive: ["tanyao", "chanta", "junchan"] },

    // --- 3판 역 ---
    { id: "honitsu", name: "혼일색", han: { closed: 3, open: 2 }, isMengenOnly: false, exclusive: ["tanyao", "chinitsu"] },
    { id: "junchan", name: "준찬타", han: { closed: 3, open: 2 }, isMengenOnly: false, exclusive: ["tanyao", "chanta", "toitoi", "honroutou"] },
    { id: "ryanpeikou", name: "량페코", han: { closed: 3, open: 0 }, isMengenOnly: true, exclusive: ["iipeikou", "toitoi"] },

    // --- 6판 역 ---
    { id: "chinitsu", name: "청일색", han: { closed: 6, open: 5 }, isMengenOnly: false, exclusive: ["sanshoku", "sanshoku_doukou", "honitsu"] },

    // --- 역만 ---
    { id: "kokushi", name: "국사무쌍", han: { closed: 13, open: 0 }, isMengenOnly: true, isYakuman: true, exclusive: ["suuankou", "daisangen", "shousuushi", "daisuushi", "tsuuiisou", "ryuuiisou", "chinroutou", "suukantsu", "chuurenpoutou"] },
    { id: "suuankou", name: "스안커", han: { closed: 13, open: 0 }, isMengenOnly: true, isYakuman: true, exclusive: ["kokushi", "chuurenpoutou"] },
    { id: "daisangen", name: "대삼원", han: { closed: 13, open: 13 }, isMengenOnly: false, isYakuman: true, exclusive: ["kokushi", "shousuushi", "daisuushi", "ryuuiisou", "chinroutou", "chuurenpoutou"] },
    { id: "shousuushi", name: "소사희", han: { closed: 13, open: 13 }, isMengenOnly: false, isYakuman: true, exclusive: ["daisuushi", "kokushi", "daisangen", "ryuuiisou", "chinroutou", "chuurenpoutou"] },
    { id: "daisuushi", name: "대사희", han: { closed: 13, open: 13 }, isMengenOnly: false, isYakuman: true, exclusive: ["shousuushi", "kokushi", "daisangen", "ryuuiisou", "chinroutou", "chuurenpoutou"] },
    { id: "tsuuiisou", name: "자일색", han: { closed: 13, open: 13 }, isMengenOnly: false, isYakuman: true, exclusive: ["kokushi", "ryuuiisou", "chinroutou", "chuurenpoutou"] },
    { id: "ryuuiisou", name: "녹일색", han: { closed: 13, open: 13 }, isMengenOnly: false, isYakuman: true, exclusive: ["kokushi", "daisangen", "shousuushi", "daisuushi", "tsuuiisou", "chinroutou", "chuurenpoutou"] },
    { id: "chinroutou", name: "청노두", han: { closed: 13, open: 13 }, isMengenOnly: false, isYakuman: true, exclusive: ["kokushi", "daisangen", "shousuushi", "daisuushi", "tsuuiisou", "ryuuiisou", "chuurenpoutou"] },
    { id: "suukantsu", name: "사깡쯔", han: { closed: 13, open: 13 }, isMengenOnly: false, isYakuman: true, exclusive: ["kokushi", "chuurenpoutou", "tenho", "chiho"] },
    { id: "chuurenpoutou", name: "구련보등", han: { closed: 13, open: 0 }, isMengenOnly: true, isYakuman: true, exclusive: ["kokushi", "suuankou", "daisangen", "shousuushi", "daisuushi", "tsuuiisou", "ryuuiisou", "chinroutou", "suukantsu"] },
    { id: "tenho", name: "천화", han: { closed: 13, open: 0 }, isMengenOnly: true, isYakuman: true, exclusive: ["chiho", "suukantsu"] },
    { id: "chiho", name: "지화", han: { closed: 13, open: 0 }, isMengenOnly: true, isYakuman: true, exclusive: ["tenho", "suukantsu"] },
];

export const SITUATIONAL_YAKU: Yaku[] = [
    { id: "riichi", name: "리치", han: { closed: 1, open: 0 }, isMengenOnly: true, exclusive: ["double_riichi"] },
    { id: "double_riichi", name: "더블 리치", han: { closed: 2, open: 0 }, isMengenOnly: true, exclusive: ["riichi"] },
    { id: "menzen_tsumo", name: "멘젠쯔모", han: { closed: 1, open: 0 }, isMengenOnly: true },
    { id: "ippatsu", name: "일발", han: { closed: 1, open: 0 }, isMengenOnly: true },
    { id: "rinshan", name: "영상개화", han: { closed: 1, open: 1 }, isMengenOnly: false },
    { id: "chankan", name: "창깡", han: { closed: 1, open: 1 }, isMengenOnly: false },
    { id: "haitei", name: "해저로월", han: { closed: 1, open: 1 }, isMengenOnly: false },
    { id: "houtei", name: "하저로어", han: { closed: 1, open: 1 }, isMengenOnly: false },
];