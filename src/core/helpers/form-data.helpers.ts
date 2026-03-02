/// <reference lib="dom" />
/**
 * Helpers for converting FormData ↔ QModel instances.
 *
 * Implements the auto-detection tree from Propuesta G (Capa 2/3):
 *
 * ```
 * ¿Qué hay en el campo?
 * ├── File instance             → preservar como File
 * ├── Blob instance             → preservar como Blob
 * ├── ArrayBuffer / Uint8Array  → wrap en Blob
 * ├── string "data:..."         → decodificar base64 → Blob
 * ├── string "https://..."      → URL reference (string)
 * ├── string "/storage/..."     → path reference (string)
 * └── string                   → string as-is
 * ```
 *
 * @module core/helpers/form-data.helpers
 * @see {@link QModel.fromFormData} — public API that uses `formDataToPlainObject`
 * @see {@link QModel.$qToFormData} — public API that uses `plainObjectToFormData`
 * @see {@link IFileSourceMode} — available binary-field source modes
 */

/**
 * Mode for interpreting binary fields when reading from FormData.
 * @public
 * @see {@link IFromFormDataOptions} — used by formDataToPlainObject
 * @see {@link resolveFormDataValue} — applies this mode per entry
 */
export type IFileSourceMode = 'auto' | 'binary' | 'reference' | 'base64';

/**
 * Mode for writing binary fields into a FormData.
 * @public
 * @see {@link IToFormDataOptions} — used by plainObjectToFormData
 * @see {@link appendFieldToFormData} — applies this mode per field
 */
export type IFileModeOutput = 'auto' | 'binary' | 'reference' | 'base64';

/**
 * Options for `fromFormData()`.
 * @public
 * @see {@link IFileSourceMode} — available binary-field source modes
 * @see {@link formDataToPlainObject} — function that consumes these options
 */
export interface IFromFormDataOptions {
	/**
	 * Global strategy for binary fields.
	 * @default 'auto'
	 */
	fileSource?: IFileSourceMode;
	/**
	 * Per-field override. Takes precedence over `fileSource`.
	 */
	fields?: Record<string, IFileSourceMode>;
}

/**
 * Options for `toFormData()`.
 * @public
 * @see {@link IFileModeOutput} — available binary-field output modes
 * @see {@link plainObjectToFormData} — function that consumes these options
 */
export interface IToFormDataOptions {
	/**
	 * How to encode binary fields (File, Blob, ArrayBuffer, Uint8Array).
	 * @default 'auto'
	 */
	fileMode?: IFileModeOutput;
	/**
	 * Per-field override. Takes precedence over `fileMode`.
	 */
	fields?: Record<string, IFileModeOutput>;
	/**
	 * When set, inserts a `_method` field as the **first** entry in the
	 * resulting `FormData`. Used for HTTP method spoofing with backends
	 * (Laravel, Symfony, Rails) that only support `POST` in multipart forms.
	 *
	 * Resolved via cascade in `toFormData()` — this field carries the
	 * already-resolved value from `QConfig.defaults` → decorator → call option.
	 */
	spoofMethod?: string;
}

// ---------------------------------------------------------------------------
// Helpers internos — auto-detección
// ---------------------------------------------------------------------------

/** Returns true if value is a data:URI string */
function isDataUri(val: unknown): val is string {
	return typeof val === 'string' && val.startsWith('data:');
}

/** Returns true if value is a URL-like string (http/https) */
function isUrlString(val: unknown): val is string {
	return (
		typeof val === 'string' &&
		(val.startsWith('http://') || val.startsWith('https://'))
	);
}

/**
 * Decodes a data:URI string into a Blob.
 *
 * @param uri - Data URI string in the format `data:[<mediatype>][;base64],<data>`
 * @returns Decoded `Blob` with the detected MIME type
 * @throws {TypeError} If the URI is missing the comma separator (invalid format)
 * @throws {DOMException} If the base64-encoded data section is malformed
 *
 * @see {@link appendFieldToFormData} — uses the decoded Blob when appending form fields
 * @see {@link IBlobSerialized} — the serialized Blob format that produces data URIs
 */
