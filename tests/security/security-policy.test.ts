import { describe, test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Security Documentation Compliance', () => {
	const securityMdPath = join(process.cwd(), 'SECURITY.md');
	let securityContent = '';

	test('SECURITY.md should exist', () => {
		expect(existsSync(securityMdPath)).toBe(true);
		securityContent = readFileSync(securityMdPath, 'utf-8');
	});

	test('should document Prototype Pollution protection', () => {
		expect(securityContent).toContain('Prototype Pollution');
		expect(securityContent).toContain('PopulationService');
		expect(securityContent).toContain('SerializerService');
		expect(securityContent).toContain('constructor');
	});

	test('should document Stack Overflow / Recursion protection', () => {
		expect(securityContent).toContain('Stack Overflow');
		expect(securityContent).toContain('MAX_DEPTH');
		expect(securityContent).toContain('512');
		expect(securityContent).toContain('Recursion DoS');
	});

	test('should document Memory Exhaustion limits', () => {
		expect(securityContent).toContain('Memory Exhaustion');
		expect(securityContent).toContain('maxItems');
		expect(securityContent).toContain('SetTransformer');
		expect(securityContent).toContain('MapTransformer');
	});

	test('should document CPU Exhaustion limits', () => {
		expect(securityContent).toContain('CPU Exhaustion');
		expect(securityContent).toContain('RegExpTransformer');
		expect(securityContent).toContain('DateTransformer');
	});

	test('should reference security tests', () => {
		expect(securityContent).toContain(
			'tests/security/stack-overflow.test.ts'
		);
		expect(securityContent).toContain(
			'tests/security/prototype-pollution.test.ts'
		);
	});
});
