import { applyRewardGrant, type AchievementProgressState, type PlayerMetaProfile, type RewardGrant, type RewardSource } from "./economy.js";

export type ProgressionEventType =
  | "MATCH_COMPLETED" | "MATCH_WON" | "MATCH_LOST" | "MATCH_DRAW"
  | "CARD_PLAYED" | "CARD_DESTROYED" | "DIRECT_REP_DAMAGE" | "DEPARTMENT_CARD_PLAYED"
  | "BOOSTER_OPENED" | "CARD_CRAFTED" | "CARD_RECYCLED" | "TRAINING_COMPLETED"
  | "TUTORIAL_COMPLETED" | "LEVEL_REACHED" | "RANK_CHANGED" | "SEASON_PLACEMENT_COMPLETED";

export interface ProgressionEvent {
  id: string;
  type: ProgressionEventType;
  playerId?: string;
  matchId?: string;
  mode?: "FRIENDLY" | "RANKED" | "TRAINING" | "TUTORIAL";
  timestamp: number;
  payload?: Record<string, unknown>;
}

export type AchievementCondition =
  | { type: "COUNTER" | "ONE_SHOT"; event: ProgressionEventType; target?: number; metric?: string; filters?: Record<string, unknown> }
  | { type: "THRESHOLD"; event: ProgressionEventType; target: number; metric?: string; filters?: Record<string, unknown> }
  | { type: "ALL"; children: AchievementCondition[] };

export interface AchievementRewardConfig {
  type: "OFFICE_CREDITS" | "SCRAP" | "CARD" | "PACK" | "COSMETIC";
  amount?: number;
  cardId?: string;
  variantId?: string | null;
  packId?: string;
  cosmeticId?: string;
  quantity?: number;
}

export interface AchievementDefinition {
  id: string;
  category: string;
  titleKey: string;
  descriptionKey: string;
  hidden?: boolean;
  repeatable?: boolean;
  condition: AchievementCondition;
  rewards: AchievementRewardConfig[];
}

export interface ProgressionConfig {
  enabled?: boolean;
  achievements: AchievementDefinition[];
}

export interface ProgressionUpdate {
  profile: PlayerMetaProfile;
  completed: string[];
  appliedGrants: RewardGrant[];
}

const DEFAULT_EXCLUDED_MODES = new Set(["TRAINING", "TUTORIAL"]);

function positiveInt(value: unknown, fallback = 1): number {
  const result = Math.floor(Number(value));
  return Number.isFinite(result) && result > 0 ? result : fallback;
}

export function normalizeProgressionConfig(value: Partial<ProgressionConfig> | undefined): ProgressionConfig {
  const achievements = Array.isArray(value?.achievements) ? value!.achievements : [];
  return {
    enabled: value?.enabled !== false,
    achievements: achievements.filter((item) => item && item.id && item.condition).map((item) => structuredClone(item))
  };
}

function filterValue(event: ProgressionEvent, key: string): unknown {
  if (key === "mode") return event.mode;
  return event.payload?.[key];
}

function eventQualifies(event: ProgressionEvent, filters: Record<string, unknown> | undefined): boolean {
  const mode = event.mode ?? event.payload?.mode;
  const explicitlyModeFiltered = Array.isArray(filters?.eligibleModes);
  if (mode && DEFAULT_EXCLUDED_MODES.has(String(mode)) && !explicitlyModeFiltered) return false;
  if (!filters) return true;
  if (Array.isArray(filters.eligibleModes) && !filters.eligibleModes.map(String).includes(String(mode))) return false;
  for (const [key, expected] of Object.entries(filters)) {
    if (key === "eligibleModes") continue;
    const actual = filterValue(event, key);
    if (Array.isArray(expected) ? !expected.map(String).includes(String(actual)) : String(actual) !== String(expected)) return false;
  }
  return true;
}

function emptyProgress(): AchievementProgressState {
  return { value: 0, completedAt: null, claimedAt: null };
}

function conditionTarget(condition: AchievementCondition): number {
  if (condition.type === "ALL") return condition.children.length;
  return positiveInt(condition.target, 1);
}