function blobFromDataUri(uri: string): Blob {
	const comma = uri.indexOf(',');
	if (comma === -1) throw new TypeError(`Invalid data:URI: missing comma`);

	const meta = uri.slice(5, comma); // strip 'data:'
	const base64Part = uri.slice(comma + 1);
	const mime = meta.split(';')[0] ?? '';

	const binary = atob(base64Part);
	const bytes = new Uint8Array(binary.length);
	for (let idx = 0; idx < binary.length; idx++) {
		bytes[idx] = binary.charCodeAt(idx);
	}
	return new Blob([bytes], { type: mime });
}

/** Converts a Blob/File to a base64 data:URI. Returns a Promise. */
async function blobToDataUri(blob: Blob): Promise<string> {
	const buffer = await blob.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let idx = 0; idx < bytes.length; idx++) {
		binary += String.fromCharCode(bytes[idx] as number);
	}
	const base64 = btoa(binary);
	return `data:${blob.type};base64,${base64}`;
}

// ---------------------------------------------------------------------------
// Auto-detect: FormData value → runtime value
// ---------------------------------------------------------------------------

/**
 * Resolves a single FormData entry value according to the given source mode.
 *
 * @param val   - The raw FormData value (File, Blob, or string)
 * @param mode  - How to interpret binary fields
 * @returns Resolved runtime value
 * @see {@link IFileSourceMode} — available interpretation modes
 * @see {@link formDataToPlainObject} — caller that applies this per entry
 */
export function resolveFormDataValue(
	val: File | Blob | string,
	mode: IFileSourceMode
): unknown {
	// File is always preserved regardless of mode (it's already the real file)
	if (val instanceof File) {
		if (mode === 'reference') return val.name;
		return val;
	}

	// Blob (non-File) — Blob is a valid FormData entry in some environments
	if (val instanceof Blob) {
		if (mode === 'reference') return '[Blob]';
		return val;
	}

	// String cases — after File and Blob guards, val must be a string
	const str = val;

	switch (mode) {
		case 'reference':
			// Always treat string as-is (path/URL reference)
			return str;

		case 'base64':
			// Expect and decode data:URI
			if (isDataUri(str)) return blobFromDataUri(str);
			// If not data:URI but mode forced to base64, return as-is (let transformer handle error)
			return str;

		case 'binary':
			// In binary mode, data:URIs are decoded
			if (isDataUri(str)) return blobFromDataUri(str);
			// Otherwise preserve string (ArrayBuffers/Uint8Array would be appended directly)
			return str;

		case 'auto':
		default:
			// Auto-detect by value shape
			if (isDataUri(str)) return blobFromDataUri(str);
			if (isUrlString(str)) return str; // URL reference — keep as string
			// Everything else: plain string (filename, path, regular text)
			return str;
	}
}

// ---------------------------------------------------------------------------
// fromFormData — build plain object from FormData
// ---------------------------------------------------------------------------

/**
 * Converts a `FormData` instance into a plain object for model construction.
 *
 * File/Blob entries are resolved according to `options.fileSource` (default: `'auto'`).
 * Per-field overrides in `options.fields` take precedence over the global strategy.
 *
 * @param formData - Source FormData
 * @param options  - Conversion options
 * @returns Plain object ready to pass to `new Model(data)`
 *
 * @see {@link resolveFormDataValue} for the per-entry resolution logic
 * @see {@link plainObjectToFormData} for the inverse operation
 */
export function formDataToPlainObject(
	formData: FormData,
	options?: IFromFormDataOptions
): Record<string, unknown> {
	const globalMode: IFileSourceMode = options?.fileSource ?? 'auto';
	const fieldOverrides = options?.fields ?? {};
	const result: Record<string, unknown> = {};

	for (const [key, val] of formData.entries()) {
		const mode: IFileSourceMode = fieldOverrides[key] ?? globalMode;
		result[key] = resolveFormDataValue(val as File | Blob | string, mode);
	}

	return result;
}

