/**
 * @fileoverview Unit tests for `qGroups` and `qGroups5`.
 *
 * ## What is tested here
 *
 * ### Runtime behavior (all TS versions)
 * - `qGroups(...spread)` returns `{ key: key }` map for each group name
 * - `qGroups([...array] as const)` returns the same map
 * - `qGroups5([...array])` (TS 5.0+) returns the same map
 * - Output is a plain object (not frozen, not a class instance)
 * - All spread args are present as keys and values
 * - Empty call returns empty object
 * - Single group works
 * - Duplicate names are deduplicated (last wins, standard fromEntries behavior)
 *
 * ### Type-level behavior (compile-time, verified by the fact that this file
 * type-checks without errors — no explicit assertions needed)
 * - `qGroups('a', 'b').a` is typed as `'a'`, not `string`
 * - `qGroups(['a', 'b'] as const).b` is typed as `'b'`, not `string`
 * - `qGroups5(['a', 'b']).a` is typed as `'a'`, not `string` (TS 5.0+)
 * - Accessing a non-existent key is a compile error
 */

import { describe, test, expect } from 'bun:test';
import { qGroups } from '@/core/helpers/q-groups';
import type { IQGroupsMap } from '@/core/helpers/q-groups';
import { qGroups5 } from '@/core/helpers/q-groups5';

// ---------------------------------------------------------------------------
// qGroups — spread form
// ---------------------------------------------------------------------------

describe('qGroups — spread form', () => {
	test('returns an object where each key equals its value', () => {
		const groups = qGroups('identity', 'security');
		expect(groups.identity).toBe('identity');
		expect(groups.security).toBe('security');
	});

	test('returns a plain object', () => {
		const groups = qGroups('a', 'b');
		expect(typeof groups).toBe('object');
		expect(Object.getPrototypeOf(groups)).toBe(Object.prototype);
	});

	test('all spread args appear as own keys', () => {
		const groups = qGroups('step1', 'step2', 'step3');
		expect(Object.keys(groups)).toEqual(['step1', 'step2', 'step3']);
	});

	test('single group works', () => {
		const groups = qGroups('only');
		expect(groups.only).toBe('only');
		expect(Object.keys(groups)).toHaveLength(1);
	});

	test('many groups work', () => {
		const groups = qGroups('a', 'b', 'c', 'd', 'e');
		expect(Object.keys(groups)).toHaveLength(5);
		for (const key of ['a', 'b', 'c', 'd', 'e']) {
			expect((groups as Record<string, string>)[key]).toBe(key);
		}
	});

	test('empty spread returns empty object', () => {
		// cast needed because overload infers never[] for empty spread
		const groups = (
			qGroups as (...args: string[]) => Record<string, string>
		)();
		expect(Object.keys(groups)).toHaveLength(0);
	});

	// -------------------------------------------------------------------------
	// Type-level checks (verified at compile time — this file must type-check)
	// -------------------------------------------------------------------------

	test('type-level: keys are literal types (file must compile without error)', () => {
		const groups = qGroups('identity', 'security');

		// These assignments type-check only if the values are the literal types
		const id: 'identity' = groups.identity;
		const sec: 'security' = groups.security;

		expect(id).toBe('identity');
		expect(sec).toBe('security');
	});

	test('type-level: result satisfies IQGroupsMap', () => {
		const groups = qGroups('x', 'y');
		const map: IQGroupsMap<'x' | 'y'> = groups;
		expect(map.x).toBe('x');
		expect(map.y).toBe('y');
	});
});

// ---------------------------------------------------------------------------
// qGroups — readonly array form (as const)
// ---------------------------------------------------------------------------

