import type { PlayerId } from "./types.js";
import type { PlayerMetaProfile } from "./economy.js";

export type CosmeticSlotId = string | null;
export type CosmeticKind = "BOARD" | "AVATAR" | "AVATAR_FRAME" | "AVATAR_DECORATION" | "CARD_BACK" | "BADGE" | "TITLE";
export type CosmeticSource = "starter" | "shop" | "achievement" | "ranked" | "season" | "promotion" | "event" | "admin";
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
  defaultCorporateCardBack: "COS-BACK-001"
} as const;

export const COSMETIC_CATALOG: Record<string, CosmeticDefinition> = {
  [COSMETIC_IDS.classicOfficeBoard]: { id:COSMETIC_IDS.classicOfficeBoard, kind:"BOARD", slot:"boardSkinId", name:"Classic Office", description:"The original executive desk.", nameKey:"cosmetics.classicOfficeName", descriptionKey:"cosmetics.classicOfficeDescription", assetPath:"/cosmetics/boards/classic-office.webp" },
  [COSMETIC_IDS.overworkedSysadminAvatar]: { id:COSMETIC_IDS.overworkedSysadminAvatar, kind:"AVATAR", slot:"avatarId", name:"Overworked Sysadmin", description:"Keeps the office online one incident at a time.", nameKey:"cosmetics.overworkedSysadminName", descriptionKey:"cosmetics.overworkedSysadminDescription", assetPath:"/cosmetics/avatars/overworked-sysadmin.webp" },
  [COSMETIC_IDS.hrOracleAvatar]: { id:COSMETIC_IDS.hrOracleAvatar, kind:"AVATAR", slot:"avatarId", name:"HR Oracle", description:"Knows who approved it before you ask.", nameKey:"cosmetics.hrOracleName", descriptionKey:"cosmetics.hrOracleDescription", assetPath:"/cosmetics/avatars/hr-oracle.webp" },
  [COSMETIC_IDS.defaultCorporateCardBack]: { id:COSMETIC_IDS.defaultCorporateCardBack, kind:"CARD_BACK", slot:"cardBackId", name:"Corporate Standard", description:"A dependable company-issued card back.", nameKey:"cosmetics.corporateStandardName", descriptionKey:"cosmetics.corporateStandardDescription", assetPath:null }
};

export const COSMETIC_SHOP_CATALOG = Object.freeze([
  { cosmeticId:COSMETIC_IDS.hrOracleAvatar, price:180 }
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
  return [COSMETIC_IDS.classicOfficeBoard, COSMETIC_IDS.overworkedSysadminAvatar, COSMETIC_IDS.defaultCorporateCardBack].map((cosmeticId) => ({ cosmeticId, acquiredAt:now, source:"starter", sourceRef:null }));
}

export function normalizePlayerCosmetics(value: Partial<PlayerCosmeticState> | null | undefined, now = Date.now()): PlayerCosmeticState {
  const owned = Array.isArray(value?.owned) ? value.owned.filter((grant): grant is CosmeticOwnershipGrant => Boolean(grant && COSMETIC_CATALOG[String(grant.cosmeticId)])) : defaultCosmeticOwnership(now);
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
