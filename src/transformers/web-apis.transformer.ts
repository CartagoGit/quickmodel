import { BaseTransformer } from '../core/bases/base-transformer';
import { QModelError } from '@/core/errors/quickmodel.error';
import { safeStringify } from '@/core/helpers/transform-helpers';
import {
	IQIntegrityContext,
	IQIntegrityResult,
	IQIntegrityChecker,
	IQTransformContext,
} from '../core/interfaces/transformer.interface';

/**
 * Transformer for URL type: converts between string and URL object.
 *
 * **Serialization**: `URL` → `string`
 * **Deserialization**: `string` → `URL`
 */
export class URLTransformer
	extends BaseTransformer<string, URL>
	implements IQIntegrityChecker
{
	/**
	 * Converts a string to a `URL` instance, validating the protocol.
	 *
	 * @param value - The URL string or existing `URL` instance.
	 * @param propertyKey - Property name (for error messages).
	 * @param className - Class name (for error messages).
	 * @returns A validated `URL` instance, or `null` when `value` is `null`/`undefined`.
	 * @throws {QModelError} When the protocol is not in the allowed list
	 *   (http, https, ftp, ws, wss by default) or the URL string is malformed.
	 */
	deserialize(
		value: string | URL | null | undefined,
		propertyKey: string,
		className: string,
		_context?: IQTransformContext
	): URL | null {
		// Passthrough null/undefined
		if (value === null || value === undefined) {
			return value as null;
		}

		// Already a URL instance - return as-is
		if (value instanceof URL) {
			return value;
		}

		// Must be string, nothing else
		if (typeof value !== 'string') {
			throw new QModelError(
				`${className}.${propertyKey}: URL transformer ONLY accepts:\n` +
					`  - string (valid URL, e.g., "https://example.com/path?query=1")\n` +
					`  - URL instance\n` +
					`Received: ${typeof value} = ${safeStringify(value)}`,
				{
					className,
					propertyKey,
					value,
					expectedType: 'string | URL',
				}
			);
		}

		try {
			const url = new URL(value);
			// SECURITY: Protocol Validation
			// Block dangerous protocols (javascript:, file:, data:, vbscript:)
			const ALLOWED_PROTOCOLS = [
				'http:',
				'https:',
				'ftp:',
				'ws:',
				'wss:',
			];

			// Allow custom protocols if explicitly configured (future proofing)
			const allowed =
				(
					_context?.metadata?.transformerOptions as {
						allowedProtocols?: string[];
					}
				)?.allowedProtocols || ALLOWED_PROTOCOLS;

			if (!allowed.includes(url.protocol)) {
				throw new Error(
					`Protocol '${url.protocol}' is not allowed. Allowed: ${allowed.join(', ')}`
				);
			}

			return url;
		} catch (error) {
			const errorMsg =
				error instanceof Error ? error.message : String(error);
			throw new QModelError(
				`${className}.${propertyKey}: Invalid URL string "${value}".\n` +
					`Error: ${errorMsg}\n` +
					`Expected: Valid URL with allowed protocol (http, https)`,
				{
					className,
					propertyKey,
					value,
					expectedType: 'Valid absolute URL',
				}
			);
		}
	}

	/**
	 * Serializes a `URL` instance to its string representation (`href`).
	 *
	 * @param value - The `URL` instance to serialize.
	 * @returns The full URL string.
	 */
	serialize(value: URL): string {
		return value.toString();
	}

	/**
	 * Validates that `value` is a `URL` instance or a valid URL string.
	 *
	 * String values are tested with `new URL(value)` — invalid URL strings fail.
	 *
	 * @param value   - Runtime value to validate.
	 * @param context - Context providing `className` and `propertyKey` for error messages.
	 * @returns `{ isValid: true }` for `URL` instances and valid URL strings;
	 *          `{ isValid: false, error }` for invalid strings and other types.
	 */
	checkIntegrity(
		value: unknown,
		context: IQIntegrityContext
	): IQIntegrityResult {
		if (value instanceof URL) {
			return { isValid: true };
		}

		if (typeof value === 'string') {
			try {
				new URL(value);
				return { isValid: true };
			} catch {
				return {
					isValid: false,
					error: `${context.className}.${context.propertyKey}: Invalid URL value "${value}"`,
				};
			}
		}

		return {
			isValid: false,
			error: `${context.className}.${context.propertyKey}: Expected string/URL, got ${typeof value}`,
		};
	}
}