// ---------------------------------------------------------------------------
// toFormData — build FormData from model plain-object
// ---------------------------------------------------------------------------

/**
 * Options for {@link appendFieldToFormData}.
 * @internal
 */
interface IAppendFieldOptions {
	/** Target FormData instance to append to. */
	formData: FormData;
	/** Field name (key). */
	key: string;
	/** Runtime value of the field. */
	val: unknown;
	/** How to encode binary fields. */
	mode: IFileModeOutput;
}

/**
 * Appends a single field value to a FormData instance according to the output mode.
 *
 * @param options - Field append options
 * @returns Promise that resolves once the field has been appended
 * @see {@link plainObjectToFormData} — calls this for each field in the object
 * @see {@link IFileModeOutput} — encoding mode applied to binary fields
 */
export async function appendFieldToFormData(
	options: IAppendFieldOptions
): Promise<void> {
	const { formData, key, val, mode } = options;

	if (val === null || val === undefined) {
		// Skip null/undefined fields — they don't belong in a FormData
		return;
	}

	if (val instanceof File) {
		switch (mode) {
			case 'reference':
				formData.append(key, val.name);
				return;
			case 'base64': {
				const uri = await blobToDataUri(val);
				formData.append(key, uri);
				return;
			}
			default:
				formData.append(key, val);
				return;
		}
	}

	if (val instanceof Blob) {
		switch (mode) {
			case 'reference':
				formData.append(key, '[Blob]');
				return;
			case 'base64': {
				const uri = await blobToDataUri(val);
				formData.append(key, uri);
				return;
			}
			default:
				formData.append(key, val, 'file');
				return;
		}
	}

	if (val instanceof ArrayBuffer || ArrayBuffer.isView(val)) {
		// Ensure we have a plain ArrayBuffer (not SharedArrayBuffer) for Blob constructor
		const viewBuf: ArrayBufferLike =
			val instanceof ArrayBuffer ? val : val.buffer;
		const safeBuf: ArrayBuffer =
			viewBuf instanceof ArrayBuffer
				? viewBuf
				: new Uint8Array(viewBuf).slice().buffer;
		const blob = new Blob([safeBuf], { type: 'application/octet-stream' });
		switch (mode) {
			case 'reference':
				formData.append(key, '[binary]');
				return;
			case 'base64': {
				const uri = await blobToDataUri(blob);
				formData.append(key, uri);
				return;
			}
			default:
				formData.append(key, blob, 'file');
				return;
		}
	}

	// Primitives: string, number, boolean
	formData.append(key, String(val));
}

/**
 * Builds a `FormData` from a plain serializable object.
 *
 * Iterates over all own enumerable keys of `plain` and appends each value
 * according to `options.fileMode` (default: `'auto'`) using {@link appendFieldToFormData}.
 *
 * @param plain   - Plain object (typically from `model.serialize()` or the model's own properties)
 * @param options - Conversion options
 * @returns Promise that resolves to the assembled `FormData`
 *
 * @see {@link formDataToPlainObject} for the inverse operation
 * @see {@link appendFieldToFormData} for per-field encoding logic
 */
export async function plainObjectToFormData(
	plain: Record<string, unknown>,
	options?: IToFormDataOptions
): Promise<FormData> {
	const globalMode: IFileModeOutput = options?.fileMode ?? 'auto';
	const fieldOverrides = options?.fields ?? {};
	const formData = new FormData();

	// _method must be the very first field (some backends require this)
	if (options?.spoofMethod) {
		formData.append('_method', options.spoofMethod);
	}

	for (const [key, val] of Object.entries(plain)) {
		const mode: IFileModeOutput = fieldOverrides[key] ?? globalMode;
		await appendFieldToFormData({ formData, key, val, mode });
	}

	return formData;
}
