import { BaseTransformer } from '../core/bases/base-transformer';

/**
 * Transformer for URL type: converts between string and URL object.
 * 
 * **Serialization**: `URL` → `string`
 * **Deserialization**: `string` → `URL`
 */
export class URLTransformer extends BaseTransformer<string, URL> {
  deserialize(value: string | URL, propertyKey: string, className: string): URL {
    // Already a URL instance - return as-is
    if (value instanceof URL) {
      return value;
    }

    // Must be string, nothing else
    if (typeof value !== 'string') {
      throw new Error(
        `${className}.${propertyKey}: URL transformer ONLY accepts:\n` +
        `  - string (valid URL, e.g., "https://example.com/path?query=1")\n` +
        `  - URL instance\n` +
        `Received: ${typeof value} = ${JSON.stringify(value)}`
      );
    }

    try {
      return new URL(value);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${className}.${propertyKey}: Invalid URL string "${value}".\n` +
        `Error: ${errorMsg}\n` +
        `Expected: Valid URL with protocol (e.g., "https://example.com/path")`
      );
    }
  }

  serialize(value: URL): string {
    return value.toString();
  }
}

/**
 * Transformer for URLSearchParams type: converts between string/object and URLSearchParams.
 * 
 * **Serialization**: `URLSearchParams` → `string`
 * **Deserialization**: `string | object` → `URLSearchParams`
 */
export class URLSearchParamsTransformer extends BaseTransformer<string | Record<string, string>, URLSearchParams> {
  deserialize(value: string | Record<string, string> | URLSearchParams, propertyKey: string, className: string): URLSearchParams {
    // Already a URLSearchParams instance - return as-is
    if (value instanceof URLSearchParams) {
      return value;
    }

    // Accept string query
    if (typeof value === 'string') {
      return new URLSearchParams(value);
    }

    // Accept plain object (not array, not null)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return new URLSearchParams(value as Record<string, string>);
    }

    throw new Error(
      `${className}.${propertyKey}: URLSearchParams transformer ONLY accepts:\n` +
      `  - string (query format, e.g., "key=value&foo=bar")\n` +
      `  - object (key-value pairs, e.g., { key: "value", foo: "bar" })\n` +
      `  - URLSearchParams instance\n` +
      `Received: ${typeof value} = ${JSON.stringify(value)}`
    );
  }

  serialize(value: URLSearchParams): string {
    return value.toString();
  }
}

/**
 * Transformer for TextEncoder: converts plain object to TextEncoder.
 * 
 * **Note**: TextEncoder has no state, so serialization returns empty object.
 */
export class TextEncoderTransformer extends BaseTransformer<Record<string, never>, TextEncoder> {
  deserialize(value: any, propertyKey: string, className: string): TextEncoder {
    // Already a TextEncoder instance - return as-is
    if (value instanceof TextEncoder) {
      return value;
    }

    // TextEncoder has no state, accept null/undefined/empty object
    if (value === null || value === undefined || (typeof value === 'object' && Object.keys(value).length === 0)) {
      return new TextEncoder();
    }

    throw new Error(
      `${className}.${propertyKey}: TextEncoder transformer ONLY accepts:\n` +
      `  - null\n` +
      `  - undefined\n` +
      `  - {} (empty object)\n` +
      `  - TextEncoder instance\n` +
      `Note: TextEncoder has no configuration, these values just create a new instance.\n` +
      `Received: ${typeof value} = ${JSON.stringify(value)}`
    );
  }

  serialize(value: TextEncoder): Record<string, never> {
    return {}; // TextEncoder has no serializable state
  }
}

/**
 * Transformer for TextDecoder: converts string/object to TextDecoder.
 * 
 * **Serialization**: `TextDecoder` → `{ encoding: string }`
 * **Deserialization**: `string | { encoding: string }` → `TextDecoder`
 */
export class TextDecoderTransformer extends BaseTransformer<string | { encoding: string }, TextDecoder> {
  deserialize(value: string | { encoding?: string } | TextDecoder, propertyKey: string, className: string): TextDecoder {
    if (value instanceof TextDecoder) {
      return value;
    }

    if (typeof value === 'string') {
      try {
        return new (TextDecoder as any)(value);
      } catch (error) {
        throw new Error(
          `${className}.${propertyKey}: Invalid encoding "${value}". ` +
          `Valid encodings include: utf-8, utf-16, iso-8859-1, etc.`
        );
      }
    }

    if (typeof value === 'object' && value !== null) {
      const encoding = (value as any).encoding || 'utf-8';
      try {
        return new (TextDecoder as any)(encoding);
      } catch (error) {
        throw new Error(
          `${className}.${propertyKey}: Invalid encoding "${encoding}". ` +
          `Valid encodings include: utf-8, utf-16, iso-8859-1, etc.`
        );
      }
    }

    if (value === null || value === undefined) {
      return new TextDecoder();
    }

    throw new Error(
      `${className}.${propertyKey}: TextDecoder transformer accepts string (encoding name like "utf-8"), ` +
      `object with encoding property, or TextDecoder instance. Got ${typeof value}`
    );
  }

  serialize(value: TextDecoder): { encoding: string } {
    return { encoding: value.encoding };
  }
}