/**
 * Transformer for URLSearchParams type: converts between string/object and URLSearchParams.
 *
 * **Serialization**: `URLSearchParams` → `string`
 * **Deserialization**: `string | object` → `URLSearchParams`
 */
export class URLSearchParamsTransformer
	extends BaseTransformer<string | Record<string, string>, URLSearchParams>
	implements IQIntegrityChecker
{
	/**
	 * Converts a string (query format) or plain object to a `URLSearchParams` instance.
	 *
	 * @param value - Query string (`"key=value&foo=bar"`), key-value record, or
	 *   existing `URLSearchParams` instance.
	 * @param propertyKey - Property name (for error messages).
	 * @param className - Class name (for error messages).
	 * @returns A `URLSearchParams` instance, or `null`/`undefined` when `value` is nullish.
	 * @throws {QModelError} When `value` is not a string, plain object, or `URLSearchParams` instance.
	 */
	deserialize(
		value:
			| string
			| Record<string, string>
			| URLSearchParams
			| null
			| undefined,
		propertyKey: string,
		className: string,
		_context?: IQTransformContext
	): URLSearchParams | null {
		// Passthrough null/undefined
		if (value === null || value === undefined) {
			return value as null;
		}

		// Already a URLSearchParams instance - return as-is
		if (value instanceof URLSearchParams) {
			return value;
		}

		// Accept string query
		if (typeof value === 'string') {
			return new URLSearchParams(value);
		}

		// Accept plain object (not array, not null)
		if (
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value)
		) {
			return new URLSearchParams(value);
		}

		throw new QModelError(
			`${className}.${propertyKey}: URLSearchParams transformer ONLY accepts:\n` +
				`  - string (query format, e.g., "key=value&foo=bar")\n` +
				`  - object (key-value pairs, e.g., { key: "value", foo: "bar" })\n` +
				`  - URLSearchParams instance\n` +
				`Received: ${typeof value} = ${safeStringify(value)}`,
			{
				className,
				propertyKey,
				value,
				expectedType: 'string | object | URLSearchParams',
			}
		);
	}

	/**
	 * Serializes `URLSearchParams` to its query-string form.
	 *
	 * @param value - The `URLSearchParams` instance to serialize.
	 * @returns The encoded query string (e.g. `"key=value&foo=bar"`).
	 */
	serialize(value: URLSearchParams): string {
		return value.toString();
	}

	/**
	 * Validates that `value` is a valid `URLSearchParams` representation:
	 * a `URLSearchParams` instance, a query string, or a plain key-value object.
	 *
	 * @param value   - Runtime value to validate.
	 * @param context - Context providing `className` and `propertyKey` for error messages.
	 * @returns `{ isValid: true }` for `URLSearchParams`, strings, and plain objects;
	 *          `{ isValid: false, error }` for all other types.
	 */
	checkIntegrity(
		value: unknown,
		context: IQIntegrityContext
	): IQIntegrityResult {
		if (value instanceof URLSearchParams) {
			return { isValid: true };
		}

		if (typeof value === 'string') {
			return { isValid: true };
		}

		if (typeof value === 'object' && value !== null) {
			return { isValid: true };
		}

		return {
			isValid: false,
			error: `${context.className}.${context.propertyKey}: Expected string/object/URLSearchParams, got ${typeof value}`,
		};
	}
}

