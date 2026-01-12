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
});
