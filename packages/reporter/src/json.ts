import type {
  Policy,
  ScanResult,
} from '@wreckcheck/core';

import {
  calculateScore,
  getRiskLevel,
} from '@wreckcheck/core';

export function renderJson(
  result: ScanResult,
  policy: Policy,
): string {
  const score = calculateScore(result.findings);
  const riskLevel = getRiskLevel(
    result.findings,
  );

  return JSON.stringify(
    {
      project: result.project,
      policy,
      score,
      riskLevel,
      findings: result.findings,
      verification: result.verification ?? [],
      duration: Math.round(result.duration),
    },
    null,
    2,
  );
}