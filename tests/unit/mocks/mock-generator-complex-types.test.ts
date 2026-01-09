/**
 * Unit Test: Mock Generator - Complex Types and Edge Cases
 * 
 * Tests mock generation for unions, enums, optionals, and edge cases
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, QInterface } from '@/index';

describe('Unit: Mock Generator - Complex Types', () => {
	// Enums (TypeScript enums become unions at runtime)
	/*
	enum _UserRole {
		ADMIN = 'admin',
		USER = 'user',
		GUEST = 'guest',
	}
	*/

	enum Priority {
		LOW = 1,
		MEDIUM = 2,
		HIGH = 3,
	}

	interface ITask {
		id: string;
		title: string;
		priority: Priority;
		status: 'pending' | 'in-progress' | 'done';
		assignee: string | null;
		dueDate: string | null;
	}

	interface ITaskTransform {
		dueDate: Date | null;
	}

	@Quick({
		dueDate: Date,
	})
	class Task extends QModel<ITask> implements QInterface<ITask, ITaskTransform> {
		id!: string;
		title!: string;
		priority!: Priority;
		status!: 'pending' | 'in-progress' | 'done';
		assignee!: string | null;
		dueDate!: Date | null;
	}

	test('should generate mocks with enum values', () => {
		const mock = Task.mock().random();

		expect(mock.priority).toBeOneOf([Priority.LOW, Priority.MEDIUM, Priority.HIGH]);
		expect([1, 2, 3]).toContain(mock.priority);
	});

	test('should generate mocks with string literal unions', () => {
		const mock = Task.mock().random();

		expect(['pending', 'in-progress', 'done']).toContain(mock.status);
	});

	test('should generate mocks with nullable fields', () => {
		const mock = Task.mock().random();

		expect(mock.assignee === null || typeof mock.assignee === 'string').toBe(true);
		expect(mock.dueDate === null || mock.dueDate instanceof Date).toBe(true);
	});

	test('should generate empty mocks with null for nullable fields', () => {
		const mock = Task.mock().empty();

		expect(mock.assignee).toBe(null);
		expect(mock.dueDate).toBe(null);
	});

	test('should allow overriding enum and union values', () => {
		const mock = Task.mock().random({
			priority: Priority.HIGH,
			status: 'done',
			assignee: 'Alice',
		});

		expect(mock.priority).toBe(Priority.HIGH);
		expect(mock.status).toBe('done');
		expect(mock.assignee).toBe('Alice');
	});

	// Complex nested unions
	interface IPayment {
		id: string;
		amount: string; // BigInt
		method: 'card' | 'paypal' | 'crypto';
		details: {
			cardNumber?: string;
			paypalEmail?: string;
			walletAddress?: string;
		};
	}

	interface IPaymentTransform {
		amount: bigint;
	}

	@Quick({
		amount: BigInt,
	})
	class Payment extends QModel<IPayment> implements QInterface<IPayment, IPaymentTransform> {
		id!: string;
		amount!: bigint;
		method!: 'card' | 'paypal' | 'crypto';
		details!: {
			cardNumber?: string;
			paypalEmail?: string;
			walletAddress?: string;
		};
	}

	test('should generate mocks with optional nested properties', () => {
		const mock = Payment.mock().random();

		expect(typeof mock.details).toBe('object');
		expect(['card', 'paypal', 'crypto']).toContain(mock.method);
	});

	test('should allow overriding optional nested properties', () => {
		const mock = Payment.mock().random({
			method: 'card',
			details: {
				cardNumber: '4111111111111111',
			},
		});

		expect(mock.method).toBe('card');
		expect(mock.details.cardNumber).toBe('4111111111111111');
	});

	// Mixed types
	interface IDocument {
		id: string;
		content: string | string[] | { text: string; format: string };
		version: number;
	}

	@Quick({})
	class Document extends QModel<IDocument> {
		id!: string;
		content!: string | string[] | { text: string; format: string };
		version!: number;
	}

	test('should generate mocks with union of different types', () => {
		const mock = Document.mock().random();

		const isString = typeof mock.content === 'string';
		const isArray = Array.isArray(mock.content);
		const isObject = typeof mock.content === 'object' && !Array.isArray(mock.content);

		expect(isString || isArray || isObject).toBe(true);
	});

	test('should allow overriding union types', () => {
		const mockString = Document.mock().random({ content: 'text' });
		expect(mockString.content).toBe('text');

		const mockArray = Document.mock().random({ content: ['a', 'b'] });
		expect(mockArray.content).toEqual(['a', 'b']);

		const mockObject = Document.mock().random({ 
			content: { text: 'hello', format: 'md' } 
		});
		expect(mockObject.content).toEqual({ text: 'hello', format: 'md' });
	});

	// Edge case: readonly and computed properties
	interface IProduct {
		id: string;
		name: string;
		price: string; // BigInt
		readonly createdAt: string;
	}

	interface IProductTransform {
		price: bigint;
		createdAt: Date;
	}

	@Quick({
		price: BigInt,
		createdAt: Date,
	})
	class Product extends QModel<IProduct> implements QInterface<IProduct, IProductTransform> {
		id!: string;
		name!: string;
		price!: bigint;
		readonly createdAt!: Date;

		getDisplayPrice(): string {
			return `$${Number(this.price) / 100}`;
		}
	}

	test('should generate mocks with readonly properties', () => {
		const mock = Product.mock().random();

		expect(mock.createdAt).toBeInstanceOf(Date);
		expect(typeof mock.getDisplayPrice()).toBe('string');
	});

	test('should allow methods to work on mocked data', () => {
		const mock = Product.mock().random({ price: '1999' });

		expect(mock.price).toBe(1999n);
		expect(mock.getDisplayPrice()).toBe('$19.99');
	});
});
