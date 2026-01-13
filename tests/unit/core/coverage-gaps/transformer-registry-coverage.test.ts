import { describe, it, expect, beforeEach } from 'bun:test';
import { QTransformerRegistry } from '../../../../src/core/registry/transformer.registry';
import { IQTransformer } from '../../../../src/core/interfaces/transformer.interface';

describe('Transformer Registry Coverage', () => {
	beforeEach(() => {
		QTransformerRegistry.clear();
	});

	it('should register and retrieve transformer by string key', () => {
		const mockTransformer: IQTransformer<any, any> = {
			serialize: (v) => v,
			deserialize: (v) => v,
		};
		QTransformerRegistry.register('test', mockTransformer);
		expect(QTransformerRegistry.get('test')).toBe(mockTransformer);
		expect(QTransformerRegistry.get('TEST')).toBe(mockTransformer); // Normalize check
		expect(QTransformerRegistry.get('unknown')).toBeUndefined();
	});

	it('should register and retrieve transformer by constructor key', () => {
		class MyClass {}
		const mockTransformer: IQTransformer<any, any> = {
			serialize: (v) => v,
			deserialize: (v) => v,
		};
		QTransformerRegistry.register(MyClass, mockTransformer);
		expect(QTransformerRegistry.get(MyClass)).toBe(mockTransformer);
		expect(QTransformerRegistry.get('myclass')).toBe(mockTransformer); // Normalize check name
	});

	it('should register and retrieve transformer by object key (with name)', () => {
		const objKey = { name: 'ObjKey' };
		const mockTransformer: IQTransformer<any, any> = {
			serialize: (v) => v,
			deserialize: (v) => v,
		};
		QTransformerRegistry.register(objKey, mockTransformer);
		expect(QTransformerRegistry.get(objKey)).toBe(mockTransformer);
		expect(QTransformerRegistry.get('objkey')).toBe(mockTransformer);
	});

	it('should check existence', () => {
		QTransformerRegistry.register('exist', {} as any);
		expect(QTransformerRegistry.has('exist')).toBe(true);
		expect(QTransformerRegistry.has('missing')).toBe(false);
	});
});
