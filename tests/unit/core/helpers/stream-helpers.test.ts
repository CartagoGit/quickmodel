/**
 * Pruebas unitarias directas para stream.helpers.ts
 *
 * Prueba: blobToReadableStream, streamToBlob, pipeReadableToWritable,
 *         modelToMultipartStream — incluyendo callbacks, límites y edge cases.
 *
 * @see {@link blobToReadableStream}
 * @see {@link streamToBlob}
 * @see {@link pipeReadableToWritable}
 * @see {@link modelToMultipartStream}
 */
import { describe, test, expect } from 'bun:test';
import {
	blobToReadableStream,
	streamToBlob,
	pipeReadableToWritable,
	modelToMultipartStream,
} from '@/core/helpers/stream.helpers';

// ---------------------------------------------------------------------------
// Helpers de test
// ---------------------------------------------------------------------------

/** Crea un ReadableStream desde un array de Uint8Arrays */
function makeStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
	let idx = 0;
	return new ReadableStream<Uint8Array>({
		pull(controller) {
			if (idx >= chunks.length) {
				controller.close();
				return;
			}
			controller.enqueue(chunks[idx++]);
		},
	});
}

/** Acumula todos los bytes de un ReadableStream en un Uint8Array */
async function collectStream(
	stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
	const reader = stream.getReader();
	const parts: Uint8Array[] = [];
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		parts.push(value);
	}
	reader.releaseLock();
	const total = parts.reduce((acc, len) => acc + len.length, 0);
	const result = new Uint8Array(total);
	let offset = 0;
	for (const part of parts) {
		result.set(part, offset);
		offset += part.length;
	}
	return result;
}

// ---------------------------------------------------------------------------
// blobToReadableStream
// ---------------------------------------------------------------------------

describe('blobToReadableStream', () => {
	test('transforma un Blob pequeño en un stream con todos los bytes', async () => {
		const data = new Uint8Array([1, 2, 3, 4, 5]);
		const blob = new Blob([data]);
		const stream = blobToReadableStream(blob);
		const result = await collectStream(stream);

		expect(result).toEqual(data);
	});

	test('Blob vacío produce stream cerrado inmediatamente', async () => {
		const blob = new Blob([]);
		const stream = blobToReadableStream(blob);
		const result = await collectStream(stream);
		expect(result.length).toBe(0);
	});

	test('stream con chunkSize pequeño divide en múltiples chunks', async () => {
		const data = new Uint8Array(10).fill(42);
		const blob = new Blob([data]);
		const chunks: Uint8Array[] = [];

		const stream = blobToReadableStream(blob, 3, (chunk) =>
			chunks.push(chunk)
		);
		await collectStream(stream);

		// Con chunkSize=3 y 10 bytes: chunks de 3,3,3,1 → 4 callbacks
		expect(chunks.length).toBe(4);
		expect(chunks[0].length).toBe(3);
		expect(chunks[chunks.length - 1].length).toBe(1);
	});

	test('onChunk callback recibe el total correcto', async () => {
		const data = new Uint8Array(20).fill(99);
		const blob = new Blob([data]);
		const totals: number[] = [];

		const stream = blobToReadableStream(blob, 10, (_chunk, total) =>
			totals.push(total)
		);
		await collectStream(stream);

		expect(totals).toHaveLength(2);
		expect(totals[0]).toBe(20);
		expect(totals[1]).toBe(20);
	});

	test('el stream sin onChunk no falla', async () => {
		const blob = new Blob([new Uint8Array([7, 8, 9])]);
		const stream = blobToReadableStream(blob);
		const result = await collectStream(stream);
		expect(result.length).toBe(3);
	});

	test('File también funciona (File extiende Blob)', async () => {
		const file = new File(['hello world'], 'test.txt', {
			type: 'text/plain',
		});
		const stream = blobToReadableStream(file);
		const result = await collectStream(stream);
		const text = new TextDecoder().decode(result);
		expect(text).toBe('hello world');
	});
});

