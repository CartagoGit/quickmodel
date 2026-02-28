/**
 * TDD tests — Capa 4: toReadableStream(), fromStream(), pipeStream()
 *
 * Propuesta G: FormData ↔ QModel — Streaming
 *
 * Fase:  🔴 RED (estos tests deben fallar antes de la implementación)
 */

import { describe, test, expect } from 'bun:test';
import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';
import type { IFileSerialized } from '@/transformers/web-apis.transformer';

// =========================================================================
// Modelos de prueba
// =========================================================================

interface IVideoUpload {
	title: string;
	video: IFileSerialized | null;
}

@Quick({ title: String, video: File }, { unknownPropertyPolicy: 'strip' })
class VideoUpload extends QModel<IVideoUpload> {
	declare title: string;
	declare video: File | null;
}

// =========================================================================
// Helper: Read stream to Uint8Array
// =========================================================================

async function readStream(
	stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}
	const total = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
	const result = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return result;
}

// =========================================================================
// toReadableStream — campo con objeto File/Blob
// =========================================================================

describe('toReadableStream: genera stream desde campo File/Blob', () => {
	test('Returns a ReadableStream', () => {
		const data = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
		const file = new File([data], 'video.mp4', { type: 'video/mp4' });
		const dto = new VideoUpload({
			title: 'test',
			video: file as unknown as IFileSerialized,
		});

		const stream = dto.toReadableStream({ field: 'video' });

		expect(stream).toBeInstanceOf(ReadableStream);
	});

	test('Stream emite todos los bytes del campo', async () => {
		const data = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
		const file = new File([data], 'video.mp4', { type: 'video/mp4' });
		const dto = new VideoUpload({
			title: 'test',
			video: file as unknown as IFileSerialized,
		});

		const stream = dto.toReadableStream({ field: 'video' });
		const result = await readStream(stream);

		expect(result).toEqual(data);
	});

	test('Stream con chunkSize emite en chunks del tamaño correcto', async () => {
		const data = new Uint8Array(100).fill(42); // 100 bytes de 0x2A
		const file = new File([data], 'data.bin', {
			type: 'application/octet-stream',
		});
		const dto = new VideoUpload({
			title: 'test',
			video: file as unknown as IFileSerialized,
		});

		const receivedChunks: Uint8Array[] = [];
		const stream = dto.toReadableStream({
			field: 'video',
			chunkSize: 30, // 30 bytes por chunk → 4 chunks (30+30+30+10)
			onChunk: (chunk) => {
				receivedChunks.push(chunk);
			},
		});

		await readStream(stream);

		// Con 100 bytes y chunks de 30: 4 chunks (30,30,30,10)
		expect(receivedChunks.length).toBeGreaterThanOrEqual(3);
	});

	test('onChunk recibe el total correcto', async () => {
		const data = new Uint8Array(50).fill(1);
		const file = new File([data], 'test.bin');
		const dto = new VideoUpload({
			title: 'test',
			video: file as unknown as IFileSerialized,
		});

		let capturedTotal = 0;
		const stream = dto.toReadableStream({
			field: 'video',
			onChunk: (_, total) => {
				capturedTotal = total;
			},
		});

		await readStream(stream);

		expect(capturedTotal).toBe(50);
	});

	test('campo null → lanza error', () => {
		const dto = new VideoUpload({ title: 'no-video', video: null });

		expect(() => dto.toReadableStream({ field: 'video' })).toThrow();
	});

	test('campo inexistente → lanza error', () => {
		const file = new File(['bytes'], 'x.bin');
		const dto = new VideoUpload({
			title: 'test',
			video: file as unknown as IFileSerialized,
		});

		expect(() =>
			dto.toReadableStream({ field: 'nonExistentField' as 'video' })
		).toThrow();
	});
});

// =========================================================================
// fromStream — acumula chunks en campo del modelo
// =========================================================================

