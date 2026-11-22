/**
 * F1 — One-Collective Brand Bundler
 * F2 — Specification-Window Radar
 *
 * Deterministic engines (no LLM needed) that answer, for a given project:
 *   - which AllHome brands to pitch together, in what order, and why  (bundle)
 *   - when each brand's specification window opens / closes          (radar)
 */
import {
  BRANDS,
  STAGES,
  SEGMENTS,
  PROJECT_TYPES,
  stageIndex,
  nearestCentre,
  type Brand,
  type ProjectStage,
  type ProjectType,
  type Segment,
  type CentreMatch,
} from "./catalog.js";

export type WindowStatus = "now" | "upcoming" | "passed";

export interface RadarEntry {
  brandId: string;
  brandName: string;
  category: string;
  status: WindowStatus;
  /** Weeks until the window opens (0 when open now, negative when passed) */
  weeksUntil: number;
  windowLabel: string;
  leadTimeWeeks: number;
  /** Latest sensible date to place the order so delivery isn't late */
  orderBy?: string;
}

export interface BundleItem {
  brandId: string;
  brandName: string;
  category: string;
  role: "primary" | "next_stage" | "add_on";
  score: number;
  productLines: string[];
  reason: string;
  centre: CentreMatch | null;
}

export interface BrandBundle {
  headline: string;
  items: BundleItem[];
  primaryBrands: string[];
  nextBrand?: { brandId: string; brandName: string; weeksUntil: number };
  vendorsReplaced: number;
}

export interface BundleInput {
  segment: Segment;
  projectType: ProjectType;
  projectStage: ProjectStage;
  city?: string;
  /** Budget tier: premium (default) / luxury / value */
  budgetTier?: "value" | "premium" | "luxury";
  /** Restrict to the brands this workspace sells */
  enabledBrands?: string[];
}

function windowStatus(brand: Brand, stage: ProjectStage): { status: WindowStatus; weeksUntil: number } {
  const current = stageIndex(stage);
  const indices = brand.specifyAt.map(stageIndex);
  const first = Math.min(...indices);
  const last = Math.max(...indices);
  if (current >= first && current <= last) return { status: "now", weeksUntil: 0 };
  const currentWeek = STAGES[current].startWeek;
  if (current < first) return { status: "upcoming", weeksUntil: STAGES[first].startWeek - currentWeek };
  return { status: "passed", weeksUntil: STAGES[last].startWeek - currentWeek };
}

export function buildRadar(stage: ProjectStage, enabledBrands?: string[], now = new Date()): RadarEntry[] {
  return BRANDS.filter((b) => !enabledBrands || enabledBrands.includes(b.id))
    .map((brand) => {
      const { status, weeksUntil } = windowStatus(brand, stage);
      const stageLabels = brand.specifyAt.map((s) => STAGES[stageIndex(s)].label).join(" → ");
      let orderBy: string | undefined;
      if (status !== "passed") {
        const d = new Date(now);
        // Order needs to be placed lead-time before the window closes; approximate with window open + 2 weeks
        d.setDate(d.getDate() + Math.max(0, weeksUntil + 2 - brand.leadTimeWeeks) * 7);
        orderBy = d.toISOString();
      }
      return {
        brandId: brand.id,
        brandName: brand.name,
        category: brand.category,
        status,
        weeksUntil,
        windowLabel: stageLabels,
        leadTimeWeeks: brand.leadTimeWeeks,
        orderBy,
      };
    })
    .sort((a, b) => {
      const order = { now: 0, upcoming: 1, passed: 2 };
      return order[a.status] - order[b.status] || a.weeksUntil - b.weeksUntil;
    });
}

export function buildBundle(input: BundleInput): BrandBundle {
  const brands = BRANDS.filter((b) => !input.enabledBrands || input.enabledBrands.includes(b.id));
  const tier = input.budgetTier || "premium";

  const scored: BundleItem[] = brands.map((brand) => {
    const { status, weeksUntil } = windowStatus(brand, input.projectStage);
    let score = 0;
    const why: string[] = [];

    // Stage fit dominates — pitching paint at foundation stage is wasted outreach
    if (status === "now") {
      score += 50;
      why.push(`specification window is open now (${brand.specifyAt.map((s) => STAGES[stageIndex(s)].label).join("/")})`);
    } else if (status === "upcoming") {
      const s = Math.max(0, 35 - weeksUntil);
      score += s;
      why.push(`specification window opens later (~${weeksUntil} weeks, planning estimate), so worth pre-specifying`);
    } else if (input.projectStage === "handover" && brand.category === "surfaces") {
      score += 30;
      why.push("ideal for renovation and touch-ups at handover");
    } else {
      score += 2;
    }

    if (brand.projectTypes.includes(input.projectType)) {
      score += 20;
      why.push(`suited to ${PROJECT_TYPES[input.projectType].toLowerCase()} projects`);
    }
    if (brand.segments.includes(input.segment)) {
      score += 15;
      why.push(`typically specified by ${SEGMENTS[input.segment].label.toLowerCase()}s`);
    }
    if (tier === "luxury" && ["house-of-w", "metalia", "window-factory"].includes(brand.id)) score += 8;
    if (tier === "value" && ["shapes", "colour-coats"].includes(brand.id)) score += 6;

    const centre = nearestCentre(input.city, brand.id);
    if (centre?.sameCity) {
      score += 7;
      why.push(`${centre.centre.kind === "dealer" ? "dealer showroom" : "experience centre"} in ${centre.centre.city}`);
    }

    return {
      brandId: brand.id,
      brandName: brand.name,
      category: brand.category,
      role: status === "now" ? "primary" : status === "upcoming" ? "next_stage" : "add_on",
      score,
      productLines: brand.productLines.slice(0, 3),
      reason: why.length ? why.join("; ") : "complements the rest of the bundle",
      centre,
    } as BundleItem;
  });

  scored.sort((a, b) => b.score - a.score);

  // Keep the bundle focused: up to 3 primary, 2 next-stage, 1 add-on
  const primary = scored.filter((s) => s.role === "primary" && s.score >= 50).slice(0, 3);
  const next = scored.filter((s) => s.role === "next_stage").slice(0, 2);
  const addOn = scored.filter((s) => s.role === "add_on" && s.score >= 30).slice(0, 1);
  let items = [...primary, ...next, ...addOn];
  if (items.length === 0) items = scored.slice(0, 3);
  // If nothing is open right now, promote the closest upcoming brand to primary
  if (!items.some((i) => i.role === "primary") && items.length > 0) {
    items[0] = { ...items[0], role: "primary" };
  }

  const primaryNames = items.filter((i) => i.role === "primary").map((i) => i.brandName);
  const nextItem = items.find((i) => i.role === "next_stage");
  const nextWeeks = nextItem ? windowStatus(BRANDS.find((b) => b.id === nextItem.brandId)!, input.projectStage).weeksUntil : undefined;

  return {
    headline: `${primaryNames.join(" + ")}${nextItem ? `, then ${nextItem.brandName}` : ""} for a ${PROJECT_TYPES[input.projectType].toLowerCase()} at ${STAGES[stageIndex(input.projectStage)].label.toLowerCase()} stage`,
    items,
    primaryBrands: items.filter((i) => i.role === "primary").map((i) => i.brandId),
    nextBrand: nextItem && nextWeeks !== undefined ? { brandId: nextItem.brandId, brandName: nextItem.brandName, weeksUntil: nextWeeks } : undefined,
    vendorsReplaced: items.length,
  };
}
