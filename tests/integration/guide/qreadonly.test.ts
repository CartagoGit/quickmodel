/**
 * Integration Test: @QReadonly decorator
 * Covers: docs-vitepress/en/guide/qreadonly.md
 *
 * Validates:
 * - Construction always allowed regardless of @QReadonly
 * - copy() throws ImmutableFieldError when targeting readonly field
 * - patch() throws ImmutableFieldError when targeting readonly field
 * - copy() with non-readonly fields succeeds
 * - ImmutableFieldError exposes .field and .modelName
 * - Direct property reads always work
 * - serialize() includes readonly fields by default
 * - Inheritance: parent's @QReadonly is inherited
 * - Composition: @QReadonly + @QDefault
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import {
	QReadonly,
	ImmutableFieldError,
	QDefault,
	QSensitive,
} from '@/decorators';

// ── Direct doc example model ──────────────────────────────────────────────────

interface IOrder {
	id: number;
	status: string;
	createdAt: Date;
}

@Quick({ createdAt: Date })
class OrderModel extends QModel<IOrder> {
	@QReadonly()
	declare id: number;

	@QReadonly()
	declare createdAt: Date;

	declare status: string;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: @QReadonly (guide/qreadonly.md)', () => {
	describe('Construction always allowed', () => {
		test('can construct with readonly fields', () => {
			const order = new OrderModel({
				id: 1,
				status: 'pending',
				createdAt: new Date(),
			});

			expect(order.id).toBe(1);
			expect(order.status).toBe('pending');
			expect(order.createdAt).toBeInstanceOf(Date);
		});
	});

	describe('copy() protection', () => {
		test('copy() throws ImmutableFieldError when changing id', () => {
			const order = new OrderModel({
				id: 1,
				status: 'pending',
				createdAt: new Date(),
			});

			expect(() => order.$qCopy({ id: 999 })).toThrow(
				ImmutableFieldError
			);
		});

		test('copy() succeeds when only changing non-readonly status', () => {
			const order = new OrderModel({
				id: 1,
				status: 'pending',
				createdAt: new Date(),
			});

			const updated = order.$qCopy({ status: 'shipped' });
			expect(updated.status).toBe('shipped');
			expect(updated.id).toBe(1); // preserved
		});

		test('ImmutableFieldError exposes .field and .modelName', () => {
			const order = new OrderModel({
				id: 1,
				status: 'pending',
				createdAt: new Date(),
			});

			try {
				order.$qCopy({ id: 999 });
				throw new Error('Should have thrown');
			} catch (err) {
				expect(err).toBeInstanceOf(ImmutableFieldError);
				if (err instanceof ImmutableFieldError) {
					expect(err.field).toBe('id');
					expect(err.modelName).toBe('OrderModel');
				}
			}
		});
	});

	describe('patch() protection', () => {
		test('patch() throws ImmutableFieldError when changing id', () => {
			const order = new OrderModel({
				id: 1,
				status: 'pending',
				createdAt: new Date(),
			});

			expect(() => order.$qPatch({ id: 999 })).toThrow(
				ImmutableFieldError
			);
		});

		test('patch() mutates in-place when only changing non-readonly fields', () => {
			const order = new OrderModel({
				id: 1,
				status: 'pending',
				createdAt: new Date(),
			});

			// $qPatch returns void — it mutates the instance in-place
			order.$qPatch({ status: 'delivered' });
			expect(order.status).toBe('delivered');
		});
	});

	describe('Direct reads are always allowed', () => {
		test('readonly fields can always be read directly', () => {
			const order = new OrderModel({
				id: 42,
				status: 'pending',
				createdAt: new Date('2026-01-01'),
			});

			expect(order.id).toBe(42);
			expect(order.createdAt.getFullYear()).toBe(2026);
		});
	});

	describe('serialize() includes readonly fields', () => {
		test('readonly field appears in serialize() output by default', () => {
			const order = new OrderModel({
				id: 7,
				status: 'pending',
				createdAt: new Date('2026-01-01T00:00:00.000Z'),
			});

			const output = order.$qSerialize();
			expect(output).toHaveProperty('id', 7);
		});

		test('combine @QReadonly + @QSensitive to exclude from output', () => {
			interface ISecret {
				id: string;
				secret: string;
			}

			@Quick()
			class SecretModel extends QModel<ISecret> {
				declare id: string;

				@QReadonly()
				@QSensitive()
				declare secret: string;
			}

			const mdl = new SecretModel({ id: 'x', secret: 'top-secret' });
			const output = mdl.$qSerialize();

			expect(output).not.toHaveProperty('secret');
		});
	});

	describe('Inheritance: @QReadonly inherited from parent', () => {
		interface IBaseEntity {
			id: string;
			createdAt: Date;
		}

		@Quick({ createdAt: Date })
		class BaseEntity extends QModel<IBaseEntity> {
			@QReadonly()
			declare id: string;

			@QReadonly()
			declare createdAt: Date;
		}

		@Quick()
		class AdminUser extends BaseEntity {
			declare role: string;
		}

		test('child class inherits parent readonly restriction', () => {
			const admin = new AdminUser({
				id: 'u1',
				createdAt: new Date(),
				role: 'admin',
			});

			expect(() => admin.$qCopy({ id: 'u2' })).toThrow(
				ImmutableFieldError
			);
		});

		test('child non-readonly fields can be copied', () => {
			const admin = new AdminUser({
				id: 'u1',
				createdAt: new Date(),
				role: 'admin',
			});

			const updated = admin.$qCopy({ role: 'superadmin' });
			expect(updated.role).toBe('superadmin');
		});
	});

	describe('Composition: @QReadonly + @QDefault', () => {
		interface IEvent {
			eventId: string;
			occurredAt: Date;
		}

		@Quick({ occurredAt: Date })
		class DomainEvent extends QModel<IEvent> {
			@QReadonly()
			@QDefault('auto-id')
			declare eventId: string;

			@QReadonly()
			@QDefault(() => new Date())
			declare occurredAt: Date;
		}

		test('defaults are applied on construction', () => {
			const evt = new DomainEvent({});
			expect(evt.eventId).toBe('auto-id');
			expect(evt.occurredAt).toBeInstanceOf(Date);
		});

		test('readonly field with default still throws on copy()', () => {
			const evt = new DomainEvent({});
			expect(() => evt.$qCopy({ eventId: 'other' })).toThrow(
				ImmutableFieldError
			);
		});
	});
});
