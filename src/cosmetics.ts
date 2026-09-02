import type { PlayerId } from "./types.js";
import type { PlayerMetaProfile } from "./economy.js";

export type CosmeticSlotId = string | null;
export type CosmeticKind = "BOARD" | "AVATAR" | "AVATAR_FRAME" | "AVATAR_DECORATION" | "CARD_BACK" | "BADGE" | "TITLE";
export type CosmeticSource = "starter" | "shop" | "achievement" | "ranked" | "season" | "promotion" | "event" | "admin" | "alpha_playtest";
export type CosmeticSlotKey = keyof CosmeticLoadout;

export interface CosmeticDefinition {
  id: string;
  kind: CosmeticKind;
  slot: CosmeticSlotKey;
  name: string;
  description: string;
  nameKey: string;
  descriptionKey: string;
  assetPath: string | null;
}

export interface CosmeticOwnershipGrant {
  cosmeticId: string;
  acquiredAt: number;
  source: CosmeticSource;
  sourceRef: string | null;
}

export interface PlayerCosmeticState {
  owned: CosmeticOwnershipGrant[];
  loadout: CosmeticLoadout;
}

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
  executiveDirectorAvatar: "COS-AVA-003",
  overloadedJuniorAvatar: "COS-AVA-004",
  confidentAnalystAvatar: "COS-AVA-005",
  customerCareVeteranAvatar: "COS-AVA-006",
  defaultCorporateCardBack: "COS-BACK-001",
  defaultBlueSilverFrame: "COS-FRAME-002",
  bronzeRankedS01Frame: "COS-FRAME-003",
  goldRankedS01Frame: "COS-FRAME-004",
  diamondRankedS01Frame: "COS-FRAME-005",
  silverRankedS01Frame: "COS-FRAME-006"
} as const;

