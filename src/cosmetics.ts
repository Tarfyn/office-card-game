import type { PlayerId } from "./types.js";

export type CosmeticSlotId = string | null;

export interface CosmeticLoadout {
  boardSkinId: string;
  avatarId: string;
  avatarFrameId: CosmeticSlotId;
  avatarDecorationId: CosmeticSlotId;
  cardBackId: string;
  badgeId: CosmeticSlotId;
  titleId: CosmeticSlotId;
}

export const COSMETIC_IDS = {
  classicOfficeBoard: "COS-BOARD-001",
  overworkedSysadminAvatar: "COS-AVA-001",
  hrOracleAvatar: "COS-AVA-002",
  defaultCorporateCardBack: "COS-BACK-001"
} as const;

export const COSMETIC_CATALOG = {
  [COSMETIC_IDS.classicOfficeBoard]: { kind: "BOARD", slug: "classic-office", assetPath: "/cosmetics/boards/classic-office.webp" },
  [COSMETIC_IDS.overworkedSysadminAvatar]: { kind: "AVATAR", slug: "overworked-sysadmin", assetPath: "/cosmetics/avatars/overworked-sysadmin.webp" },
  [COSMETIC_IDS.hrOracleAvatar]: { kind: "AVATAR", slug: "hr-oracle", assetPath: "/cosmetics/avatars/hr-oracle.webp" },
  [COSMETIC_IDS.defaultCorporateCardBack]: { kind: "CARD_BACK", slug: "default-corporate", assetPath: null }
} as const;

const LEGACY_BOARD_TO_ID: Record<string, string> = {
  "classic-office": COSMETIC_IDS.classicOfficeBoard,
  [COSMETIC_IDS.classicOfficeBoard]: COSMETIC_IDS.classicOfficeBoard
};

export function defaultCosmeticLoadout(playerId: PlayerId): CosmeticLoadout {
  return {
    boardSkinId: COSMETIC_IDS.classicOfficeBoard,
    avatarId: playerId === "P1" ? COSMETIC_IDS.overworkedSysadminAvatar : COSMETIC_IDS.hrOracleAvatar,
    avatarFrameId: null,
    avatarDecorationId: null,
    cardBackId: COSMETIC_IDS.defaultCorporateCardBack,
    badgeId: null,
    titleId: null
  };
}

export function normalizeCosmeticLoadout(
  loadout: Partial<CosmeticLoadout> | null | undefined,
  playerId: PlayerId,
  legacyBoardSkinId?: string | null
): CosmeticLoadout {
  const fallback = defaultCosmeticLoadout(playerId);
  const boardCandidate = String(loadout?.boardSkinId || legacyBoardSkinId || fallback.boardSkinId);
  return {
    boardSkinId: LEGACY_BOARD_TO_ID[boardCandidate] || fallback.boardSkinId,
    avatarId: String(loadout?.avatarId || fallback.avatarId),
    avatarFrameId: loadout?.avatarFrameId ?? fallback.avatarFrameId,
    avatarDecorationId: loadout?.avatarDecorationId ?? fallback.avatarDecorationId,
    cardBackId: String(loadout?.cardBackId || fallback.cardBackId),
    badgeId: loadout?.badgeId ?? fallback.badgeId,
    titleId: loadout?.titleId ?? fallback.titleId
  };
}
