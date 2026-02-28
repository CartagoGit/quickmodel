import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { QModel, Quick, QConfig } from '../../../src/index';

describe('DIAG: App-Wide Protection Debug', () => {
	beforeEach(() => {
		QConfig.configure({
			defaults: { unknownPropertyPolicy: 'error' },
		});
	});

	afterEach(() => {
		QConfig.reset();
	});

	test('global defaults propagate to class without advancedOptions', () => {
		interface IProduct {
			sku: string;
			price: number;
		}

		@Quick({ sku: String, price: Number })
		class Product extends QModel<IProduct> {
			declare sku: string;
			declare price: number;
		}

		// Log what metadata was stored
		const QUICK_OPTIONS_KEY = 'quickmodel:options';
		const meta = Reflect.getMetadata(QUICK_OPTIONS_KEY, Product);
		console.log('QUICK_OPTIONS_KEY metadata:', JSON.stringify(meta));
		console.log(
			'QConfig.get().defaults:',
			JSON.stringify(QConfig.get().defaults)
		);

		// Should throw because global unknownPropertyPolicy: 'error'
		expect(() => {
			new Product({ sku: 'A-123', price: 100, _internal_id: 999 } as any);
		}).toThrow(/Strict Mode/);
	});
});
