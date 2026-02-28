import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import { QUICK_DESIGN_TYPES_KEY } from '@/core/constants/metadata-keys';
import { PopulationService } from '@/core/services/population.service';
import { TransformerLookupService } from '@/core/services/transformer-lookup.service';
import { ValueTransformerService } from '@/core/services/value-transformer.service';

describe('PopulationService Coverage Gaps', () => {
	it('should throw validation error when calling populateInstance directly with metadata', () => {
		const lookup = new TransformerLookupService();
		const valueTransformer = new ValueTransformerService(lookup, {} as any);
		const service = new PopulationService(
			valueTransformer,
			lookup,
			{} as any
		);

		class TestModel {}
		const instance = new TestModel();

		Reflect.defineMetadata(
			QUICK_DESIGN_TYPES_KEY,
			{ val: Number },
			TestModel
		);

		expect(() => {
			service.populateInstance(
				instance as Record<string, unknown>,
				{ val: 'string' },
				{ modelClass: TestModel }
			);
		}).toThrow(/Expected number, got string/);
	});

	it('should throw validation error for String mismatch', () => {
		const lookup = new TransformerLookupService();
		const valueTransformer = new ValueTransformerService(lookup, {} as any);
		const service = new PopulationService(
			valueTransformer,
			lookup,
			{} as any
		);
		class StrModel {}
		Reflect.defineMetadata(
			QUICK_DESIGN_TYPES_KEY,
			{ val: String },
			StrModel
		);
		expect(() =>
			service.populateInstance(
				new StrModel() as any,
				{ val: 123 },
				{ modelClass: StrModel }
			)
		).toThrow(/Expected string, got number/);
	});

	it('should throw validation error for Boolean mismatch', () => {
		const lookup = new TransformerLookupService();
		const valueTransformer = new ValueTransformerService(lookup, {} as any);
		const service = new PopulationService(
			valueTransformer,
			lookup,
			{} as any
		);
		class BoolModel {}
		Reflect.defineMetadata(
			QUICK_DESIGN_TYPES_KEY,
			{ val: Boolean },
			BoolModel
		);
		expect(() =>
			service.populateInstance(
				new BoolModel() as any,
				{ val: 'true' },
				{ modelClass: BoolModel }
			)
		).toThrow(/Expected boolean, got string/);
	});

	it('should NOT throw for null/undefined values in primitive validation', () => {
		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class PrimitiveModelNull extends QModel<{ val: number | null }> {
			declare val: number | null;
		}

		// Should not throw
		const model = new PrimitiveModelNull({ val: null });
		expect(model.val).toBeNull();
	});

	it('should prevent prototype pollution via population', () => {
		const lookup = new TransformerLookupService();
		const valueTransformer = new ValueTransformerService(lookup, {} as any);
		const service = new PopulationService(
			valueTransformer,
			lookup,
			{} as any
		);

		class EmptyModel {}
		const instance: any = new EmptyModel();
		const pollutionPayload = JSON.parse(
			'{"__proto__": {"polluted": true}, "constructor": {"polluted": true}, "prototype": {"polluted": true}}'
		);

		service.populateInstance(instance, pollutionPayload, {
			modelClass: EmptyModel,
		});

		expect(instance.__proto__.polluted).toBeUndefined();
		expect(instance.constructor.polluted).toBeUndefined();
		expect(instance.prototype).toBeUndefined();
		// Ensure global Object prototype is not polluted
		expect(({} as any).polluted).toBeUndefined();
	});

	it('should prevent prototype pollution via dot notation', () => {
		@Quick({
			'a.__proto__.polluted': String,
			'constructor.prototype.polluted': String,
		})
		class DotPollutionModel extends QModel<any> {}

		// NOTE: 'instance' is created to trigger the potential pollution logic in the constructor/population
		// even if we don't use the variable afterwards.
		const instance = new DotPollutionModel({
			a: {},
			constructor: {},
		});
		expect(instance).toBeDefined();

		// The security check in applyDotNotationTransform should prevent this
		expect(({} as any).polluted).toBeUndefined();
	});
});
