import { describe, it, expect } from 'bun:test';
import { InstanceFactoryService } from '../../../../src/core/services/instance-factory.service';

describe('Instance Factory Coverage', () => {
	it('should return existing instance if data is already instance of model', () => {
		const factory = new InstanceFactoryService();
		class MyModel {}
		const instance = new MyModel();

		const result = factory.createInstance(MyModel, instance as any);
		expect(result).toBe(instance);
	});

	it('should use __createQuickInstance if available', () => {
		const factory = new InstanceFactoryService();
		class CustomModel {
			static __createQuickInstance(_data: any) {
				return new CustomModel();
			}
		}

		const result = factory.createInstance(CustomModel, {});
		expect(result).toBeInstanceOf(CustomModel);
	});

	it('should fallback to Object.create if no custom creator', () => {
		const factory = new InstanceFactoryService();
		class PlainModel {
			prop = 'default';
		}

		const result = factory.createInstance(PlainModel, {});
		expect(result).toBeInstanceOf(PlainModel);
		// Note: Object.create(prototype) does NOT run constructor, so prop is undefined until populated?
		// Wait, standard behavior of Object.create(PlainModel.prototype)
		expect((result as any).prop).toBeUndefined();
	});
});
