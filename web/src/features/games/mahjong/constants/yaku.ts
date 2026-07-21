// web/src/constants/yaku.ts
export interface Yaku {
  id: string;
  name: string;
  han: {
    closed: number; // 멘젠
    open: number; // 오픈 (0이면 성립 불가)
  };
  isMengenOnly: boolean;
  isYakuman?: boolean;
  yakumanMultiplier?: number;
  exclusive?: string[]; // 함께 선택 불가한 역 ID들
}

export const NORMAL_YAKU: Yaku[] = [
  // --- 1판 역 ---
  { id: "tanyao", name: "탕야오", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["yakuhai_dragon_white", "yakuhai_dragon_green", "yakuhai_dragon_red", "yakuhai_prevailing", "yakuhai_player", "ittsuu", "chanta", "shousangen", "honroutou", "honitsu", "junchan"] },
  { id: "yakuhai_dragon_white", name: "역패 백", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["tanyao", "pinfu", "iipeikou", "chiitoitsu", "sanshoku", "ittsuu", "ryanpeikou", "junchan", "chinitsu"] },
  { id: "yakuhai_dragon_green", name: "역패 발", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["tanyao", "pinfu", "iipeikou", "chiitoitsu", "sanshoku", "ittsuu", "ryanpeikou", "junchan", "chinitsu"] },
  { id: "yakuhai_dragon_red", name: "역패 중", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["tanyao", "pinfu", "iipeikou", "chiitoitsu", "sanshoku", "ittsuu", "ryanpeikou", "junchan", "chinitsu"] },
  { id: "yakuhai_prevailing", name: "장풍패", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["tanyao", "pinfu", "iipeikou", "chiitoitsu", "sanshoku", "ittsuu", "ryanpeikou", "junchan", "chinitsu"] },
  { id: "yakuhai_player", name: "자풍패", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["tanyao", "pinfu", "iipeikou", "chiitoitsu", "sanshoku", "ittsuu", "ryanpeikou", "junchan", "chinitsu"] },
  { id: "pinfu", name: "핑후", han: { closed: 1, open: 0 }, isMengenOnly: true, exclusive: ["yakuhai_dragon_white", "yakuhai_dragon_green", "yakuhai_dragon_red", "yakuhai_prevailing", "yakuhai_player", "chiitoitsu", "toitoi", "sankantsu", "sanshoku_doukou", "sanankou", "shousangen", "honroutou"] },
  { id: "iipeikou", name: "이페코", han: { closed: 1, open: 0 }, isMengenOnly: true, exclusive: ["yakuhai_dragon_white", "yakuhai_dragon_green", "yakuhai_dragon_red", "yakuhai_prevailing", "yakuhai_player", "chiitoitsu", "toitoi", "sankantsu", "sanshoku_doukou", "sanankou", "shousangen", "honroutou", "ryanpeikou"] },

  // --- 2판 역 ---
  { id: "sanshoku", name: "삼색동순", han: { closed: 2, open: 1 }, isMengenOnly: false, exclusive: ["yakuhai_dragon_white", "yakuhai_dragon_green", "yakuhai_dragon_red", "yakuhai_prevailing", "yakuhai_player", "ittsuu", "chiitoitsu", "toitoi", "sankantsu", "sanshoku_doukou", "sanankou", "honroutou", "honitsu", "ryanpeikou", "chinitsu"] },
  { id: "ittsuu", name: "일기통관", han: { closed: 2, open: 1 }, isMengenOnly: false, exclusive: ["tanyao", "yakuhai_dragon_white", "yakuhai_dragon_green", "yakuhai_dragon_red", "yakuhai_prevailing", "yakuhai_player", "sanshoku", "chiitoitsu", "toitoi", "sankantsu", "sanshoku_doukou", "sanankou", "shousangen", "honroutou", "ryanpeikou"] },
  { id: "chanta", name: "찬타", han: { closed: 2, open: 1 }, isMengenOnly: false, exclusive: ["tanyao", "chiitoitsu", "toitoi", "honroutou", "junchan", "ryanpeikou"] },
  { id: "chiitoitsu", name: "치또이쯔", han: { closed: 2, open: 0 }, isMengenOnly: true, exclusive: ["yakuhai_dragon_white", "yakuhai_dragon_green", "yakuhai_dragon_red", "yakuhai_prevailing", "yakuhai_player", "pinfu", "iipeikou", "sanshoku", "ittsuu", "chanta", "toitoi", "sankantsu", "sanshoku_doukou", "sanankou", "shousangen", "junchan", "ryanpeikou"] },
  { id: "toitoi", name: "또이또이", han: { closed: 2, open: 2 }, isMengenOnly: false, exclusive: ["pinfu", "iipeikou", "sanshoku", "ittsuu", "chanta", "chiitoitsu", "junchan", "ryanpeikou"] },
  { id: "sanshoku_doukou", name: "삼색동각", han: { closed: 2, open: 2 }, isMengenOnly: false, exclusive: ["pinfu", "iipeikou", "sanshoku", "ittsuu", "chiitoitsu", "honitsu", "ryanpeikou", "chinitsu"] },
  { id: "sankantsu", name: "산깡쯔", han: { closed: 2, open: 2 }, isMengenOnly: false, exclusive: ["pinfu", "iipeikou", "sanshoku", "ittsuu", "chiitoitsu", "ryanpeikou"] },
  { id: "sanankou", name: "산안커", han: { closed: 2, open: 2 }, isMengenOnly: false, exclusive: ["pinfu", "iipeikou", "sanshoku", "ittsuu", "chiitoitsu", "ryanpeikou"] },
  { id: "shousangen", name: "소삼원", han: { closed: 2, open: 2 }, isMengenOnly: false, exclusive: ["tanyao", "pinfu", "iipeikou", "ittsuu", "chiitoitsu", "junchan", "ryanpeikou", "chinitsu"] },
  { id: "honroutou", name: "혼노두", han: { closed: 2, open: 2 }, isMengenOnly: false, exclusive: ["tanyao", "pinfu", "iipeikou", "sanshoku", "ittsuu", "chanta", "junchan", "ryanpeikou", "chinitsu"] },

  // --- 3판 역 ---
  { id: "junchan", name: "준찬타", han: { closed: 3, open: 2 }, isMengenOnly: false, exclusive: ["tanyao", "yakuhai_dragon_white", "yakuhai_dragon_green", "yakuhai_dragon_red", "yakuhai_prevailing", "yakuhai_player", "chanta", "chiitoitsu", "toitoi", "shousangen", "honroutou", "honitsu"] },
  { id: "honitsu", name: "혼일색", han: { closed: 3, open: 2 }, isMengenOnly: false, exclusive: ["tanyao", "sanshoku", "sanshoku_doukou", "junchan", "chinitsu"] },
  { id: "ryanpeikou", name: "량페코", han: { closed: 3, open: 0 }, isMengenOnly: true, exclusive: ["yakuhai_dragon_white", "yakuhai_dragon_green", "yakuhai_dragon_red", "yakuhai_prevailing", "yakuhai_player", "iipeikou", "sanshoku", "ittsuu", "chanta", "chiitoitsu", "toitoi", "sankantsu", "sanshoku_doukou", "sanankou", "shousangen", "honroutou"] },

  // --- 6판 역 ---
  { id: "chinitsu", name: "청일색", han: { closed: 6, open: 5 }, isMengenOnly: false, exclusive: ["yakuhai_dragon_white", "yakuhai_dragon_green", "yakuhai_dragon_red", "yakuhai_prevailing", "yakuhai_player", "sanshoku", "sanshoku_doukou", "shousangen", "honroutou", "honitsu"] },

  // --- 역만 ---
  { id: "kokushi", name: "국사무쌍", han: { closed: 13, open: 0 }, isMengenOnly: true, isYakuman: true, yakumanMultiplier: 1, exclusive: ["kokushi_13_wait", "suuankou", "suuankou_tanki", "daisangen", "shousuushi", "daisuushi", "tsuuiisou", "ryuuiisou", "chinroutou", "suukantsu", "chuurenpoutou", "junsei_chuurenpoutou"] },
  { id: "kokushi_13_wait", name: "국사무쌍 13면 대기", han: { closed: 13, open: 0 }, isMengenOnly: true, isYakuman: true, yakumanMultiplier: 2, exclusive: ["kokushi", "suuankou", "suuankou_tanki", "daisangen", "shousuushi", "daisuushi", "tsuuiisou", "ryuuiisou", "chinroutou", "suukantsu", "chuurenpoutou", "junsei_chuurenpoutou"] },
  { id: "suuankou", name: "스안커", han: { closed: 13, open: 0 }, isMengenOnly: true, isYakuman: true, yakumanMultiplier: 1, exclusive: ["kokushi", "kokushi_13_wait", "suuankou_tanki", "chuurenpoutou", "junsei_chuurenpoutou"] },
  { id: "suuankou_tanki", name: "스안커 단기", han: { closed: 13, open: 0 }, isMengenOnly: true, isYakuman: true, yakumanMultiplier: 2, exclusive: ["kokushi", "kokushi_13_wait", "suuankou", "chuurenpoutou", "junsei_chuurenpoutou"] },
  { id: "daisangen", name: "대삼원", han: { closed: 13, open: 13 }, isMengenOnly: false, isYakuman: true, yakumanMultiplier: 1, exclusive: ["kokushi", "kokushi_13_wait", "shousuushi", "daisuushi", "ryuuiisou", "chinroutou", "chuurenpoutou", "junsei_chuurenpoutou"] },
  { id: "shousuushi", name: "소사희", han: { closed: 13, open: 13 }, isMengenOnly: false, isYakuman: true, yakumanMultiplier: 1, exclusive: ["kokushi", "kokushi_13_wait", "daisangen", "daisuushi", "ryuuiisou", "chinroutou", "chuurenpoutou", "junsei_chuurenpoutou"] },
  { id: "daisuushi", name: "대사희", han: { closed: 13, open: 13 }, isMengenOnly: false, isYakuman: true, yakumanMultiplier: 2, exclusive: ["kokushi", "kokushi_13_wait", "daisangen", "shousuushi", "ryuuiisou", "chinroutou", "chuurenpoutou", "junsei_chuurenpoutou"] },
  { id: "tsuuiisou", name: "자일색", han: { closed: 13, open: 13 }, isMengenOnly: false, isYakuman: true, yakumanMultiplier: 1, exclusive: ["kokushi", "kokushi_13_wait", "ryuuiisou", "chinroutou", "chuurenpoutou", "junsei_chuurenpoutou"] },
  { id: "ryuuiisou", name: "녹일색", han: { closed: 13, open: 13 }, isMengenOnly: false, isYakuman: true, yakumanMultiplier: 1, exclusive: ["kokushi", "kokushi_13_wait", "daisangen", "shousuushi", "daisuushi", "tsuuiisou", "chinroutou", "chuurenpoutou", "junsei_chuurenpoutou"] },
  { id: "chinroutou", name: "청노두", han: { closed: 13, open: 13 }, isMengenOnly: false, isYakuman: true, yakumanMultiplier: 1, exclusive: ["kokushi", "kokushi_13_wait", "daisangen", "shousuushi", "daisuushi", "tsuuiisou", "ryuuiisou", "chuurenpoutou", "junsei_chuurenpoutou"] },
  { id: "suukantsu", name: "스깡쯔", han: { closed: 13, open: 13 }, isMengenOnly: false, isYakuman: true, yakumanMultiplier: 1, exclusive: ["kokushi", "kokushi_13_wait", "chuurenpoutou", "junsei_chuurenpoutou", "tenho", "chiho"] },
  { id: "chuurenpoutou", name: "구련보등", han: { closed: 13, open: 0 }, isMengenOnly: true, isYakuman: true, yakumanMultiplier: 1, exclusive: ["kokushi", "kokushi_13_wait", "suuankou", "suuankou_tanki", "daisangen", "shousuushi", "daisuushi", "tsuuiisou", "ryuuiisou", "chinroutou", "suukantsu", "junsei_chuurenpoutou"] },
  { id: "junsei_chuurenpoutou", name: "순정구련보등", han: { closed: 13, open: 0 }, isMengenOnly: true, isYakuman: true, yakumanMultiplier: 2, exclusive: ["kokushi", "kokushi_13_wait", "suuankou", "suuankou_tanki", "daisangen", "shousuushi", "daisuushi", "tsuuiisou", "ryuuiisou", "chinroutou", "suukantsu", "chuurenpoutou"] },
  { id: "tenho", name: "천화", han: { closed: 13, open: 0 }, isMengenOnly: true, isYakuman: true, yakumanMultiplier: 1, exclusive: ["chiho", "suukantsu"] },
  { id: "chiho", name: "지화", han: { closed: 13, open: 0 }, isMengenOnly: true, isYakuman: true, yakumanMultiplier: 1, exclusive: ["tenho", "suukantsu"] },
];

