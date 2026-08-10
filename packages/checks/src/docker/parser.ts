export interface DockerInstruction {
  instruction: string;
  value: string;
  line: number;
}

export function parseDockerfile(content: string): DockerInstruction[] {
  const instructions: DockerInstruction[] = [];

  let current = '';
  let startLine = 0;

  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]?.trimEnd() ?? '';

    if (!current) {
      startLine = index + 1;
    }

    if (!line.trim() || line.trimStart().startsWith('#')) {
      continue;
    }

    current += line.trim();

    if (current.endsWith('\\')) {
      current = current.slice(0, -1);
      continue;
    }

    const match = current.match(/^([A-Z]+)\s+(.*)$/);

    if (match) {
      instructions.push({
        instruction: match[1]!,
        value: match[2]!,
        line: startLine,
      });
    }

    current = '';
  }

  return instructions;
}