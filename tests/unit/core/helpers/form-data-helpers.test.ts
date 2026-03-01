/**
 * Pruebas unitarias directas para las funciones de form-data.helpers.ts
 *
 * Prueba: formDataToPlainObject, plainObjectToFormData, resolveFormDataValue,
 *         appendFieldToFormData — modos auto, binary, base64, reference.
 *
 * @see {@link formDataToPlainObject}
 * @see {@link plainObjectToFormData}
 * @see {@link resolveFormDataValue}
 * @see {@link appendFieldToFormData}
 */
import { describe, test, expect } from 'bun:test';
import {
	resolveFormDataValue,
	formDataToPlainObject,
	plainObjectToFormData,
	appendFieldToFormData,
} from '@/core/helpers/form-data.helpers';

// ---------------------------------------------------------------------------
// resolveFormDataValue
// ---------------------------------------------------------------------------

describe('resolveFormDataValue — File', () => {
	test('mode auto: preserva File como File', () => {
		const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
		const result = resolveFormDataValue(file, 'auto');
		expect(result).toBeInstanceOf(File);
	});

	test('mode reference: devuelve el nombre del fichero', () => {
		const file = new File(['hello'], 'avatar.png', { type: 'image/png' });
		const result = resolveFormDataValue(file, 'reference');
		expect(result).toBe('avatar.png');
	});

	test('mode binary: preserva File', () => {
		const file = new File(['a'], 'doc.pdf');
		const result = resolveFormDataValue(file, 'binary');
		expect(result).toBeInstanceOf(File);
	});

	test('mode base64: preserva File (no necesita decodificar)', () => {
		const file = new File(['data'], 'img.jpg');
		const result = resolveFormDataValue(file, 'base64');
		expect(result).toBeInstanceOf(File);
	});
});

describe('resolveFormDataValue — Blob (non-File)', () => {
	test('mode auto: preserva Blob', () => {
		const blob = new Blob(['bytes'], { type: 'application/octet-stream' });
		const result = resolveFormDataValue(blob, 'auto');
		expect(result).toBeInstanceOf(Blob);
	});

	test('mode reference: devuelve "[Blob]"', () => {
		const blob = new Blob(['bytes']);
		const result = resolveFormDataValue(blob, 'reference');
		expect(result).toBe('[Blob]');
	});

	test('mode binary: preserva Blob', () => {
		const blob = new Blob(['hi']);
		const result = resolveFormDataValue(blob, 'binary');
		expect(result).toBeInstanceOf(Blob);
	});
});

describe('resolveFormDataValue — string data:URI', () => {
	const dataUri =
		'data:text/plain;base64,' + Buffer.from('hello').toString('base64');

	test('mode auto: decodifica data:URI a Blob', () => {
		const result = resolveFormDataValue(dataUri, 'auto');
		expect(result).toBeInstanceOf(Blob);
	});

	test('mode binary: decodifica data:URI a Blob', () => {
		const result = resolveFormDataValue(dataUri, 'binary');
		expect(result).toBeInstanceOf(Blob);
	});

	test('mode base64: decodifica data:URI a Blob', () => {
		const result = resolveFormDataValue(dataUri, 'base64');
		expect(result).toBeInstanceOf(Blob);
	});

	test('mode reference: devuelve el string tal cual', () => {
		const result = resolveFormDataValue(dataUri, 'reference');
		expect(result).toBe(dataUri);
	});
});

describe('resolveFormDataValue — string URL (http/https)', () => {
	test('mode auto: preserva URL como string', () => {
		const url = 'https://cdn.example.com/avatar.png';
		const result = resolveFormDataValue(url, 'auto');
		expect(result).toBe(url);
	});

	test('mode auto: preserva URL http', () => {
		const url = 'http://api.example.com/files/doc.pdf';
		const result = resolveFormDataValue(url, 'auto');
		expect(result).toBe(url);
	});
});

describe('resolveFormDataValue — string plain', () => {
	test('mode auto: devuelve el string tal cual', () => {
		const result = resolveFormDataValue('simple text', 'auto');
		expect(result).toBe('simple text');
	});

	test('mode reference: devuelve el string tal cual', () => {
		const result = resolveFormDataValue(
			'/storage/uploads/file.jpg',
			'reference'
		);
		expect(result).toBe('/storage/uploads/file.jpg');
	});

	test('mode binary: string sin data:URI se preserva', () => {
		const result = resolveFormDataValue('plain string', 'binary');
		expect(result).toBe('plain string');
	});

	test('mode base64: string sin data:URI se preserva', () => {
		const result = resolveFormDataValue('not-a-data-uri', 'base64');
		expect(result).toBe('not-a-data-uri');
	});
});

