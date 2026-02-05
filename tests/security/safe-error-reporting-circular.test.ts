import { describe, test, expect } from 'bun:test';
import { DateTransformer } from '../../src/transformers/date.transformer';
import { URLTransformer } from '../../src/transformers/web-apis.transformer';
import { SymbolTransformer } from '../../src/transformers/symbol.transformer';
import { ErrorTransformer } from '../../src/transformers/error.transformer';

describe('Safe Error Reporting (Circular Reference)', () => {
	const circular: any = { name: 'Circular' };
	circular.self = circular;

	test('DateTransformer should handle circular input in error message', () => {
		const transformer = new DateTransformer();
		// This should throw QModelError, NOT TypeError (circular JSON)
		try {
			transformer.deserialize(circular, 'date', 'TestClass');
			throw new Error('Should have thrown');
		} catch (e: any) {
			expect(e.message).not.toContain(
				'Converting circular structure to JSON'
			);
			expect(e.message).toContain('Date transformer ONLY accepts'); // Expected error part
		}
	});

	test('URLTransformer should handle circular input in error message', () => {
		const transformer = new URLTransformer();
		try {
			transformer.deserialize(circular, 'url', 'TestClass');
			throw new Error('Should have thrown');
		} catch (e: any) {
			expect(e.message).not.toContain(
				'Converting circular structure to JSON'
			);
			expect(e.message).toContain('URL transformer ONLY accepts');
		}
	});

	test('SymbolTransformer should handle circular input in error message', () => {
		const transformer = new SymbolTransformer();
		try {
			transformer.deserialize(circular, 'sym', 'TestClass');
			throw new Error('Should have thrown');
		} catch (e: any) {
			expect(e.message).not.toContain(
				'Converting circular structure to JSON'
			);
			expect(e.message).toContain('Symbol transformer ONLY accepts');
		}
	});

	test('ErrorTransformer should handle circular input in error message', () => {
		const transformer = new ErrorTransformer();
		try {
			transformer.deserialize(circular, 'err', 'TestClass');
			throw new Error('Should have thrown');
		} catch (e: any) {
			expect(e.message).not.toContain(
				'Converting circular structure to JSON'
			);
			expect(e.message).toContain('Error transformer ONLY accepts');
		}
	});
});
