/**
 * Streaming helpers for large binary fields in QModel instances.
 *
 * Implements Capa 4 from Propuesta G:
 * - `blobToReadableStream` — emits a Blob/File as a stream of `Uint8Array` chunks
 * - `streamToBlob` — accumulates a `ReadableStream<Uint8Array>` into a single `Blob`
 * - `pipeReadableToWritable` — pipes bytes from a `ReadableStream` to a `WritableStream`
 *
 * These are the low-level building blocks. The public API
 * (`QModel.toReadableStream`, `QModel.fromStream`, `QModel.pipeStream`) delegates here.
 *
 * @module core/helpers/stream.helpers
 */

/** Default chunk size: 256 KB */
const DEFAULT_CHUNK_SIZE = 256 * 1024;

/**
 * Options for `toReadableStream()`.
 * @public
 * @see {@link QModel.toReadableStream} — public API that uses these options
 * @see {@link blobToReadableStream} — underlying implementation
 */
export interface IToReadableStreamOptions {
	/**
	 * Name of the field containing the binary value (Blob or File).
	 * Required when called from `QModel.toReadableStream()`.
	 */
	field: string;

	/**
	 * Size of each emitted chunk in bytes.
	 * @default 262144 (256 KB)
	 */
	chunkSize?: number;

	/**
	 * Callback invoked after each chunk is emitted.
	 * @param chunk - The emitted chunk
	 * @param total - Total byte size of the source
	 */
	onChunk?: (chunk: Uint8Array, total: number) => void;
}

/**
 * Options for `fromStream()`.
 * @public
 * @see {@link QModel.fromStream} — public API that uses these options
 * @see {@link streamToBlob} — underlying implementation
 */
export interface IFromStreamOptions {
	/**
	 * Name of the field where the accumulated Blob will be stored.
	 */
	field: string;

	/**
	 * Maximum number of bytes to accept. Throws if exceeded.
	 * @default Infinity (no limit)
	 */
	maxBytes?: number;

	/**
	 * Callback invoked after each chunk is received.
	 * @param received - Total bytes received so far
	 * @param total    - Declared total size (may be 0 if unknown)
	 */
	onProgress?: (received: number, total: number) => void;
}

/**
 * Options for `pipeStream()`.
 * @public
 * @see {@link QModel.pipeStream} — public API that uses these options
 * @see {@link pipeReadableToWritable} — underlying implementation
 */
export interface IPipeStreamOptions {
	/**
	 * Maximum number of bytes to pipe. Throws if exceeded.
	 * @default Infinity (no limit)
	 */
	maxBytes?: number;

	/**
	 * Callback invoked after each chunk is transferred.
	 * @param bytes - Total bytes transferred so far
	 */
	onProgress?: (bytes: number) => void;
}

// ---------------------------------------------------------------------------
// blobToReadableStream
// ---------------------------------------------------------------------------

/**
 * Creates a `ReadableStream<Uint8Array>` from a Blob or File.
 *
 * The Blob is sliced lazily into chunks — it is never fully loaded into memory
 * before it needs to be emitted (though individual chunk `arrayBuffer()` calls
 * do allocate each chunk).
 *
 * @param blob      - Source Blob or File
 * @param chunkSize - Size of each emitted chunk in bytes (default: 256 KB)
 * @param onChunk   - Optional callback after each chunk is enqueued
 * @returns `ReadableStream<Uint8Array>`
 */
export function blobToReadableStream(
	blob: Blob,
	chunkSize = DEFAULT_CHUNK_SIZE,
	onChunk?: (chunk: Uint8Array, total: number) => void
): ReadableStream<Uint8Array> {
	const total = blob.size;
	let offset = 0;

	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			if (offset >= total) {
				controller.close();
				return;
			}

			const end = Math.min(offset + chunkSize, total);
			const slice = blob.slice(offset, end);
			const buffer = await slice.arrayBuffer();
			const chunk = new Uint8Array(buffer);

			controller.enqueue(chunk);
			onChunk?.(chunk, total);
			offset = end;
		},
	});
}

// ---------------------------------------------------------------------------
// streamToBlob
// ---------------------------------------------------------------------------

/**
 * Options for {@link streamToBlob}.
 */
export interface IStreamToBlobOptions {
	/** Optional byte limit; throws `RangeError` if exceeded. Default: `Infinity`. */
	maxBytes?: number;
	/** Called after each chunk with `(bytesReceived, 0)`. Total is unknown in a generic stream. */
	onProgress?: (received: number, total: number) => void;
	/** MIME type for the resulting Blob. Default: `'application/octet-stream'`. */
	mimeType?: string;
}

/**
 * Accumulates all chunks from a `ReadableStream<Uint8Array>` into a single `Blob`.
 *
 * @param stream  - Source stream
 * @param options - Optional byte limit, progress callback, and MIME type
 * @returns `Promise<Blob>`
 * @throws {RangeError} If `options.maxBytes` is exceeded
 */
export async function streamToBlob(
	stream: ReadableStream<Uint8Array>,
	options: IStreamToBlobOptions = {}
): Promise<Blob> {
	const {
		maxBytes = Infinity,
		onProgress,
		mimeType = 'application/octet-stream',
	} = options;
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	let received = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			received += value.byteLength;
			if (received > maxBytes) {
				reader.cancel().catch(() => undefined);
				throw new RangeError(
					`Stream exceeded maxBytes limit of ${maxBytes} bytes (received ${received})`
				);
			}

			chunks.push(value);
			onProgress?.(received, 0); // total unknown in generic stream
		}
	} finally {
		reader.releaseLock();
	}

	return new Blob(chunks as BlobPart[], { type: mimeType });
}

// ---------------------------------------------------------------------------
// pipeReadableToWritable
// ---------------------------------------------------------------------------

/**
 * Options for {@link pipeReadableToWritable}.
 */
export interface IPipeReadableToWritableOptions {
	/** Optional byte limit; throws `RangeError` if exceeded. Default: `Infinity`. */
	maxBytes?: number;
	/** Called after each chunk with the running byte total. */
	onProgress?: (bytes: number) => void;
}

/**
 * Pipes all bytes from a `ReadableStream<Uint8Array>` to a `WritableStream<Uint8Array>`.
 *
 * Acts as a zero-copy conduit: bytes flow through without accumulation.
 *
 * @param src     - Source stream
 * @param dst     - Destination stream
 * @param options - Optional byte limit and progress callback
 * @throws {RangeError} If `options.maxBytes` is exceeded
 */
export async function pipeReadableToWritable(
	src: ReadableStream<Uint8Array>,
	dst: WritableStream<Uint8Array>,
	options: IPipeReadableToWritableOptions = {}
): Promise<void> {
	const { maxBytes = Infinity, onProgress } = options;
	const reader = src.getReader();
	const writer = dst.getWriter();
	let total = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			total += value.byteLength;
			if (total > maxBytes) {
				reader.cancel().catch(() => undefined);
				writer
					.abort(
						new RangeError(
							`Stream exceeded maxBytes limit of ${maxBytes} bytes`
						)
					)
					.catch(() => undefined);
				throw new RangeError(
					`Stream exceeded maxBytes limit of ${maxBytes} bytes (transferred ${total})`
				);
			}

			await writer.write(value);
			onProgress?.(total);
		}

		await writer.close();
	} finally {
		reader.releaseLock();
		writer.releaseLock();
	}
}
