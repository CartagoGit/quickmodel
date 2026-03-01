import { describe, test, expect } from 'bun:test';
import { QSimulateValidationTool } from '../../src/mcp/tools/public/simulate-validation.tool';
import { QSimulateRulesTool } from '../../src/mcp/tools/public/simulate-rules.tool';
import { QSimulateAsyncRulesTool } from '../../src/mcp/tools/public/simulate-async-rules.tool';

const SAFE_DATA = { value: 'hello', age: 25 };

/**
 * Security: RCE via new Function() with attacker-controlled predicates.
 * CRIT-01 — all three simulation tools must reject dangerous predicates.
 */
describe('CRIT-01 — MCP Simulate tools: RCE prevention', () => {
	const DANGEROUS_PREDICATES = [
		'process.exit(1)',
		'process.env.DATABASE_URL',
		"require('fs').readFileSync('/etc/passwd','utf8')",
		"require('child_process').execSync('id')",
		'global.process.exit(0)',
		'globalThis.process.env',
		"eval('1+1')",
		"new Function('return 1')()",
		'__dirname',
		'__filename',
		"Buffer.from('x')",
		'setTimeout(()=>{},0)',
		'setInterval(()=>{},0)',
		"import('fs')",
		'XMLHttpRequest',
	];

	describe('QSimulateValidationTool', () => {
		const tool = new QSimulateValidationTool();

		for (const predicate of DANGEROUS_PREDICATES) {
			test(`should reject predicate: ${predicate.slice(0, 40)}`, async () => {
				const result = await tool.execute({
					data: SAFE_DATA,
					rules: [{ field: 'value', predicate, message: 'fail' }],
				});
				// Must NOT execute the payload — valid is irrelevant,
				// but at minimum must not throw unhandled and must treat it as a rule failure
				// OR return an error. Either way process must still be alive.
				expect(typeof result).toBe('object');
				// The predicate must be rejected (result.valid false is acceptable,
				// but the process must be alive and no side-effects must have occurred)
				// We primarily check that `valid` is false (predicate blocked/failed)
				expect(result.valid).toBe(false);
			});
		}

		test('should allow safe boolean predicates', async () => {
			const result = await tool.execute({
				data: { age: 25 },
				rules: [
					{
						field: 'age',
						predicate: 'value >= 18',
						message: 'must be adult',
					},
				],
			});
			expect(result.valid).toBe(true);
			expect(result.evaluated).toBe(1);
		});

		test('should allow string length predicate', async () => {
			const result = await tool.execute({
				data: { name: 'Alice' },
				rules: [
					{
						field: 'name',
						predicate: 'value.length > 0',
						message: 'required',
					},
				],
			});
			expect(result.valid).toBe(true);
		});

		test('should allow cross-field predicate', async () => {
			const result = await tool.execute({
				data: { password: 'abc', confirm: 'abc' },
				rules: [
					{
						field: 'confirm',
						predicate: 'value === data.password',
						message: 'passwords must match',
					},
				],
			});
			expect(result.valid).toBe(true);
		});
	});

	describe('QSimulateRulesTool', () => {
		const tool = new QSimulateRulesTool();

		for (const predicate of DANGEROUS_PREDICATES) {
			test(`should reject predicate: ${predicate.slice(0, 40)}`, async () => {
				const result = await tool.execute({
					data: SAFE_DATA,
					rules: [
						{
							field: 'value',
							predicate,
							message: 'fail',
						},
					],
				});
				expect(typeof result).toBe('object');
				expect(result.valid).toBe(false);
			});
		}

		test('should allow safe predicate', async () => {
			const result = await tool.execute({
				data: { score: 90 },
				rules: [
					{
						field: 'score',
						predicate: 'value > 50',
						message: 'too low',
					},
				],
			});
			expect(result.valid).toBe(true);
		});
	});

	describe('QSimulateAsyncRulesTool', () => {
		const tool = new QSimulateAsyncRulesTool();

		for (const predicate of DANGEROUS_PREDICATES) {
			test(`should reject predicate: ${predicate.slice(0, 40)}`, async () => {
				const result = await tool.execute({
					data: SAFE_DATA,
					rules: [
						{
							field: 'value',
							predicate,
							message: 'fail',
						},
					],
				});
				expect(typeof result).toBe('object');
				expect(result.valid).toBe(false);
			});
		}

		test('should allow safe async predicate', async () => {
			const result = await tool.execute({
				data: { email: 'test@example.com' },
				rules: [
					{
						field: 'email',
						predicate: "Promise.resolve(value.includes('@'))",
						message: 'invalid email',
					},
				],
			});
			expect(result.valid).toBe(true);
		});
	});
});
