import 'reflect-metadata';
import {
	IQTransformContext,
	IQTransformer,
} from '../interfaces/transformer.interface';
import { TransformerLookupService } from './transformer-lookup.service';
import { IQDiscriminatorConfig } from '../interfaces/quick-options.interface';

// Interface to avoid circular dependency
export interface IRecursiveDeserializer {
	deserialize(
		data: Record<string, unknown>,
		modelClass: new (data: any) => any,
		context?: { visited?: WeakSet<object> }
	): any;
}

/**
 * Service responsible for transforming single values based on metadata.
 */
export class ValueTransformerService {
	constructor(
		private readonly transformerLookup: TransformerLookupService,
		private readonly recursiveDeserializer: IRecursiveDeserializer
	) {}

	/**
	 * Transforms a nested array of primitive/transformable types.
	 * e.g. Date[][], BigInt[][][]
	 */
	public transformNestedArray(
		value: unknown[],
		elementClass: unknown,
		context: IQTransformContext,
		recursionContext?: { visited?: WeakSet<object> }
	): unknown[] {
		return value.map((item) => {
			if (item === null || item === undefined) return item;

			if (Array.isArray(item)) {
				return this.transformNestedArray(
					item,
					elementClass,
					context,
					recursionContext
				);
			}

			return this.transformByDesignType(
				item,
				elementClass as Function,
				context,
				recursionContext
			);
		});
	}

	/**
	 * Transforms a nested array of models.
	 * e.g. User[][], Post[][]
	 */
	public transformNestedModelArray(
		value: unknown[],
		possibleTypes: unknown[],
		discriminatorConfig?: IQDiscriminatorConfig,
		recursionContext?: { visited?: WeakSet<object> }
	): unknown[] {
		// Filter nulls/undefined for models
		const validItems = value.filter(
			(item) => item !== null && item !== undefined
		);

		return validItems.map((item) => {
			if (Array.isArray(item)) {
				return this.transformNestedModelArray(
					item,
					possibleTypes,
					discriminatorConfig,
					recursionContext
				);
			}

			let targetClass = possibleTypes[0] as new (data: any) => any;
			let matchFound = false;

			// Handle polymorphism via discriminator
			if (discriminatorConfig && possibleTypes.length > 0) {
				if (typeof discriminatorConfig === 'function') {
					try {
						const result = discriminatorConfig(item);
						if (result) {
							targetClass = result as new (data: any) => any;
							matchFound = true;
						}
					} catch (_) {
						// Ignore error, use default
					}
				} else if (typeof discriminatorConfig === 'string') {
					// Handle simple string case: discriminatorConfig is the field name
					const discriminatorValue = (item as any)[
						discriminatorConfig
					];

					if (typeof discriminatorValue === 'string') {
						// Try to match value to class name (case-insensitive)
						const match = possibleTypes.find(
							(type: any) =>
								type &&
								type.name &&
								type.name.toLowerCase() ===
									discriminatorValue.toLowerCase()
						);
						if (match) {
							targetClass = match as new (data: any) => any;
							matchFound = true;
						}
					}
				} else if (
					typeof discriminatorConfig === 'object' &&
					'field' in discriminatorConfig
				) {
					const { field, mapping } = discriminatorConfig;
					const discriminatorValue = (item as any)[field];

					if (
						discriminatorValue &&
						mapping &&
						mapping[discriminatorValue]
					) {
						targetClass = mapping[discriminatorValue] as new (
							data: any
						) => any;
						matchFound = true;
					}
				}
			}

			// Fallback: Best Guess if no discriminator match found
			if (!matchFound) {
				for (const type of possibleTypes) {
					if (!type) continue;

					// 1. Primitive Constructor check (String, Number, Boolean)
					// If we find an explicit primitive match, return it immediately
					if (type === String && typeof item === 'string')
						return item;
					if (type === Number && typeof item === 'number')
						return item;
					if (type === Boolean && typeof item === 'boolean')
						return item;

					// 2. Instance check (e.g. valid Date, valid Model instance)
					if (item instanceof (type as any)) {
						return item; // Already transformed/correct type
					}
				}

				// Secondary pass: finding a matching transformer
				for (const type of possibleTypes) {
					if (!type) continue;

					// Heuristic: If it's a date string and type is Date
					if (
						type === Date &&
						typeof item === 'string' &&
						/^\d{4}-\d{2}-\d{2}/.test(item)
					) {
						targetClass = Date;
						matchFound = true;
						break;
					}

					// Generic transformer check could go here if needed
				}
			}

			// If still no match and it's a primitive, we might want to return it as is if it's not an object
			// This handles cases where mixed arrays have primitives but 'String' etc wasn't explicitly in possibleTypes
			// (Though usually it should be if configured correctly)
			if (
				!matchFound &&
				typeof item !== 'object' &&
				typeof item !== 'function'
			) {
				return item;
			}

			// Handle Primitive Constructors as target (avoid recursiveDeserializer for them)
			if (targetClass === String) return String(item);
			if (targetClass === Number) return Number(item);
			if (targetClass === Boolean) return Boolean(item);

			// If target class has a custom transformer, use it
			if (this.transformerLookup.getTransformer(targetClass as any)) {
				const transformer = this.transformerLookup.getTransformer(
					targetClass as any
				);
				if (transformer) {
					return transformer.deserialize(
						item,
						'arrayItem',
						targetClass.name
					);
				}
			}

			return this.recursiveDeserializer.deserialize(
				item as Record<string, unknown>,
				targetClass,
				recursionContext
			);
		});
	}

