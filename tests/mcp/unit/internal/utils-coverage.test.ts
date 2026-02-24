import { describe, it, expect } from 'bun:test';
import { spawnCommand } from '../../../../src/mcp/tools/internal/utils';

describe('Utils Coverage (spawnCommand)', () => {
	it('should truncate stdout if it exceeds MAX_BUFFER', async () => {
		// 10MB is the limit. We generate 10MB + 1kb
		const script = `
            const blob = 'a'.repeat(10 * 1024 * 1024 + 1024);
            process.stdout.write(blob);
        `;

		const { stdout } = await spawnCommand('bun', ['-e', script]);

		expect(stdout).toContain('[TRUNCATED DUE TO SIZE]');
		expect(stdout.length).toBeLessThan(11 * 1024 * 1024);
		// The buffer limit is 10MB, so it should be around 10MB + "truncated" message length
		expect(stdout.length).toBeGreaterThan(9 * 1024 * 1024);
	});
});