// ---------------------------------------------------------------------------
// streamToBlob
// ---------------------------------------------------------------------------

describe('streamToBlob', () => {
	test('acumula chunks en un solo Blob', async () => {
		const data = new Uint8Array([10, 20, 30]);
		const stream = makeStream([data]);
		const blob = await streamToBlob(stream);

		expect(blob).toBeInstanceOf(Blob);
		expect(blob.size).toBe(3);
	});

	test('Blob resultante tiene el mimeType especificado', async () => {
		const stream = makeStream([new Uint8Array([1])]);
		const blob = await streamToBlob(stream, { mimeType: 'image/png' });
		expect(blob.type).toBe('image/png');
	});

	test('mimeType por defecto es application/octet-stream', async () => {
		const stream = makeStream([new Uint8Array([1])]);
		const blob = await streamToBlob(stream);
		expect(blob.type).toBe('application/octet-stream');
	});

	test('stream vacío produce Blob de tamaño 0', async () => {
		const stream = makeStream([]);
		const blob = await streamToBlob(stream);
		expect(blob.size).toBe(0);
	});

	test('lanza RangeError si se supera maxBytes', async () => {
		const data = new Uint8Array(10).fill(1);
		const stream = makeStream([data]);

		// eslint-disable-next-line @typescript-eslint/await-thenable
		await expect(streamToBlob(stream, { maxBytes: 5 })).rejects.toThrow(
			RangeError
		);
	});

	test('onProgress callback se llama con bytes acumulados', async () => {
		const chunk1 = new Uint8Array(4).fill(1);
		const chunk2 = new Uint8Array(4).fill(2);
		const stream = makeStream([chunk1, chunk2]);
		const progress: number[] = [];

		await streamToBlob(stream, {
			onProgress: (received) => progress.push(received),
		});

		expect(progress).toEqual([4, 8]);
	});

	test('acumula múltiples chunks correctamente', async () => {
		const chunks = [
			new Uint8Array([1, 2]),
			new Uint8Array([3, 4]),
			new Uint8Array([5]),
		];
		const stream = makeStream(chunks);
		const blob = await streamToBlob(stream);
		const buf = await blob.arrayBuffer();
		const result = new Uint8Array(buf);
		expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
	});
});

// ---------------------------------------------------------------------------
// pipeReadableToWritable
// ---------------------------------------------------------------------------

