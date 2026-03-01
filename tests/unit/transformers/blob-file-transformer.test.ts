// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * Unit Tests: BlobTransformer + FileTransformer
 *
 * TDD — estos tests deben fallar hasta que se implemente la Capa 1 de la Propuesta G.
 *
 * Cubre:
 *  - BlobTransformer: serialize / deserialize / passthrough / edge cases
 *  - FileTransformer: serialize / deserialize / passthrough / edge cases
 *  - Registro en TransformerLookupService ('blob', 'file')
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import {
	BlobTransformer,
	FileTransformer,
} from '@/transformers/web-apis.transformer';

// =========================================================================
// Tipos de ayuda para serialización
// =========================================================================

interface IBlobSerialized {
	size: number;
	type: string;
	_blobRef: true;
}

interface IFileSerialized {
	name: string;
	size: number;
	type: string;
	lastModified: number;
}

// =========================================================================
// BlobTransformer — tests unitarios directos
// =========================================================================

describe('Unit: BlobTransformer', () => {
	const transformer = new BlobTransformer();
	const propKey = 'thumbnail';
	const cls = 'ArticleDto';

	// ---- deserialize ----

	test('passthrough: Blob instance queda como Blob', () => {
		const blob = new Blob(['hello'], { type: 'text/plain' });
		const result = transformer.deserialize(blob, propKey, cls);
		expect(result).toBeInstanceOf(Blob);
		// Bun puede añadir ;charset=utf-8 al tipo — verificamos solo el prefijo MIME
		expect(result?.type).toStartWith('text/plain');
	});

	test('null → null', () => {
		expect(transformer.deserialize(null, propKey, cls)).toBeNull();
	});

	test('undefined → null', () => {
		expect(transformer.deserialize(undefined, propKey, cls)).toBeNull();
	});

	test('ArrayBuffer → Blob', () => {
		const buf = new TextEncoder().encode('hola').buffer;
		const result = transformer.deserialize(buf, propKey, cls);
		expect(result).toBeInstanceOf(Blob);
		expect(result?.size).toBe(4);
	});

	test('Uint8Array → Blob', () => {
		const arr = new Uint8Array([104, 105]); // 'hi'
		const result = transformer.deserialize(arr, propKey, cls);
		expect(result).toBeInstanceOf(Blob);
		expect(result?.size).toBe(2);
	});

	test('string base64 "data:..." → Blob', () => {
		const base64 = 'data:text/plain;base64,aGVsbG8='; // 'hello'
		const result = transformer.deserialize(base64, propKey, cls);
		expect(result).toBeInstanceOf(Blob);
		// Bun puede añadir ;charset=utf-8 al tipo — verificamos solo el prefijo MIME
		expect(result?.type).toStartWith('text/plain');
	});

	test('string base64 sin prefijo data: lanza QModelError', () => {
		expect(() =>
			transformer.deserialize('not-base64-data', propKey, cls)
		).toThrow(/BlobTransformer/);
	});

	test('tipo no soportado (number) lanza QModelError', () => {
		expect(
			() =>
				transformer.deserialize(
					42 as unknown as ArrayBuffer,
					propKey,
					cls
				) // @quickmodel-rule-ignore: no-as-unknown
		).toThrow(/BlobTransformer/);
	});

	// ---- serialize ----

	test('Blob → IBlobSerialized con _blobRef: true', () => {
		const blob = new Blob(['world'], { type: 'text/html' });
		const serialized = transformer.serialize(blob) as IBlobSerialized;
		expect(serialized._blobRef).toBe(true);
		// Bun puede añadir ;charset=utf-8 al tipo
		expect(serialized.type).toStartWith('text/html');
		expect(serialized.size).toBe(5);
	});

	// ---- checkIntegrity ----

	test('checkIntegrity: Blob instance → válido', () => {
		const blob = new Blob([]);
		expect(
			transformer.checkIntegrity(blob, { propertyKey: propKey }).isValid
		).toBe(true);
	});

	test('checkIntegrity: IBlobSerialized → válido', () => {
		const serialized: IBlobSerialized = {
			size: 10,
			type: 'image/png',
			_blobRef: true,
		};
		expect(
			transformer.checkIntegrity(serialized, { propertyKey: propKey })
				.isValid
		).toBe(true);
	});

	test('checkIntegrity: string base64 → válido', () => {
		expect(
			transformer.checkIntegrity('data:image/png;base64,abc', {
				propertyKey: propKey,
			}).isValid
		).toBe(true);
	});

	test('checkIntegrity: number → inválido', () => {
		expect(
			transformer.checkIntegrity(99, { propertyKey: propKey }).isValid
		).toBe(false);
	});
});

