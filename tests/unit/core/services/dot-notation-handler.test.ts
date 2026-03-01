/**
 * Pruebas unitarias directas para DotNotationHandler.
 *
 * DotNotationHandler.apply() permite transformar campos anidados usando
 * notación de puntos (ej: 'address.city') — seguro contra prototype pollution.
 *
 * @see {@link DotNotationHandler}
 */
import { describe, test, expect } from 'bun:test';
import { DotNotationHandler } from '@/core/services/dot-notation-handler.service';
import { TransformerLookupService } from '@/core/services/transformer-lookup.service';
import { ValueTransformerService } from '@/core/services/value-transformer.service';
import type { IRecursiveDeserializer } from '@/core/services/value-transformer.service';
import { QUICK_OPTIONS_KEY } from '@/core/constants/metadata-keys';
import { Quick, QModel } from '@/index';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/** Recursion context stub — los tests no necesitan descomposición recursiva */
const stubDeserializer: IRecursiveDeserializer = {
	deserialize(data, modelClass) {
		return new modelClass(data);
	},
};

function makeHandler(): DotNotationHandler {
	const lookup = new TransformerLookupService();
	const valueSvc = new ValueTransformerService(lookup, stubDeserializer);
	return new DotNotationHandler(lookup, valueSvc, stubDeserializer);
}

/** Clase de modelo ficticia para los tests */
class FakeModel {}

// ---------------------------------------------------------------------------
// Prototype pollution — el handler debe ignorar rutas con palabras reservadas
// ---------------------------------------------------------------------------