describe('pipeReadableToWritable', () => {
	test('transfiere todos los bytes de src a dst', async () => {
		const data = new Uint8Array([10, 20, 30, 40]);
		const src = makeStream([data]);
		const received: Uint8Array[] = [];
		const dst = new WritableStream<Uint8Array>({
			write(chunk) {
				received.push(chunk);
			},
		});

		await pipeReadableToWritable(src, dst);

		const total = received.reduce((sum, chunk) => sum + chunk.length, 0);
		expect(total).toBe(4);
	});

	test('lanza RangeError si se supera maxBytes', async () => {
		const data = new Uint8Array(10).fill(7);
		const src = makeStream([data]);
		const dst = new WritableStream<Uint8Array>({
			write() {},
		});

		// eslint-disable-next-line @typescript-eslint/await-thenable
		await expect(
			pipeReadableToWritable(src, dst, { maxBytes: 5 })
		).rejects.toThrow(RangeError);
	});

	test('onProgress se llama con bytes acumulados', async () => {
		const chunks = [new Uint8Array(3), new Uint8Array(3)];
		const src = makeStream(chunks);
		const progress: number[] = [];
		const dst = new WritableStream<Uint8Array>({ write() {} });

		await pipeReadableToWritable(src, dst, {
			onProgress: (bytes) => progress.push(bytes),
		});

		expect(progress).toEqual([3, 6]);
	});

	test('stream vacío termina sin escrituras', async () => {
		const src = makeStream([]);
		let writeCount = 0;
		const dst = new WritableStream<Uint8Array>({
			write() {
				writeCount++;
			},
		});

		await pipeReadableToWritable(src, dst);
		expect(writeCount).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// modelToMultipartStream
// ---------------------------------------------------------------------------

describe('modelToMultipartStream', () => {
	test('devuelve un stream con propiedad boundary', () => {
		const stream = modelToMultipartStream({
			values: { name: 'Alice' },
			fieldFileModes: null,
		});
		expect(typeof stream.boundary).toBe('string');
		expect(stream.boundary.length).toBeGreaterThan(0);
	});

	test('permite especificar un boundary personalizado', () => {
		const stream = modelToMultipartStream({
			values: { name: 'Bob' },
			fieldFileModes: null,
			boundary: 'my-boundary-123',
		});
		expect(stream.boundary).toBe('my-boundary-123');
	});

	test('genera un stream con el delimitador multipart correcto', async () => {
		const stream = modelToMultipartStream({
			values: { name: 'Alice' },
			fieldFileModes: null,
			boundary: 'testboundary',
		});

		const result = await collectStream(stream);
		const text = new TextDecoder().decode(result);

		expect(text).toContain('--testboundary');
		expect(text).toContain('--testboundary--');
		expect(text).toContain('name="name"');
		expect(text).toContain('Alice');
	});

	test('incluye campos de texto como partes del multipart', async () => {
		const stream = modelToMultipartStream({
			values: { username: 'testuser', age: 25 },
			fieldFileModes: null,
			boundary: 'boundary001',
		});

		const result = await collectStream(stream);
		const text = new TextDecoder().decode(result);

		expect(text).toContain('testuser');
		expect(text).toContain('25');
	});

	test('omite campos null y undefined', async () => {
		const stream = modelToMultipartStream({
			values: { present: 'yes', missing: null, absent: undefined },
			fieldFileModes: null,
			boundary: 'bnd',
		});

		const result = await collectStream(stream);
		const text = new TextDecoder().decode(result);

		expect(text).toContain('yes');
		expect(text).not.toContain('missing');
		expect(text).not.toContain('absent');
	});

	test('Blob se incluye como parte binaria con Content-Type', async () => {
		const blob = new Blob(['binary data'], {
			type: 'application/octet-stream',
		});
		const stream = modelToMultipartStream({
			values: { file: blob },
			fieldFileModes: null,
			boundary: 'binbnd',
		});

		const result = await collectStream(stream);
		const text = new TextDecoder().decode(result);

		expect(text).toContain('Content-Type: application/octet-stream');
		expect(text).toContain('binary data');
	});

	test('File con fileMode reference se incluye como nombre', async () => {
		const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
		const stream = modelToMultipartStream({
			values: { photo: file },
			fieldFileModes: { photo: 'reference' },
			boundary: 'refbnd',
		});

		const result = await collectStream(stream);
		const text = new TextDecoder().decode(result);

		expect(text).toContain('photo.jpg');
		expect(text).not.toContain('Content-Type: image/jpeg');
	});

	test('onChunk callback se llama para partes binarias', async () => {
		const data = new Uint8Array(6).fill(99);
		const blob = new Blob([data]);
		const chunkCalls: number[] = [];

		const stream = modelToMultipartStream({
			values: { bin: blob },
			fieldFileModes: null,
			boundary: 'cbnd',
			chunkSize: 3,
			onChunk: (chunk) => chunkCalls.push(chunk.length),
		});

		await collectStream(stream);

		// 6 bytes con chunkSize=3 → 2 chunks
		expect(chunkCalls.length).toBe(2);
	});

	test('object vacío genera solo el delimitador de cierre', async () => {
		const stream = modelToMultipartStream({
			values: {},
			fieldFileModes: null,
			boundary: 'emptybnd',
		});

		const result = await collectStream(stream);
		const text = new TextDecoder().decode(result);

		expect(text).toBe('--emptybnd--\r\n');
	});
});
