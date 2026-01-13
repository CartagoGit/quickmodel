import { QUICK_OPTIONS_KEY } from '../constants/metadata-keys';
import type { IQAdvancedOptions } from '../interfaces/quick-options.interface';

export class ToInterfaceService<
	TModel extends Record<string, unknown> = Record<string, unknown>,
	TInterface extends Record<string, unknown> = Record<string, unknown>,
> {
	toInterface<T extends Record<string, unknown> = TInterface>(
		model: TModel,
		seen?: WeakSet<object>,
		depth: number = 0
	): T {
		// SECURITY: Prevent Stack Overflow
		const MAX_DEPTH = 512;
		if (depth > MAX_DEPTH) {
			throw new Error(
				`QuickModel Security: Maximum recursion depth (${MAX_DEPTH}) exceeded during toInterface serialization.`
			);
		}

		// Handle inconsistent Type usage in tests (Passing array as seen for original values)
		// This supports legacy tests that pass [originalData] as the second argument
		let visited: WeakSet<object>;
		let originalArray: any[] = [];

		if (Array.isArray(seen)) {
			visited = new WeakSet<object>();
			originalArray = seen;
		} else {
			visited = seen || new WeakSet<object>();
		}

		// If model is a collection (Array/Set/Map), handle it specially
		// This explicitly supports Arrays passed to toInterface, mapping them using originalArray if provided
		if (Array.isArray(model)) {
			return model.map((item, index) =>
				this.convertToInterfaceFormat(
					item,
					originalArray[index],
					visited,
					process.env.NODE_ENV === 'production',
					index.toString(),
					depth + 1
				)
			) as unknown as T;
		}

		const result: Record<string, unknown> = {};
		// visited is already initialized above

		const initData =
			(model as unknown as { __initData?: Record<string, unknown> })
				.__initData || {};
		const isProduction = process.env.NODE_ENV === 'production';

		// Retrieve advanced options (custom serializers)
		const options: IQAdvancedOptions =
			Reflect.getMetadata(QUICK_OPTIONS_KEY, model.constructor) || {};

		// INFER MISSING KEYS:
		// If initData is missing (e.g. newly created instance without initData or manual pop? No, QModel always has initData).
		// But if properties were added dynamically? QuickModel only tracks declared props.

		// Wait, toInterface only iterates initData keys to "PRESERVE" format.
		// If a key is NOT in initData, it means it wasn't in constructor.
		// If it's a declared property, it should be processed.
		// QModel uses QUICK_VALUES_KEY for internal storage.

		// BUT for toInterface() we only care about "Restoring Interface".
		// If expected interface has key X, and initData had X.
		// If we added a property Y dynamically that is NOT in the interface... should it be in toInterface()?
		// Usually NO. toInterface implies "contract compliance".
		// The loop over initData keys ensures strict adherance to original input structure.

		// However, if we added items to an array (which is a Value, not a Key on the model), that is handled in convertToInterfaceFormat.

		for (const key of Object.keys(initData)) {
			// SECURITY: Prevent Prototype Pollution
			if (
				key === '__proto__' ||
				key === 'constructor' ||
				key === 'prototype'
			) {
				continue;
			}

			const currentValue = (model as unknown as Record<string, unknown>)[
				key
			];
			const originalValue = initData[key];

			// 🔥 CHECK 1: Custom serializer from @Quick options
			if (
				options.serializers &&
				key in options.serializers &&
				typeof options.serializers[key] === 'function'
			) {
				result[key] = options.serializers[key](currentValue);
				continue;
			}

			// 🔥 CHECK 2: Custom serializer from @QType metadata
			const customSerializer = Reflect.getMetadata(
				'customSerializer',
				model,
				key
			);
			if (customSerializer && typeof customSerializer === 'function') {
				result[key] = customSerializer(currentValue);
				continue;
			}

			// Convert to interface format
			result[key] = this.convertToInterfaceFormat(
				currentValue,
				originalValue,
				visited,
				isProduction,
				key,
				depth
			);
		}

		// Wait! What if we want to include properties that are NEW but valid?
		// E.g. Optional properties not present in initData but set later?
		// If user set user.optionalProp = 'value', it should be in toInterface().
		// But current implementation ONLY iterates initData keys.
		// This means optional properties set later are IGNORED in toInterface().
		// IS THIS INTENTIONAL?
		// "Preserves ORIGINAL input format". If it wasn't in input, it has no "original format".
		// Maybe we should iterate over Model Keys too?
		// But Model Keys are getters.

		// Let's stick to current logic which iterates initData.
		// If the user wants full serialization including new props, they use serialize().
		// toInterface() is strictly "revert to input format".

		return result as T;
	}

	private convertToInterfaceFormat(
		currentValue: unknown,
		originalValue: unknown,
		seen: WeakSet<object>,
		isProduction: boolean,
		propertyKey: string = '',
		depth: number
	): unknown {
		// SECURITY: Prevent Stack Overflow in deep properties
		const MAX_DEPTH = 512;
		if (depth > MAX_DEPTH) {
			throw new Error(
				`QuickModel Security: Maximum recursion depth (${MAX_DEPTH}) exceeded during toInterface property conversion.`
			);
		}

		// 1. Handle null and undefined first
		if (currentValue === null) return null;
		if (currentValue === undefined) return undefined;
		if (typeof currentValue === 'function') return undefined;

		// 2. Check for circular references (only for objects)
		if (typeof currentValue === 'object' && currentValue !== null) {
			if (seen.has(currentValue)) {
				const returnValue = { __circular: true };
				const errorMsg = `QuickModel Error => [Circular reference] at property '${propertyKey}'`;

				if (!isProduction) {
					throw new Error(errorMsg);
				} else {
					console.error(errorMsg, returnValue);
					return returnValue;
				}
			}
			seen.add(currentValue);
		}

		// If no original value to compare, we must infer the interface format for complex types
		// This happens when adding new items to collections that weren't in the original data
		if (originalValue === undefined) {
			// Handle Nested QModels (Recursion)
			if (
				currentValue &&
				typeof currentValue === 'object' &&
				'toInterface' in currentValue &&
				typeof (
					currentValue as {
						toInterface: (
							s: WeakSet<object>,
							d?: number
						) => unknown;
					}
				).toInterface === 'function'
			) {
				return (
					currentValue as {
						toInterface: (
							s: WeakSet<object>,
							d?: number
						) => unknown;
					}
				).toInterface(seen, depth + 1);
			}

			// Handle Sets -> Array
			if (currentValue instanceof Set) {
				return Array.from(currentValue);
			}

			// Handle Maps -> Array of entries (standard QuickModel interface format)
			if (currentValue instanceof Map) {
				return Array.from(currentValue.entries());
			}

			return currentValue;
		}

		// 3. DATE: Check BEFORE generic string handling
		// originalValue can be Date instance OR ISO string
		if (
			originalValue instanceof Date ||
			(typeof originalValue === 'string' &&
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(originalValue))
		) {
			// If currentValue is a Date, convert to ISO string
			if (
				currentValue &&
				typeof currentValue === 'object' &&
				'toISOString' in currentValue &&
				typeof (currentValue as { toISOString: () => string })
					.toISOString === 'function'
			) {
				try {
					return (
						currentValue as { toISOString: () => string }
					).toISOString();
				} catch {
					// Invalid Date - return original value if available, otherwise string representation
					return typeof originalValue === 'string'
						? originalValue
						: String(currentValue);
				}
			}
			// If currentValue is already a string (no transformation occurred), return as-is
			if (typeof currentValue === 'string') {
				return currentValue;
			}
			// Fallback: convert to string
			return String(currentValue);
		}

		// 4. REGEXP: Check BEFORE generic string handling to preserve original format
		if (originalValue instanceof RegExp) {
			if (!(currentValue instanceof RegExp)) {
				return originalValue; // Return original RegExp
			}
			return currentValue; // Return current RegExp
		}

		// RegExp as string pattern
		if (
			typeof originalValue === 'string' &&
			currentValue instanceof RegExp
		) {
			if (originalValue.startsWith('/')) {
				return currentValue.toString(); // "/pattern/flags"
			} else {
				return currentValue.source; // "pattern"
			}
		}

		// RegExp as object
		if (
			originalValue &&
			typeof originalValue === 'object' &&
			'source' in originalValue &&
			'flags' in originalValue &&
			currentValue instanceof RegExp
		) {
			return { source: currentValue.source, flags: currentValue.flags };
		}

		// 5. PRIMITIVES: Preserve primitive type
		if (typeof originalValue === 'number') {
			// Includes NaN, Infinity, -Infinity as numbers
			return Number(currentValue);
		}

		if (typeof originalValue === 'string') {
			return String(currentValue);
		}

		if (typeof originalValue === 'boolean') {
			return Boolean(currentValue);
		}

		if (typeof originalValue === 'bigint') {
			return BigInt(currentValue as string | number | bigint | boolean);
		}

		if (typeof originalValue === 'symbol') {
			return typeof currentValue === 'symbol'
				? currentValue
				: Symbol(currentValue as string | number | undefined);
		}

		// 6. WRAPPER OBJECTS: Number, String, Boolean objects
		if (originalValue instanceof Number) {
			const primitiveValue =
				typeof currentValue === 'object' &&
				currentValue !== null &&
				'valueOf' in currentValue
					? currentValue.valueOf()
					: currentValue;
			return new Number(primitiveValue);
		}

		if (originalValue instanceof String) {
			const primitiveValue =
				typeof currentValue === 'object' &&
				currentValue !== null &&
				'valueOf' in currentValue
					? currentValue.valueOf()
					: currentValue;
			return new String(primitiveValue);
		}

		if (originalValue instanceof Boolean) {
			const primitiveValue =
				typeof currentValue === 'object' &&
				currentValue !== null &&
				'valueOf' in currentValue
					? currentValue.valueOf()
					: currentValue;
			return new Boolean(primitiveValue);
		}

		// 7. ARRAYS: Recursively convert elements
		if (Array.isArray(originalValue)) {
			if (!Array.isArray(currentValue)) {
				return [];
			}
			return currentValue.map((item: unknown, index: number) =>
				this.convertToInterfaceFormat(
					item,
					originalValue[index],
					seen,
					isProduction,
					`${propertyKey}[${index}]`
				)
			);
		}

		// 8. BIGINT: Always serialize to string
		if (
			originalValue &&
			typeof originalValue === 'object' &&
			'__type' in originalValue &&
			(originalValue as { __type: unknown }).__type === 'bigint'
		) {
			const bigintValue =
				typeof currentValue === 'bigint'
					? currentValue
					: BigInt(
							currentValue as string | number | bigint | boolean
						);
			return bigintValue.toString();
		}

		if (
			typeof originalValue === 'string' &&
			typeof currentValue === 'bigint'
		) {
			return currentValue.toString();
		}

		// 9. PLAIN OBJECTS: Recursively convert properties
		if (originalValue && typeof originalValue === 'object') {
			const typedOriginal = originalValue as Record<string, unknown>;
			const result: Record<string, unknown> = {};

			// Handle objects without constructor (Object.create(null))
			if (
				!('constructor' in typedOriginal) ||
				!typedOriginal.constructor
			) {
				const typedCurrent = currentValue as Record<string, unknown>;
				const resultNoProto = Object.create(null);
				for (const key in typedCurrent) {
					resultNoProto[key] = this.convertToInterfaceFormat(
						typedCurrent[key],
						typedOriginal[key],
						seen,
						isProduction,
						`${propertyKey}.${key}`
					);
				}
				return resultNoProto;
			}

			// Plain Object literal
			if (typedOriginal.constructor === Object) {
				// Ensure currentValue is also an object
				if (typeof currentValue !== 'object' || currentValue === null) {
					if (!isProduction) {
						throw new Error(
							`Cannot convert property "${propertyKey}": original was object but current is ${typeof currentValue}`
						);
					}
					console.error(
						`Cannot convert property "${propertyKey}": type mismatch`
					);
					return currentValue;
				}

				const typedCurrent = currentValue as Record<string, unknown>;
				for (const key in typedOriginal) {
					if (key in typedCurrent) {
						result[key] = this.convertToInterfaceFormat(
							typedCurrent[key],
							typedOriginal[key],
							seen,
							isProduction,
							`${propertyKey}.${key}`
						);
					}
				}
				return result;
			}

			// Objects with custom constructor: try to call toInterface
			// For QModel instances, call toInterface() recursively
			if (
				currentValue &&
				typeof currentValue === 'object' &&
				'toInterface' in currentValue &&
				typeof (
					currentValue as {
						toInterface: (s: WeakSet<object>) => unknown;
					}
				).toInterface === 'function'
			) {
				// Pass the 'seen' set to prevent infinite loops in recursive models
				return (
					currentValue as {
						toInterface: (s: WeakSet<object>) => unknown;
					}
				).toInterface(seen);
			}

			// For other objects, create plain object
			const typedCurrent = currentValue as Record<string, unknown>;

			for (const key in typedCurrent) {
				if (typeof typedCurrent[key] !== 'function') {
					result[key] = this.convertToInterfaceFormat(
						typedCurrent[key],
						typedOriginal[key],
						seen,
						isProduction,
						`${propertyKey}.${key}`
					);
				}
			}
			return result;
		}

		// Fallback for NULL original value but QModel current value (Recursion support for nullable fields)
		if (
			originalValue === null &&
			currentValue &&
			typeof currentValue === 'object' &&
			'toInterface' in currentValue &&
			typeof (
				currentValue as {
					toInterface: (s: WeakSet<object>) => unknown;
				}
			).toInterface === 'function'
		) {
			return (
				currentValue as {
					toInterface: (s: WeakSet<object>) => unknown;
				}
			).toInterface(seen);
		}

		return currentValue;
	}
}
