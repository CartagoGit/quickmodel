/**
 * Task #19 — QTransformerRegistry.snapshot() / restore()
 *
 * Ensures test isolation when custom transformers are registered:
 * snapshot saves current state → register custom → restore brings it back.
 */

import { QTransformerRegistry } from '@/core/registry/transformer.registry';
import { QModel, Quick } from '@/index';
import type { IQTransformer } from '@/core/interfaces/transformer.interface';
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';

// ---------------------------------------------------------------------------
// Minimal custom transformer stub
// ---------------------------------------------------------------------------

class FakeType {
	constructor(public value: string) {}
}

const fakeTransformer: IQTransformer<FakeType, string> = {
	deserialize: (raw: unknown) => new FakeType(String(raw)),
	serialize: (v: FakeType) => v.value,
};

// ---------------------------------------------------------------------------
// Helpers — save/restore surrounding each test to avoid cross-test pollution
// ---------------------------------------------------------------------------

let surroundingSnapshot: ReturnType<typeof QTransformerRegistry.snapshot>;

beforeEach(() => {
	surroundingSnapshot = QTransformerRegistry.snapshot();
});

afterEach(() => {
	QTransformerRegistry.restore(surroundingSnapshot);
});

// ---------------------------------------------------------------------------
// 1. snapshot() — basic contract
// ---------------------------------------------------------------------------

describe('QTransformerRegistry.snapshot()', () => {
	test('returns a value (truthy snapshot token)', () => {
		const snap = QTransformerRegistry.snapshot();
		expect(snap).toBeDefined();
	});

	test('snapshot does not include transformers registered AFTER taking it', () => {
		const snap = QTransformerRegistry.snapshot();
		QTransformerRegistry.register(FakeType, fakeTransformer);

		// The snap was taken BEFORE registering, so restoring must remove FakeType
		QTransformerRegistry.restore(snap);
		expect(QTransformerRegistry.has(FakeType)).toBe(false);
	});

	test('snapshot includes transformers registered BEFORE taking it', () => {
		QTransformerRegistry.register(FakeType, fakeTransformer);
		const snap = QTransformerRegistry.snapshot();

		// Destroy all registrations then restore — FakeType should come back
		QTransformerRegistry.clear();
		expect(QTransformerRegistry.has(FakeType)).toBe(false);

		QTransformerRegistry.restore(snap);
		expect(QTransformerRegistry.has(FakeType)).toBe(true);
	});

	test('snapshot is immutable — mutating registry after snapshot does not alter snap', () => {
		const snap = QTransformerRegistry.snapshot();

		// Register something
		QTransformerRegistry.register(FakeType, fakeTransformer);
		expect(QTransformerRegistry.has(FakeType)).toBe(true);

		// Restore from snapshot — FakeType was registered AFTER snap, must disappear
		QTransformerRegistry.restore(snap);
		expect(QTransformerRegistry.has(FakeType)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// 2. restore() — round-trip contract
// ---------------------------------------------------------------------------

describe('QTransformerRegistry.restore()', () => {
	test('round-trip: snapshot → register → restore removes added transformer', () => {
		const snap = QTransformerRegistry.snapshot();
		QTransformerRegistry.register('custom-key', fakeTransformer);
		expect(QTransformerRegistry.has('custom-key')).toBe(true);

		QTransformerRegistry.restore(snap);
		expect(QTransformerRegistry.has('custom-key')).toBe(false);
	});

	test('round-trip: snapshot → clear → restore brings back original transformers', () => {
		QTransformerRegistry.register(FakeType, fakeTransformer);
		const snap = QTransformerRegistry.snapshot();

		QTransformerRegistry.clear();
		QTransformerRegistry.restore(snap);

		expect(QTransformerRegistry.has(FakeType)).toBe(true);
	});

	test('restore replaces the ENTIRE registry (removes additions, re-adds removals)', () => {
		class TypeA {}
		class TypeB {}
		const xfA: IQTransformer<TypeA, string> = {
			deserialize: (_raw) => new TypeA(),
			serialize: () => 'a',
		};
		const xfB: IQTransformer<TypeB, string> = {
			deserialize: (_raw) => new TypeB(),
			serialize: () => 'b',
		};

		// Register A, take snapshot
		QTransformerRegistry.register(TypeA, xfA);
		const snap = QTransformerRegistry.snapshot();

		// Mutate: remove A, add B
		QTransformerRegistry.clear();
		QTransformerRegistry.register(TypeB, xfB);
		expect(QTransformerRegistry.has(TypeA)).toBe(false);
		expect(QTransformerRegistry.has(TypeB)).toBe(true);

		// Restore → A back, B gone
		QTransformerRegistry.restore(snap);
		expect(QTransformerRegistry.has(TypeA)).toBe(true);
		expect(QTransformerRegistry.has(TypeB)).toBe(false);
	});

	test('multiple independent snapshots work correctly', () => {
		const snap0 = QTransformerRegistry.snapshot(); // empty

		QTransformerRegistry.register('step1', fakeTransformer);
		const snap1 = QTransformerRegistry.snapshot(); // has step1

		QTransformerRegistry.register('step2', fakeTransformer);
		const snap2 = QTransformerRegistry.snapshot(); // has step1, step2

		// Restore snap1 → only step1 present
		QTransformerRegistry.restore(snap1);
		expect(QTransformerRegistry.has('step1')).toBe(true);
		expect(QTransformerRegistry.has('step2')).toBe(false);

		// Restore snap0 → nothing present (from our test setup)
		QTransformerRegistry.restore(snap0);
		expect(QTransformerRegistry.has('step1')).toBe(false);

		// Restore snap2 → both present
		QTransformerRegistry.restore(snap2);
		expect(QTransformerRegistry.has('step1')).toBe(true);
		expect(QTransformerRegistry.has('step2')).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 3. Integration — snapshot isolates QModel deserialization
// ---------------------------------------------------------------------------

describe('QTransformerRegistry.snapshot() integration with QModel', () => {
	test('custom transformer active when registered, inactive after restore', () => {
		class Euro {
			constructor(
				public readonly cents: number,
				public readonly currency = 'EUR'
			) {}
		}

		const euroTransformer: IQTransformer<Euro, string> = {
			deserialize: (raw: unknown) =>
				new Euro(Math.round(parseFloat(String(raw)) * 100)),
			serialize: (v: Euro) => (v.cents / 100).toFixed(2),
		};

		const snap = QTransformerRegistry.snapshot();

		// Register transformer
		QTransformerRegistry.register(Euro, euroTransformer);

		@Quick({ price: Euro })
		class Product extends QModel<any> {
			declare price: Euro;
		}

		const product = new Product({ price: '9.99' });
		expect(product.price).toBeInstanceOf(Euro);
		expect(product.price.cents).toBe(999);

		// Restore — Euro transformer gone
		QTransformerRegistry.restore(snap);
		expect(QTransformerRegistry.has(Euro)).toBe(false);
	});

	test('clear() followed by restore() does not leave registry dirty', () => {
		QTransformerRegistry.register('temp', fakeTransformer);
		const snap = QTransformerRegistry.snapshot();

		QTransformerRegistry.clear();
		QTransformerRegistry.restore(snap);

		// State is exactly what was in snap — 'temp' should still be there
		expect(QTransformerRegistry.has('temp')).toBe(true);
	});
});