// ---------------------------------------------------------------------------
// formDataToPlainObject
// ---------------------------------------------------------------------------

describe('formDataToPlainObject', () => {
	test('convierte campos de texto correctamente', () => {
		const formData = new FormData();
		formData.append('name', 'Alice');
		formData.append('age', '30');

		const result = formDataToPlainObject(formData);
		expect(result['name']).toBe('Alice');
		expect(result['age']).toBe('30');
	});

	test('preserva File en modo auto', () => {
		const formData = new FormData();
		const file = new File(['content'], 'test.txt');
		formData.append('avatar', file);

		const result = formDataToPlainObject(formData, { fileSource: 'auto' });
		expect(result['avatar']).toBeInstanceOf(File);
	});

	test('convierte File a nombre con mode reference', () => {
		const formData = new FormData();
		formData.append('file', new File(['x'], 'doc.pdf'));

		const result = formDataToPlainObject(formData, {
			fileSource: 'reference',
		});
		expect(result['file']).toBe('doc.pdf');
	});

	test('override por campo toma precedencia sobre modo global', () => {
		const formData = new FormData();
		formData.append('avatar', new File(['x'], 'img.png'));
		formData.append('name', 'Bob');

		const result = formDataToPlainObject(formData, {
			fileSource: 'auto',
			fields: { avatar: 'reference' },
		});

		expect(result['avatar']).toBe('img.png');
		expect(result['name']).toBe('Bob');
	});

	test('sin opciones usa modo auto por defecto', () => {
		const formData = new FormData();
		formData.append('key', 'value');
		const result = formDataToPlainObject(formData);
		expect(result['key']).toBe('value');
	});

	test('FormData vacío devuelve objeto vacío', () => {
		const formData = new FormData();
		const result = formDataToPlainObject(formData);
		expect(Object.keys(result)).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// appendFieldToFormData
// ---------------------------------------------------------------------------

describe('appendFieldToFormData — null y undefined', () => {
	test('ignora campo null', async () => {
		const formData = new FormData();
		await appendFieldToFormData({
			formData: formData,
			key: 'field',
			val: null,
			mode: 'auto',
		});
		expect(Array.from(formData.keys())).toHaveLength(0);
	});

	test('ignora campo undefined', async () => {
		const formData = new FormData();
		await appendFieldToFormData({
			formData: formData,
			key: 'field',
			val: undefined,
			mode: 'auto',
		});
		expect(Array.from(formData.keys())).toHaveLength(0);
	});
});

describe('appendFieldToFormData — primitivos', () => {
	test('añade string', async () => {
		const formData = new FormData();
		await appendFieldToFormData({
			formData: formData,
			key: 'name',
			val: 'Alice',
			mode: 'auto',
		});
		expect(formData.get('name')).toBe('Alice');
	});

	test('añade número como string', async () => {
		const formData = new FormData();
		await appendFieldToFormData({
			formData: formData,
			key: 'age',
			val: 25,
			mode: 'auto',
		});
		expect(formData.get('age')).toBe('25');
	});

	test('añade boolean como string', async () => {
		const formData = new FormData();
		await appendFieldToFormData({
			formData: formData,
			key: 'active',
			val: true,
			mode: 'auto',
		});
		expect(formData.get('active')).toBe('true');
	});
});

describe('appendFieldToFormData — File', () => {
	test('modo auto: añade File directamente', async () => {
		const formData = new FormData();
		const file = new File(['content'], 'test.txt');
		await appendFieldToFormData({
			formData: formData,
			key: 'file',
			val: file,
			mode: 'auto',
		});
		expect(formData.get('file')).toBeInstanceOf(File);
	});

	test('modo reference: añade el nombre del fichero', async () => {
		const formData = new FormData();
		const file = new File(['content'], 'photo.jpg');
		await appendFieldToFormData({
			formData: formData,
			key: 'photo',
			val: file,
			mode: 'reference',
		});
		expect(formData.get('photo')).toBe('photo.jpg');
	});

	test('modo base64: añade data:URI', async () => {
		const formData = new FormData();
		const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
		await appendFieldToFormData({
			formData: formData,
			key: 'file',
			val: file,
			mode: 'base64',
		});
		const val = formData.get('file');
		expect(typeof val).toBe('string');
		expect((val as string).startsWith('data:')).toBe(true);
	});
});

describe('appendFieldToFormData — Blob', () => {
	test('modo auto: añade Blob', async () => {
		const formData = new FormData();
		const blob = new Blob(['bytes']);
		await appendFieldToFormData({
			formData: formData,
			key: 'data',
			val: blob,
			mode: 'auto',
		});
		expect(formData.get('data')).toBeInstanceOf(Blob);
	});

	test('modo reference: añade "[Blob]"', async () => {
		const formData = new FormData();
		const blob = new Blob(['x']);
		await appendFieldToFormData({
			formData: formData,
			key: 'data',
			val: blob,
			mode: 'reference',
		});
		expect(formData.get('data')).toBe('[Blob]');
	});

	test('modo base64: añade data:URI', async () => {
		const formData = new FormData();
		const blob = new Blob(['hi'], { type: 'text/plain' });
		await appendFieldToFormData({
			formData: formData,
			key: 'data',
			val: blob,
			mode: 'base64',
		});
		const val = formData.get('data');
		expect(typeof val).toBe('string');
		expect((val as string).startsWith('data:')).toBe(true);
	});
});

describe('appendFieldToFormData — ArrayBuffer y TypedArray', () => {
	test('modo auto: convierte ArrayBuffer a Blob y añade', async () => {
		const formData = new FormData();
		const buf = new Uint8Array([1, 2, 3]).buffer;
		await appendFieldToFormData({
			formData: formData,
			key: 'bin',
			val: buf,
			mode: 'auto',
		});
		expect(formData.get('bin')).toBeInstanceOf(Blob);
	});

	test('modo reference: añade "[binary]"', async () => {
		const formData = new FormData();
		const buf = new Uint8Array([1, 2]).buffer;
		await appendFieldToFormData({
			formData: formData,
			key: 'bin',
			val: buf,
			mode: 'reference',
		});
		expect(formData.get('bin')).toBe('[binary]');
	});

	test('modo base64: convierte ArrayBuffer a data:URI', async () => {
		const formData = new FormData();
		const buf = new Uint8Array([65, 66, 67]).buffer;
		await appendFieldToFormData({
			formData: formData,
			key: 'bin',
			val: buf,
			mode: 'base64',
		});
		const val = formData.get('bin');
		expect(typeof val).toBe('string');
		expect((val as string).startsWith('data:')).toBe(true);
	});

	test('Uint8Array también funciona como ArrayBuffer view', async () => {
		const formData = new FormData();
		const arr = new Uint8Array([10, 20, 30]);
		await appendFieldToFormData({
			formData: formData,
			key: 'arr',
			val: arr,
			mode: 'auto',
		});
		expect(formData.get('arr')).toBeInstanceOf(Blob);
	});
});

// ---------------------------------------------------------------------------
// plainObjectToFormData
// ---------------------------------------------------------------------------

describe('plainObjectToFormData', () => {
	test('convierte objeto plano a FormData', async () => {
		const plain = { name: 'Alice', age: 30 };
		const formData = await plainObjectToFormData(plain);
		expect(formData.get('name')).toBe('Alice');
		expect(formData.get('age')).toBe('30');
	});

	test('omite campos null', async () => {
		const plain: Record<string, unknown> = { name: 'Bob', missing: null };
		const formData = await plainObjectToFormData(plain);
		expect(formData.get('name')).toBe('Bob');
		expect(formData.get('missing')).toBeNull();
	});

	test('spoofMethod inserta _method como primer campo', async () => {
		const plain = { data: 'value' };
		const formData = await plainObjectToFormData(plain, {
			spoofMethod: 'PUT',
		});
		const keys = Array.from(formData.keys());
		expect(keys[0]).toBe('_method');
		expect(formData.get('_method')).toBe('PUT');
	});

	test('sin spoofMethod no inserta _method', async () => {
		const plain = { data: 'value' };
		const formData = await plainObjectToFormData(plain);
		expect(formData.get('_method')).toBeNull();
	});

	test('override por campo toma precedencia sobre modo global', async () => {
		const file = new File(['x'], 'img.png');
		const plain: Record<string, unknown> = { avatar: file, name: 'Alice' };
		const formData = await plainObjectToFormData(plain, {
			fileMode: 'auto',
			fields: { avatar: 'reference' },
		});
		expect(formData.get('avatar')).toBe('img.png');
		expect(formData.get('name')).toBe('Alice');
	});

	test('FormData vacío si no hay propiedades', async () => {
		const formData = await plainObjectToFormData({});
		expect(Array.from(formData.keys())).toHaveLength(0);
	});
});
