// @quickmodel-rule-ignore: prefer-quick — @QType({ fileMode }) is used intentionally here to test fileMode streaming behaviour; @Quick has no fileMode option
// @quickmodel-rule-ignore: no-as-unknown — test file intentionally passes wrong types to verify edge-case handling
/**
 * TDD tests — Tarea 5: toReadableStream({ multipart: true })
 *
 * Propuesta G — Capa 4: multipart/form-data streaming sin memoria completa.
 *
 * Fase inicial: 🔴 RED (deben fallar antes de la implementación)
 */

import { describe, test, expect } from 'bun:test';
import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';
import { QType } from '@/core/decorators/qtype.decorator';
import type { IFileSerialized } from '@/transformers/web-apis.transformer';

// =========================================================================
// Modelos de prueba
// =========================================================================

interface IUploadForm {
	title: string;
	tags: string;
	avatar: IFileSerialized | null;
}

@Quick({ title: String, tags: String, avatar: File })
class UploadForm extends QModel<IUploadForm> {
	declare title: string;
	declare tags: string;
	declare avatar: File | null;
}

interface ITextForm {
	nombre: string;
	edad: string;
}

@Quick({ nombre: String, edad: String })
class TextForm extends QModel<ITextForm> {
	declare nombre: string;
	declare edad: string;
}

interface IDecoratedForm {
	label: string;
	thumb: IFileSerialized | null;
}

// NOTE: @QType is intentional here — this model exists specifically to test
// how @QType({ fileMode: 'reference' }) affects multipart streaming.
// The rule "prefer @Quick in tests" applies to general model setup; tests
// that exercise @QType behaviour are an accepted exception (same as
// qtype-file-mode.test.ts).
@Quick({ label: String, thumb: File })
class DecoratedForm extends QModel<IDecoratedForm> {
	declare label: string;

	@QType(File, { fileMode: 'reference' })
	declare thumb: File | null;
}

// =========================================================================
// Helper: leer stream completo como string legible
// =========================================================================

async function readStreamAsText(
	stream: ReadableStream<Uint8Array>
): Promise<string> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}
	const total = chunks.reduce((acc, cur) => acc + cur.byteLength, 0);
	const merged = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(merged);
}

async function readStreamAsBytes(
	stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}
	const total = chunks.reduce((acc, cur) => acc + cur.byteLength, 0);
	const merged = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return merged;
}

// =========================================================================
// Bloque 1 — Propiedad boundary y tipo de retorno
// =========================================================================

describe('toReadableStream({ multipart: true }) — boundary y tipo de retorno', () => {
	test('devuelve un ReadableStream', () => {
		const dto = new TextForm({ nombre: 'Ana', edad: '30' });

		const stream = dto.$qToReadableStream({ multipart: true });

		expect(stream).toBeInstanceOf(ReadableStream);
	});

	test('el stream devuelto expone la propiedad boundary (string no vacío)', () => {
		const dto = new TextForm({ nombre: 'Ana', edad: '30' });

		const stream = dto.$qToReadableStream({ multipart: true });

		expect(
			typeof (stream as unknown as { boundary: string }).boundary // @quickmodel-rule-ignore: no-as-unknown
		).toBe('string');
		expect(
			(stream as unknown as { boundary: string }).boundary.length // @quickmodel-rule-ignore: no-as-unknown
		).toBeGreaterThan(0);
	});

	test('boundary personalizado se respeta', () => {
		const dto = new TextForm({ nombre: 'Ana', edad: '30' });
		const custom = 'mi-boundary-personalizado';

		const stream = dto.$qToReadableStream({
			multipart: true,
			boundary: custom,
		});

		expect((stream as unknown as { boundary: string }).boundary).toBe(
			// @quickmodel-rule-ignore: no-as-unknown
			custom
		);
	});

	test('multipart: true sin campo field no lanza error', () => {
		const dto = new TextForm({ nombre: 'Ana', edad: '30' });

		expect(() => dto.$qToReadableStream({ multipart: true })).not.toThrow();
	});

	test('sin multipart, field sigue siendo obligatorio y el comportamiento es el mismo', () => {
		const data = new Uint8Array([1, 2, 3]);
		const file = new File([data], 'x.bin', {
			type: 'application/octet-stream',
		});
		const dto = new UploadForm({
			title: 'test',
			tags: 'a',
			avatar: file as unknown as IFileSerialized, // @quickmodel-rule-ignore: no-as-unknown
		});

		const stream = dto.$qToReadableStream({ field: 'avatar' });

		expect(stream).toBeInstanceOf(ReadableStream);
		expect(
			(stream as unknown as { boundary?: string }).boundary // @quickmodel-rule-ignore: no-as-unknown
		).toBeUndefined();
	});
});