/**
 * Transformer for TextEncoder: converts plain object to TextEncoder.
 *
 * **Note**: TextEncoder has no state, so serialization returns empty object.
 */
export class TextEncoderTransformer extends BaseTransformer<
	Record<string, never>,
	TextEncoder
> {
	/**
	 * Creates a new `TextEncoder` instance.
	 *
	 * `TextEncoder` is stateless, so any nullish value or empty object is
	 * accepted and results in a fresh instance.
	 *
	 * @param value - `null`, `undefined`, an empty object `{}`, or an existing
	 *   `TextEncoder` instance.
	 * @param propertyKey - Property name (for error messages).
	 * @param className - Class name (for error messages).
	 * @returns A `TextEncoder` instance.
	 * @throws {QModelError} When `value` is a non-empty non-TextEncoder value.
	 */
	deserialize(
		value: unknown,
		propertyKey: string,
		className: string,
		_context?: IQTransformContext
	): TextEncoder | null {
		// Already a TextEncoder instance - return as-is
		if (value instanceof TextEncoder) {
			return value;
		}

		// TextEncoder has no state, accept null/undefined/empty object
		if (
			value === null ||
			value === undefined ||
			(typeof value === 'object' && Object.keys(value).length === 0)
		) {
			return new TextEncoder();
		}

		throw new QModelError(
			`${className}.${propertyKey}: TextEncoder transformer ONLY accepts:\n` +
				`  - null\n` +
				`  - undefined\n` +
				`  - {} (empty object)\n` +
				`  - TextEncoder instance\n` +
				`Note: TextEncoder has no configuration, these values just create a new instance.\n` +
				`Received: ${typeof value} = ${safeStringify(value)}`,
			{
				className,
				propertyKey,
				value,
				expectedType: 'null | undefined | {} | TextEncoder',
			}
		);
	}

	/**
	 * Serializes a `TextEncoder` to an empty object (it has no configurable state).
	 *
	 * @returns An empty plain object `{}`.
	 */
	serialize(_value: TextEncoder): Record<string, never> {
		return {}; // TextEncoder has no serializable state
	}
}

/**
 * Transformer for TextDecoder: converts string/object to TextDecoder.
 *
 * **Serialization**: `TextDecoder` → `{ encoding: string }`
 * **Deserialization**: `string | { encoding: string }` → `TextDecoder`
 */
export class TextDecoderTransformer extends BaseTransformer<
	string | { encoding: string },
	TextDecoder
> {
	/**
	 * Creates a `TextDecoder` from a string (encoding name), a plain object
	 * with an `encoding` property, or an existing `TextDecoder` instance.
	 *
	 * @param value - Encoding string (e.g. `"utf-8"`), `{ encoding: "utf-8" }` object,
	 *   or an existing `TextDecoder` instance.
	 * @param propertyKey - Property name (for error messages).
	 * @param className - Class name (for error messages).
	 * @returns A `TextDecoder` instance, or `null` when `value` is nullish.
	 * @throws {QModelError} When the encoding string is not a valid IANA charset label.
	 */
	deserialize(
		value: string | { encoding?: string } | TextDecoder | null | undefined,
		propertyKey: string,
		className: string,
		_context?: IQTransformContext
	): TextDecoder | null {
		if (value === null || value === undefined) return null;

		if (value instanceof TextDecoder) {
			return value;
		}

		if (typeof value === 'string') {
			try {
				return new TextDecoder(value as any);
			} catch (_error) {
				throw new QModelError(
					`${className}.${propertyKey}: Invalid encoding "${value}". ` +
						`Valid encodings include: utf-8, utf-16, iso-8859-1, etc.`,
					{
						className,
						propertyKey,
						value,
						expectedType: 'TextDecoder valid encoding (string)',
					}
				);
			}
		}

		if (typeof value === 'object' && value !== null) {
			const encoding =
				(value as { encoding?: string }).encoding || 'utf-8';
			try {
				return new TextDecoder(encoding as any);
			} catch (_error) {
				throw new QModelError(
					`${className}.${propertyKey}: Invalid encoding "${encoding}". ` +
						`Valid encodings include: utf-8, utf-16, iso-8859-1, etc.`,
					{
						className,
						propertyKey,
						value,
						expectedType: 'TextDecoder valid encoding (object)',
					}
				);
			}
		}

		if (value === null || value === undefined) {
			return new TextDecoder();
		}

		throw new QModelError(
			`${className}.${propertyKey}: TextDecoder transformer accepts string (encoding name like "utf-8"), ` +
				`object with encoding property, or TextDecoder instance. Got ${typeof value}`,
			{
				className,
				propertyKey,
				value,
				expectedType: 'string | { encoding: string } | TextDecoder',
			}
		);
	}

	/**
	 * Serializes a `TextDecoder` to its encoding name.
	 *
	 * @param value - The `TextDecoder` instance to serialize.
	 * @returns An object `{ encoding: string }` with the decoder's IANA charset label.
	 */
	serialize(value: TextDecoder): { encoding: string } {
		return { encoding: value.encoding };
	}
}

