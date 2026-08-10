import { readFile } from 'node:fs/promises';

export async function parseEnvFile(
  filePath: string,
): Promise<Set<string>> {
  const content = await readFile(filePath, 'utf8');
  const variables = new Set<string>();

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/,
    );

    if (match?.[1]) {
      variables.add(match[1]);
    }
  }

  return variables;
}