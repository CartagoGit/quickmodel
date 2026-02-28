/**
 * TDD tests — fileMode en serialize()
 *
 * Propuesta G: FormData ↔ QModel
 * Tarea 2: `fileMode` en `IQSerializationOptions` — controla cómo se
 * serializan los campos `File`, `Blob`, `ArrayBuffer` y `TypedArray`.
 *
 *   'auto' / 'binary' (default) → POJO de metadatos (comportamiento actual)
 *   'reference'                  → string descriptivo (file.name / '[Blob]' / '[binary]')
 */

import { describe, test, expect } from 'bun:test';
import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';

// =========================================================================
// Modelos de prueba
// =========================================================================

interface IMediaDto {
	name: string;
	avatar: File | null;
	thumbnail: Blob | null;
	buffer: ArrayBuffer | null;
	bytes: Uint8Array | null;
}

@Quick(
	{
		name: String,
		avatar: File,
		thumbnail: Blob,
		buffer: ArrayBuffer,
		bytes: Uint8Array,
	},
	{ unknownPropertyPolicy: 'strip' }
)
class MediaDto extends QModel<IMediaDto> {
	declare name: string;
	declare avatar: File | null;
	declare thumbnail: Blob | null;
	declare buffer: ArrayBuffer | null;
	declare bytes: Uint8Array | null;
}

// =========================================================================
// Helpers
// =========================================================================

function makeFile(name = 'foto.jpg', type = 'image/jpeg', size = 1024): File {
	const buf = new Uint8Array(size).fill(0);
	return new File([buf], name, { type, lastModified: 1709123456000 });
}

function makeBlob(type = 'image/png', size = 512): Blob {
	const buf = new Uint8Array(size).fill(0);
	return new Blob([buf], { type });
}

// =========================================================================
// Tests — modo default ('auto' / 'binary')
// =========================================================================

describe('serialize fileMode: default (auto / binary) — comportamiento existente', () => {
	test('File se serializa como POJO de metadatos sin fileMode', () => {
		const dto = new MediaDto({
			name: 'test',
			avatar: makeFile(),
			thumbnail: null,
			buffer: null,
			bytes: null,
		});
		const result = dto.serialize();
		expect(result.avatar).toMatchObject({
			name: 'foto.jpg',
			size: 1024,
			type: 'image/jpeg',
			lastModified: 1709123456000,
		});
	});

	test('Blob se serializa como POJO de metadatos sin fileMode', () => {
		const dto = new MediaDto({
			name: 'test',
			avatar: null,
			thumbnail: makeBlob(),
			buffer: null,
			bytes: null,
		});
		const result = dto.serialize();
		expect(result.thumbnail).toMatchObject({
			size: 512,
			type: 'image/png',
			_blobRef: true,
		});
	});

	test("fileMode: 'binary' produce el mismo POJO de metadatos que el default", () => {
		const dto = new MediaDto({
			name: 'test',
			avatar: makeFile('doc.pdf', 'application/pdf', 2048),
			thumbnail: null,
			buffer: null,
			bytes: null,
		});
		const withBinary = dto.serialize({ fileMode: 'binary' });
		const withDefault = dto.serialize();
		expect(withBinary.avatar).toEqual(withDefault.avatar);
	});

	test("fileMode: 'auto' produce el mismo POJO de metadatos que el default", () => {
		const dto = new MediaDto({
			name: 'test',
			avatar: null,
			thumbnail: makeBlob('video/mp4', 4096),
			buffer: null,
			bytes: null,
		});
		const withAuto = dto.serialize({ fileMode: 'auto' });
		const withDefault = dto.serialize();
		expect(withAuto.thumbnail).toEqual(withDefault.thumbnail);
	});
});

// =========================================================================
// Tests — fileMode: 'reference'
// =========================================================================

describe("serialize fileMode: 'reference' — campos binarios como strings descriptivos", () => {
	test("File serializa como string con su nombre cuando fileMode: 'reference'", () => {
		const dto = new MediaDto({
			name: 'Alice',
			avatar: makeFile('profile.png', 'image/png', 204800),
			thumbnail: null,
			buffer: null,
			bytes: null,
		});
		const result = dto.serialize({ fileMode: 'reference' });
		expect(result.avatar).toBe('profile.png');
	});

	test("Blob serializa como '[Blob]' cuando fileMode: 'reference'", () => {
		const dto = new MediaDto({
			name: 'Alice',
			avatar: null,
			thumbnail: makeBlob(),
			buffer: null,
			bytes: null,
		});
		const result = dto.serialize({ fileMode: 'reference' });
		expect(result.thumbnail).toBe('[Blob]');
	});

	test("ArrayBuffer serializa como '[binary]' cuando fileMode: 'reference'", () => {
		const dto = new MediaDto({
			name: 'test',
			avatar: null,
			thumbnail: null,
			buffer: new ArrayBuffer(256),
			bytes: null,
		});
		const result = dto.serialize({ fileMode: 'reference' });
		expect(result.buffer).toBe('[binary]');
	});

	test("Uint8Array serializa como '[binary]' cuando fileMode: 'reference'", () => {
		const dto = new MediaDto({
			name: 'test',
			avatar: null,
			thumbnail: null,
			buffer: null,
			bytes: new Uint8Array([1, 2, 3, 4]),
		});
		const result = dto.serialize({ fileMode: 'reference' });
		expect(result.bytes).toBe('[binary]');
	});

	test("los campos primitivos no se ven afectados por fileMode: 'reference'", () => {
		const dto = new MediaDto({
			name: 'Alice',
			avatar: makeFile(),
			thumbnail: null,
			buffer: null,
			bytes: null,
		});
		const result = dto.serialize({ fileMode: 'reference' });
		expect(result.name).toBe('Alice');
	});

	test("fileMode: 'reference' convierte todos los campos binarios del modelo en una sola llamada", () => {
		const dto = new MediaDto({
			name: 'mixed',
			avatar: makeFile('img.jpg'),
			thumbnail: makeBlob(),
			buffer: new ArrayBuffer(8),
			bytes: new Uint8Array([0, 1]),
		});
		const result = dto.serialize({ fileMode: 'reference' });
		expect(result.avatar).toBe('img.jpg');
		expect(result.thumbnail).toBe('[Blob]');
		expect(result.buffer).toBe('[binary]');
		expect(result.bytes).toBe('[binary]');
		expect(result.name).toBe('mixed');
	});
});