// ============================================================================
// Blob / File transformers (Propuesta G — FormData)
// ============================================================================

/**
 * Serialized representation of a `Blob`.
 * The binary content is **not** included — only its metadata.
 *
 * @group Types
 */
export interface IBlobSerialized {
	/** Byte length of the original Blob. */
	size: number;
	/** MIME type of the original Blob. */
	type: string;
	/** Discriminant marker to identify this POJO as a serialized Blob. */
	_blobRef: true;
}

/**
 * Serialized representation of a `File`.
 * The binary content is **not** included — only its metadata.
 *
 * @group Types
 */
export interface IFileSerialized {
	/** File name as reported by the browser / OS. */
	name: string;
	/** Byte length of the file. */
	size: number;
	/** MIME type of the file. */
	type: string;
	/** Last-modified timestamp in milliseconds since Unix epoch. */
	lastModified: number;
}

/** Accepted input types when deserializing a Blob field. */
type IBlobInput = IBlobSerialized | Blob | ArrayBuffer | Uint8Array | string;

/** Accepted input types when deserializing a File field. */
type IFileInput = IFileSerialized | File;

/**
 * Returns `true` when `val` looks like an `IBlobSerialized` POJO.
 * @internal
 */
function isBlobSerialized(val: unknown): val is IBlobSerialized {
	return (
		typeof val === 'object' &&
		val !== null &&
		'_blobRef' in val &&
		(val as IBlobSerialized)._blobRef === true
	);
}

/**
 * Returns `true` when `val` looks like an `IFileSerialized` POJO.
 * @internal
 */
function isFileSerialized(val: unknown): val is IFileSerialized {
	return (
		typeof val === 'object' &&
		val !== null &&
		'name' in val &&
		typeof (val as IFileSerialized).name === 'string' &&
		'size' in val &&
		'type' in val &&
		'lastModified' in val
	);
}

/**
 * Decodes a base64 data URI string into a `Blob`.
 *
 * @param dataUri   - Full data URI, e.g. `"data:image/png;base64,abc..."`
 * @param propKey   - Property name for error messages.
 * @param className - Class name for error messages.
 * @returns A `Blob` with the decoded bytes and the parsed MIME type.
 * @throws {QModelError} When the URI is malformed (no comma separator).
 * @internal
 */
function blobFromDataUri(
	dataUri: string,
	propKey: string,
	className: string
): Blob {
	const commaIdx = dataUri.indexOf(',');
	if (commaIdx === -1) {
		throw new QModelError(
			`${className}.${propKey}: BlobTransformer: malformed data URI (missing comma separator). ` +
				`Expected format: "data:<mime>;base64,<data>"`,
			{
				className,
				propertyKey: propKey,
				value: dataUri,
				expectedType: 'data:<mime>;base64,<data>',
			}
		);
	}
	const header = dataUri.slice(5, commaIdx); // strip leading 'data:'
	const base64Part = dataUri.slice(commaIdx + 1);
	const mimeType = header.split(';')[0] ?? '';
	const bytes = Buffer.from(base64Part, 'base64');
	return new Blob([bytes], { type: mimeType });
}

