import { describe, it, expect } from 'bun:test';
import { QModel, Quick, QType } from '@/index';

describe('Mock Generator Coverage Gaps', () => {
	// ...
	it('should generate mocks via implicit design:type (no explicit config)', () => {
		// Covers generateByDesignType gaps (lines 419-444)
		class ImplicitBinaryModel extends QModel<any> {
			@QType()
			i8: Int8Array;

			@QType()
			buf: ArrayBuffer;

			@QType()
			view: DataView;

			@QType()
			date: Date;
		}

		const mock = ImplicitBinaryModel.mock().random();
		expect(mock.i8).toBeInstanceOf(Int8Array);
		expect(mock.buf).toBeInstanceOf(ArrayBuffer);
		expect(mock.view).toBeInstanceOf(DataView);
		expect(mock.date).toBeInstanceOf(Date);
	});

	it('should generate sample values for all types', () => {
		// Covers getSampleValue gaps (lines 530-548)
		@Quick({
			bi: 'bigint',
			sym: 'symbol',
			re: 'regexp',
			err: 'error',
			u: 'url',
			usp: 'urlsearchparams',
			map: 'map',
			set: 'set',
			arr: 'array',
			obj: 'object',
		})
		class SampleModel extends QModel<any> {
			declare bi: bigint;
			declare sym: symbol;
			declare re: RegExp;
			declare err: Error;
			declare u: URL;
			declare usp: URLSearchParams;
			declare map: Map<any, any>;
			declare set: Set<any>;
			declare arr: any[];
			declare obj: any;
		}

		const mock = SampleModel.mock().sample();

		expect(typeof mock.bi).toBe('string'); // Serialized format
		expect(typeof mock.sym).toBe('symbol');
		expect(typeof mock.re).toBe('string'); // Serialized format "/pat/flags"
		expect(mock.err).toBeInstanceOf(Error);
		expect(typeof mock.u).toBe('string'); // Serialized format
		expect(mock.usp).toBeInstanceOf(URLSearchParams);
		expect(Array.isArray(mock.map)).toBe(true); // Serialized entries
		expect(Array.isArray(mock.set)).toBe(true); // Serialized array
		expect(Array.isArray(mock.arr)).toBe(true);
		expect(typeof mock.obj).toBe('object');
	});
});
