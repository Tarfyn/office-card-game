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
  /** Optional escape hatch for an asset whose opening cannot be inferred from alpha. */
  portraitMaskAsset?: string;
  /** Ranked cosmetics sort by configured tier order instead of cosmetic ID. */
  rankTierId?: string;
  /** Fallback order for non-ranked cosmetics in collection views. */
  sortOrder?: number;
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
  softOfficeBoard: "COS-BOARD-002",
  midnightCircuitBoard: "COS-BOARD-003",
  executiveSteelBoard: "COS-BOARD-004",
  concreteMinimalBoard: "COS-BOARD-005",
  overworkedSysadminAvatar: "COS-AVA-001",
  hrOracleAvatar: "COS-AVA-002",
  executiveDirectorAvatar: "COS-AVA-003",
  overloadedJuniorAvatar: "COS-AVA-004",
  confidentAnalystAvatar: "COS-AVA-005",
  customerCareVeteranAvatar: "COS-AVA-006",
  defaultCorporateCardBack: "COS-BACK-001",
  externalAlphaCardBack: "COS-BACK-002",
  rankedSeason01CardBack: "COS-BACK-003",
  customerServiceCardBack: "COS-BACK-004",
  itDepartmentCardBack: "COS-BACK-005",
  defaultBlueSilverFrame: "COS-FRAME-002",
  bronzeRankedS01Frame: "COS-FRAME-003",
  goldRankedS01Frame: "COS-FRAME-004",
  diamondRankedS01Frame: "COS-FRAME-005",
  silverRankedS01Frame: "COS-FRAME-006",
  replyAllSurvivorBadge: "COS-BADGE-001",
  coffeePoweredBadge: "COS-BADGE-002",
  inboxZeroBadge: "COS-BADGE-003",
  meetingSurvivorBadge: "COS-BADGE-004",
  ticketCloserBadge: "COS-BADGE-005",
  escalationSpecialistBadge: "COS-BADGE-006"
} as const;

