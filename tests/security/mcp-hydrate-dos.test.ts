import { describe, test, expect } from 'bun:test';
import { QSimulateTransformationTool } from '../../src/mcp/tools/public/simulate-transformation.tool';
import { QRoundtripTool } from '../../src/mcp/tools/public/roundtrip.tool';
import { QCheckIntegrityTool } from '../../src/mcp/tools/public/check-integrity.tool';
import { QExplainTransformationTool } from '../../src/mcp/tools/public/explain-transformation.tool';

/**
 * LOW-22 — hydrateOptions() stack overflow via deeply nested options object.
 *
 * hydrateOptions() is used in simulate_transformation, roundtrip,
 * check_integrity, and explain_transformation. With no depth guard, a caller
 * can supply an options object 10 000+ levels deep and exhaust the JS call
 * stack, crashing the MCP server process.
 *
 * Fix: add a `depth = 0` parameter; return the value as-is when depth > 10.
 */

/** Builds an object nested N levels deep with a value at the bottom. */
function buildNestedOptions(
	depth: number,
	bottom: unknown = 'Date'
): Record<string, unknown> {
	let nested: unknown = bottom;
	for (let idx = 0; idx < depth; idx++) {
		nested = { val: nested };
	}
	return nested as Record<string, unknown>;
}

// LOW-22a — simulate_transformation ──────────────────────────────────────────

describe('LOW-22 — simulate_transformation: hydrateOptions must limit recursion depth', () => {
	const tool = new QSimulateTransformationTool();

	test('should not stack-overflow with 10 000 levels of nested options', () => {
		const deepOptions = buildNestedOptions(10_000);
		// Without depth guard: RangeError (Maximum call stack size exceeded).
		// With depth guard (depth > 10): returns safely at depth 10.
		expect(() => (tool as any).hydrateOptions(deepOptions)).not.toThrow();
	});

	test('should not stack-overflow with 10 000 levels of nested arrays in options', () => {
		// Nested arrays also recurse through hydrateOptions
		let nestedArr: unknown = 'Date';
		for (let idx = 0; idx < 10_000; idx++) {
			nestedArr = [nestedArr];
		}
		expect(() => (tool as any).hydrateOptions(nestedArr)).not.toThrow();
	});
});

// LOW-22b — roundtrip ─────────────────────────────────────────────────────────

describe('LOW-22 — roundtrip: hydrateOptions must limit recursion depth', () => {
	const tool = new QRoundtripTool();

	test('should not stack-overflow with 10 000 levels of nested options', () => {
		const deepOptions = buildNestedOptions(10_000);
		expect(() => (tool as any).hydrateOptions(deepOptions)).not.toThrow();
	});
});

// LOW-22c — check_integrity ──────────────────────────────────────────────────

describe('LOW-22 — check_integrity: hydrateOptions must limit recursion depth', () => {
	const tool = new QCheckIntegrityTool();

	test('should not stack-overflow with 10 000 levels of nested options', () => {
		const deepOptions = buildNestedOptions(10_000);
		expect(() => (tool as any).hydrateOptions(deepOptions)).not.toThrow();
	});
});

// LOW-22d — explain_transformation ───────────────────────────────────────────

describe('LOW-22 — explain_transformation: hydrateOptions must limit recursion depth', () => {
	const tool = new QExplainTransformationTool();

	test('should not stack-overflow with 10 000 levels of nested options', () => {
		const deepOptions = buildNestedOptions(10_000);
		expect(() => (tool as any).hydrateOptions(deepOptions)).not.toThrow();
	});
});
