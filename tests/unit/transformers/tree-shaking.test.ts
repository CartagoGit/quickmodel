/**
 * TDD: Tree-shakeable — individual transformer subpath imports
 *
 * Verifies that each transformer can be imported independently via its dedicated
 * subpath (e.g. `@/transformers/date.transformer`) without requiring the full
 * bundle. These tests ensure the module graph is correctly split.
 */

import { describe, test, expect } from 'bun:test';

// Individual transformer direct imports (not through the barrel index)
import { DateTransformer } from '@/transformers/date.transformer';
import { BigIntTransformer } from '@/transformers/bigint.transformer';
import { RegExpTransformer } from '@/transformers/regexp.transformer';
import {
	MapTransformer,
	SetTransformer,
} from '@/transformers/map-set.transformer';
import {
	StringTransformer,
	NumberTransformer,
	BooleanTransformer,
} from '@/transformers/primitive.transformer';
import {
	NanTransformer,
	InfinityTransformer,
	SpecialFloatTransformer,
} from '@/transformers/special-float.transformer';
import { SymbolTransformer } from '@/transformers/symbol.transformer';
import { ErrorTransformer } from '@/transformers/error.transformer';
import {
	URLTransformer,
	URLSearchParamsTransformer,
} from '@/transformers/web-apis.transformer';
import { TypedArrayTransformer } from '@/transformers/typed-array.transformer';

// ────────────────────────────────────────────────────────────────────────────
// Each transformer can be imported and instantiated in isolation
// ────────────────────────────────────────────────────────────────────────────

describe('Individual transformer imports (tree-shaking)', () => {
	test('DateTransformer is importable and functional', () => {
		expect(DateTransformer).toBeDefined();
		const trx = new DateTransformer();
		const iso = '2024-01-15T12:00:00.000Z';
		const deserialized = trx.deserialize(iso, 'date', 'Test');
		expect(deserialized).toBeInstanceOf(Date);
	});

	test('BigIntTransformer is importable and functional', () => {
		expect(BigIntTransformer).toBeDefined();
		const trx = new BigIntTransformer();
		expect(trx.deserialize('9999', 'bal', 'Test')).toBe(9999n);
	});

	test('RegExpTransformer is importable and functional', () => {
		expect(RegExpTransformer).toBeDefined();
		const trx = new RegExpTransformer();
		const result = trx.deserialize(
			{ source: '^abc$', flags: 'gi' },
			'pat',
			'Test'
		);
		expect(result).toBeInstanceOf(RegExp);
	});

	test('MapTransformer / SetTransformer are importable', () => {
		expect(MapTransformer).toBeDefined();
		expect(SetTransformer).toBeDefined();
		const mapTrx = new MapTransformer();
		const setTrx = new SetTransformer();
		expect(mapTrx).toBeDefined();
		expect(setTrx).toBeDefined();
	});

	test('PrimitiveTransformer variants are importable', () => {
		expect(StringTransformer).toBeDefined();
		expect(NumberTransformer).toBeDefined();
		expect(BooleanTransformer).toBeDefined();
		expect(StringTransformer.deserialize('hi', 'str', 'T')).toBe('hi');
		expect(NumberTransformer.deserialize(42, 'num', 'T')).toBe(42);
		expect(BooleanTransformer.deserialize(true, 'bool', 'T')).toBe(true);
	});

	test('SpecialFloatTransformer / NanTransformer / InfinityTransformer are importable', () => {
		expect(SpecialFloatTransformer).toBeDefined();
		expect(NanTransformer).toBeDefined();
		expect(InfinityTransformer).toBeDefined();
	});

	test('SymbolTransformer is importable', () => {
		expect(SymbolTransformer).toBeDefined();
		const trx = new SymbolTransformer();
		expect(trx).toBeDefined();
	});

	test('ErrorTransformer is importable', () => {
		expect(ErrorTransformer).toBeDefined();
	});

	test('WebAPI transformers are importable', () => {
		expect(URLTransformer).toBeDefined();
		expect(URLSearchParamsTransformer).toBeDefined();
	});

	test('TypedArrayTransformer is importable', () => {
		expect(TypedArrayTransformer).toBeDefined();
	});
});

// ────────────────────────────────────────────────────────────────────────────
// QTransformerRegistry allows opt-in registration of only needed transformers
// ────────────────────────────────────────────────────────────────────────────

import { QTransformerRegistry } from '@/core/registry/transformer.registry';

describe('QTransformerRegistry opt-in registration', () => {
	test('custom transformer registered and retrieved by string key', () => {
		const snapshot = QTransformerRegistry.snapshot();
		try {
			QTransformerRegistry.register('mydate', new DateTransformer());
			const trx = QTransformerRegistry.get('mydate');
			expect(trx).toBeDefined();
		} finally {
			QTransformerRegistry.restore(snapshot);
		}
	});

	test('custom transformer registered by constructor', () => {
		class MyDate extends Date {}
		const snapshot = QTransformerRegistry.snapshot();
		try {
			QTransformerRegistry.register(MyDate, new DateTransformer());
			const trx = QTransformerRegistry.get(MyDate);
			expect(trx).toBeDefined();
		} finally {
			QTransformerRegistry.restore(snapshot);
		}
	});
});
