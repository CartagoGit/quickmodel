/**
 * SecurityInspector - Handles security validations during model population
 *
 * Responsibilities:
 * - Prototype pollution prevention
 * - Method shadowing detection
 * - Template instance creation for intrinsic checks
 * - Arrow function protection
 */
export class SecurityInspector {
	/** @internal Cache of template model instances keyed by constructor, used to inspect default values without mutating real instances. */
	private static readonly templateCache = new WeakMap<
		Function,
		Record<string, unknown> | null
	>();

	/**
	 * Gets or creates a cached template instance of a model class.
	 *
	 * Used for intrinsic security checks that need to inspect the default shape of a
	 * class without mutating a real instance (e.g. detecting arrow-function methods).
	 * Results are cached per constructor in a `WeakMap` so the costly instantiation
	 * only happens once per class.
	 *
	 * @param modelClass - The constructor function of the model class to inspect
	 * @returns A plain-record view of a freshly constructed instance, or `null` if the
	 *   class cannot be constructed without throwing.
	 */
	public getTemplateInstance(
		modelClass: Function
	): Record<string, unknown> | null {
		if (SecurityInspector.templateCache.has(modelClass)) {
			return SecurityInspector.templateCache.get(modelClass) || null;
		}

		try {
			let instance: unknown;
			try {
				// 1. Try to instantiate with no arguments
				instance = new (modelClass as unknown as new () => unknown)();
			} catch {
				// 2. Retry with empty object (common pattern for strict constructors)
				instance = new (modelClass as unknown as new (
					d: unknown
				) => unknown)({});
			}

			const record = instance as Record<string, unknown>;
			SecurityInspector.templateCache.set(modelClass, record);
			return record;
		} catch {
			// If constructor still throws (e.g. requires specific shape), we can't inspect it
			SecurityInspector.templateCache.set(modelClass, null);
			return null;
		}
	}

	/**
	 * Returns `true` when `key` is a known prototype-pollution vector.
	 *
	 * The blocked key set is: `__proto__`, `constructor`, `prototype`,
	 * `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`.
	 *
	 * @param key - The property name to test
	 * @returns `true` if the key is dangerous and should be silently skipped
	 */
	public isDangerousKey(key: string): boolean {
		return (
			key === '__proto__' ||
			key === 'constructor' ||
			key === 'prototype' ||
			key === '__defineGetter__' ||
			key === '__defineSetter__' ||
			key === '__lookupGetter__' ||
			key === '__lookupSetter__'
		);
	}

	/**
	 * Checks whether `key` resolves to a function method anywhere on the prototype chain.
	 *
	 * Used to prevent **Method Shadowing** attacks: an attacker supplying a payload
	 * object `{ toString: malicious }` would otherwise overwrite the prototype method.
	 * Accessor properties (getters/setters) are intentionally **not** treated as
	 * methods — they must be allowed so setter-backed fields keep working.
	 *
	 * @param proto - Prototype object to walk (typically `modelClass.prototype`)
	 * @param key - Property name to check
	 * @param decoratedFields - Field names explicitly declared as data properties;
	 *   if `key` is in this list the check is skipped and `false` is returned.
	 * @returns `true` when a non-accessor function with `key` is found on `proto` or
	 *   any ancestor up to (but not including) `Object.prototype`
	 */
	public isMethodOnPrototype(
		proto: any,
		key: string,
		decoratedFields: string[] = []
	): boolean {
		// If the property is explicitly decorated as a data field, we trust it.
		if (decoratedFields.includes(key)) {
			return false;
		}

		let current = proto;
		while (current && current !== Object.prototype) {
			const descriptor = Object.getOwnPropertyDescriptor(current, key);
			if (descriptor) {
				// Classic method definition
				if (typeof descriptor.value === 'function') {
					return true;
				}
				// Accessors (getters/setters) are NOT methods in this context.
				// We want to allow them so setters are triggered (Backing Field pattern).
				// Method Shadowing protection is specifically for protecting logic functions (methods).
			}
			current = Object.getPrototypeOf(current);
		}
		return false;
	}

	/**
	 * Checks whether `key` is an arrow-function method defined directly on a class
	 * instance (as opposed to a prototype method).
	 *
	 * Arrow-function class fields (`myMethod = () => {}`) are stored on the instance
	 * itself rather than on `prototype`. Without this check they would be
	 * indistinguishable from data properties, allowing an attacker to shadow them via
	 * a payload object.
	 *
	 * @param key - The property name to check
	 * @param template - A template instance from {@link getTemplateInstance}, or `null`
	 *   if the class could not be instantiated
	 * @param decoratedFields - Field names explicitly registered as data properties;
	 *   if `key` is in this list the check is skipped and `false` is returned.
	 * @returns `true` when `key` exists on `template`, its value is a function, and
	 *   it is not listed in `decoratedFields`
	 */
	public isArrowFunctionMethod(
		key: string,
		template: Record<string, unknown> | null,
		decoratedFields: string[]
	): boolean {
		// Using 'in' operator to check prototype chain if direct access fails or returns undefined
		if (
			template &&
			key in template &&
			typeof (template as any)[key] === 'function' &&
			!decoratedFields.includes(key)
		) {
			return true;
		}
		return false;
	}
}
