// web/src/features/games/mahjong/lib/mahjong-calc.ts

import { NORMAL_YAKU, SITUATIONAL_YAKU } from "../constants/yaku";

const ALL_YAKU = [...NORMAL_YAKU, ...SITUATIONAL_YAKU];

export function getValidatedYakuList(selectedIds: string[], newId: string): string[] {
  const newYaku = ALL_YAKU.find(y => y.id === newId);
  if (!newYaku) return selectedIds;

  // 1. 이미 선택된 경우 제거 (토글)
  if (selectedIds.includes(newId)) {
    return selectedIds.filter(id => id !== newId);
  }

  // 2. 배타적 관계 검사 (새로 선택한 역과 충돌하는 기존 역 제거)
  let nextIds = selectedIds.filter(id => {
    const existing = ALL_YAKU.find(y => y.id === id);
    // 현재 선택된 역이 새로운 역의 배타 리스트에 있거나, 반대인 경우 제거
    const isExclusive = (newYaku.exclusive?.includes(id)) || (existing?.exclusive?.includes(newId));
    return !isExclusive;
  });

  // 3. 새로 선택한 역 추가
  return [...nextIds, newId];
}

export function calculateTotalHan(
  selectedIds: string[],
  isMenzen: boolean,
  doraCount: number
) {
  let totalHan = doraCount;

  for (const id of selectedIds) {
    const yaku = ALL_YAKU.find(y => y.id === id);
    if (!yaku) continue;

    // 멘젠 전용 역 체크 (멘젠이 아닌데 멘젠 전용인 경우 계산에서 제외)
    if (!isMenzen && yaku.isMenzenOnly) continue;

    const han = isMenzen ? yaku.han.closed : yaku.han.open;
    totalHan += han;
  }
  return totalHan;
}