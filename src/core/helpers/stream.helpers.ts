/**
 * Streaming helpers for large binary fields in QModel instances.
 *
 * Implements Capa 4 from Propuesta G:
 * - `blobToReadableStream` — emits a Blob/File as a stream of `Uint8Array` chunks
 * - `streamToBlob` — accumulates a `ReadableStream<Uint8Array>` into a single `Blob`
 * - `pipeReadableToWritable` — pipes bytes from a `ReadableStream` to a `WritableStream`
 *
 * These are the low-level building blocks. The public API
 * (`QModel.$qToReadableStream`, `QModel.fromStream`, `QModel.pipeStream`) delegates here.
 *
 * @module core/helpers/stream.helpers
 * @see {@link QModel.$qToReadableStream} — public API for emitting a field as a stream
 * @see {@link QModel.fromStream} — public API for accumulating a stream into a field
 * @see {@link QModel.pipeStream} — public API for piping between streams
 */

/** Default chunk size: 256 KB */
const DEFAULT_CHUNK_SIZE = 256 * 1024;

/** Shared chunk-emission options used in both single-field and multipart modes. */
interface IStreamChunkOptions {
	/**
	 * Size of each emitted chunk in bytes.
	 * @default 262144 (256 KB)
	 */
	chunkSize?: number;

	/**
	 * Callback invoked after each binary chunk is emitted.
	 * @param chunk - The emitted chunk
	 * @param total - Total byte size of the source Blob/File
	 */
	onChunk?: (chunk: Uint8Array, total: number) => void;
}

/**
 * Options for `toReadableStream()` in single-field mode.
 *
 * Use when you need to stream a single Blob/File field as raw bytes.
 *
 * @public
 * @see {@link QModel.$qToReadableStream}
 * @see {@link IToReadableStreamMultipart} — multipart variant for streaming all fields
 */
export type IToReadableStreamSingleField = IStreamChunkOptions & {
	/** Name of the binary field to stream. Required in single-field mode. */
	field: string;
	multipart?: never;
	boundary?: never;
};

/**
 * Options for `toReadableStream()` in multipart mode.
 *
 * Use when you need to stream all model fields as a complete
 * `multipart/form-data` message (RFC 2046) without loading any binary
 * into memory all at once.
 *
 * The returned stream exposes a `boundary` property to build the
 * `Content-Type` header:
 * ```typescript
 * const stream = dto.toReadableStream({ multipart: true });
 * // Content-Type: multipart/form-data; boundary=${stream.boundary}
 * ```
 *
 * @public
 * @see {@link QModel.$qToReadableStream}
 * @see {@link IQMultipartStream}
 */
export type IToReadableStreamMultipart = IStreamChunkOptions & {
	/**
	 * When `true`, stream all fields as a full `multipart/form-data` message.
	 * `field` must not be provided in this mode.
	 */
	multipart: true;
	/**
	 * Custom boundary string. Auto-generated (32 hex chars) when omitted.
	 * Must not appear in any field value.
	 */
	boundary?: string;
	field?: never;
};

/**
 * Options for `toReadableStream()`.
 *
 * Discriminated union — provide either `field` (single-field raw stream)
 * or `multipart: true` (full `multipart/form-data` stream).
 *
 * @public
 * @see {@link IToReadableStreamSingleField} — single-field variant
 * @see {@link IToReadableStreamMultipart} — multipart variant
 */
export type IToReadableStreamOptions =
	| IToReadableStreamSingleField
	| IToReadableStreamMultipart;

/**
 * A `ReadableStream<Uint8Array>` that also carries the multipart boundary
 * string used to build the `Content-Type` header.
 *
 * @public
 * @see {@link modelToMultipartStream}
 * @see {@link IToReadableStreamMultipart} — options for multipart streaming
 */