/**
 * Transformer for `Blob`: converts between a metadata POJO / binary sources and a `Blob` instance.
 *
 * **Serialization**: `Blob` → `IBlobSerialized` (`{ size, type, _blobRef: true }`)
 * **Deserialization** (auto-detect):
 * - `Blob` / `File`        → passthrough
 * - `ArrayBuffer`          → wrap in `Blob`
 * - `Uint8Array`           → wrap in `Blob`
 * - `string "data:..."`    → decode base64 → `Blob`
 * - `IBlobSerialized` POJO → restore with metadata only (content is not stored in JSON)
 *
 * @example
 * ```typescript
 * @Quick({ thumbnail: 'blob' })
 * class ArticleDto extends QModel<IArticleDto> {
 *   declare thumbnail: Blob;
 * }
 * ```
 *
 * @group Transformers
 */
export class BlobTransformer
	extends BaseTransformer<IBlobInput, Blob>
	implements IQIntegrityChecker
{
	/**
	 * Converts multiple input formats into a `Blob` instance.
	 *
	 * @param value       - The value to deserialize.
	 * @param propertyKey - Property name (for error messages).
	 * @param className   - Class name (for error messages).
	 * @returns A `Blob` instance, or `null` when `value` is `null`/`undefined`.
	 * @throws {QModelError} On unsupported input types or malformed data URIs.
	 */
	deserialize(
		value: IBlobInput | null | undefined,
		propertyKey: string,
		className: string,
		_context?: IQTransformContext
	): Blob | null {
		if (value === null || value === undefined) return null;

		// Blob (and its File subclass) — passthrough
		if (value instanceof Blob) return value;

		if (value instanceof ArrayBuffer) {
			return new Blob([value]);
		}

		if (value instanceof Uint8Array) {
			return new Blob([value as BlobPart]);
		}

		if (typeof value === 'string') {
			if (!value.startsWith('data:')) {
				throw new QModelError(
					`${className}.${propertyKey}: BlobTransformer requires a base64 data URI ` +
						`(e.g. "data:image/png;base64,..."), got: "${safeStringify(value)}"`,
					{
						className,
						propertyKey,
						value,
						expectedType:
							'data URI string (data:<mime>;base64,<data>)',
					}
				);
			}
			return blobFromDataUri(value, propertyKey, className);
		}

		if (isBlobSerialized(value)) {
			// Content is not stored in JSON — reconstruct with metadata only
			return new Blob([], { type: value.type });
		}

		throw new QModelError(
			`${className}.${propertyKey}: BlobTransformer ONLY accepts:\n` +
				`  - Blob / File instance\n` +
				`  - ArrayBuffer\n` +
				`  - Uint8Array\n` +
				`  - data URI string (e.g. "data:image/png;base64,...")\n` +
				`  - IBlobSerialized { size, type, _blobRef: true }\n` +
				`Received: ${typeof value} = ${safeStringify(value)}`,
			{
				className,
				propertyKey,
				value,
				expectedType:
					'Blob | ArrayBuffer | Uint8Array | string | IBlobSerialized',
			}
		);
	}

	/**
	 * Serializes a `Blob` to its metadata representation.
	 *
	 * @remarks Binary content is **not** included in the serialized output.
	 * @param value - The `Blob` instance to serialize.
	 * @returns An `IBlobSerialized` POJO with `size`, `type`, and `_blobRef: true`.
	 */
	serialize(value: Blob): IBlobSerialized {
		return { size: value.size, type: value.type, _blobRef: true };
	}

	/** @inheritdoc */
	checkIntegrity(
		value: unknown,
		context: IQIntegrityContext
	): IQIntegrityResult {
		if (value instanceof Blob) return { isValid: true };
		if (isBlobSerialized(value)) return { isValid: true };
		if (value instanceof ArrayBuffer) return { isValid: true };
		if (value instanceof Uint8Array) return { isValid: true };
		if (typeof value === 'string' && value.startsWith('data:')) {
			return { isValid: true };
		}

		return {
			isValid: false,
			error:
				`${context.className ?? '?'}.${context.propertyKey}: ` +
				`Expected Blob or compatible input, got ${typeof value}`,
		};
	}
}

