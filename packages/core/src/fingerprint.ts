export function createFingerprint(
	id: string,
	file?: string,
	line?: number,
): string {
	return [id, file ?? 'unknown', line ?? 0].join(':');
}