describe('DotNotationHandler — prototype pollution prevention', () => {
	const handler = makeHandler();

	test('ignora path que contiene __proto__ como segmento intermedio', () => {
		const instance = { address: { city: 'Madrid' } } as Record<
			string,
			unknown
		>;
		expect(() =>
			handler.apply(instance, {
				path: '__proto__.city',
				modelClass: FakeModel,
			})
		).not.toThrow();
		// El objeto no debe tener su prototipo mutado
		expect(({} as any)['city']).toBeUndefined();
	});

	test('ignora path que contiene constructor como segmento intermedio', () => {
		const instance = {} as Record<string, unknown>;
		expect(() =>
			handler.apply(instance, {
				path: 'constructor.prototype',
				modelClass: FakeModel,
			})
		).not.toThrow();
	});

	test('ignora path que contiene prototype como segmento intermedio', () => {
		const instance = {} as Record<string, unknown>;
		expect(() =>
			handler.apply(instance, {
				path: 'foo.prototype.bar',
				modelClass: FakeModel,
			})
		).not.toThrow();
	});

	test('ignora path que termina en __proto__ (lastKey check)', () => {
		const instance = { data: {} } as Record<string, unknown>;
		expect(() =>
			handler.apply(instance, {
				path: 'data.__proto__',
				modelClass: FakeModel,
			})
		).not.toThrow();
	});

	test('ignora path que termina en constructor', () => {
		const instance = { data: {} } as Record<string, unknown>;
		expect(() =>
			handler.apply(instance, {
				path: 'data.constructor',
				modelClass: FakeModel,
			})
		).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Segmentos de ruta que no existen o tienen valores nulos
// ---------------------------------------------------------------------------

describe('DotNotationHandler — missing / null segments', () => {
	const handler = makeHandler();

	test('ignora path cuando el segmento intermedio es undefined', () => {
		const instance = { address: undefined } as Record<string, unknown>;
		expect(() =>
			handler.apply(instance, {
				path: 'address.city',
				modelClass: FakeModel,
			})
		).not.toThrow();
		// No debe mutar nada
		expect(instance['address']).toBeUndefined();
	});

	test('ignora path cuando el segmento intermedio es null', () => {
		const instance = { address: null } as Record<string, unknown>;
		expect(() =>
			handler.apply(instance, {
				path: 'address.city',
				modelClass: FakeModel,
			})
		).not.toThrow();
	});

	test('ignora path cuando el valor de la hoja es undefined', () => {
		const instance = { address: { city: undefined } } as Record<
			string,
			unknown
		>;
		expect(() =>
			handler.apply(instance, {
				path: 'address.city',
				modelClass: FakeModel,
			})
		).not.toThrow();
	});

	test('ignora path cuando el valor de la hoja es null', () => {
		const instance = { user: { score: null } } as Record<string, unknown>;
		expect(() =>
			handler.apply(instance, {
				path: 'user.score',
				modelClass: FakeModel,
			})
		).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Transformación real vía fieldType en metadata
// ---------------------------------------------------------------------------

describe('DotNotationHandler — transformación de valores con metadata', () => {
	const handler = makeHandler();

	test('transforma ISO string a Date con transformer "date" via fieldType metadata', () => {
		const isoDate = '2024-01-15T00:00:00.000Z';
		const instance = { meta: { createdAt: isoDate } } as Record<
			string,
			unknown
		>;
		Reflect.defineMetadata('fieldType', 'date', instance, 'meta.createdAt');
		Reflect.defineMetadata(QUICK_OPTIONS_KEY, {}, FakeModel);

		handler.apply(instance, {
			path: 'meta.createdAt',
			modelClass: FakeModel,
		});

		const dateVal = (instance as any)['meta']['createdAt'];
		expect(dateVal).toBeInstanceOf(Date);
	});

	test('no transforma valor si no hay fieldType metadata registrado', () => {
		const instance = { nested: { val: 'unchanged' } } as Record<
			string,
			unknown
		>;
		// Sin metadata de tipo — el handler no modifica nada
		Reflect.defineMetadata(QUICK_OPTIONS_KEY, {}, FakeModel);

		handler.apply(instance, {
			path: 'nested.val',
			modelClass: FakeModel,
		});

		expect((instance as any)['nested']['val']).toBe('unchanged');
	});
});

// ---------------------------------------------------------------------------
// Rutas de un solo nivel (sin separador de puntos)
// ---------------------------------------------------------------------------

describe('DotNotationHandler — path de un solo nivel', () => {
	const handler = makeHandler();

	test('path sin puntos no provoca error (valor inexistente)', () => {
		const instance = {} as Record<string, unknown>;
		expect(() =>
			handler.apply(instance, {
				path: 'standalone',
				modelClass: FakeModel,
			})
		).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Via QModel con @Quick y dot notation (test de integración directa)
// ---------------------------------------------------------------------------

describe('DotNotationHandler — integración vía QModel + @Quick', () => {
	test('@Quick con dot notation convierte fecha ISO a Date en campo anidado', () => {
		interface IDatedProfile {
			name: string;
			meta: { createdAt: Date };
		}

		@Quick({ name: String, 'meta.createdAt': Date })
		class DatedProfile extends QModel<IDatedProfile> {
			declare name: string;
			declare meta: { createdAt: Date };
		}

		const isoDate = '2024-03-15T10:00:00.000Z';
		const profile = DatedProfile.create({
			name: 'Alice',
			meta: { createdAt: isoDate as any },
		});

		expect(profile.meta.createdAt).toBeInstanceOf(Date);
		expect(profile.meta.createdAt.toISOString()).toBe(isoDate);
	});

	test('@Quick con dot notation profundo (3 niveles) — conversión de fecha', () => {
		interface IDeepDates {
			top: { mid: { timestamp: Date } };
		}

		@Quick({ 'top.mid.timestamp': Date })
		class DeepDateModel extends QModel<IDeepDates> {
			declare top: { mid: { timestamp: Date } };
		}

		const isoTs = '2023-06-01T00:00:00.000Z';
		const mdl = DeepDateModel.create({
			top: { mid: { timestamp: isoTs as any } },
		});

		expect(mdl.top.mid.timestamp).toBeInstanceOf(Date);
	});

	test('@Quick con dot notation: campo de texto string preservado', () => {
		interface IAddress {
			user: { address: { city: string } };
		}

		@Quick({ 'user.address.city': String })
		class AddressModel extends QModel<IAddress> {
			declare user: { address: { city: string } };
		}

		const mdl = AddressModel.create({
			user: { address: { city: 'Madrid' } },
		});

		expect(mdl.user.address.city).toBe('Madrid');
	});
});
