import type { MockGenerator } from './mock-generator.service';
import type { MockType } from './mock-generator.service';

/**
 * Type-safe mock builder for QuickModel instances.
 * Each instance is specialized for a specific model class, providing strongly-typed mock generation.
 * 
 * @template TInstance - The model instance type (e.g., `User`)
 * @template TInterface - The interface type (e.g., `IUser`)
 * 
 * @example
 * ```typescript
 * const mockUser = User.mock().random();
 * const mockUsers = User.mock().array(5);
 * ```
 */
export class MockBuilder<TInstance, TInterface> {
	private _fieldsRegistered = false;

	/**
	 * Creates a new MockBuilder instance.
	 * 
	 * @param modelClass - The model class constructor
	 * @param mockGenerator - The mock generator service instance
	 */
	constructor(
		private readonly modelClass: new (data: TInterface) => TInstance,
		private readonly mockGenerator: MockGenerator
	) {}

	/**
	 * Ensures fields are registered by creating a dummy instance if needed.
	 * This is required for @Quick() decorated classes that register fields
	 * dynamically on first instantiation.
	 */
	private ensureFieldsRegistered(): void {
		if (!this._fieldsRegistered) {
			try {
				// Create sample data for all properties in the typeMap to trigger registration
				const typeMap = Reflect.getMetadata('__quickTypeMap__', this.modelClass) || {};
				const sampleData: Record<string, any> = {};
				
				for (const [key, value] of Object.entries(typeMap)) {
					// Generate appropriate sample data based on type
					if (value === Date) {
						sampleData[key] = new Date().toISOString();
					} else if (value === BigInt) {
						sampleData[key] = '1';
					} else if (value === Set) {
						sampleData[key] = [];
					} else if (value === Map) {
						sampleData[key] = {};
					} else if (value === Symbol) {
						sampleData[key] = 'Symbol(test)';
					} else if (value === RegExp) {
						sampleData[key] = '/test/';
					} else if (value === Error) {
						sampleData[key] = { message: 'test' };
					} else if (typeof value === 'function') {
						// Nested model or constructor
						sampleData[key] = {};
					} else if (Array.isArray(value)) {
						// Array with element type
						sampleData[key] = [];
					}
				}
				
				// Try to create an instance to trigger field registration
				new this.modelClass(sampleData as TInterface);
			} catch (e) {
				// If it fails, that's ok - fields might be already registered
			}
			this._fieldsRegistered = true;
		}
	}

	/**
	 * Generates a model instance with empty/default values.
	 * 
	 * @param overrides - Optional partial data to override default values
	 * @returns A new model instance with empty values
	 * 
	 * @example
	 * ```typescript
	 * const user = User.mock().empty({ name: 'John' });
	 * ```
	 */
	empty(overrides?: Partial<TInterface>): TInstance {
		this.ensureFieldsRegistered();
		const data = this.mockGenerator.generate(
			this.modelClass,
			'empty',
			overrides
		);
		return new this.modelClass(data);
	}

	/**
	 * Generates a model instance with random realistic values.
	 * Uses faker.js to generate random but realistic data.
	 * 
	 * @param overrides - Optional partial data to override generated values
	 * @returns A new model instance with random values
	 * 
	 * @example
	 * ```typescript
	 * const user = User.mock().random();
	 * // { name: 'Jane Smith', age: 32, email: 'jane.smith@example.com' }
	 * ```
	 */
	random(overrides?: Partial<TInterface>): TInstance {
		this.ensureFieldsRegistered();
		const data = this.mockGenerator.generate(
			this.modelClass,
			'random',
			overrides
		);
		return new this.modelClass(data);
	}

	/**
	 * Generates a model instance with sample/predictable values.
	 * Always returns the same deterministic data, useful for testing.
	 * 
	 * @param overrides - Optional partial data to override sample values
	 * @returns A new model instance with sample values
	 * 
	 * @example
	 * ```typescript
	 * const user = User.mock().sample();
	 * // Always returns: { name: 'Sample Name', age: 25, ... }
	 * ```
	 */
	sample(overrides?: Partial<TInterface>): TInstance {
		this.ensureFieldsRegistered();
		const data = this.mockGenerator.generate(
			this.modelClass,
			'sample',
			overrides
		);
		return new this.modelClass(data);
	}

	/**
	 * Generates a model instance with minimal required values.
	 * Only populates required fields, leaving optional fields undefined.
	 * 
	 * @param overrides - Optional partial data to override minimal values
	 * @returns A new model instance with minimal values
	 * 
	 * @example
	 * ```typescript
	 * const user = User.mock().minimal();
	 * // Only required fields populated
	 * ```
	 */
	minimal(overrides?: Partial<TInterface>): TInstance {
		this.ensureFieldsRegistered();
		const data = this.mockGenerator.generate(
			this.modelClass,
			'minimal',
			overrides
		);
		return new this.modelClass(data);
	}

