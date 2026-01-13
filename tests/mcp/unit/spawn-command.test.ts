import { describe, it, expect } from 'bun:test';
import { spawnCommand } from '../../../src/mcp/tools/internal';

describe('MCP Internal Tools - spawnCommand', () => {
	it('should resolve with stdout when command succeeds', async () => {
		// We can actually run a simple command like 'echo'
		const result = await spawnCommand('echo', ['hello']);
		expect(result.stdout.trim()).toBe('hello');
		expect(result.stderr).toBe('');
	});

	it('should reject when command fails', async () => {
		// Run a command that fails
		try {
			await spawnCommand('false', []);
			expect(true).toBe(false); // Should not reach here
		} catch (error: any) {
			expect(error).toBeDefined();
			expect(error.message).toContain('Command failed');
		}
	});

	it('should handle stderr output', async () => {
		// Run a command that prints to stderr?
		// In sh: >&2 echo "error"
		const result = await spawnCommand('sh', ['-c', 'echo "error" >&2']);
		expect(result.stderr.trim()).toBe('error');
	});

	it('should handle non-existent command', async () => {
		try {
			await spawnCommand('non-existent-command-xyz', []);
			expect(true).toBe(false);
		} catch (error: any) {
			// Node/Bun usually throws 'spawn non-existent-command-xyz ENOENT' or similar
			expect(error).toBeDefined();
		}
	});
});