describe('fromStream: acumula ReadableStream en un campo', () => {
	test('devuelve instancia del modelo con campo como Blob', async () => {
		const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(data);
				controller.close();
			},
		});

		const dto = await VideoUpload.fromStream(stream, { field: 'video' });

		expect(dto).toBeInstanceOf(VideoUpload);
		expect(dto.video).toBeInstanceOf(Blob);
	});

	test('Blob acumulado tiene los bytes correctos', async () => {
		const data = new Uint8Array([1, 2, 3, 4, 5]);
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(data);
				controller.close();
			},
		});

		const dto = await VideoUpload.fromStream(stream, { field: 'video' });
		const blob = dto.video as Blob;
		const buffer = await blob.arrayBuffer();
		const result = new Uint8Array(buffer);

		expect(result).toEqual(data);
	});

	test('múltiples chunks se concatenan correctamente', async () => {
		const chunk1 = new Uint8Array([1, 2, 3]);
		const chunk2 = new Uint8Array([4, 5, 6]);
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(chunk1);
				controller.enqueue(chunk2);
				controller.close();
			},
		});

		const dto = await VideoUpload.fromStream(stream, { field: 'video' });
		const blob = dto.video as Blob;
		const buffer = await blob.arrayBuffer();
		const result = new Uint8Array(buffer);

		expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
	});

	test('maxBytes: lanza error si se supera el límite', async () => {
		const bigData = new Uint8Array(100).fill(255);
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(bigData);
				controller.close();
			},
		});

		// eslint-disable-next-line @typescript-eslint/await-thenable
		await expect(
			VideoUpload.fromStream(stream, { field: 'video', maxBytes: 50 })
		).rejects.toThrow();
	});

	test('onProgress callback se invoca con bytes recibidos', async () => {
		const data = new Uint8Array(30).fill(7);
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(data);
				controller.close();
			},
		});

		let lastReceived = 0;
		await VideoUpload.fromStream(stream, {
			field: 'video',
			onProgress: (received) => {
				lastReceived = received;
			},
		});

		expect(lastReceived).toBe(30);
	});
});

// =========================================================================
// pipeStream — conecta ReadableStream con WritableStream
// =========================================================================

describe('pipeStream: conecta src ReadableStream con dst WritableStream', () => {
	test('todos los bytes se transfieren al destino', async () => {
		const data = new Uint8Array([10, 20, 30, 40, 50]);
		const src = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(data);
				controller.close();
			},
		});

		const received: Uint8Array[] = [];
		const dst = new WritableStream<Uint8Array>({
			write(chunk) {
				received.push(chunk);
			},
		});

		await VideoUpload.pipeStream(src, dst);

		const combined = new Uint8Array(
			received.reduce((acc, chunk) => acc + chunk.byteLength, 0)
		);
		let offset = 0;
		for (const chunk of received) {
			combined.set(chunk, offset);
			offset += chunk.byteLength;
		}

		expect(combined).toEqual(data);
	});

	test('maxBytes: lanza error si se supera el límite', async () => {
		const bigData = new Uint8Array(200).fill(1);
		const src = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(bigData);
				controller.close();
			},
		});

		const dst = new WritableStream<Uint8Array>({
			write() {},
		});

		// eslint-disable-next-line @typescript-eslint/await-thenable
		await expect(
			VideoUpload.pipeStream(src, dst, { maxBytes: 100 })
		).rejects.toThrow();
	});

	test('onProgress se invoca con bytes transferidos', async () => {
		const data = new Uint8Array(40).fill(3);
		const src = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(data);
				controller.close();
			},
		});

		const dst = new WritableStream<Uint8Array>({
			write() {},
		});

		let lastBytes = 0;
		await VideoUpload.pipeStream(src, dst, {
			onProgress: (bytes) => {
				lastBytes = bytes;
			},
		});

		expect(lastBytes).toBe(40);
	});
});
