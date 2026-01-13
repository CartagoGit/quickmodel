import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

describe('Integration: Decoration Inheritance', () => {
	class ParentClean extends QModel<any> {
		declare parentData: string;
	}

	@Quick({
		childBigInt: BigInt,
	})
	class ChildClean extends ParentClean {
		declare childBigInt: bigint;
	}

	it('should work on Child extending undecorated Parent', () => {
		const data = { childBigInt: '9007199254740992' };
		const instance = ChildClean.create(data);
		expect(instance.childBigInt).toBe(9007199254740992n);
	});

	// Case 1: Simple Inheritance (Child adds fields)
	@Quick({
		parentDate: Date,
	})
	class Parent extends QModel<any> {
		declare parentDate: Date;
		declare simpleParent: string;
	}

	@Quick({
		childBigInt: BigInt,
	})
	class Child extends Parent {
		declare childBigInt: bigint;
		declare simpleChild: string;
	}

	// Case 2: Override (Child overrides parent field type)
	// Note: Overriding behavior depends on library implementation (shadowing vs merging)
	@Quick({
		sharedField: Date,
	})
	class BaseOverride extends QModel<any> {
		declare sharedField: Date | number;
	}

	@Quick({
		sharedField: 'number', // Child decides it's just a number (no Date transform)
	})
	class ChildOverride extends BaseOverride {}

	it('should inherit transformations from parent class', () => {
		const data = {
			parentDate: '2020-01-01T00:00:00Z',
			simpleParent: 'parent',
			childBigInt: '9007199254740992', // > MAX_SAFE_INTEGER
			simpleChild: 'child',
		};

		const instance = QModel.create.call(Child, data);

		// DEBUG: Check metadata manually
		const proto = Object.getPrototypeOf(instance);
		const meta = Reflect.getMetadata('fieldType', proto, 'childBigInt');
		console.log('[Test] Manual Metadata Check:', meta);

		// Parent's transformation (inherited)
		expect(instance.parentDate).toBeInstanceOf(Date);
		expect(instance.parentDate.getFullYear()).toBe(2020);

		// Child's own transformation
		expect(instance.childBigInt).toBe(9007199254740992n);
	});

	it('should respect child overrides of parent fields', () => {
		const data = {
			sharedField: 123456,
		};

		const instance = ChildOverride.create(data);

		// Should be number, not Date
		expect(typeof instance.sharedField).toBe('number');
		expect(instance.sharedField).toBe(123456);
	});
});
