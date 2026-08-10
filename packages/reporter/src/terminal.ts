import pc from 'picocolors';

import type {
  Finding,
  RiskLevel,
  ScanResult,
  Severity,
} from '@wreckcheck/core';
import { calculateScore, getRiskLevel } from '@wreckcheck/core';

const severityOrder: Severity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
];

function formatSeverity(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return pc.bgRed(pc.white(' CRITICAL '));
    case 'high':
      return pc.red('HIGH');
    case 'medium':
      return pc.yellow('MEDIUM');
    case 'low':
      return pc.cyan('LOW');
    case 'info':
      return pc.dim('INFO');
  }
}

function formatFinding(finding: Finding): string {
  const location = finding.file
    ? `${finding.file}${finding.line ? `:${finding.line}` : ''}`
    : undefined;

  const lines = [
    `  ${pc.red('✖')} ${finding.title}`,
  ];

  if (location) {
    lines.push(`    ${pc.dim(location)}`);
  }

  lines.push('');
  lines.push(`    ${finding.description}`);

  if (finding.package) {
    lines.push('');

    lines.push(
      `    ${pc.dim('Dependency')}  ${finding.package.direct ? 'direct' : 'transitive'}`,
    );

    if (finding.package.installedVersion) {
      lines.push(
        `    ${pc.dim('Installed')}    ${finding.package.installedVersion}`,
      );
    }

    if (finding.package.fixedVersion) {
      lines.push(
        `    ${pc.dim('Fixed')}        ${finding.package.fixedVersion}`,
      );
    }
  }

  if (finding.recommendation) {
    lines.push('');
    lines.push(`    ${pc.dim('→')} ${finding.recommendation}`);
  }

  return lines.join('\n');
}

function formatRiskLevel(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'safe':
      return pc.green('✓ SAFE TO SHIP');

    case 'review':
      return pc.yellow('⚠ REVIEW BEFORE SHIPPING');

    case 'risky':
      return pc.yellow('⚠ HIGH RISK');

    case 'blocked':
      return pc.red('✖ BLOCKED');
  }
}

function groupFindings(findings: Finding[]): Map<Severity, Finding[]> {
  const groups = new Map<Severity, Finding[]>();

  for (const finding of findings) {
    const existing = groups.get(finding.severity) ?? [];
    existing.push(finding);
    groups.set(finding.severity, existing);
  }

  return groups;
}

function formatScore(score: number): string {
  if (score >= 90) {
    return pc.green(`${score} / 100`);
  }

  if (score >= 70) {
    return pc.yellow(`${score} / 100`);
  }

  return pc.red(`${score} / 100`);
}

export function renderTerminal(result: ScanResult): string {
  const { project, findings, duration, verification } = result;
  const score = calculateScore(findings);
  const riskLevel = getRiskLevel(findings);
  const groups = groupFindings(findings);

  const output: string[] = [];

  output.push('');
  output.push(pc.bold('  WRECKCHECK'));
  output.push(pc.dim('  Find what will wreck your release.'));
  output.push('');

  output.push(pc.bold('  PROJECT'));
  output.push(
    pc.dim('  ────────────────────────────────────────────'),
  );
  output.push(`  ${project.rootDir}`);
  output.push(`  Language       ${project.language}`);
  output.push(
    `  Framework      ${project.framework ?? 'Unknown'}`,
  );
  output.push(
    `  Package        ${project.packageManager ?? 'Unknown'}`,
  );
  output.push(
    `  Docker         ${
      project.hasDocker ? pc.green('✓') : pc.dim('✗')
    }`,
  );
  output.push(
    `  Git            ${
      project.hasGit ? pc.green('✓') : pc.dim('✗')
    }`,
  );
  output.push('');

  output.push(pc.bold('  SHIP READINESS'));
  output.push('');
  output.push(`             ${pc.bold(formatScore(score))}`);
  output.push('');
  output.push(`             ${formatRiskLevel(riskLevel)}`);
  output.push('');

  if (findings.length === 0) {
    output.push(pc.green('  ✓ No issues found'));
  } else {
    output.push(
      `  ${pc.yellow('⚠')} ${findings.length} issue${
        findings.length === 1 ? '' : 's'
      } found`,
    );
    output.push('');

    for (const severity of severityOrder) {
      const severityFindings = groups.get(severity);

      if (!severityFindings?.length) {
        continue;
      }

      output.push(`  ${formatSeverity(severity)}`);
      output.push('');

      for (const finding of severityFindings) {
        output.push(formatFinding(finding));
        output.push('');
      }
    }
  }

  if (verification?.length) {
    output.push('');
    output.push(pc.bold('  VERIFICATION'));
    output.push(
      pc.dim(
        '  ────────────────────────────────────────────',
      ),
    );
    output.push('');

    for (const check of verification) {
      switch (check.status) {
        case 'passed':
          output.push(
            `  ${pc.green('✓')} ${check.command} ${pc.dim(
              `${Math.round(check.duration)}ms`,
            )}`,
          );
          break;

        case 'failed':
          output.push(
            `  ${pc.red('✖')} ${check.command} ${pc.dim(
              `${Math.round(check.duration)}ms`,
            )}`,
          );

          if (check.output) {
            output.push('');

            output.push(
              check.output
                .trim()
                .split('\n')
                .map((line: string) => `    ${line}`)
                .join('\n'),
            );
          }

          break;

        case 'skipped':
          output.push(
            `  ${pc.yellow('⏭')} ${check.command}`,
          );

          if (check.reason) {
            output.push(
              `    ${pc.dim(check.reason)}`,
            );
          }

          break;
      }

      output.push('');
    }
  }

  output.push(
    pc.dim(
      '  ────────────────────────────────────────────',
    ),
  );

  output.push(
    pc.dim(
      `${`  ${findings.length} issue${
        findings.length === 1 ? '' : 's'
      } · ${Math.round(duration)}ms`}`,
    ),
  );

  output.push('');

  return output.join('\n');
}