// =========================================================================
// Bloque 2 — Estructura del stream: partes de texto
// =========================================================================

describe('toReadableStream({ multipart: true }) — partes de texto', () => {
	test('el boundary aparece en el contenido del stream', async () => {
		const dto = new TextForm({ nombre: 'Ana', edad: '30' });
		const stream = dto.$qToReadableStream({ multipart: true });
		const boundary = (stream as unknown as { boundary: string }).boundary; // @quickmodel-rule-ignore: no-as-unknown

		const text = await readStreamAsText(stream);

		expect(text).toContain(`--${boundary}`);
	});

	test('el stream contiene el nombre de campo de texto en Content-Disposition', async () => {
		const dto = new TextForm({ nombre: 'Ana', edad: '30' });
		const stream = dto.$qToReadableStream({ multipart: true });

		const text = await readStreamAsText(stream);

		expect(text).toContain('Content-Disposition: form-data; name="nombre"');
	});

	test('el stream contiene el valor del campo de texto', async () => {
		const dto = new TextForm({ nombre: 'Beatriz', edad: '25' });
		const stream = dto.$qToReadableStream({ multipart: true });

		const text = await readStreamAsText(stream);

		expect(text).toContain('Beatriz');
		expect(text).toContain('25');
	});

	test('el stream finaliza con --boundary-- (cierre RFC 2046)', async () => {
		const dto = new TextForm({ nombre: 'Carlos', edad: '40' });
		const stream = dto.$qToReadableStream({ multipart: true });
		const boundary = (stream as unknown as { boundary: string }).boundary; // @quickmodel-rule-ignore: no-as-unknown

		const text = await readStreamAsText(stream);

		expect(text.trimEnd()).toEndWith(`--${boundary}--`);
	});

	test('todos los campos de texto están presentes en el stream', async () => {
		const dto = new TextForm({ nombre: 'Diana', edad: '22' });
		const stream = dto.$qToReadableStream({ multipart: true });

		const text = await readStreamAsText(stream);

		expect(text).toContain('name="nombre"');
		expect(text).toContain('name="edad"');
	});
});

// =========================================================================
// Bloque 3 — Partes binarias (File/Blob)
// =========================================================================

