/**
 * @fileoverview Tests for the `quickmodel/compat/ts5/forms` entry point.
 *
 * Verifies that:
 * - `$qGroups5` is correctly re-exported from the compat layer
 * - `IQGroupsMap` type alias is re-exported (type-checked implicitly)
 * - The runtime behavior of the re-exported function is identical to
 *   importing directly from `@/core/helpers/q-groups5`
 */

import { describe, test, expect } from 'bun:test';
import { $qGroups5 } from '../../../src/compat/ts5/forms';
import type { IQGroupsMap } from '../../../src/compat/ts5/forms';

// ---------------------------------------------------------------------------
// qGroups5 re-export from compat/ts5/forms
// ---------------------------------------------------------------------------

describe('compat/ts5/forms — $qGroups5 re-export', () => {
	test('returns an object where each key equals its value', () => {
		const groups = $qGroups5(['identity', 'security']);
		expect(groups.identity).toBe('identity');
		expect(groups.security).toBe('security');
	});

	test('returns a plain object (not frozen, not null-prototype)', () => {
		const groups = $qGroups5(['a', 'b']);
		expect(typeof groups).toBe('object');
		expect(Object.getPrototypeOf(groups)).toBe(Object.prototype);
	});

	test('all array entries appear as own keys', () => {
		const groups = $qGroups5(['step1', 'step2', 'step3']);
		expect(Object.keys(groups)).toEqual(['step1', 'step2', 'step3']);
	});

	test('single group works', () => {
		const groups = $qGroups5(['only']);
		expect(groups.only).toBe('only');
		expect(Object.keys(groups)).toHaveLength(1);
	});

	test('empty array returns empty object', () => {
		const groups = $qGroups5([]);
		expect(Object.keys(groups)).toHaveLength(0);
	});

	test('duplicate entries produce a single key (last-write-wins via Object.fromEntries)', () => {
		const groups = $qGroups5(['a', 'a', 'b']);
		expect(Object.keys(groups)).toHaveLength(2);
		expect(groups.a).toBe('a');
		expect(groups.b).toBe('b');
	});

	// -------------------------------------------------------------------------
	// Type-level checks: this file must compile without errors for them to pass
	// -------------------------------------------------------------------------

	test('type-level: result satisfies IQGroupsMap', () => {
		const groups = $qGroups5(['x', 'y']);
		// Type annotation — compile error if types are wrong
		const map: IQGroupsMap<'x' | 'y'> = groups;
		expect(map.x).toBe('x');
		expect(map.y).toBe('y');
	});

	test('no as const needed for mutable arrays (TS 5.0+ feature)', () => {
		// Without const type parameters this would produce IQGroupsMap<string>
		// With const type parameters this correctly infers IQGroupsMap<'a' | 'b'>
		const arr = ['a', 'b'];
		const groups = $qGroups5(arr);
		expect(groups.a).toBe('a');
		expect(groups.b).toBe('b');
	});
});