function applyCondition(condition: AchievementCondition, progress: AchievementProgressState, event: ProgressionEvent): boolean {
  if (condition.type === "ALL") {
    const children = progress.children ?? {};
    condition.children.forEach((child, index) => {
      const key = String(index);
      const childProgress = children[key] ?? emptyProgress();
      applyCondition(child, childProgress, event);
      children[key] = childProgress;
    });
    progress.children = children;
    progress.value = Object.values(children).filter((child) => child.completedAt != null).length;
    return progress.value >= condition.children.length;
  }
  if (event.type !== condition.event || !eventQualifies(event, condition.filters)) return progress.value >= conditionTarget(condition);
  if (condition.type === "THRESHOLD") {
    const metric = condition.metric ? Number(event.payload?.[condition.metric]) : 1;
    progress.value = Math.max(progress.value, Number.isFinite(metric) ? metric : 0);
  } else {
    const metric = condition.metric ? Number(event.payload?.[condition.metric]) : 1;
    if (Number.isFinite(metric) && metric > 0) progress.value += metric;
  }
  return progress.value >= conditionTarget(condition);
}

export function rewardGrantFromRewardItems(source: RewardSource, sourceRef: string, rewards: unknown[], now: number): RewardGrant {
  const grant: RewardGrant = {
    source,
    sourceRef,
    cards: [], officeCredits: 0, scrap: 0, cosmetics: [], packs: [], grantedAt: now
  };
  for (const rawReward of rewards ?? []) {
    if (!rawReward || typeof rawReward !== "object") continue;
    const reward = rawReward as AchievementRewardConfig;
    const quantity = positiveInt(reward.quantity ?? reward.amount, 1);
    if (reward.type === "OFFICE_CREDITS") grant.officeCredits += quantity;
    else if (reward.type === "SCRAP") grant.scrap += quantity;
    else if (reward.type === "CARD" && reward.cardId) grant.cards.push({ cardId: reward.cardId, quantity, variantId: reward.variantId ?? null });
    else if (reward.type === "PACK" && reward.packId) grant.packs.push({ packId: reward.packId, quantity });
    else if (reward.type === "COSMETIC" && reward.cosmeticId) grant.cosmetics.push(reward.cosmeticId);
  }
  return grant;
}

export function rewardGrantFromAchievement(definition: AchievementDefinition, now: number, tier = 1): RewardGrant {
  return rewardGrantFromRewardItems("achievement", `achievement:${definition.id}${definition.repeatable ? `:${tier}` : ""}`, definition.rewards, now);
}

export function processProgressionEvents(profile: PlayerMetaProfile, events: ProgressionEvent[], configInput: ProgressionConfig, now = Date.now()): ProgressionUpdate {
  let next = structuredClone(profile);
  const config = normalizeProgressionConfig(configInput);
  if (!config.enabled) return { profile: structuredClone(profile), completed: [], appliedGrants: [] };
  const completed: string[] = [];
  const appliedGrants: RewardGrant[] = [];
  for (const event of events ?? []) {
    if (!event?.id || next.processedProgressionEventIds.includes(event.id)) continue;
    next.processedProgressionEventIds.push(event.id);
    for (const definition of config.achievements) {
      const progress = next.achievements[definition.id] ?? emptyProgress();
      if (progress.completedAt && !definition.repeatable) { next.achievements[definition.id] = progress; continue; }
      const done = applyCondition(definition.condition, progress, event);
      if (done && !progress.completedAt) {
        progress.completedAt = now;
        const grant = rewardGrantFromAchievement(definition, now);
        const receipt = applyRewardGrant(next, grant, now);
        next = receipt.profile;
        progress.claimedAt = receipt.applied ? now : progress.claimedAt;
        completed.push(definition.id);
        if (receipt.applied) appliedGrants.push(grant);
      }
      next.achievements[definition.id] = progress;
    }
  }
  next.processedProgressionEventIds = [...new Set(next.processedProgressionEventIds)].slice(-2000);
  return { profile: next, completed, appliedGrants };
}

export function projectAchievements(configInput: ProgressionConfig, profile: PlayerMetaProfile) {
  const config = normalizeProgressionConfig(configInput);
  return config.achievements.map((definition) => {
    const progress = profile.achievements?.[definition.id] ?? emptyProgress();
    const hidden = Boolean(definition.hidden && !progress.completedAt);
    return {
      id: definition.id,
      category: definition.category,
      titleKey: hidden ? null : definition.titleKey,
      descriptionKey: hidden ? null : definition.descriptionKey,
      hidden,
      repeatable: Boolean(definition.repeatable),
      progress: structuredClone(progress),
      target: conditionTarget(definition.condition),
      rewards: hidden ? [] : structuredClone(definition.rewards)
    };
  });
}

export const PROGRESSION_REWARD_SOURCE: RewardSource = "achievement";
