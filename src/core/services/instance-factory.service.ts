import 'reflect-metadata';

/**
 * Service responsible for creating model instances.
 *
 * This service applies SOLID principles:
 * - Single Responsibility: Only handles instance creation.
 */
export class InstanceFactoryService {
	/**
	 * Creates a bare instance of a model.
	 *
	 * @param modelClass - The model class constructor
	 * @param data - The data to initialize the model with
	 * @returns A new instance of the model class
	 */
	public createInstance<TData extends Record<string, unknown>, TResult>(
		modelClass: new (data: TData) => TResult,
		data: TData
	): TResult {
		// Return existing instance as-is
		if (data instanceof modelClass) {
			return data;
		}

		// Check if class has custom instance creation (from @Quick() decorator)
		const createQuickInstance = (
			modelClass as {
				__createQuickInstance?: (data: TData) => TResult;
			}
		).__createQuickInstance;

		if (createQuickInstance) {
			return createQuickInstance(data);
		}

		// Fallback to standard Object.create to avoid constructor side-effects
		// during deserialization (fields are populated later)
		return Object.create(modelClass.prototype);
	}
}
