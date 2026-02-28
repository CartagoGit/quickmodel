/**
 * TDD Tests: CLI `bunx quickmodel generate` subcommand
 *
 * RED phase — `generate` command does not exist yet.
 */
import { describe, it, expect } from 'bun:test';
import { spawn } from 'bun';

describe('CLI generate subcommand', () => {
	it('shows generate help when called with no args', async () => {
		const proc = spawn(['bun', 'src/mcp-cli.ts', 'generate'], {
			stdout: 'pipe',
		});
		const text = await new Response(proc.stdout).text();
		expect(text).toContain('generate');
		expect(text).toContain('Usage:');
	});

	it('shows generate help with --help flag', async () => {
		const proc = spawn(['bun', 'src/mcp-cli.ts', 'generate', '--help'], {
			stdout: 'pipe',
		});
		const text = await new Response(proc.stdout).text();
		expect(text).toContain('generate model');
		expect(text).toContain('generate transformer');
	});

	it('generate model outputs a valid QModel class', async () => {
		const proc = spawn(
			[
				'bun',
				'src/mcp-cli.ts',
				'generate',
				'model',
				'User',
				'--fields',
				'id:number,name:string,email:string',
			],
			{ stdout: 'pipe' }
		);
		const text = await new Response(proc.stdout).text();
		expect(text).toContain('class User extends QModel');
		expect(text).toContain('declare id');
		expect(text).toContain('declare name');
		expect(text).toContain('declare email');
		expect(text).toContain('@Quick');
	});

	it('generate model with Date field produces @Quick({ createdAt: Date })', async () => {
		const proc = spawn(
			[
				'bun',
				'src/mcp-cli.ts',
				'generate',
				'model',
				'Post',
				'--fields',
				'id:number,title:string,createdAt:Date',
			],
			{ stdout: 'pipe' }
		);
		const text = await new Response(proc.stdout).text();
		expect(text).toContain('createdAt: Date');
		expect(text).toContain('declare createdAt: Date');
	});

	it('generate transformer outputs a valid IQTransformer class', async () => {
		const proc = spawn(
			['bun', 'src/mcp-cli.ts', 'generate', 'transformer', 'Decimal'],
			{ stdout: 'pipe' }
		);
		const text = await new Response(proc.stdout).text();
		expect(text).toContain('decimalTransformer');
		expect(text).toContain('serialize');
		expect(text).toContain('deserialize');
	});

	it('generate integration outputs a guide stub', async () => {
		const proc = spawn(
			['bun', 'src/mcp-cli.ts', 'generate', 'integration', 'prisma'],
			{ stdout: 'pipe' }
		);
		const text = await new Response(proc.stdout).text();
		expect(text).toContain('prisma');
	});

	it('generate model with no name shows error', async () => {
		const proc = spawn(['bun', 'src/mcp-cli.ts', 'generate', 'model'], {
			stdout: 'pipe',
		});
		const text = await new Response(proc.stdout).text();
		expect(text.toLowerCase()).toMatch(/model name|usage|error/);
	});

	it('unknown generate subcommand shows error', async () => {
		const proc = spawn(['bun', 'src/mcp-cli.ts', 'generate', 'unknown'], {
			stdout: 'pipe',
		});
		const text = await new Response(proc.stdout).text();
		expect(text.toLowerCase()).toMatch(/unknown|not supported|usage/);
	});
});
