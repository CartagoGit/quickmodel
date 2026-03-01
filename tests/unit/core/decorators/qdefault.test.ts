/**
 * TDD Tests: @QDefault decorator
 * Propuesta F — valores por defecto declarativos por campo.
 */
import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import { QDefault } from '@/core/decorators/qdefault.decorator';

// ─────────────────────────────────────────────────────────────────────────────
// MODELOS DE PRUEBA
// ─────────────────────────────────────────────────────────────────────────────

interface IEvent {
	id: string;
	status: string;
	priority: number;
	tags: string[];
	createdAt: Date;
}

@Quick({ createdAt: Date })
class EventModel extends QModel<IEvent> {
	declare id: string;

	@QDefault('draft')
	declare status: string;

	@QDefault(1)
	declare priority: number;

	@QDefault(() => [])
	declare tags: string[];

	@QDefault(() => new Date('2026-01-01'))
	declare createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('@QDefault — valor estático', () => {
	it('aplica el valor por defecto cuando el campo es undefined en el input', () => {
		const evt = new EventModel({ id: 'e1' } as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown
		expect(evt.status).toBe('draft');
	});

	it('aplica el valor numérico por defecto', () => {
		const evt = new EventModel({ id: 'e1' } as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown
		expect(evt.priority).toBe(1);
	});

	it('no sobreescribe el valor si el campo está presente en el input', () => {
		const evt = new EventModel({
			id: 'e1',
			status: 'published',
		} as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown
		expect(evt.status).toBe('published');
	});

	it('no sobreescribe el valor si el campo es false, 0 o cadena vacía', () => {
		interface IFlags {
			flag: boolean;
			count: number;
			label: string;
		}
		@Quick()
		class FlagsModel extends QModel<IFlags> {
			@QDefault(true)
			declare flag: boolean;

			@QDefault(99)
			declare count: number;

			@QDefault('default')
			declare label: string;
		}
		const obj = new FlagsModel({
			flag: false,
			count: 0,
			label: '',
		} as unknown as IFlags); // @quickmodel-rule-ignore: no-as-unknown
		expect(obj.flag).toBe(false);
		expect(obj.count).toBe(0);
		expect(obj.label).toBe('');
	});
});

describe('@QDefault — factory function', () => {
	it('invoca la factory para producir el valor por defecto', () => {
		const evt = new EventModel({ id: 'e1' } as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown
		expect(Array.isArray(evt.tags)).toBe(true);
		expect(evt.tags).toHaveLength(0);
	});

	it('cada instancia obtiene su propia copia del array (no comparte referencia)', () => {
		const evt1 = new EventModel({ id: 'e1' } as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown
		const evt2 = new EventModel({ id: 'e2' } as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown
		evt1.tags.push('x');
		expect(evt2.tags).toHaveLength(0);
	});

	it('aplica la factory de Date y produce una instancia Date', () => {
		const evt = new EventModel({ id: 'e1' } as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown
		expect(evt.createdAt).toBeInstanceOf(Date);
		expect(evt.createdAt.getFullYear()).toBe(2026);
	});

	it('no sobreescribe cuando se proporciona una fecha real', () => {
		const custom = new Date('2025-06-15');
		const evt = new EventModel({
			id: 'e1',
			createdAt: custom,
		} as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown
		expect(evt.createdAt.getFullYear()).toBe(2025);
	});
});

describe('@QDefault — null tratado como "ausente"', () => {
	it('aplica el default cuando el valor entrante es null', () => {
		const evt = new EventModel({
			id: 'e1',
			status: null,
		} as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown
		expect(evt.status).toBe('draft');
	});
});

describe('@QDefault — serialize() y copy() respetan el default', () => {
	it('serialize() incluye el campo con su valor por defecto', () => {
		const evt = new EventModel({ id: 'e1' } as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown
		const plain = evt.serialize() as Record<string, unknown>;
		expect(plain['status']).toBe('draft');
		expect(plain['priority']).toBe(1);
	});

	it('copy() preserva el default si no se sobreescribe', () => {
		const evt = new EventModel({ id: 'e1' } as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown
		const copy = evt.copy({});
		expect(copy.status).toBe('draft');
	});

	it('copy() permite sobreescribir un campo que tenía default', () => {
		const evt = new EventModel({ id: 'e1' } as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown
		const updated = evt.copy({ status: 'archived' });
		expect(updated.status).toBe('archived');
	});
});

describe('@QDefault — herencia', () => {
	interface IExtendedEvent extends IEvent {
		venue: string;
	}
	@Quick({ createdAt: Date })
	class ExtendedEventModel extends EventModel {
		@QDefault('online')
		declare venue: string;
	}

	it('hereda los defaults de la clase padre', () => {
		const evt = new ExtendedEventModel({
			id: 'e1',
		} as unknown as IExtendedEvent); // @quickmodel-rule-ignore: no-as-unknown
		expect(evt.status).toBe('draft');
		expect(evt.venue).toBe('online');
	});
});