export const SITUATIONAL_YAKU: Yaku[] = [
  // --- 리치 계열 ---
  { id: "riichi", name: "리치", han: { closed: 1, open: 0 }, isMengenOnly: true, exclusive: ["double_riichi"] },
  { id: "double_riichi", name: "더블 리치", han: { closed: 2, open: 0 }, isMengenOnly: true, exclusive: ["riichi"] },
  { id: "ippatsu", name: "일발", han: { closed: 1, open: 0 }, isMengenOnly: true, exclusive: ["rinshan", "chankan"] },

  // --- 쯔모/우연역 ---
  { id: "menzen_tsumo", name: "멘젠쯔모", han: { closed: 1, open: 0 }, isMengenOnly: true, exclusive: ["chankan", "houtei"] },
  { id: "rinshan", name: "영상개화", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["ippatsu", "chankan", "haitei", "houtei"] },
  { id: "chankan", name: "창깡", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["ippatsu", "menzen_tsumo", "rinshan", "haitei"] },
  { id: "haitei", name: "해저로월", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["rinshan", "chankan", "houtei"] },
  { id: "houtei", name: "하저로어", han: { closed: 1, open: 1 }, isMengenOnly: false, exclusive: ["menzen_tsumo", "rinshan", "haitei"] },
];

export const ALL_YAKU = [...NORMAL_YAKU, ...SITUATIONAL_YAKU];