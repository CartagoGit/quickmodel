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
	private static readonly templateCache = new WeakMap<
		Function,
		Record<string, unknown> | null
	>();

	/**
	 * Gets a template instance of the model to inspect default values/methods.
	 * Used for intrinsic security checks.
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
	 * Checks if a key is a dangerous prototype pollution key
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
	 * Checks if a key corresponds to a method on the prototype chain.
	 * Used to prevent Method Shadowing attacks where payload data overwrites methods.
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
				// Accessors (getters/setters)
				if (
					typeof descriptor.get === 'function' ||
					typeof descriptor.set === 'function'
				) {
					return true;
				}
			}
			current = Object.getPrototypeOf(current);
		}
		return false;
	}

	/**
	 * Checks if a property is an arrow function method (instance property)
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
