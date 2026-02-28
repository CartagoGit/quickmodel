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
