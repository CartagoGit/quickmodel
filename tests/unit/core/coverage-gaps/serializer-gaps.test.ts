import { describe, it, expect } from 'bun:test';
import { Serializer } from '../../../../src/core/services/serializer.service';
import { Quick, QModel } from '../../../../src';

describe('Serializer Coverage Gaps', () => {
	it('should serialize to JSON string', () => {
		@Quick({ name: 'string' })
		class Simple extends QModel<any> {
			declare name: string;
		}
		const s = new Simple({ name: 'test' });
		const serializer = new Serializer();
		const json = serializer.serializeToJson(s as any);
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
			d: 'any',
			u: 'any',
			usp: 'any',
			bi: 'any',
			sym: 'any',
			re: 'any',
			err: 'any',
			buf: 'any',
		})
		class FallbackModel extends QModel<any> {
			declare d: any;
			declare u: any;
			declare usp: any;
			declare bi: any;
			declare sym: any;
			declare re: any;
			declare err: any;
			declare buf: any;
		}

		const m = new FallbackModel({
			d: date,
			u: new URL('https://example.com'),
			usp: new URLSearchParams('q=test'),
			bi: 123n,
			sym: Symbol.for('key'),
			re: /test/g,
			err: new Error('oops'),
			buf: new ArrayBuffer(2),
		});

		const res = serializer.serialize(m as any);

		expect(res.d).toBe(date.toISOString());
		expect(res.u).toBe('https://example.com/');
		expect(res.usp).toBe('q=test');
		expect(res.bi).toBe('123');
		expect(res.sym).toBe('key');
		expect(res.re).toEqual({ source: 'test', flags: 'g' });
		expect(res.err).toEqual({
			message: 'oops',
			name: 'Error',
			stack: expect.any(String),
		});
		expect(res.buf).toEqual([0, 0]);
	});
});
