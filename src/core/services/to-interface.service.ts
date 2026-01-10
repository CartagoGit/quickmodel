/**
 * Service for converting model instances back to their original interface format.
 *
 * **IMPORTANT:** This service does NOT serialize to JSON. It preserves the EXACT format
 * that was provided in the model constructor (__initData).
 *
 * **Key difference from serializer.service.ts:**
 * - `serializer.serialize()` → Converts to JSON-compatible format (Date → ISO string, BigInt → string, etc.)
 * - `toInterface.toInterface()` → Preserves ORIGINAL input format from constructor
 *
 * @template TModel - The model type (extends Record)
 * @template TInterface - The original interface type (from constructor input)
 *
 * @remarks
 * **Use cases for toInterface():**
 * - Comparing current state vs initial state: `model.toInterface() === model.getInitInterface()`
 * - Change detection: `model.hasChanges()`, `model.getChanges()`
 * - Form reset: restore original values
 * - API responses: return data in same format as received
 *
 * **How it works:**
 * 1. Reads `__initData` (stored BEFORE transformations in constructor)
 * 2. For each property, compares `originalValue` (from __initData) vs `currentValue` (from model)
 * 3. Returns values preserving the ORIGINAL type/format:
 *    - If input was `string "2024-01-01"` → returns string (NOT Date object)
 *    - If input was `string "999999"` → returns string (NOT bigint)
 *    - If input was `RegExp /test/` → returns RegExp (NOT string)
 *    - If input was `string "^test$"` → returns string (NOT RegExp)
 *
 * @example
 * **Example 1: Date as string input**
 * ```typescript
 * const user = new User({
 *   createdAt: '2024-01-01T00:00:00.000Z'  // String input
 * });
 *
 * user.createdAt;           // Date object (transformed)
 * user.toInterface();       // { createdAt: '2024-01-01T00:00:00.000Z' } - STRING preserved
 * user.serialize();         // { createdAt: '2024-01-01T00:00:00.000Z' } - ISO string
 * ```
 *
 * @example
 * **Example 2: BigInt as string input**
 * ```typescript
 * const account = new Account({
 *   balance: '999999999999999'  // String input
 * });
 *
 * account.balance;          // 999999999999999n (bigint transformed)
 * account.toInterface();    // { balance: '999999999999999' } - STRING preserved
 * account.serialize();      // { balance: '999999999999999' } - string for JSON
 * ```
 *
 * @example
 * **Example 3: RegExp as string vs RegExp input**
 * ```typescript
 * // Case A: String input
 * const model1 = new Model({ pattern: '^test$' });
 * model1.pattern;          // /^test$/ (RegExp transformed)
 * model1.toInterface();    // { pattern: '^test$' } - STRING preserved
 *
 * // Case B: RegExp input
 * const model2 = new Model({ pattern: /^test$/ });
 * model2.pattern;          // /^test$/ (RegExp)
 * model2.toInterface();    // { pattern: /^test$/ } - REGEXP preserved
 * model2.serialize();      // { pattern: { source: '^test$', flags: '' } } - object for JSON
 * ```
 *
 * @example
 * **Example 4: Change detection**
 * ```typescript
 * const user = new User({ name: 'John', age: 30 });
 *
 * user.name = 'Jane';
 * user.hasChanges();       // true
 * user.getChanges();       // { name: 'Jane' }
 * user.getInitInterface(); // { name: 'John', age: 30 } - original
 * user.toInterface();      // { name: 'Jane', age: 30 } - current
 * ```
 */

export class ToInterfaceService<
	TModel extends Record<string, unknown> = Record<string, unknown>,
	TInterface extends Record<string, unknown> = any