export const COSMETIC_CATALOG: Record<string, CosmeticDefinition> = {
  [COSMETIC_IDS.classicOfficeBoard]: { id:COSMETIC_IDS.classicOfficeBoard, kind:"BOARD", slot:"boardSkinId", name:"Classic Office", description:"The original executive desk.", nameKey:"cosmetics.classicOfficeName", descriptionKey:"cosmetics.classicOfficeDescription", assetPath:"/cosmetics/boards/classic-office.webp" },
  [COSMETIC_IDS.softOfficeBoard]: { id:COSMETIC_IDS.softOfficeBoard, kind:"BOARD", slot:"boardSkinId", name:"Soft Office", description:"A warm neutral desk-style board with a bright office character.", nameKey:"cosmetics.softOfficeName", descriptionKey:"cosmetics.softOfficeDescription", assetPath:"/cosmetics/boards/soft-office.webp" },
  [COSMETIC_IDS.midnightCircuitBoard]: { id:COSMETIC_IDS.midnightCircuitBoard, kind:"BOARD", slot:"boardSkinId", name:"Midnight Circuit", description:"A sleek dark board with subtle neon-lit panel seams.", nameKey:"cosmetics.midnightCircuitName", descriptionKey:"cosmetics.midnightCircuitDescription", assetPath:"/cosmetics/boards/midnight-circuit.webp" },
  [COSMETIC_IDS.executiveSteelBoard]: { id:COSMETIC_IDS.executiveSteelBoard, kind:"BOARD", slot:"boardSkinId", name:"Executive Steel", description:"A premium graphite play surface framed by industrial steel.", nameKey:"cosmetics.executiveSteelName", descriptionKey:"cosmetics.executiveSteelDescription", assetPath:"/cosmetics/boards/executive-steel.webp" },
  [COSMETIC_IDS.concreteMinimalBoard]: { id:COSMETIC_IDS.concreteMinimalBoard, kind:"BOARD", slot:"boardSkinId", name:"Concrete Minimal", description:"A clean stone-textured board for a calm, modern workspace feel.", nameKey:"cosmetics.concreteMinimalName", descriptionKey:"cosmetics.concreteMinimalDescription", assetPath:"/cosmetics/boards/concrete-minimal.webp" },
  [COSMETIC_IDS.overworkedSysadminAvatar]: { id:COSMETIC_IDS.overworkedSysadminAvatar, kind:"AVATAR", slot:"avatarId", name:"Overworked Sysadmin", description:"Keeps the office online one incident at a time.", nameKey:"cosmetics.overworkedSysadminName", descriptionKey:"cosmetics.overworkedSysadminDescription", assetPath:"/cosmetics/avatars/overworked-sysadmin.webp" },
  [COSMETIC_IDS.hrOracleAvatar]: { id:COSMETIC_IDS.hrOracleAvatar, kind:"AVATAR", slot:"avatarId", name:"HR Oracle", description:"Knows who approved it before you ask.", nameKey:"cosmetics.hrOracleName", descriptionKey:"cosmetics.hrOracleDescription", assetPath:"/cosmetics/avatars/hr-oracle.webp" },
  [COSMETIC_IDS.executiveDirectorAvatar]: { id:COSMETIC_IDS.executiveDirectorAvatar, kind:"AVATAR", slot:"avatarId", name:"Executive Director", description:"Looks like every approval already went through.", nameKey:"cosmetics.executiveDirectorName", descriptionKey:"cosmetics.executiveDirectorDescription", assetPath:"/cosmetics/avatars/executive-director.webp" },
  [COSMETIC_IDS.overloadedJuniorAvatar]: { id:COSMETIC_IDS.overloadedJuniorAvatar, kind:"AVATAR", slot:"avatarId", name:"Overloaded Junior", description:"Running on caffeine, luck and unresolved tickets.", nameKey:"cosmetics.overloadedJuniorName", descriptionKey:"cosmetics.overloadedJuniorDescription", assetPath:"/cosmetics/avatars/overloaded-junior.webp" },
  [COSMETIC_IDS.confidentAnalystAvatar]: { id:COSMETIC_IDS.confidentAnalystAvatar, kind:"AVATAR", slot:"avatarId", name:"Confident Analyst", description:"Optimistic, prepared and suspiciously motivated.", nameKey:"cosmetics.confidentAnalystName", descriptionKey:"cosmetics.confidentAnalystDescription", assetPath:"/cosmetics/avatars/confident-analyst.webp" },
  [COSMETIC_IDS.customerCareVeteranAvatar]: { id:COSMETIC_IDS.customerCareVeteranAvatar, kind:"AVATAR", slot:"avatarId", name:"Customer Care Veteran", description:"Calm voice, tired eyes, infinite patience.", nameKey:"cosmetics.customerCareVeteranName", descriptionKey:"cosmetics.customerCareVeteranDescription", assetPath:"/cosmetics/avatars/customer-care-veteran.webp" },
  [COSMETIC_IDS.defaultCorporateCardBack]: { id:COSMETIC_IDS.defaultCorporateCardBack, kind:"CARD_BACK", slot:"cardBackId", name:"Corporate Standard", description:"A dependable company-issued card back.", nameKey:"cosmetics.corporateStandardName", descriptionKey:"cosmetics.corporateStandardDescription", assetPath:"/cosmetics/card-backs/default-corporate.webp", sortOrder:0 },
  [COSMETIC_IDS.externalAlphaCardBack]: { id:COSMETIC_IDS.externalAlphaCardBack, kind:"CARD_BACK", slot:"cardBackId", name:"External Alpha", description:"Issued to External Alpha participants.", nameKey:"cosmetics.externalAlphaName", descriptionKey:"cosmetics.externalAlphaDescription", assetPath:"/cosmetics/card-backs/alpha-back.webp", sortOrder:10 },
  [COSMETIC_IDS.rankedSeason01CardBack]: { id:COSMETIC_IDS.rankedSeason01CardBack, kind:"CARD_BACK", slot:"cardBackId", name:"Ranked Season 1", description:"A competitive card back reserved for Ranked rewards.", nameKey:"cosmetics.rankedSeason01BackName", descriptionKey:"cosmetics.rankedSeason01BackDescription", assetPath:"/cosmetics/card-backs/ranked-season-1.webp", sortOrder:20 },
  [COSMETIC_IDS.customerServiceCardBack]: { id:COSMETIC_IDS.customerServiceCardBack, kind:"CARD_BACK", slot:"cardBackId", name:"Customer Service Department", description:"A department issue for the people who keep customers heard.", nameKey:"cosmetics.customerServiceBackName", descriptionKey:"cosmetics.customerServiceBackDescription", assetPath:"/cosmetics/card-backs/customer-service-department.webp", sortOrder:30 },
  [COSMETIC_IDS.itDepartmentCardBack]: { id:COSMETIC_IDS.itDepartmentCardBack, kind:"CARD_BACK", slot:"cardBackId", name:"IT Department", description:"A department issue for the systems desk.", nameKey:"cosmetics.itBackName", descriptionKey:"cosmetics.itBackDescription", assetPath:"/cosmetics/card-backs/it-department.webp", sortOrder:40 },
  [COSMETIC_IDS.defaultBlueSilverFrame]: { id:COSMETIC_IDS.defaultBlueSilverFrame, kind:"AVATAR_FRAME", slot:"avatarFrameId", name:"Blue Silver Frame", description:"Clean corporate standard issue.", nameKey:"cosmetics.blueSilverFrameName", descriptionKey:"cosmetics.blueSilverFrameDescription", assetPath:"/cosmetics/avatar-frames/default-blue-silver.webp", sortOrder:0 },
  [COSMETIC_IDS.bronzeRankedS01Frame]: { id:COSMETIC_IDS.bronzeRankedS01Frame, kind:"AVATAR_FRAME", slot:"avatarFrameId", name:"Bronze Ranked S1", description:"Early-season ranked reward frame.", nameKey:"cosmetics.bronzeRankedS01Name", descriptionKey:"cosmetics.bronzeRankedS01Description", assetPath:"/cosmetics/avatar-frames/bronze-ranked-s01.webp", rankTierId:"BRONZE" },
  [COSMETIC_IDS.goldRankedS01Frame]: { id:COSMETIC_IDS.goldRankedS01Frame, kind:"AVATAR_FRAME", slot:"avatarFrameId", name:"Gold Ranked S1", description:"Premium ranked reward frame.", nameKey:"cosmetics.goldRankedS01Name", descriptionKey:"cosmetics.goldRankedS01Description", assetPath:"/cosmetics/avatar-frames/gold-ranked-s01.webp", rankTierId:"GOLD" },
  [COSMETIC_IDS.diamondRankedS01Frame]: { id:COSMETIC_IDS.diamondRankedS01Frame, kind:"AVATAR_FRAME", slot:"avatarFrameId", name:"Diamond Ranked S1", description:"High-tier ranked reward frame.", nameKey:"cosmetics.diamondRankedS01Name", descriptionKey:"cosmetics.diamondRankedS01Description", assetPath:"/cosmetics/avatar-frames/diamond-ranked-s01.webp", rankTierId:"DIAMOND" },
  [COSMETIC_IDS.silverRankedS01Frame]: { id:COSMETIC_IDS.silverRankedS01Frame, kind:"AVATAR_FRAME", slot:"avatarFrameId", name:"Silver Ranked S1", description:"Mid-tier ranked reward frame.", nameKey:"cosmetics.silverRankedS01Name", descriptionKey:"cosmetics.silverRankedS01Description", assetPath:"/cosmetics/avatar-frames/silver-ranked-s01.webp", portraitMaskAsset:"/cosmetics/avatar-frames/masks/silver-ranked-s01-inner-opening.png", rankTierId:"SILVER" },
  [COSMETIC_IDS.replyAllSurvivorBadge]: { id:COSMETIC_IDS.replyAllSurvivorBadge, kind:"BADGE", slot:"badgeId", name:"Reply All Survivor", description:"Survived the thread that should have been a direct message.", nameKey:"cosmetics.replyAllSurvivorName", descriptionKey:"cosmetics.replyAllSurvivorDescription", assetPath:"/cosmetics/badges/reply-all-survivor.webp", sortOrder:10 },
  [COSMETIC_IDS.coffeePoweredBadge]: { id:COSMETIC_IDS.coffeePoweredBadge, kind:"BADGE", slot:"badgeId", name:"Coffee Powered", description:"Kept the office moving one cup at a time.", nameKey:"cosmetics.coffeePoweredName", descriptionKey:"cosmetics.coffeePoweredDescription", assetPath:"/cosmetics/badges/coffee-powered.webp", sortOrder:20 },
  [COSMETIC_IDS.inboxZeroBadge]: { id:COSMETIC_IDS.inboxZeroBadge, kind:"BADGE", slot:"badgeId", name:"Inbox Zero", description:"Reached the quietest place in the company.", nameKey:"cosmetics.inboxZeroName", descriptionKey:"cosmetics.inboxZeroDescription", assetPath:"/cosmetics/badges/inbox-zero.webp", sortOrder:30 },
  [COSMETIC_IDS.meetingSurvivorBadge]: { id:COSMETIC_IDS.meetingSurvivorBadge, kind:"BADGE", slot:"badgeId", name:"Meeting Survivor", description:"Returned from the calendar with notes intact.", nameKey:"cosmetics.meetingSurvivorName", descriptionKey:"cosmetics.meetingSurvivorDescription", assetPath:"/cosmetics/badges/meeting-survivor.webp", sortOrder:40 },
  [COSMETIC_IDS.ticketCloserBadge]: { id:COSMETIC_IDS.ticketCloserBadge, kind:"BADGE", slot:"badgeId", name:"Ticket Closer", description:"Turns open tickets into resolved tickets.", nameKey:"cosmetics.ticketCloserName", descriptionKey:"cosmetics.ticketCloserDescription", assetPath:"/cosmetics/badges/ticket-closer.webp", sortOrder:50 },
  [COSMETIC_IDS.escalationSpecialistBadge]: { id:COSMETIC_IDS.escalationSpecialistBadge, kind:"BADGE", slot:"badgeId", name:"Escalation Specialist", description:"Knows exactly when to raise the issue.", nameKey:"cosmetics.escalationSpecialistName", descriptionKey:"cosmetics.escalationSpecialistDescription", assetPath:"/cosmetics/badges/escalation-specialist.webp", sortOrder:60 }
};