// =========================================================================
// FileTransformer — tests unitarios directos
// =========================================================================

describe('Unit: FileTransformer', () => {
	const transformer = new FileTransformer();
	const propKey = 'avatar';
	const cls = 'ProfileDto';

	// ---- deserialize ----

	test('passthrough: File instance queda como File', () => {
		const file = new File(['content'], 'foto.jpg', { type: 'image/jpeg' });
		const result = transformer.deserialize(file, propKey, cls);
		expect(result).toBeInstanceOf(File);
		expect(result?.name).toBe('foto.jpg');
	});

	test('null → null', () => {
		expect(transformer.deserialize(null, propKey, cls)).toBeNull();
	});

	test('undefined → null', () => {
		expect(transformer.deserialize(undefined, propKey, cls)).toBeNull();
	});

	test('IFileSerialized POJO → File con metadatos correctos', () => {
		const serialized: IFileSerialized = {
			name: 'doc.pdf',
			size: 1024,
			type: 'application/pdf',
			lastModified: 1709123456000,
		};
		const result = transformer.deserialize(
			serialized,
			propKey,
			cls
		) as File;
		expect(result).toBeInstanceOf(File);
		expect(result.name).toBe('doc.pdf');
		expect(result.type).toBe('application/pdf');
		expect(result.lastModified).toBe(1709123456000);
	});

	test('IFileSerialized sin name lanza QModelError', () => {
		expect(() =>
			transformer.deserialize(
				{
					size: 100,
					type: 'image/png',
					lastModified: 0,
				} as unknown as IFileSerialized, // @quickmodel-rule-ignore: no-as-unknown
				propKey,
				cls
			)
		).toThrow(/FileTransformer/);
	});

	test('tipo no soportado (boolean) lanza QModelError', () => {
		expect(() =>
			transformer.deserialize(
				true as unknown as IFileSerialized, // @quickmodel-rule-ignore: no-as-unknown
				propKey,
				cls
			)
		).toThrow(/FileTransformer/);
	});

	// ---- serialize ----

	test('File → IFileSerialized con todos los campos', () => {
		const file = new File(['data'], 'imagen.png', {
			type: 'image/png',
			lastModified: 1700000000000,
		});
		const serialized = transformer.serialize(file) as IFileSerialized;
		expect(serialized.name).toBe('imagen.png');
		expect(serialized.type).toBe('image/png');
		expect(serialized.size).toBe(4);
		expect(serialized.lastModified).toBe(1700000000000);
	});

	// ---- checkIntegrity ----

	test('checkIntegrity: File instance → válido', () => {
		const file = new File([], 'test.txt');
		expect(
			transformer.checkIntegrity(file, { propertyKey: propKey }).isValid
		).toBe(true);
	});

	test('checkIntegrity: IFileSerialized → válido', () => {
		const serialized: IFileSerialized = {
			name: 'x.txt',
			size: 0,
			type: 'text/plain',
			lastModified: 0,
		};
		expect(
			transformer.checkIntegrity(serialized, { propertyKey: propKey })
				.isValid
		).toBe(true);
	});

	test('checkIntegrity: null → inválido', () => {
		expect(
			transformer.checkIntegrity(null, { propertyKey: propKey }).isValid
		).toBe(false);
	});
});

// =========================================================================
// Integración: aliases 'blob' y 'file' registrados en QModel
// =========================================================================