	/**
	 * Transforms a value based on its design:type metadata.
	 */
	public transformByDesignType(
		value: unknown,
		designType: Function | undefined,
		context: IQTransformContext,
		recursionContext?: { visited?: WeakSet<object> }
	): unknown {
		// Null/Undefined check - Pass through
		if (value === null || value === undefined) {
			return value;
		}

		// Check for __type marker FIRST (highest priority)
		const detectedTransformer = this.detectTransformerFromValue(value);
		if (detectedTransformer) {
			return detectedTransformer.deserialize(
				value,
				context.propertyKey,
				context.className
			);
		}

		// If no designType, return value as-is
		if (!designType) {
			return value;
		}

		// Primitives & Built-ins
		if (designType === Date) {
			const transformer = this.transformerLookup.getTransformer('date');
			if (transformer)
				return transformer.deserialize(
					value,
					context.propertyKey,
					context.className
				);
			if (
				typeof value === 'string' ||
				typeof value === 'number' ||
				value instanceof Date
			)
				return new Date(value);
			throw new Error(
				`${context.className}.${context.propertyKey}: Invalid Date value`
			);
		}

		if (designType === BigInt) {
			const transformer = this.transformerLookup.getTransformer('bigint');
			if (transformer)
				return transformer.deserialize(
					value,
					context.propertyKey,
					context.className
				);
			if (typeof value === 'string' || typeof value === 'number')
				return BigInt(value);
			if (typeof value === 'bigint') return value;
		}

		// Check via registry
		const transformer = this.transformerLookup.getTransformer(
			designType as any
		);
		if (transformer) {
			return transformer.deserialize(
				value,
				context.propertyKey,
				context.className
			);
		}

		return value;
	}

	private detectTransformerFromValue(
		value: unknown
	): IQTransformer<unknown> | undefined {
		if (value === null || value === undefined) return undefined;

		// ISO 8601 date format check
		if (typeof value === 'string') {
			if (
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value)
			) {
				return this.transformerLookup.getTransformer('date');
			}
		}

		// Check for Map/Set/RegExp/Symbol/BigInt/Error/Buffer serialized with __type marker
		if (
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value)
		) {
			const obj = value as Record<string, unknown>;
			const typeValue = obj.__type;

			if (typeof typeValue === 'string') {
				return this.transformerLookup.getTransformer(
					typeValue.toLowerCase()
				);
			}
		}

		return undefined;
	}
}
