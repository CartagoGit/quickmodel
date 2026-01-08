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
		const sym = Symbol('test-symbol');
		const model = new SymbolData({ symbol: sym.toString() });
		
		const json = model.toJSON();
		const parsed = JSON.parse(json);
		
		expect(typeof parsed.symbol).toBe('string');
		expect(parsed.symbol).toContain('test-symbol');
	});

	test('Should deserialize symbol', () => {
		const model = SymbolData.fromInterface({ symbol: 'Symbol(my-symbol)' });
		
		expect(typeof model.symbol).toBe('symbol');
	});

	test('Should handle symbol without description', () => {
		const sym = Symbol();
		const model = new SymbolData({ symbol: sym.toString() });
		const deserialized = SymbolData.fromJSON(model.toJSON());
		
		expect(typeof deserialized.symbol).toBe('symbol');
	});

	test('Should preserve symbol description', () => {
		const description = 'unique-identifier-123';
		const sym = Symbol(description);
		const model = new SymbolData({ symbol: sym.toString() });
		const deserialized = SymbolData.fromJSON(model.toJSON());
		
		expect(deserialized.symbol.description).toBe(description);
	});

	test('Should handle symbol with special characters', () => {
		const sym = Symbol('symbol-with-!@#$%');
		const model = new SymbolData({ symbol: sym.toString() });
		const deserialized = SymbolData.fromJSON(model.toJSON());
		
		expect(deserialized.symbol.description).toContain('symbol-with-');
	});

	test('Should create new symbol on each deserialization', () => {
		const sym = Symbol('test');
		const model = new SymbolData({ symbol: sym.toString() });
		
		const deserialized1 = SymbolData.fromJSON(model.toJSON());
		const deserialized2 = SymbolData.fromJSON(model.toJSON());
		
		// Symbols are always unique, even with same description
		expect(deserialized1.symbol).not.toBe(deserialized2.symbol);
		expect(deserialized1.symbol.description).toBe(deserialized2.symbol.description);
	});

	test('Should handle empty description', () => {
		const sym = Symbol('');
		const model = new SymbolData({ symbol: sym.toString() });
		const deserialized = SymbolData.fromJSON(model.toJSON());
		
		expect(typeof deserialized.symbol).toBe('symbol');
		expect(deserialized.symbol.description).toBe('');
	});

	test('Should handle numeric descriptions', () => {
		const sym = Symbol('12345');
		const model = new SymbolData({ symbol: sym.toString() });
		const deserialized = SymbolData.fromJSON(model.toJSON());
		
		expect(deserialized.symbol.description).toBe('12345');
	});

	test('Should handle multiword descriptions', () => {
		const sym = Symbol('this is a long description with spaces');
		const model = new SymbolData({ symbol: sym.toString() });
		const deserialized = SymbolData.fromJSON(model.toJSON());
		
		expect(deserialized.symbol.description).toBe('this is a long description with spaces');
	});
});