	/**
	 * Generates a model instance with all fields populated.
	 * Includes both required and optional fields with realistic values.
	 * 
	 * @param overrides - Optional partial data to override full values
	 * @returns A new model instance with all fields populated
	 * 
	 * @example
	 * ```typescript
	 * const user = User.mock().full();
	 * // All fields including optional ones are populated
	 * ```
	 */
	full(overrides?: Partial<TInterface>): TInstance {
		this.ensureFieldsRegistered();
		const data = this.mockGenerator.generate(
			this.modelClass,
			'full',
			overrides
		);
		return new this.modelClass(data);
	}

	/**
	 * Generates a plain interface object with empty/default values (no model instance).
	 * Returns a plain JavaScript object instead of a model instance.
	 * 
	 * @param overrides - Optional partial data to override default values
	 * @returns A plain interface object with empty values
	 * 
	 * @example
	 * ```typescript
	 * const userData = User.mock().interfaceEmpty();
	 * // Returns: { name: '', age: 0, ... } (plain object, not User instance)
	 * ```
	 */
	interfaceEmpty(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(this.modelClass, 'empty', overrides);
	}

	/**
	 * Generates a plain interface object with random values (no model instance).
	 * 
	 * @param overrides - Optional partial data to override generated values
	 * @returns A plain interface object with random values
	 * 
	 * @example
	 * ```typescript
	 * const userData = User.mock().interfaceRandom();
	 * ```
	 */
	interfaceRandom(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(
			this.modelClass,
			'random',
			overrides
		);
	}

	/**
	 * Generates a plain interface object with sample/predictable values.
	 * 
	 * @param overrides - Optional partial data to override sample values
	 * @returns A plain interface object with sample values
	 */
	interfaceSample(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(
			this.modelClass,
			'sample',
			overrides
		);
	}

	/**
	 * Generates a plain interface object with minimal required values.
	 * 
	 * @param overrides - Optional partial data to override minimal values
	 * @returns A plain interface object with minimal values
	 */
	interfaceMinimal(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(
			this.modelClass,
			'minimal',
			overrides
		);
	}

	/**
	 * Generates a plain interface object with all fields populated.
	 * 
	 * @param overrides - Optional partial data to override full values
	 * @returns A plain interface object with all fields
	 */
	interfaceFull(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(this.modelClass, 'full', overrides);
	}

	/**
	 * Generates an array of model instances.
	 * 
	 * @param count - Number of instances to generate
	 * @param type - Type of mock data ('empty' | 'random' | 'sample' | 'minimal' | 'full')
	 * @param overrides - Optional function that receives index and returns overrides for each instance
	 * @returns Array of model instances
	 * 
	 * @throws {Error} If count is negative
	 * 
	 * @example
	 * ```typescript
	 * // Generate 5 random users
	 * const users = User.mock().array(5);
	 * 
	 * // Generate 3 users with custom values
	 * const users = User.mock().array(3, 'random', (i) => ({ name: `User ${i}` }));
	 * ```
	 */
	array(
		count: number,
		type: MockType = 'random',
		overrides?: (index: number) => Partial<TInterface>
	): TInstance[] {
		this.ensureFieldsRegistered();
		if (count < 0) {
			throw new Error(`Count must be non-negative, got ${count}`);
		}
		if (count === 0) {
			return [];
		}
		const dataArray = this.mockGenerator.generateArray(
			this.modelClass,
			count,
			type,
			overrides
		);
		return dataArray.map((data) => new this.modelClass(data));
	}

	/**
	 * Generates an array of plain interface objects (no model instances).
	 * 
	 * @param count - Number of objects to generate
	 * @param type - Type of mock data ('empty' | 'random' | 'sample' | 'minimal' | 'full')
	 * @param overrides - Optional function that receives index and returns overrides for each object
	 * @returns Array of plain interface objects
	 * 
	 * @throws {Error} If count is negative
	 * 
	 * @example
	 * ```typescript
	 * const usersData = User.mock().interfaceArray(5);
	 * // Returns plain objects, not User instances
	 * ```
	 */
	interfaceArray(
		count: number,
		type: MockType = 'random',
		overrides?: (index: number) => Partial<TInterface>
	): TInterface[] {
		if (count < 0) {
			throw new Error(`Count must be non-negative, got ${count}`);
		}
		if (count === 0) {
			return [];
		}
		return this.mockGenerator.generateArray(
			this.modelClass,
			count,
			type,
			overrides
		);
	}
}
