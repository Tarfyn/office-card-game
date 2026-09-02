import type { CardDefinition } from "./types.js";

export const EXECUTIVE_SUFFIX = "-EXEC";
export const EXECUTIVE_FINISH = "EXECUTIVE" as const;

export type CardFinish = "STANDARD" | typeof EXECUTIVE_FINISH;

export function executiveEditionVariantId(baseCardId: string): string {
  return `${baseCardId}${EXECUTIVE_SUFFIX}`;
}

export function isExecutiveEditionVariant(variantId: unknown): variantId is string {
  return typeof variantId === "string" && variantId.endsWith(EXECUTIVE_SUFFIX) && variantId.length > EXECUTIVE_SUFFIX.length;
}

export function baseCardIdForVariant(cardIdOrVariantId: string): string {
  return isExecutiveEditionVariant(cardIdOrVariantId)
    ? cardIdOrVariantId.slice(0, -EXECUTIVE_SUFFIX.length)
    : cardIdOrVariantId;
}

export function normalizeCardVariantId(baseCardId: string, variantId: unknown): string | null {
  if (variantId === null || variantId === undefined || variantId === "") return null;
  const normalized = String(variantId);
  return normalized === executiveEditionVariantId(baseCardId) ? normalized : null;
}

export function isExecutiveEditionEligible(definition: CardDefinition | undefined): boolean {
  if (!definition?.id) return false;
  const id = definition.id.toUpperCase();
  if (id.startsWith("TUT-") || id.startsWith("TEST-")) return false;
  return definition.implementationStatus !== "TEXT_ONLY";
}

export function variantOwnershipKey(baseCardId: string, variantId?: string | null): string {
  return normalizeCardVariantId(baseCardId, variantId) ?? baseCardId;
}

export function variantDisplayName(finish: CardFinish): string {
  return finish === EXECUTIVE_FINISH ? "Executive Edition" : "Standard";
}
