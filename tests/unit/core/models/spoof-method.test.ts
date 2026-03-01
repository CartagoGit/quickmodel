/**
 * TDD tests — spoofMethod en toFormData()
 *
 * Propuesta G: FormData ↔ QModel — Method Spoofing
 *
 * Cascada (de menor a mayor prioridad):
 *   QConfig.defaults.spoofMethod  < @Quick({}, { spoofMethod })  < toFormData({ spoofMethod })
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';
import { QConfig } from '@/core/config/quick.config';

// =========================================================================
// Modelos de prueba
// =========================================================================

interface IProfileDto {
	name: string;
}

@Quick({ name: String }, { unknownPropertyPolicy: 'strip' })
class ProfileDto extends QModel<IProfileDto> {
	declare name: string;
}

@Quick(
	{ name: String },
	{ unknownPropertyPolicy: 'strip', spoofMethod: 'PATCH' }
)
class PatchProfileDto extends QModel<IProfileDto> {
	declare name: string;
}

@Quick(
	{ name: String },
	{ unknownPropertyPolicy: 'strip', spoofMethod: 'DELETE' }
)
class DeleteProfileDto extends QModel<IProfileDto> {
	declare name: string;
}

// =========================================================================
// Helpers
// =========================================================================

/** Returns all FormData entries as an ordered array of [name, value] pairs. */
function getEntries(formData: FormData): Array<[string, string]> {
	const entries: Array<[string, string]> = [];
	formData.forEach((val, key) => {
		entries.push([key, val as string]);
	});
	return entries;
}

// =========================================================================
// Lifecycle — reset QConfig after each test
// =========================================================================

beforeEach(() => {
	QConfig.reset();
});
afterEach(() => {
	QConfig.reset();
});

// =========================================================================
// Tests
// =========================================================================

describe('spoofMethod: campo _method en toFormData()', () => {
	test('inserta _method cuando se pasa spoofMethod en toFormData()', async () => {
		const dto = new ProfileDto({ name: 'Alice' });
		const formData = await dto.$qm.toFormData({ spoofMethod: 'PUT' });

		expect(formData.get('_method')).toBe('PUT');
	});

	test('_method es el primer campo del FormData resultante', async () => {
		const dto = new ProfileDto({ name: 'Alice' });
		const formData = await dto.$qm.toFormData({ spoofMethod: 'PUT' });
		const entries = getEntries(formData);

		expect(entries[0]?.[0]).toBe('_method');
		expect(entries[0]?.[1]).toBe('PUT');
	});

	test('acepta todos los métodos HTTP estándar', async () => {
		const methods = [
			'GET',
			'POST',
			'PUT',
			'PATCH',
			'DELETE',
			'HEAD',
			'OPTIONS',
			'TRACE',
			'CONNECT',
		];
		const dto = new ProfileDto({ name: 'test' });

		for (const method of methods) {
			const formData = await dto.$qm.toFormData({ spoofMethod: method });
			expect(formData.get('_method')).toBe(method);
		}
	});

	test('acepta métodos WebDAV como PROPFIND, LOCK, UNLOCK', async () => {
		const methods = [
			'PROPFIND',
			'PROPPATCH',
			'MKCOL',
			'COPY',
			'MOVE',
			'LOCK',
			'UNLOCK',
		];
		const dto = new ProfileDto({ name: 'test' });

		for (const method of methods) {
			const formData = await dto.$qm.toFormData({ spoofMethod: method });
			expect(formData.get('_method')).toBe(method);
		}
	});

	test('acepta métodos DeltaV como REPORT, CHECKOUT, CHECKIN', async () => {
		const methods = [
			'REPORT',
			'CHECKOUT',
			'CHECKIN',
			'UNCHECKOUT',
			'MKWORKSPACE',
			'UPDATE',
			'LABEL',
			'MERGE',
			'BASELINE-CONTROL',
			'MKACTIVITY',
		];
		const dto = new ProfileDto({ name: 'test' });

		for (const method of methods) {
			const formData = await dto.$qm.toFormData({ spoofMethod: method });
			expect(formData.get('_method')).toBe(method);
		}
	});

	test('acepta métodos custom via string & {} (ej. PURGE, SEARCH, X-CUSTOM)', async () => {
		const dto = new ProfileDto({ name: 'test' });

		for (const method of ['PURGE', 'SEARCH', 'X-CUSTOM-METHOD']) {
			const formData = await dto.$qm.toFormData({ spoofMethod: method });
			expect(formData.get('_method')).toBe(method);
		}
	});

	test('no inserta _method si ningún nivel define spoofMethod', async () => {
		const dto = new ProfileDto({ name: 'Alice' });
		const formData = await dto.$qm.toFormData();

		expect(formData.has('_method')).toBe(false);
	});

	test('sin QConfig y sin decorador, toFormData sin spoofMethod no añade _method', async () => {
		// Aseguramos que QConfig está limpio (lo hace beforeEach)
		const dto = new ProfileDto({ name: 'Alice' });
		const formData = await dto.$qm.toFormData();

		expect(formData.has('_method')).toBe(false);
	});

	test('QConfig.configure con defaults vacío no interfiere con spoofMethod no definido', async () => {
		QConfig.configure({ defaults: {} });

		const dto = new ProfileDto({ name: 'Alice' });
		const formData = await dto.$qm.toFormData();

		expect(formData.has('_method')).toBe(false);
	});
});

describe('spoofMethod: cascada de configuración', () => {
	test('toFormData spoofMethod sobreescribe el del decorador', async () => {
		const dto = new PatchProfileDto({ name: 'Alice' }); // decorador: PATCH
		const formData = await dto.$qm.toFormData({ spoofMethod: 'DELETE' }); // call: DELETE

		expect(formData.get('_method')).toBe('DELETE');
	});

	test('decorador spoofMethod sobreescribe QConfig.configure defaults', async () => {
		QConfig.configure({ defaults: { spoofMethod: 'PUT' } }); // global: PUT

		const dto = new PatchProfileDto({ name: 'Alice' }); // decorador: PATCH
		const formData = await dto.$qm.toFormData(); // sin option en call

		expect(formData.get('_method')).toBe('PATCH');
	});

	test('QConfig.configure defaults aplica como fallback cuando ningún nivel lo define', async () => {
		QConfig.configure({ defaults: { spoofMethod: 'PUT' } });

		const dto = new ProfileDto({ name: 'Alice' }); // sin decorador ni call
		const formData = await dto.$qm.toFormData();

		expect(formData.get('_method')).toBe('PUT');
	});

	test('precedencia completa: toFormData > decorador > QConfig.defaults', async () => {
		QConfig.configure({ defaults: { spoofMethod: 'PUT' } }); // global
		const dto = new PatchProfileDto({ name: 'Alice' }); // decorador: PATCH
		const formDataGlobal = await dto.$qm.toFormData(); // hereda decorador
		const formDataCall = await dto.$qm.toFormData({
			spoofMethod: 'DELETE',
		}); // máxima prioridad

		// Decorador (PATCH) supera global (PUT)
		expect(formDataGlobal.get('_method')).toBe('PATCH');
		// Call (DELETE) supera decorador (PATCH) y global (PUT)
		expect(formDataCall.get('_method')).toBe('DELETE');
	});

	test('decorador DELETE sobreescribe QConfig PUT', async () => {
		QConfig.configure({ defaults: { spoofMethod: 'PUT' } });

		const dto = new DeleteProfileDto({ name: 'Alice' }); // decorador: DELETE
		const formData = await dto.$qm.toFormData();

		expect(formData.get('_method')).toBe('DELETE');
	});
});
