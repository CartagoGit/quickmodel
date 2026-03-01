/**
 * TDD Tests: @QReadonly decorator
 * Propuesta P — campos inmutables tras construcción.
 */
import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import { QReadonly } from '@/core/decorators/qreadonly.decorator';

// ─────────────────────────────────────────────────────────────────────────────
// MODELOS DE PRUEBA
// ─────────────────────────────────────────────────────────────────────────────

interface IOrder {
	id: number;
	status: string;
	amount: number;
}

@Quick()
class OrderModel extends QModel<IOrder> {
	@QReadonly()
	declare id: number;

	declare status: string;
	declare amount: number;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('@QReadonly — construcción normal', () => {
	it('permite construir el modelo con todos los campos', () => {
		const order = new OrderModel({ id: 1, status: 'pending', amount: 99 });
		expect(order.id).toBe(1);
		expect(order.status).toBe('pending');
	});

	it('serialize() incluye el campo readonly', () => {
		const order = new OrderModel({ id: 1, status: 'pending', amount: 99 });
		const plain = order.serialize() as Record<string, unknown>;
		expect(plain['id']).toBe(1);
	});
});

describe('@QReadonly — copy() con campo readonly incluido → error', () => {
	it('lanza ImmutableFieldError cuando copy() intenta cambiar un campo readonly', () => {
		const order = new OrderModel({ id: 1, status: 'pending', amount: 99 });
		expect(() => order.copy({ id: 999 })).toThrow();
	});

	it('el mensaje de error menciona el nombre del campo', () => {
		const order = new OrderModel({ id: 1, status: 'pending', amount: 99 });
		expect(() => order.copy({ id: 999 })).toThrow('id');
	});

	it('copy() sin partial no lanza (clonación pura)', () => {
		const order = new OrderModel({ id: 1, status: 'pending', amount: 99 });
		expect(() => order.copy()).not.toThrow();
		expect(order.copy().id).toBe(1);
	});

	it('copy() con campos no-readonly funciona normalmente', () => {
		const order = new OrderModel({ id: 1, status: 'pending', amount: 99 });
		const updated = order.copy({ status: 'shipped' });
		expect(updated.status).toBe('shipped');
		expect(updated.id).toBe(1); // readonly preserved
	});
});

describe('@QReadonly — patch() con campo readonly incluido → error', () => {
	it('lanza ImmutableFieldError cuando patch() incluye un campo readonly', () => {
		const order = new OrderModel({ id: 1, status: 'pending', amount: 99 });
		expect(() => order.patch({ id: 999 })).toThrow();
	});

	it('patch() con campos no-readonly funciona normalmente', () => {
		const order = new OrderModel({ id: 1, status: 'pending', amount: 99 });
		expect(() => order.patch({ status: 'shipped' })).not.toThrow();
		expect(order.status).toBe('shipped');
	});
});

describe('@QReadonly — múltiples campos readonly', () => {
	interface IEntity {
		id: number;
		createdAt: string;
		name: string;
	}
	@Quick()
	class EntityModel extends QModel<IEntity> {
		@QReadonly()
		declare id: number;

		@QReadonly()
		declare createdAt: string;

		declare name: string;
	}

	it('copia campos readonly sin tocarlos', () => {
		const entity = new EntityModel({
			id: 42,
			createdAt: '2026-01-01',
			name: 'Test',
		});
		const cloned = entity.copy({ name: 'Updated' });
		expect(cloned.id).toBe(42);
		expect(cloned.createdAt).toBe('2026-01-01');
		expect(cloned.name).toBe('Updated');
	});

	it('lanza si cualquiera de los readonly se intenta cambiar', () => {
		const entity = new EntityModel({
			id: 42,
			createdAt: '2026-01-01',
			name: 'Test',
		});
		expect(() =>
			entity.copy({ id: 99, createdAt: '2026-02-01' })
		).toThrow();
	});
});

describe('@QReadonly — herencia', () => {
	interface IExtendedOrder extends IOrder {
		ref: string;
	}
	@Quick()
	class ExtendedOrderModel extends OrderModel {
		@QReadonly()
		declare ref: string;
	}

	it('hereda los campos readonly del padre', () => {
		const order = new ExtendedOrderModel({
			id: 1,
			status: 'pending',
			amount: 99,
			ref: 'REF-001',
		} as unknown as IExtendedOrder); // @quickmodel-rule-ignore: no-as-unknown
		// id es readonly en el padre
		expect(() => order.copy({ id: 999 })).toThrow();
		// ref es readonly en el hijo
		expect(() => order.copy({ ref: 'REF-002' })).toThrow();
	});
});