export interface IQMultipartStream extends ReadableStream<Uint8Array> {
	/** The boundary token used to delimit parts in the multipart body. */
	readonly boundary: string;
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
 * @see {@link QModel.$qToReadableStream} — public API that delegates here
 * @see {@link IToReadableStreamOptions} — options passed from the public API
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
 * @see {@link streamToBlob} — function that consumes these options
 * @see {@link IFromStreamOptions} — higher-level options through QModel.fromStream
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
 * @see {@link QModel.fromStream} — public API that delegates here
 * @see {@link IStreamToBlobOptions} — accepted options
 * @see {@link pipeReadableToWritable} — zero-copy alternative when accumulation is not needed
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
// modelToMultipartStream
// ---------------------------------------------------------------------------

/**
 * Generates a random RFC 2046 boundary token (32 lowercase hex characters).
 *
 * @see {@link modelToMultipartStream} — the public function that calls this helper
 * @see {@link IQMultipartStream} — stream type that carries the generated boundary
 */
function generateBoundary(): string {
	const arr = new Uint8Array(16);
	crypto.getRandomValues(arr);
	return Array.from(arr, (byt) => byt.toString(16).padStart(2, '0')).join('');
}

/**
 * Async generator that yields RFC 2046 multipart/form-data parts for every
 * field in `values`.
 *
 * - Null / undefined fields are silently skipped.
 * - `File`/`Blob` fields whose `fileMode` is **not** `'reference'` are emitted
 *   as binary parts, streamed in chunks of `chunkSize` bytes.
 * - `File`/`Blob` fields whose `fileMode` is `'reference'` are emitted as
 *   a text part containing the filename (same behaviour as serialize).
 * - All other values are coerced to string and emitted as text parts.
 *
 * @see {@link modelToMultipartStream} — public function that drives this generator
 * @see {@link IBuildPartsConfig} — config object that parameterises this generator
 */
interface IBuildPartsConfig {
	values: Record<string, unknown>;
	fieldFileModes: Record<string, string> | null;
	boundary: string;
	chunkSize: number;
	onChunk: ((chunk: Uint8Array, total: number) => void) | undefined;
}
async function* buildMultipartParts(
	config: IBuildPartsConfig
): AsyncGenerator<Uint8Array> {
	const { values, fieldFileModes, boundary, chunkSize, onChunk } = config;
	const enc = new TextEncoder();
	const CRLF = '\r\n';

	for (const [key, val] of Object.entries(values)) {
		if (val === null || val === undefined) continue;

		const fileMode = fieldFileModes?.[key];

		if (val instanceof Blob && fileMode !== 'reference') {
			// Binary part — stream the Blob lazily
			const filename = val instanceof File ? val.name : 'blob';
			const mimeType = val.type || 'application/octet-stream';
			const header =
				`--${boundary}${CRLF}` +
				`Content-Disposition: form-data; name="${key}"; filename="${filename}"${CRLF}` +
				`Content-Type: ${mimeType}${CRLF}` +
				`${CRLF}`;
			yield enc.encode(header);

			const total = val.size;
			let offset = 0;
			while (offset < total) {
				const end = Math.min(offset + chunkSize, total);
				const slice = val.slice(offset, end);
				const buf = await slice.arrayBuffer();
				const chunk = new Uint8Array(buf);
				yield chunk;
				onChunk?.(chunk, total);
				offset = end;
			}

			yield enc.encode(CRLF);
		} else {
			// Text part — coerce to string (respects fileMode: 'reference')
			let strVal: string;
			if (val instanceof Blob) {
				// fileMode === 'reference'
				strVal = val instanceof File ? val.name : '[Blob]';
			} else {
				strVal = String(val);
			}

			const part =
				`--${boundary}${CRLF}` +
				`Content-Disposition: form-data; name="${key}"${CRLF}` +
				`${CRLF}` +
				`${strVal}${CRLF}`;
			yield enc.encode(part);
		}
	}

	yield enc.encode(`--${boundary}--${CRLF}`);
}

/**
 * Options for {@link modelToMultipartStream}.
 * @public
 * @see {@link modelToMultipartStream} — function that consumes these options
 * @see {@link IQMultipartStream} — the stream type returned after providing these options
 */
export interface IModelToMultipartStreamOptions {
	/** Plain record of field name → value. */
	values: Record<string, unknown>;
	/** Per-field fileMode from `@QType({ fileMode })` decorators, or null. */
	fieldFileModes: Record<string, string> | null;
	/** RFC 2046 boundary token. Auto-generated when omitted. */
	boundary?: string;
	/** Bytes per chunk for binary fields. @default 262144 */
	chunkSize?: number;
	/** Optional callback after each binary chunk. */
	onChunk?: (chunk: Uint8Array, total: number) => void;
}

/**
 * Creates a `multipart/form-data` `ReadableStream<Uint8Array>` from a plain
 * record of field values.
 *
 * Binary fields (`Blob`/`File`) are emitted lazily in chunks — they are never
 * fully loaded into memory at once. Text fields are inlined as-is.
 *
 * The returned stream has a `boundary` property that must be included in the
 * `Content-Type` header of the outgoing request:
 *
 * ```typescript
 * const stream = modelToMultipartStream({ values, fieldFileModes });
 * headers['Content-Type'] = `multipart/form-data; boundary=${stream.boundary}`;
 * ```
 *
 * @param opts - All configuration in a single object (see {@link IModelToMultipartStreamOptions})
 * @returns `IQMultipartStream` — `ReadableStream` augmented with `boundary`
 *
 * @public
 * @see {@link IModelToMultipartStreamOptions} — full options reference for this function
 * @see {@link IQMultipartStream} — the stream type returned, with `boundary` header helper
 */
export function modelToMultipartStream(
	opts: IModelToMultipartStreamOptions
): IQMultipartStream {
	const {
		values,
		fieldFileModes,
		boundary: rawBoundary,
		chunkSize = DEFAULT_CHUNK_SIZE,
		onChunk,
	} = opts;
	const boundary = rawBoundary ?? generateBoundary();
	const gen = buildMultipartParts({
		values,
		fieldFileModes,
		boundary,
		chunkSize,
		onChunk,
	});

	const stream = new ReadableStream<Uint8Array>({
		async pull(controller) {
			const { done, value } = await gen.next();
			if (done) {
				controller.close();
			} else {
				controller.enqueue(value);
			}
		},
	});

	return Object.assign(stream, { boundary }) as IQMultipartStream;
}

// ---------------------------------------------------------------------------
// pipeReadableToWritable
// ---------------------------------------------------------------------------

/**
 * Options for {@link pipeReadableToWritable}.
 * @see {@link pipeReadableToWritable} — function that consumes these options
 * @see {@link IPipeStreamOptions} — higher-level options through QModel.pipeStream
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
 * @see {@link QModel.pipeStream} — public API that delegates here
 * @see {@link streamToBlob} — accumulates all bytes instead of piping
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