> {
	/**
	 * Converts model to interface format, preserving original input types.
	 *
	 * @param model - The model instance to convert
	 * @returns Plain object with values in their ORIGINAL input format
	 *
	 * @remarks
	 * Preserves the EXACT format that was provided in the constructor (__initData).
	 * - If Date was provided as ISO string → returns ISO string
	 * - If BigInt was provided as string → returns string
	 * - If RegExp was provided as string → returns string
	 * - If RegExp was provided as RegExp → returns RegExp
	 *
	 * This method does NOT serialize to JSON. Use `serialize()` for JSON output.
	 */
	toInterface<T extends Record<string, unknown> = TInterface>(model: TModel): T {
		const result: Record<string, unknown> = {};
		const seen = new WeakSet(); // Track circular references
		const initData = (model as any).__initData || {};
		const isProduction = process.env.NODE_ENV === 'production';

		// ONLY iterate over properties that were in the original initData
		// Return current values, but preserve original format based on __initData type
		for (const key of Object.keys(initData)) {
			const currentValue = (model as any)[key];
			const originalValue = initData[key];

			// Convert to interface format, preserving original type
			result[key] = this.convertToInterfaceFormat(
				currentValue,
				originalValue,
				seen,
				isProduction,
				key
			);
		}

		return result as T;
	}

	/**
	 * Converts a value to interface format, preserving the original type from __initData.
	 *
	 * @param currentValue - The current value from the model instance
	 * @param originalValue - The original value from __initData (constructor input)
	 * @param seen - WeakSet for circular reference detection
	 * @param isProduction - Production mode flag
	 * @param propertyKey - Property name for error messages
	 * @returns Value in original format
	 *
	 * @remarks
	 * Logic priority (order matters):
	 * 1. null/undefined → return as-is
	 * 2. Circular references → error or __circular marker
	 * 3. **Date handling** (BEFORE generic string check):
	 *    - If originalValue is Date or ISO string → convert currentValue to ISO string
	 * 4. **RegExp handling** (BEFORE generic string check):
	 *    - If originalValue is RegExp → return currentValue as RegExp
	 *    - If originalValue is string + currentValue is RegExp → return string (source or toString)
	 *    - If originalValue is object {source, flags} → return object
	 * 5. **Primitives** (number, string, boolean, bigint, symbol) → cast to original type
	 * 6. **Wrapper objects** (Number, String, Boolean) → return wrapper
	 * 7. **Arrays** → recursively process elements
	 * 8. **BigInt special formats** (__type: 'bigint' or string) → convert appropriately
	 * 9. **Plain objects** → recursively process properties
	 * 10. Fallback → return currentValue
	 */
	private convertToInterfaceFormat(
		currentValue: any,
		originalValue: any,
		seen: WeakSet<object>,
		isProduction: boolean,
		propertyKey: string = ''
	): any {
		// 1. Handle null and undefined first
		if (currentValue === null) return null;
		if (currentValue === undefined) return undefined;

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

		// If no original value to compare, return currentValue as-is
		if (originalValue === undefined) {
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
			if (typeof currentValue?.toISOString === 'function') {
				try {
					return currentValue.toISOString();
				} catch {
					// Invalid Date - return original value if available, otherwise string representation
					return typeof originalValue === 'string' ? originalValue : String(currentValue);
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
		if (typeof originalValue === 'string' && currentValue instanceof RegExp) {
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
			return BigInt(currentValue);
		}

		if (typeof originalValue === 'symbol') {
			return typeof currentValue === 'symbol' ? currentValue : Symbol(currentValue);
		}

		// 6. WRAPPER OBJECTS: Number, String, Boolean objects
		if (originalValue instanceof Number) {
			// Extract primitive value if currentValue is also a wrapper
			const primitiveValue =
				typeof currentValue === 'object' && currentValue !== null && 'valueOf' in currentValue
					? currentValue.valueOf()
					: currentValue;
			return new Number(primitiveValue);
		}

		if (originalValue instanceof String) {
			const primitiveValue =
				typeof currentValue === 'object' && currentValue !== null && 'valueOf' in currentValue
					? currentValue.valueOf()
					: currentValue;
			return new String(primitiveValue);
		}

		if (originalValue instanceof Boolean) {
			const primitiveValue =
				typeof currentValue === 'object' && currentValue !== null && 'valueOf' in currentValue
					? currentValue.valueOf()
					: currentValue;
			return new Boolean(primitiveValue);
		}

		// 7. ARRAYS: Recursively convert elements
		if (Array.isArray(originalValue)) {
			if (!Array.isArray(currentValue)) {
				return [];
			}
			return currentValue.map((item: any, index: number) =>
				this.convertToInterfaceFormat(
					item,
					originalValue[index],
					seen,
					isProduction,
					`${propertyKey}[${index}]`
				)
			);
		}

		// 8. BIGINT: Preserve original format
		if (originalValue && typeof originalValue === 'object' && originalValue.__type === 'bigint') {
			const bigintValue = typeof currentValue === 'bigint' ? currentValue : BigInt(currentValue);
			return { __type: 'bigint', value: bigintValue.toString() };
		}

		if (typeof originalValue === 'string' && typeof currentValue === 'bigint') {
			return currentValue.toString();
		}

		// 9. PLAIN OBJECTS: Recursively convert properties
		if (originalValue && typeof originalValue === 'object') {
			const result: any = {};

			// Handle objects without constructor (Object.create(null))
			if (!originalValue.constructor) {
				const resultNoProto = Object.create(null);
				for (const key in currentValue) {
					resultNoProto[key] = this.convertToInterfaceFormat(
						currentValue[key],
						originalValue[key],
						seen,
						isProduction,
						`${propertyKey}.${key}`
					);
				}
				return resultNoProto;
			}

			// Plain Object literal
			if (originalValue.constructor === Object) {
				// Ensure currentValue is also an object
				if (typeof currentValue !== 'object' || currentValue === null) {
					if (!isProduction) {
						throw new Error(
							`Cannot convert property "${propertyKey}": original was object but current is ${typeof currentValue}`
						);
					}
					console.error(`Cannot convert property "${propertyKey}": type mismatch`);
					return currentValue;
				}

				for (const key in originalValue) {
					if (key in currentValue) {
						result[key] = this.convertToInterfaceFormat(
							currentValue[key],
							originalValue[key],
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
			if (typeof currentValue?.toInterface === 'function') {
				return currentValue.toInterface();
			}

			// For other objects, create plain object
			for (const key in currentValue) {
				if (typeof currentValue[key] !== 'function') {
					result[key] = this.convertToInterfaceFormat(
						currentValue[key],
						originalValue[key],
						seen,
						isProduction,
						`${propertyKey}.${key}`
					);
				}
			}
			return result;
		}

		// 10. Fallback: return currentValue as-is
		return currentValue;
	}
}