/**
 * Transformer for `File`: converts between a metadata POJO and a `File` instance.
 *
 * **Serialization**: `File` → `IFileSerialized` (`{ name, size, type, lastModified }`)
 * **Deserialization**:
 * - `File` instance       → passthrough
 * - `IFileSerialized` POJO → reconstruct `File` with metadata (empty content)
 *
 * @remarks
 * File binary content is never included in the serialized form.
 * After JSON round-trip, the deserialized `File` carries correct metadata
 * but has zero bytes. Use `toFormData()` / `toReadableStream()` to preserve
 * actual bytes for binary transfer.
 *
 * @example
 * ```typescript
 * @Quick({ avatar: 'file' })
 * class ProfileDto extends QModel<IProfileDto> {
 *   declare avatar: File;
 * }
 * ```
 *
 * @group Transformers
 */
export class FileTransformer
	extends BaseTransformer<IFileInput, File>
	implements IQIntegrityChecker
{
	/**
	 * Converts supported input into a `File` instance.
	 *
	 * @param value       - The value to deserialize.
	 * @param propertyKey - Property name (for error messages).
	 * @param className   - Class name (for error messages).
	 * @returns A `File` instance, or `null` when `value` is `null`/`undefined`.
	 * @throws {QModelError} On unsupported input types or missing required fields.
	 */
	deserialize(
		value: IFileInput | null | undefined,
		propertyKey: string,
		className: string,
		_context?: IQTransformContext
	): File | null {
		if (value === null || value === undefined) return null;

		if (value instanceof File) return value;

		// Blob → File wrapping (e.g. from streamToBlob / fromStream)
		if (value instanceof Blob) {
			return new File([value], '', {
				type: value.type,
				lastModified: Date.now(),
			});
		}

		if (isFileSerialized(value)) {
			return new File([], value.name, {
				type: value.type,
				lastModified: value.lastModified,
			});
		}

		throw new QModelError(
			`${className}.${propertyKey}: FileTransformer ONLY accepts:\n` +
				`  - File instance\n` +
				`  - IFileSerialized { name, size, type, lastModified }\n` +
				`Received: ${typeof value} = ${safeStringify(value)}`,
			{
				className,
				propertyKey,
				value,
				expectedType: 'File | IFileSerialized',
			}
		);
	}

	/**
	 * Serializes a `File` to its metadata representation.
	 *
	 * @remarks Binary content is **not** included in the serialized output.
	 * @param value - The `File` instance to serialize.
	 * @returns An `IFileSerialized` POJO with `name`, `size`, `type`, and `lastModified`.
	 */
	serialize(value: File): IFileSerialized {
		return {
			name: value.name,
			size: value.size,
			type: value.type,
			lastModified: value.lastModified,
		};
	}

	/** @inheritdoc */
	checkIntegrity(
		value: unknown,
		context: IQIntegrityContext
	): IQIntegrityResult {
		if (value instanceof File) return { isValid: true };
		if (isFileSerialized(value)) return { isValid: true };

		return {
			isValid: false,
			error:
				`${context.className ?? '?'}.${context.propertyKey}: ` +
				`Expected File or IFileSerialized, got ${typeof value}`,
		};
	}
}