export const COSMETIC_SHOP_CATALOG = Object.freeze([
  { cosmeticId:COSMETIC_IDS.softOfficeBoard, price:180 },
  { cosmeticId:COSMETIC_IDS.midnightCircuitBoard, price:220 },
  { cosmeticId:COSMETIC_IDS.executiveSteelBoard, price:260 },
  { cosmeticId:COSMETIC_IDS.concreteMinimalBoard, price:180 },
  { cosmeticId:COSMETIC_IDS.hrOracleAvatar, price:180 },
  { cosmeticId:COSMETIC_IDS.executiveDirectorAvatar, price:240 },
  { cosmeticId:COSMETIC_IDS.overloadedJuniorAvatar, price:240 },
  { cosmeticId:COSMETIC_IDS.confidentAnalystAvatar, price:240 },
  { cosmeticId:COSMETIC_IDS.customerCareVeteranAvatar, price:240 },
  { cosmeticId:COSMETIC_IDS.defaultBlueSilverFrame, price:160 },
  { cosmeticId:COSMETIC_IDS.customerServiceCardBack, price:180 },
  { cosmeticId:COSMETIC_IDS.itDepartmentCardBack, price:180 }
]);

export function sortCosmeticItems<T extends { definition?: CosmeticDefinition }>(items: readonly T[], rankedTiers: readonly { id: string; order: number }[] = []): T[] {
  const rankOrder = new Map(rankedTiers.map((tier) => [String(tier.id).toUpperCase(), Number(tier.order)]));
  const sortKey = (item: T) => {
    const definition = item.definition;
    if (definition?.rankTierId) return 1000 + (rankOrder.get(definition.rankTierId.toUpperCase()) ?? 999);
    return Number(definition?.sortOrder ?? 0);
  };
  return [...items].sort((a, b) => sortKey(a) - sortKey(b) || String(a.definition?.id ?? '').localeCompare(String(b.definition?.id ?? '')));
}