export const COSMETIC_CATALOG: Record<string, CosmeticDefinition> = {
  [COSMETIC_IDS.classicOfficeBoard]: { id:COSMETIC_IDS.classicOfficeBoard, kind:"BOARD", slot:"boardSkinId", name:"Classic Office", description:"The original executive desk.", nameKey:"cosmetics.classicOfficeName", descriptionKey:"cosmetics.classicOfficeDescription", assetPath:"/cosmetics/boards/classic-office.webp" },
  [COSMETIC_IDS.overworkedSysadminAvatar]: { id:COSMETIC_IDS.overworkedSysadminAvatar, kind:"AVATAR", slot:"avatarId", name:"Overworked Sysadmin", description:"Keeps the office online one incident at a time.", nameKey:"cosmetics.overworkedSysadminName", descriptionKey:"cosmetics.overworkedSysadminDescription", assetPath:"/cosmetics/avatars/overworked-sysadmin.webp" },
  [COSMETIC_IDS.hrOracleAvatar]: { id:COSMETIC_IDS.hrOracleAvatar, kind:"AVATAR", slot:"avatarId", name:"HR Oracle", description:"Knows who approved it before you ask.", nameKey:"cosmetics.hrOracleName", descriptionKey:"cosmetics.hrOracleDescription", assetPath:"/cosmetics/avatars/hr-oracle.webp" },
  [COSMETIC_IDS.executiveDirectorAvatar]: { id:COSMETIC_IDS.executiveDirectorAvatar, kind:"AVATAR", slot:"avatarId", name:"Executive Director", description:"Looks like every approval already went through.", nameKey:"cosmetics.executiveDirectorName", descriptionKey:"cosmetics.executiveDirectorDescription", assetPath:"/cosmetics/avatars/executive-director.webp" },
  [COSMETIC_IDS.overloadedJuniorAvatar]: { id:COSMETIC_IDS.overloadedJuniorAvatar, kind:"AVATAR", slot:"avatarId", name:"Overloaded Junior", description:"Running on caffeine, luck and unresolved tickets.", nameKey:"cosmetics.overloadedJuniorName", descriptionKey:"cosmetics.overloadedJuniorDescription", assetPath:"/cosmetics/avatars/overloaded-junior.webp" },
  [COSMETIC_IDS.confidentAnalystAvatar]: { id:COSMETIC_IDS.confidentAnalystAvatar, kind:"AVATAR", slot:"avatarId", name:"Confident Analyst", description:"Optimistic, prepared and suspiciously motivated.", nameKey:"cosmetics.confidentAnalystName", descriptionKey:"cosmetics.confidentAnalystDescription", assetPath:"/cosmetics/avatars/confident-analyst.webp" },
  [COSMETIC_IDS.customerCareVeteranAvatar]: { id:COSMETIC_IDS.customerCareVeteranAvatar, kind:"AVATAR", slot:"avatarId", name:"Customer Care Veteran", description:"Calm voice, tired eyes, infinite patience.", nameKey:"cosmetics.customerCareVeteranName", descriptionKey:"cosmetics.customerCareVeteranDescription", assetPath:"/cosmetics/avatars/customer-care-veteran.webp" },
  [COSMETIC_IDS.defaultCorporateCardBack]: { id:COSMETIC_IDS.defaultCorporateCardBack, kind:"CARD_BACK", slot:"cardBackId", name:"Corporate Standard", description:"A dependable company-issued card back.", nameKey:"cosmetics.corporateStandardName", descriptionKey:"cosmetics.corporateStandardDescription", assetPath:null },
  [COSMETIC_IDS.defaultBlueSilverFrame]: { id:COSMETIC_IDS.defaultBlueSilverFrame, kind:"AVATAR_FRAME", slot:"avatarFrameId", name:"Blue Silver Frame", description:"Clean corporate standard issue.", nameKey:"cosmetics.blueSilverFrameName", descriptionKey:"cosmetics.blueSilverFrameDescription", assetPath:"/cosmetics/avatar-frames/default-blue-silver.webp" },
  [COSMETIC_IDS.bronzeRankedS01Frame]: { id:COSMETIC_IDS.bronzeRankedS01Frame, kind:"AVATAR_FRAME", slot:"avatarFrameId", name:"Bronze Ranked S1", description:"Early-season ranked reward frame.", nameKey:"cosmetics.bronzeRankedS01Name", descriptionKey:"cosmetics.bronzeRankedS01Description", assetPath:"/cosmetics/avatar-frames/bronze-ranked-s01.webp" },
  [COSMETIC_IDS.goldRankedS01Frame]: { id:COSMETIC_IDS.goldRankedS01Frame, kind:"AVATAR_FRAME", slot:"avatarFrameId", name:"Gold Ranked S1", description:"Premium ranked reward frame.", nameKey:"cosmetics.goldRankedS01Name", descriptionKey:"cosmetics.goldRankedS01Description", assetPath:"/cosmetics/avatar-frames/gold-ranked-s01.webp" },
  [COSMETIC_IDS.diamondRankedS01Frame]: { id:COSMETIC_IDS.diamondRankedS01Frame, kind:"AVATAR_FRAME", slot:"avatarFrameId", name:"Diamond Ranked S1", description:"High-tier ranked reward frame.", nameKey:"cosmetics.diamondRankedS01Name", descriptionKey:"cosmetics.diamondRankedS01Description", assetPath:"/cosmetics/avatar-frames/diamond-ranked-s01.webp" },
  [COSMETIC_IDS.silverRankedS01Frame]: { id:COSMETIC_IDS.silverRankedS01Frame, kind:"AVATAR_FRAME", slot:"avatarFrameId", name:"Silver Ranked S1", description:"Mid-tier ranked reward frame.", nameKey:"cosmetics.silverRankedS01Name", descriptionKey:"cosmetics.silverRankedS01Description", assetPath:"/cosmetics/avatar-frames/silver-ranked-s01.webp" }
};

export const COSMETIC_SHOP_CATALOG = Object.freeze([
  { cosmeticId:COSMETIC_IDS.hrOracleAvatar, price:180 },
  { cosmeticId:COSMETIC_IDS.executiveDirectorAvatar, price:240 },
  { cosmeticId:COSMETIC_IDS.overloadedJuniorAvatar, price:240 },
  { cosmeticId:COSMETIC_IDS.confidentAnalystAvatar, price:240 },
  { cosmeticId:COSMETIC_IDS.customerCareVeteranAvatar, price:240 },
  { cosmeticId:COSMETIC_IDS.defaultBlueSilverFrame, price:160 }
]);

const LEGACY_STARTER_EXCLUDED_COSMETICS = new Set<string>([
  COSMETIC_IDS.executiveDirectorAvatar,
  COSMETIC_IDS.overloadedJuniorAvatar,
  COSMETIC_IDS.confidentAnalystAvatar,
  COSMETIC_IDS.customerCareVeteranAvatar,
  COSMETIC_IDS.bronzeRankedS01Frame,
  COSMETIC_IDS.goldRankedS01Frame,
  COSMETIC_IDS.diamondRankedS01Frame,
  COSMETIC_IDS.silverRankedS01Frame
]);

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

