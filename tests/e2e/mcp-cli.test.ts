import { describe, it, expect } from 'bun:test';
import { spawn } from 'bun';

describe('CLI E2E', () => {
	it('should show help when run without arguments', async () => {
		const proc = spawn(['bun', 'src/mcp-cli.ts'], {
			stdout: 'pipe',
		});
		const text = await new Response(proc.stdout).text();
		expect(text).toContain('QuickModel CLI');
		expect(text).toContain('Usage:');
	});

	it('should show help when run with help command', async () => {
		const proc = spawn(['bun', 'src/mcp-cli.ts', 'help'], {
			stdout: 'pipe',
		});
		const text = await new Response(proc.stdout).text();
		expect(text).toContain('QuickModel CLI');
	});

	it('should start MCP server with mcp command', async () => {
		const proc = spawn(['bun', 'src/mcp-cli.ts', 'mcp'], {
			stderr: 'pipe',
			stdout: 'pipe', // consume to prevent blocking
		});

		// Read stderr stream
		const reader = proc.stderr.getReader();
		let output = '';
		let found = false;

		const readLoop = async (): Promise<void> => {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = new TextDecoder().decode(value);
					output += chunk;

					if (
						output.includes(
							'QuickModel MCP Server running on StdIO'
						)
					) {
						found = true;
						break;
					}
				}
			} catch (_err) {
				// Ignore read errors on kill
			}
		};

		await Promise.race([readLoop(), Bun.sleep(3000)]);
		proc.kill();

		expect(found).toBe(true);
	}, 5000); // Increase timeout for this test
});