describe('toReadableStream({ multipart: true }) — partes binarias', () => {
	test('el stream incluye filename en Content-Disposition para campos File', async () => {
		const data = new Uint8Array([255, 216, 255]);
		const file = new File([data], 'foto.jpg', { type: 'image/jpeg' });
		const dto = new UploadForm({
			title: 'img-test',
			tags: 'foto',
			avatar: file as unknown as IFileSerialized, // @quickmodel-rule-ignore: no-as-unknown
		});

		const stream = dto.$qToReadableStream({ multipart: true });
		const text = await readStreamAsText(stream);

		expect(text).toContain('filename="foto.jpg"');
	});

	test('el stream incluye Content-Type para campos File', async () => {
		const data = new Uint8Array([1, 2, 3]);
		const file = new File([data], 'img.png', { type: 'image/png' });
		const dto = new UploadForm({
			title: 'png-test',
			tags: 'x',
			avatar: file as unknown as IFileSerialized, // @quickmodel-rule-ignore: no-as-unknown
		});

		const stream = dto.$qToReadableStream({ multipart: true });
		const text = await readStreamAsText(stream);

		expect(text).toContain('Content-Type: image/png');
	});

	test('los bytes del campo binario están presentes en el stream', async () => {
		const data = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
		const file = new File([data], 'data.bin', {
			type: 'application/octet-stream',
		});
		const dto = new UploadForm({
			title: 'bytes-test',
			tags: 'raw',
			avatar: file as unknown as IFileSerialized, // @quickmodel-rule-ignore: no-as-unknown
		});

		const stream = dto.$qToReadableStream({ multipart: true });
		const bytes = await readStreamAsBytes(stream);

		// Los bytes 0xDE 0xAD 0xBE 0xEF deben aparecer en el stream
		const haystack = bytes.join(',');
		const needle = data.join(',');
		expect(haystack).toContain(needle);
	});

	test('campo binario null se omite sin error', async () => {
		const dto = new UploadForm({
			title: 'sin-fichero',
			tags: 'x',
			avatar: null,
		});

		const stream = dto.$qToReadableStream({ multipart: true });
		const text = await readStreamAsText(stream);

		// El campo de texto sí aparece, la parte del campo binario null no
		expect(text).toContain('name="title"');
		expect(text).not.toContain('name="avatar"');
	});
});

// =========================================================================
// Bloque 4 — Respeto a @QType({ fileMode: 'reference' })
// =========================================================================

describe('toReadableStream({ multipart: true }) — respeto de @QType fileMode', () => {
	test('@QType({ fileMode: reference }) emite el filename como texto, no binario', async () => {
		const data = new Uint8Array([1, 2, 3]);
		const file = new File([data], 'thumb.webp', { type: 'image/webp' });
		const dto = new DecoratedForm({
			label: 'portada',
			thumb: file as unknown as IFileSerialized, // @quickmodel-rule-ignore: no-as-unknown
		});

		const stream = dto.$qToReadableStream({ multipart: true });
		const text = await readStreamAsText(stream);

		// En modo reference se emite el nombre, no datos binarios ni Content-Type de imagen
		expect(text).toContain('thumb.webp');
		expect(text).not.toContain('Content-Type: image/webp');
	});
});

// =========================================================================
// Bloque 5 — Round-trip con fromFormData
// =========================================================================

describe('toReadableStream({ multipart: true }) — round-trip', () => {
	test('el stream parseado con Request.formData() recupera los campos de texto', async () => {
		const dto = new TextForm({ nombre: 'Elena', edad: '35' });
		const stream = dto.$qToReadableStream({ multipart: true });
		const boundary = (stream as unknown as { boundary: string }).boundary; // @quickmodel-rule-ignore: no-as-unknown

		const req = new Request('http://localhost', {
			method: 'POST',
			headers: {
				'Content-Type': `multipart/form-data; boundary=${boundary}`,
			},
			body: stream,
		});

		const fmd = await req.formData();

		expect(fmd.get('nombre')).toBe('Elena');
		expect(fmd.get('edad')).toBe('35');
	});

	test('el stream parseado recupera los bytes del campo File', async () => {
		const data = new Uint8Array([10, 20, 30, 40]);
		const file = new File([data], 'upload.bin', {
			type: 'application/octet-stream',
		});
		const dto = new UploadForm({
			title: 'roundtrip',
			tags: 'test',
			avatar: file as unknown as IFileSerialized, // @quickmodel-rule-ignore: no-as-unknown
		});

		const stream = dto.$qToReadableStream({ multipart: true });
		const boundary = (stream as unknown as { boundary: string }).boundary; // @quickmodel-rule-ignore: no-as-unknown

		const req = new Request('http://localhost', {
			method: 'POST',
			headers: {
				'Content-Type': `multipart/form-data; boundary=${boundary}`,
			},
			body: stream,
		});

		const fmd = await req.formData();
		const recoveredFile = fmd.get('avatar') as File;

		expect(recoveredFile).toBeInstanceOf(File);
		const recovered = new Uint8Array(await recoveredFile.arrayBuffer());
		expect(recovered).toEqual(data);
	});
});
