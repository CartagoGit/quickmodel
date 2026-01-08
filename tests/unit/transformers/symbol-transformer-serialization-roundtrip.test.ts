/**
 * Unit Test: Symbol Transformer
 * 
 * Tests serialization and deserialization of Symbol objects
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, QInterface } from '../../../src';

describe('Unit: Symbol Transformer', () => {
	interface ISymbolData {
		symbol: string; // Symbol serializado como string del backend
	}

	interface ISymbolDataTransform {
		symbol: symbol; // Transformado a symbol en la clase
	}

	@Quick({ symbol: Symbol })
	class SymbolData extends QModel<ISymbolData> implements QInterface<ISymbolData, ISymbolDataTransform> {
		symbol!: symbol;
	}

	test('Should serialize symbol with description', () => {
		const model = new SymbolData({ symbol: 'test-symbol' });
		
		const json = model.toJSON();
		const parsed = JSON.parse(json);
		
		expect(typeof parsed.symbol).toBe('object');
		expect(parsed.symbol.__type).toBe('symbol');
		expect(parsed.symbol.description).toBe('test-symbol');
	});

	test('Should deserialize symbol', () => {
		const model = SymbolData.deserialize({ symbol: 'my-symbol' });
		
		expect(typeof model.symbol).toBe('symbol');
		expect(Symbol.keyFor(model.symbol)).toBe('my-symbol');
	});

	test('Should handle symbol without description', () => {
		const model = new SymbolData({ symbol: '' });
		const deserialized = SymbolData.fromJSON(model.toJSON());
		
		expect(typeof deserialized.symbol).toBe('symbol');
		expect(Symbol.keyFor(deserialized.symbol)).toBe('');
	});

	test('Should preserve symbol description', () => {
		const description = 'unique-identifier-123';
		const model = new SymbolData({ symbol: description });
		const deserialized = SymbolData.fromJSON(model.toJSON());
		
		expect(Symbol.keyFor(deserialized.symbol)).toBe(description);
	});

	test('Should handle symbol with special characters', () => {
		const model = new SymbolData({ symbol: 'symbol-with-!@#$%' });
		const deserialized = SymbolData.fromJSON(model.toJSON());
		
		expect(Symbol.keyFor(deserialized.symbol)).toBe('symbol-with-!@#$%');
	});

	test('Should return same global symbol on each deserialization', () => {
		const model = new SymbolData({ symbol: 'test' });
		
		const deserialized1 = SymbolData.fromJSON(model.toJSON());
		const deserialized2 = SymbolData.fromJSON(model.toJSON());
		
		// Global symbols (Symbol.for) are the same reference
		expect(deserialized1.symbol).toBe(deserialized2.symbol);
	});

	test('Should handle empty description', () => {
		const model = new SymbolData({ symbol: '' });
		const deserialized = SymbolData.fromJSON(model.toJSON());
		
		expect(typeof deserialized.symbol).toBe('symbol');
		expect(Symbol.keyFor(deserialized.symbol)).toBe('');
	});

	test('Should handle numeric descriptions', () => {
		const model = new SymbolData({ symbol: '12345' });
		const deserialized = SymbolData.fromJSON(model.toJSON());
		
		expect(Symbol.keyFor(deserialized.symbol)).toBe('12345');
	});

	test('Should handle multiword descriptions', () => {
		const model = new SymbolData({ symbol: 'this is a long description with spaces' });
		const deserialized = SymbolData.fromJSON(model.toJSON());
		
		expect(Symbol.keyFor(deserialized.symbol)).toBe('this is a long description with spaces');
	});
});
