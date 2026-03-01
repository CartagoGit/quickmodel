/**
 * TDD Tests: QModel.configure() — config per-class
 * Propuesta Q — override de configuración local sin afectar el QConfig global.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Quick, QModel, QConfig } from '@/index';

// ─────────────────────────────────────────────────────────────────────────────
// Guard to reset QConfig after each test
// ─────────────────────────────────────────────────────────────────────────────
let _origDefaults: object;

beforeEach(() => {
	_origDefaults = { ...QConfig.get().defaults };
	QConfig.configure({
		defaults: {
			unknownPropertyPolicy: 'strip',
			coercionStrategy: 'strict',
		},
	});
});

afterEach(() => {
	QConfig.configure({
		defaults: _origDefaults as Parameters<
			typeof QConfig.configure
		>[0]['defaults'],
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// MODELOS
// ─────────────────────────────────────────────────────────────────────────────

interface INoisy {
	id: number;
	name: string;
	extra?: string;
}

/**
 * Global-defaults model — no override.
 * Global : unknownPropertyPolicy = 'strip'
 */
@Quick()
class DefaultModel extends QModel<INoisy> {
	declare id: number;
	declare name: string;
}

/**
 * Per-class config → keep unknown properties.
 */
@Quick()
class KeepModel extends QModel<INoisy> {
	declare id: number;
	declare name: string;

	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'keep',
	});
}

/**
 * Per-class config → coercionStrategy: 'loose'
 * Number transformer is registered via typeMap so loose coercion applies.
 */
interface ILoose {
	count: number;
}
@Quick({ count: Number })
class LooseModel extends QModel<ILoose> {
	declare count: number;

	static override readonly config = QModel.configure({
		coercionStrategy: 'loose',
	});
}

// ─────────────────────────────────────────────────────────────────────────────

describe('QModel.configure() — comportamiento básico', () => {
	it('QModel.configure() retorna un objeto de configuración válido', () => {
		const cfg = QModel.configure({ unknownPropertyPolicy: 'keep' });
		expect(cfg).toBeDefined();
		expect(typeof cfg).toBe('object');
	});

	it('la clase sin static config usa la política global (strip unknown)', () => {
		// Global is 'strip'; DefaultModel has no override
		const obj = new DefaultModel({
			id: 1,
			name: 'A',
			extra: 'X',
		} as INoisy);
		const plain = obj.$qSerialize() as Record<string, unknown>;
		expect(plain['extra']).toBeUndefined();
	});
});

describe('QModel.configure() — unknownPropertyPolicy override', () => {
	it('KeepModel mantiene propiedades desconocidas (override = keep)', () => {
		const obj = new KeepModel({ id: 1, name: 'A', extra: 'X' } as INoisy);
		const plain = obj.$qSerialize() as Record<string, unknown>;
		expect(plain['extra']).toBe('X');
	});

	it('DefaultModel sigue haciendo strip (no afectado por KeepModel)', () => {
		// Ensures per-class config doesn't bleed into sibling classes
		const obj = new DefaultModel({
			id: 1,
			name: 'A',
			extra: 'X',
		} as INoisy);
		const plain = obj.$qSerialize() as Record<string, unknown>;
		expect(plain['extra']).toBeUndefined();
	});
});

describe('QModel.configure() — coercionStrategy override', () => {
	it('LooseModel acepta string como number (coercionStrategy: loose)', () => {
		// In strict mode, '42' would stay as-is (no coercion to number for non-@Quick-typed fields)
		// In loose mode, string → number coercion is attempted
		const obj = new LooseModel({ count: '42' } as unknown as ILoose); // @quickmodel-rule-ignore: no-as-unknown
		expect(typeof obj.count).toBe('number');
		expect(obj.count).toBe(42);
	});

	it('LooseModel no afecta a DefaultModel (que sigue strict)', () => {
		// Trigger LooseModel per-class config (coercionStrategy: 'loose')
		new LooseModel({ count: '42' } as unknown as ILoose); // @quickmodel-rule-ignore: no-as-unknown
		// Global config must remain untouched by LooseModel's static config
		expect(QConfig.get().defaults?.coercionStrategy).toBe('strict');
		// DefaultModel uses global strip policy — LooseModel's config has not bled over
		const obj = new DefaultModel({
			id: 1,
			name: 'A',
			extra: 'X',
		} as INoisy);
		const plain = obj.$qSerialize() as Record<string, unknown>;
		expect(plain['extra']).toBeUndefined();
	});
});

describe('QModel.configure() — combinación con @Quick() options', () => {
	it('@Quick() options y static config pueden coexistir', () => {
		interface ICombined {
			id: number;
			data: string;
		}
		@Quick({}, { coercionStrategy: 'strict' })
		class CombinedModel extends QModel<ICombined> {
			declare id: number;
			declare data: string;

			static override readonly config = QModel.configure({
				unknownPropertyPolicy: 'keep',
			});
		}
		const obj = new CombinedModel({
			id: 1,
			data: 'test',
			unknown: 'val',
		} as unknown as ICombined); // @quickmodel-rule-ignore: no-as-unknown
		const plain = obj.$qSerialize() as Record<string, unknown>;
		expect(plain['unknown']).toBe('val'); // keep from static config
	});
});

describe('QModel.configure() — herencia', () => {
	interface IChild {
		id: number;
		name: string;
		extra?: string;
	}

	@Quick()
	class ChildKeepModel extends KeepModel {
		declare extra: string;
	}

	it('subclase hereda la config del padre si no define la suya', () => {
		const obj = new ChildKeepModel({
			id: 1,
			name: 'A',
			extra: 'X',
			unknown: 'Y',
		} as unknown as IChild); // @quickmodel-rule-ignore: no-as-unknown
		const plain = obj.$qSerialize() as Record<string, unknown>;
		// ChildKeepModel doesn't override static config, so it inherits KeepModel.config
		expect(plain['unknown']).toBe('Y');
	});
});
