import { describe, it, expect } from 'bun:test';
import { RegExpTransformer } from '@/transformers/regexp.transformer';
// import { QModelError } from '@/core/errors/quickmodel.error';

describe('Unit: RegExp Transformer Security', () => {
	const transformer = new RegExpTransformer();
	// const context = { propertyKey: 'regex', className: 'TestClass' };

	it('deserialize: should throw on very long string pattern (> 1000 chars)', () => {
		const longString = 'a'.repeat(1001);
		expect(() => {
			transformer.deserialize(longString, 'regex', 'TestClass');
		}).toThrow(/RegExp pattern too long/);
	});

	it('deserialize: should throw on object with very long source (> 1000 chars)', () => {
		const longString = 'a'.repeat(1001);
		expect(() => {
			transformer.deserialize(
				{ source: longString, flags: '' },
				'regex',
				'TestClass'
			);
		}).toThrow(/RegExp source too long/);
	});
});
