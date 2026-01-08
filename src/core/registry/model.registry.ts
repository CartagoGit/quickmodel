/**
 * Global registry for model classes and their property signatures.
 * 
 * Used for automatic type inference in arrays of models.
 * Maps property signatures (e.g., "email,id,name") to model classes.
 * 
 * @remarks
 * When deserializing arrays without explicit type information:
 * 1. Analyze first element's properties
 * 2. Look up model class by property signature
 * 3. Deserialize all elements using that class
 * 
 * @example
 * ```typescript
 * // Register a model
 * qModelRegistry.register(User, ['id', 'name', 'email']);
 * 
 * // Look up by properties
 * const data = { id: '1', name: 'John', email: 'john@test.com' };
 * const ModelClass = qModelRegistry.findByProperties(Object.keys(data));
 * // Returns: User
 * ```
 */

/**
 * Type for a model class constructor
 */
export type ModelConstructor = new (data: any) => any;

export interface IQModelRegistry {
  /**
   * Registers a model class with its property signature.
   * 
   * @param modelClass - The model class constructor
   * @param properties - Array of property names that define this model
   */
  register(modelClass: ModelConstructor, properties: string[]): void;

  /**
   * Finds a model class by analyzing object properties.
   * 
   * @param properties - Array of property names from an object
   * @returns The matching model class, or null if not found
   */
  findByProperties(properties: string[]): ModelConstructor | null;

  /**
   * Gets all registered property signatures.
   * 
   * @returns Array of registered signatures
   */
  getRegisteredSignatures(): string[];

  /**
   * Clears all registrations (mainly for testing).
   */
  clear(): void;
}

export class QModelRegistry implements IQModelRegistry {
  /**
   * Maps property signatures to model classes.
   * Key: "prop1,prop2,prop3" (sorted alphabetically)
   * Value: Model class constructor
   */
  private readonly registry = new Map<string, ModelConstructor>();

  /**
   * Registers a model class with its property signature.
   * 
   * @param modelClass - The model class constructor
   * @param properties - Array of property names that define this model
   */
  register(modelClass: ModelConstructor, properties: string[]): void {
    if (!modelClass || typeof modelClass !== 'function') {
      throw new Error('QModelRegistry.register: modelClass must be a constructor function');
    }

    if (!Array.isArray(properties) || properties.length === 0) {
      throw new Error(`QModelRegistry.register: ${modelClass.name} must have at least one property`);
    }

    const signature = this.createSignature(properties);
    
    // Check for conflicts - only warn in debug mode
    const existing = this.registry.get(signature);
    if (existing && existing !== modelClass) {
      // Only log in debug mode (set QUICKMODEL_DEBUG=1 to enable)
      if (process.env.QUICKMODEL_DEBUG === '1') {
        console.warn(
          `QModelRegistry: Signature "${signature}" is already registered for ${existing.name}. ` +
          `Overwriting with ${modelClass.name}.`
        );
      }
    }

    this.registry.set(signature, modelClass);
  }

  /**
   * Finds a model class by analyzing object properties.
   * 
   * @param properties - Array of property names from an object
   * @returns The matching model class, or null if not found
   */
  findByProperties(properties: string[]): ModelConstructor | null {
    if (!Array.isArray(properties) || properties.length === 0) {
      return null;
    }

    const signature = this.createSignature(properties);
    return this.registry.get(signature) || null;
  }

  /**
   * Gets all registered property signatures.
   * 
   * @returns Array of registered signatures
   */
  getRegisteredSignatures(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Clears all registrations (mainly for testing).
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * Creates a normalized signature from property names.
   * 
   * @param properties - Array of property names
   * @returns Comma-separated sorted property names
   * 
   * @example
   * createSignature(['name', 'id', 'email']) // => "email,id,name"
   */
  private createSignature(properties: string[]): string {
    return properties.slice().sort().join(',');
  }
}

/**
 * Global singleton instance of the model registry.
 */
export const qModelRegistry = new QModelRegistry();
