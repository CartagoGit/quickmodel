import { describe, it, expect } from 'bun:test';
import { Serializer } from '../../../../src/core/services/serializer.service';
import { Quick, QModel } from '../../../../src';

describe('Serializer Coverage Gaps', () => {
	it('should serialize to JSON string', () => {
		@Quick({ name: 'string' })
		class Simple extends QModel<any> {
			declare name: string;
		}
		const simpleModel = new Simple({ name: 'test' });
		const serializer = new Serializer();
		const json = serializer.serializeToJson(simpleModel as any);
		expect(json).toBe('{"name":"test"}');
	});

	it('should fallback to default behavior if transformers are removed', () => {
		const serializer = new Serializer();

		// Force clear internal transformers map to trigger fallbacks
		(serializer as any).transformers.clear();

		const date = new Date('2023-01-01T00:00:00.000Z');
		// Fallback for Date is toISOString() (Line 386)
		// We pass raw value (not model) to test simulate private serializeValue via public serialize method?
		// serialize() expects a model.
		// We can create a dummy model and inject values.

		@Quick({
			dateVal: 'any',
			urlVal: 'any',
			usp: 'any',
			bigintVal: 'any',
			sym: 'any',
			regexpVal: 'any',
			err: 'any',
			buf: 'any',
		})
		class FallbackModel extends QModel<any> {
			declare dateVal: any;
			declare urlVal: any;
			declare usp: any;
			declare bigintVal: any;
			declare sym: any;
			declare regexpVal: any;
			declare err: any;
			declare buf: any;
		}

		const model = new FallbackModel({
			dateVal: date,
			urlVal: new URL('https://example.com'),
			usp: new URLSearchParams('q=test'),
			bigintVal: 123n,
			sym: Symbol.for('key'),
			regexpVal: /test/g,
			err: new Error('oops'),
			buf: new ArrayBuffer(2),
		});

		const res = serializer.serialize(model as any);

		expect(res.dateVal).toBe(date.toISOString());
		expect(res.urlVal).toBe('https://example.com/');
		expect(res.usp).toBe('q=test');
		expect(res.bigintVal).toBe('123');
		expect(res.sym).toBe('key');
		expect(res.regexpVal).toEqual({ source: 'test', flags: 'g' });
		expect(res.err).toEqual({
			message: 'oops',
			name: 'Error',
			stack: expect.any(String),
		});
		expect(res.buf).toEqual([0, 0]);
	});
});
