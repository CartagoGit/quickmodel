import { describe, it, expect } from 'bun:test';
import { InstanceFactoryService } from '@/core/services/instance-factory.service';

describe('InstanceFactoryService Coverage Gaps', () => {
	it('should return the same instance if data is already an instance of the model', () => {
		class SimpleClass {}
		const factory = new InstanceFactoryService();
		const instance = new SimpleClass();

		const result = factory.createInstance(SimpleClass, instance as any);

		expect(result).toBe(instance);
	});

	it('should create empty instance via Object.create if no factory method', () => {
		class PlainClass {
			prop = 'default';
		}
		const factory = new InstanceFactoryService();
		const result = factory.createInstance(PlainClass, {});

		expect(result).toBeInstanceOf(PlainClass);
		// Object.create skips constructor, so defaults are NOT set yet
		// This verifies we are using Object.create logic
		expect((result as any).prop).toBeUndefined();
	});

	it('should use __createQuickInstance static method if present', () => {
		class CustomFactoryClass {
			static __createQuickInstance(_data: any) {
				const instance = new CustomFactoryClass();
				(instance as any).createdViaFactory = true;
				return instance;
			}
		}
		const factory = new InstanceFactoryService();
		const result = factory.createInstance(CustomFactoryClass, {});

		expect(result).toBeInstanceOf(CustomFactoryClass);
		expect((result as any).createdViaFactory).toBe(true);
	});
});
