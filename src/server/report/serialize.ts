import type { AuditScores, NamedCheckResult } from "@/server/audit/types";
import { topIssues } from "@/server/audit/scoring";
import { env } from "@/lib/env";

export type Entitlement = "free" | "full";

export interface SerializedCheck {
  id: string;
  category: NamedCheckResult["category"];
  status: NamedCheckResult["status"];
  /** Present only when the entitlement allows details for this check. */
  score?: number;
  detailsParams?: Record<string, string | number>;
  evidence?: unknown;
  locked: boolean;
}

export interface SerializedReport {
  scores: AuditScores;
  checks: SerializedCheck[];
  topIssueIds: string[];
  entitlement: Entitlement;
}

/**
 * Server-side gating: the full check payload never leaves the server for
 * free-tier viewers. Free users see scores, statuses, and details for the
 * top issues + free-tier checks only.
 */
export function serializeReport(
  checks: NamedCheckResult[],
  scores: AuditScores,
  entitlement: Entitlement
): SerializedReport {
  const effective: Entitlement = env.ENFORCE_FREE_TIER ? entitlement : "full";
  const top = topIssues(checks, 3).map((c) => c.id);

  const serialized = checks.map((c): SerializedCheck => {
    const visible = effective === "full" || c.tier === "free" || top.includes(c.id);
    return {
      id: c.id,
      category: c.category,
      status: c.status,
      locked: !visible,
      ...(visible && {
        score: c.score,
        detailsParams: c.detailsParams,
        evidence: c.evidence,
      }),
    };
  });

  return { scores, checks: serialized, topIssueIds: top, entitlement: effective };
}