export function defaultCosmeticOwnership(now = Date.now()): CosmeticOwnershipGrant[] {
  return [
    COSMETIC_IDS.classicOfficeBoard,
    COSMETIC_IDS.overworkedSysadminAvatar,
    COSMETIC_IDS.hrOracleAvatar,
    COSMETIC_IDS.defaultCorporateCardBack,
    COSMETIC_IDS.defaultBlueSilverFrame
  ].map((cosmeticId) => ({ cosmeticId, acquiredAt:now, source:"starter", sourceRef:null }));
}

export function normalizePlayerCosmetics(value: Partial<PlayerCosmeticState> | null | undefined, now = Date.now()): PlayerCosmeticState {
  const owned = Array.isArray(value?.owned)
    ? value.owned.filter((grant): grant is CosmeticOwnershipGrant => Boolean(grant && COSMETIC_CATALOG[String(grant.cosmeticId)] && !(grant.source === "starter" && LEGACY_STARTER_EXCLUDED_COSMETICS.has(String(grant.cosmeticId)))))
    : defaultCosmeticOwnership(now);
  const unique = new Map<string, CosmeticOwnershipGrant>();
  for (const grant of owned) unique.set(String(grant.cosmeticId), { cosmeticId:String(grant.cosmeticId), acquiredAt:Number(grant.acquiredAt) || now, source:grant.source ?? "admin", sourceRef:grant.sourceRef == null ? null : String(grant.sourceRef) });
  const fallback = defaultCosmeticLoadout("P1");
  const loadout = normalizeCosmeticLoadout(value?.loadout ?? {}, "P1");
  for (const slot of ["boardSkinId","avatarId","cardBackId"] as const) {
    const id = loadout[slot];
    const definition = COSMETIC_CATALOG[id];
    if (!definition || definition.slot !== slot || !unique.has(id)) loadout[slot] = fallback[slot];
  }
  for (const slot of ["avatarFrameId","avatarDecorationId","badgeId","titleId"] as const) {
    const id = loadout[slot];
    if (id != null && (!COSMETIC_CATALOG[id] || COSMETIC_CATALOG[id].slot !== slot || !unique.has(id))) loadout[slot] = null;
  }
  return { owned:[...unique.values()], loadout };
}

export function cosmeticIsOwned(state: PlayerCosmeticState, cosmeticId: string): boolean {
  return state.owned.some((grant) => grant.cosmeticId === cosmeticId);
}

export function cosmeticShopEntry(cosmeticId: string) {
  return COSMETIC_SHOP_CATALOG.find((entry) => entry.cosmeticId === cosmeticId) ?? null;
}

export function applyCosmeticEquip(meta: PlayerMetaProfile, slot: CosmeticSlotKey, cosmeticId: string | null): PlayerMetaProfile {
  const next = structuredClone(meta);
  next.cosmetics = normalizePlayerCosmetics(next.cosmetics);
  if (!(slot in next.cosmetics.loadout)) throw new Error("COSMETIC_SLOT_INVALID");
  if (cosmeticId == null) {
    if (["boardSkinId","avatarId","cardBackId"].includes(slot)) throw new Error("COSMETIC_REQUIRED");
    next.cosmetics.loadout[slot as "avatarFrameId" | "avatarDecorationId" | "badgeId" | "titleId"] = null;
    return next;
  }
  const definition = COSMETIC_CATALOG[String(cosmeticId)];
  if (!definition) throw new Error("COSMETIC_NOT_FOUND");
  if (definition.slot !== slot) throw new Error("COSMETIC_WRONG_SLOT");
  if (!cosmeticIsOwned(next.cosmetics, definition.id)) throw new Error("COSMETIC_NOT_OWNED");
  next.cosmetics.loadout[slot] = definition.id;
  return next;
}

export function applyCosmeticPurchase(meta: PlayerMetaProfile, cosmeticId: string, now = Date.now()): PlayerMetaProfile {
  const shop = cosmeticShopEntry(String(cosmeticId));
  const definition = COSMETIC_CATALOG[String(cosmeticId)];
  if (!definition) throw new Error("COSMETIC_NOT_FOUND");
  if (!shop) throw new Error("COSMETIC_NOT_IN_SHOP");
  const next = structuredClone(meta);
  next.cosmetics = normalizePlayerCosmetics(next.cosmetics, now);
  if (cosmeticIsOwned(next.cosmetics, definition.id)) throw new Error("COSMETIC_ALREADY_OWNED");
  if (next.balances.OFFICE_CREDITS < shop.price) throw new Error("COSMETIC_INSUFFICIENT_CREDITS");
  next.balances.OFFICE_CREDITS -= shop.price;
  next.cosmetics.owned.push({ cosmeticId:definition.id, acquiredAt:now, source:"shop", sourceRef:null });
  return next;
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
