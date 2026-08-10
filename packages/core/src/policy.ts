import type { Finding, Severity } from './checks/types.js';

export interface Policy {
  failOn: Severity;
}

const severityRank: Record<Severity, number> = {
  info: 1,
  low: 2,
  medium: 3,
  high: 4,
  critical: 5,
};

export const DEFAULT_POLICY: Policy = {
  failOn: 'critical',
};

export function shouldFail(
  findings: Finding[],
  policy: Policy,
): boolean {
  const threshold = severityRank[policy.failOn];

  return findings.some(
    (finding) =>
      severityRank[finding.severity] >= threshold,
  );
}