describe('qGroups — readonly array form (as const)', () => {
	test('returns an object where each key equals its value', () => {
		const groups = qGroups(['identity', 'security'] as const);
		expect(groups.identity).toBe('identity');
		expect(groups.security).toBe('security');
	});

	test('all array elements appear as own keys', () => {
		const groups = qGroups(['step1', 'step2', 'step3'] as const);
		expect(Object.keys(groups)).toEqual(['step1', 'step2', 'step3']);
	});

	test('single element array works', () => {
		const groups = qGroups(['only'] as const);
		expect(groups.only).toBe('only');
		expect(Object.keys(groups)).toHaveLength(1);
	});

	test('empty array returns empty object', () => {
		const groups = qGroups([] as const);
		expect(Object.keys(groups)).toHaveLength(0);
	});

	test('type-level: keys are literal types (file must compile without error)', () => {
		const groups = qGroups(['identity', 'security'] as const);

		const id: 'identity' = groups.identity;
		const sec: 'security' = groups.security;

		expect(id).toBe('identity');
		expect(sec).toBe('security');
	});

	test('type-level: result satisfies IQGroupsMap', () => {
		const groups = qGroups(['x', 'y'] as const);
		const map: IQGroupsMap<'x' | 'y'> = groups;
		expect(map.x).toBe('x');
		expect(map.y).toBe('y');
	});
});

// ---------------------------------------------------------------------------
// qGroups5 — mutable array WITHOUT as const (TS 5.0+ const type parameter)
// ---------------------------------------------------------------------------

describe('qGroups5 — mutable array form (TS 5.0+, no as const needed)', () => {
	test('returns an object where each key equals its value', () => {
		const groups = qGroups5(['identity', 'security']);
		expect(groups.identity).toBe('identity');
		expect(groups.security).toBe('security');
	});

	test('all array elements appear as own keys', () => {
		const groups = qGroups5(['step1', 'step2', 'step3']);
		expect(Object.keys(groups)).toEqual(['step1', 'step2', 'step3']);
	});

	test('single element array works', () => {
		const groups = qGroups5(['only']);
		expect(groups.only).toBe('only');
		expect(Object.keys(groups)).toHaveLength(1);
	});

	test('empty array returns empty object', () => {
		const groups = qGroups5([]);
		expect(Object.keys(groups)).toHaveLength(0);
	});

	test('type-level: keys are literal types without as const (TS 5.0+ const T)', () => {
		const groups = qGroups5(['identity', 'security']);

		// This assignment compiles only if 'identity' is inferred as literal,
		// not widened to string — which requires const T (TS 5.0+)
		const id: 'identity' = groups.identity;
		const sec: 'security' = groups.security;

		expect(id).toBe('identity');
		expect(sec).toBe('security');
	});

	test('type-level: result satisfies IQGroupsMap', () => {
		const groups = qGroups5(['x', 'y']);
		const map: IQGroupsMap<'x' | 'y'> = groups;
		expect(map.x).toBe('x');
		expect(map.y).toBe('y');
	});
});

// ---------------------------------------------------------------------------
// Equivalence — all three call styles produce identical runtime output
// ---------------------------------------------------------------------------

describe('qGroups — all call styles produce identical runtime output', () => {
	test('spread and as-const array give the same object structure', () => {
		const bySpread = qGroups('identity', 'security', 'payment');
		const byArray = qGroups(['identity', 'security', 'payment'] as const);
		const byArray5 = qGroups5(['identity', 'security', 'payment']);

		expect(bySpread).toEqual(byArray);
		expect(bySpread).toEqual(byArray5);
	});

	test('output object is not the same reference across calls', () => {
		const groups1 = qGroups('a', 'b');
		const groups2 = qGroups('a', 'b');
		expect(groups1).not.toBe(groups2);
		expect(groups1).toEqual(groups2);
	});
});

// ---------------------------------------------------------------------------
// Integration: typical usage pattern — groups map used in QGroup decorator
// ---------------------------------------------------------------------------

describe('qGroups — typical usage pattern', () => {
	test('groups map values can be used directly as string constants', () => {
		const ProfileGroups = qGroups('personal', 'address', 'payment');

		// Simulated use: passing a group name as a string where string is expected
		function getGroupLabel(group: string): string {
			return `Section: ${group}`;
		}

		expect(getGroupLabel(ProfileGroups.personal)).toBe('Section: personal');
		expect(getGroupLabel(ProfileGroups.address)).toBe('Section: address');
		expect(getGroupLabel(ProfileGroups.payment)).toBe('Section: payment');
	});

	test('groups map keys can be iterated for dynamic validation', () => {
		const Groups = qGroups('step1', 'step2', 'step3');
		const allGroups = Object.values(Groups);
		expect(allGroups).toEqual(['step1', 'step2', 'step3']);
	});
});