describe('Integración: alias "blob" y "file" en @Quick()', () => {
	interface IArticleDto {
		title: string;
		thumbnail: IBlobSerialized | null;
	}

	@Quick({ thumbnail: 'blob' })
	class ArticleDto extends QModel<IArticleDto> {
		declare title: string;
		declare thumbnail: Blob | null;
	}

	interface IProfileDto {
		username: string;
		avatar: IFileSerialized | null;
	}

	@Quick({ avatar: 'file' })
	class ProfileDto extends QModel<IProfileDto> {
		declare username: string;
		declare avatar: File | null;
	}

	test('ArticleDto hidrata Blob desde base64', () => {
		const dto = new ArticleDto({
			title: 'Post',
			thumbnail:
				'data:image/png;base64,aGVsbG8=' as unknown as IBlobSerialized, // @quickmodel-rule-ignore: no-as-unknown
		});
		expect(dto.thumbnail).toBeInstanceOf(Blob);
	});

	test('ArticleDto serializa Blob a IBlobSerialized', () => {
		const dto = new ArticleDto({
			title: 'Post',
			thumbnail:
				'data:image/png;base64,aGVsbG8=' as unknown as IBlobSerialized, // @quickmodel-rule-ignore: no-as-unknown
		});
		const serialized = dto.serialize();
		expect((serialized.thumbnail as IBlobSerialized)._blobRef).toBe(true);
	});

	test('ArticleDto null thumbnail → null en modelo y serialización', () => {
		const dto = new ArticleDto({ title: 'Empty', thumbnail: null });
		expect(dto.thumbnail).toBeNull();
		expect(dto.serialize().thumbnail).toBeNull();
	});

	test('ProfileDto hidrata File desde IFileSerialized', () => {
		const dto = new ProfileDto({
			username: 'alice',
			avatar: {
				name: 'foto.jpg',
				size: 2048,
				type: 'image/jpeg',
				lastModified: 1709123456000,
			},
		});
		expect(dto.avatar).toBeInstanceOf(File);
		expect((dto.avatar as File).name).toBe('foto.jpg');
	});

	test('ProfileDto serializa File a IFileSerialized', () => {
		const file = new File(['pixeles'], 'img.png', {
			type: 'image/png',
			lastModified: 1700000000000,
		});
		const dto = new ProfileDto({
			username: 'bob',
			avatar: file as unknown as IFileSerialized, // @quickmodel-rule-ignore: no-as-unknown
		});
		const serialized = dto.serialize();
		expect((serialized.avatar as IFileSerialized).name).toBe('img.png');
	});

	test('ProfileDto null avatar → null en modelo y serialización', () => {
		const dto = new ProfileDto({ username: 'carol', avatar: null });
		expect(dto.avatar).toBeNull();
		expect(dto.serialize().avatar).toBeNull();
	});
});

// =========================================================================
// Constructor de clase a partir del constructor global (Blob, File)
// =========================================================================

describe('Integración: constructor Blob/File en @Quick()', () => {
	interface IUploadDto {
		doc: IFileSerialized | null;
	}

	@Quick({ doc: File })
	class UploadDto extends QModel<IUploadDto> {
		declare doc: File | null;
	}

	test('deserialize throws on malformed data URI (missing comma separator)', () => {
		const transformer = new BlobTransformer();
		expect(() => {
			transformer.deserialize(
				'data:image/pngbase64NOCOMMA', // malformed — no comma
				'thumbnail',
				'ArticleDto'
			);
		}).toThrow(/malformed data URI/);
	});

	test('@Quick({ doc: File }) hidrata IFileSerialized en File', () => {
		const dto = new UploadDto({
			doc: {
				name: 'report.pdf',
				size: 512,
				type: 'application/pdf',
				lastModified: 0,
			},
		});
		expect(dto.doc).toBeInstanceOf(File);
	});

	test('@Quick({ doc: File }) serializa File a POJO', () => {
		const file = new File(['pdf'], 'report.pdf', {
			type: 'application/pdf',
		});
		const dto = new UploadDto({ doc: file as unknown as IFileSerialized }); // @quickmodel-rule-ignore: no-as-unknown
		const out = dto.serialize();
		expect(typeof (out.doc as IFileSerialized).name).toBe('string');
	});
});
