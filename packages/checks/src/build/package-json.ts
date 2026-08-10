import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface PackageJson {
  scripts?: Record<string, string>;
  packageManager?: string;
}

export async function readPackageJson(
  rootDir: string,
): Promise<PackageJson | undefined> {
  try {
    const content = await readFile(
      join(rootDir, 'package.json'),
      'utf8',
    );

    return JSON.parse(content) as PackageJson;
  } catch {
    return undefined;
  }
}