const LEGACY_STARTER_EXCLUDED_COSMETICS = new Set<string>([
  COSMETIC_IDS.softOfficeBoard,
  COSMETIC_IDS.midnightCircuitBoard,
  COSMETIC_IDS.executiveSteelBoard,
  COSMETIC_IDS.concreteMinimalBoard,
  COSMETIC_IDS.executiveDirectorAvatar,
  COSMETIC_IDS.overloadedJuniorAvatar,
  COSMETIC_IDS.confidentAnalystAvatar,
  COSMETIC_IDS.customerCareVeteranAvatar,
  COSMETIC_IDS.bronzeRankedS01Frame,
  COSMETIC_IDS.goldRankedS01Frame,
  COSMETIC_IDS.diamondRankedS01Frame,
  COSMETIC_IDS.silverRankedS01Frame,
  COSMETIC_IDS.externalAlphaCardBack,
  COSMETIC_IDS.rankedSeason01CardBack,
  COSMETIC_IDS.customerServiceCardBack,
  COSMETIC_IDS.itDepartmentCardBack,
  COSMETIC_IDS.replyAllSurvivorBadge,
  COSMETIC_IDS.coffeePoweredBadge,
  COSMETIC_IDS.inboxZeroBadge,
  COSMETIC_IDS.meetingSurvivorBadge,
  COSMETIC_IDS.ticketCloserBadge,
  COSMETIC_IDS.escalationSpecialistBadge
]);

const LEGACY_BOARD_TO_ID: Record<string, string> = {
  "classic-office": COSMETIC_IDS.classicOfficeBoard,
  [COSMETIC_IDS.classicOfficeBoard]: COSMETIC_IDS.classicOfficeBoard,
  "soft-office": COSMETIC_IDS.softOfficeBoard,
  "midnight-circuit": COSMETIC_IDS.midnightCircuitBoard,
  "executive-steel": COSMETIC_IDS.executiveSteelBoard,
  "concrete-minimal": COSMETIC_IDS.concreteMinimalBoard,
  [COSMETIC_IDS.softOfficeBoard]: COSMETIC_IDS.softOfficeBoard,
  [COSMETIC_IDS.midnightCircuitBoard]: COSMETIC_IDS.midnightCircuitBoard,
  [COSMETIC_IDS.executiveSteelBoard]: COSMETIC_IDS.executiveSteelBoard,
  [COSMETIC_IDS.concreteMinimalBoard]: COSMETIC_IDS.concreteMinimalBoard
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
    COSMETIC_IDS.defaultCorporateCardBack
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
