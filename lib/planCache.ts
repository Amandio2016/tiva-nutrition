import type { GeneratedPlan } from "@/types";

const KEY    = "tiva_cached_plan";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function cachePlan(plan: GeneratedPlan): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ plan, ts: Date.now() }));
  } catch {}
}

export function getCachedPlan(): GeneratedPlan | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { plan, ts } = JSON.parse(raw) as { plan: GeneratedPlan; ts: number };
    if (Date.now() - ts > TTL_MS) return null;
    return plan;
  } catch {
    return null;
  }
}
