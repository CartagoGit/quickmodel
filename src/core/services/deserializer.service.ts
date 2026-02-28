import 'reflect-metadata';
import { IQDeserializer } from '../interfaces/serializer.interface';
import { IQTransformer } from '../interfaces/transformer.interface';
import { IQTransformerKey } from '../registry/transformer.registry';
import { TransformerLookupService } from './transformer-lookup.service';
import { InstanceFactoryService } from './instance-factory.service';
import { PopulationService } from './population.service';
import {
	ValueTransformerService,
	IRecursiveDeserializer,
} from './value-transformer.service';
import { IntegrityService } from './integrity.service';
import { QConfig } from '../config/quick.config';
import { QModelError } from '../errors/quickmodel.error';
import { QUICK_OPTIONS_KEY } from '../constants/metadata-keys';

/** @internal Per-class cache for `validationTrigger` resolution — avoids `Reflect.getMetadata` + `QConfig.get()` on every `deserialize()` call. */
interface IQDeserializeTriggerCache {
	/** QConfig snapshot for invalidation */
	configRef: unknown;
	/** True when the resolved trigger is 'construction' */
	triggerOnConstruction: boolean;
}
const _DESERIALIZE_TRIGGER_CACHE = new WeakMap<
	Function,
	IQDeserializeTriggerCache
>();

/**
 * Service for deserializing plain data into model instances.
 *
 * Converts JSON-compatible objects into fully-typed QuickModel instances,
 * using registered transformers and reflection metadata for type conversions.
 *
 * @template TInterface - The input interface type (plain object)
 * @template TModel - The output model type
 *
 * @remarks
 * Acts as a facade/orchestrator — delegates to:
 * - `TransformerLookupService` (registry & defaults)
 * - `InstanceFactoryService` (object creation)
 * - `PopulationService` (data mapping)
 * - `ValueTransformerService` (type conversion)
 */
export class Deserializer<
	TInterface extends Record<string, unknown> = Record<string, unknown>,
	TModel = unknown,
>
	implements IQDeserializer<TInterface, TModel>, IRecursiveDeserializer
{
	/** @internal Service for resolving transformers by key or constructor name. */
	private readonly transformerLookup: TransformerLookupService;
	/** @internal Service for creating model instances. */
	private readonly instanceFactory: InstanceFactoryService;
	/** @internal Service that populates/hydrates a model instance from raw data. */
	private readonly populationService: PopulationService;
	/** @internal Service that coerces individual field values via the registered transformers. */
	private readonly valueTransformer: ValueTransformerService;
	/** @internal Service that validates model instances against `@QType()` integrity rules. */
	private readonly integrityService: IntegrityService;

	/**
	 * Creates a model deserializer.
	 */
	constructor(integrityService?: IntegrityService) {
		this.transformerLookup = new TransformerLookupService();
		this.instanceFactory = new InstanceFactoryService();
		this.integrityService = integrityService || new IntegrityService();
		this.valueTransformer = new ValueTransformerService(
			this.transformerLookup,
			this
		);
		this.populationService = new PopulationService(
			this.valueTransformer,
			this.transformerLookup,
			this
		);
	}

	/**
	 * Gets a registered transformer by key or constructor name.
	 * Delegated to TransformerLookupService.
	 *
	 * @param key - The key to look up
	 * @returns The registered transformer or undefined if not found
	 * @internal
	 */
	public getTransformer(
		key: IQTransformerKey
	): IQTransformer<unknown, unknown> | undefined {
		return this.transformerLookup.getTransformer(key);
	}

	/**
	 * Public helper to transform a single value based on a spec.
	 * Used by "Smart Setters" in QModel.
	 *
	 * @param value - The raw value to transform
	 * @param key - The property name (for context/errors)
	 * @param spec - The Type/Transformer specification (Date, [Date], custom obj, etc.)
	 * @returns The transformed value
	 */
	public transformValue(value: unknown, key: string, spec: unknown): unknown {
		const context = { propertyKey: key, className: 'SmartSetter' };

		// 1. Resolve transformer
		if (Array.isArray(spec)) {
			// Array logic
			if (!Array.isArray(value)) {
				// QuickModel generally expects array for array spec.
				if (value === null || value === undefined) return value;
				return value;
			}

			// Should reuse ValueTransformer logic for nested arrays
			// But spec here is likely [Type] or [[Type]] which maps to our internal usages
			const itemType = spec[0];
			// Check nesting depth by recursion or loop?
			// Simplified logic matching original implementation:
			return value.map((item) =>
				this.transformValue(item, key, itemType)
			);
		}

		// 2. Resolve single transformer
		// Check if spec is a registered key first
		const transformer = this.getTransformer(spec as any);
		if (transformer) {
			return transformer.deserialize(value, key, 'SmartSetter');
		}

		// 3. Fallback: Nested model check?
		// Using direct ValueTransformer check would require setting up proper context
		// Try simple recursion if spec is a class
		if (
			typeof spec === 'function' &&
			// Check if it looks like a model class (heuristic)
			(spec.prototype || (spec as any).create)
		) {
			// It's a nested model class
			if (value instanceof (spec as any)) return value;
			if (value && typeof value === 'object') {
				return this.deserialize(
					value as Record<string, unknown>,
					spec as new (data: any) => any
				);
			}
		}

		return this.valueTransformer.transformByDesignType(
			value,
			spec as Function,
			context
		);
	}

	/**
	 * Deserializes plain data into a model instance.
	 *
	 * @param data - Plain object to deserialize
	 * @param modelClass - Model class constructor
	 * @returns Fully-typed model instance
	 */
	deserialize<TData extends Record<string, unknown>, TResult = unknown>(
		data: TData,
		modelClass: new (data: TData) => TResult,
		context?: { visited?: WeakSet<object>; depth?: number }
	): TResult {
		// SECURITY: Prevent Stack Overflow
		const currentDepth = context?.depth || 0;
		const MAX_DEPTH = 512;
		if (currentDepth > MAX_DEPTH) {
			throw new Error(
				`QuickModel Security: Maximum recursion depth (${MAX_DEPTH}) exceeded during model deserialization.`
			);
		}

		// 1. Creation
		const instance = this.instanceFactory.createInstance(modelClass, data);

		// Return immediately if it was already an instance (handled inside createInstance check or here)
		if (data instanceof modelClass) return instance;

		// 2. Population
		this.populationService.populateInstance(
			instance as Record<string, unknown>,
			data,
			{ modelClass, context }
		);

		// 3. Validation (Trigger: 'construction')
		const globalConfig = QConfig.get();
		let triggerCache = _DESERIALIZE_TRIGGER_CACHE.get(modelClass);
		if (!triggerCache || triggerCache.configRef !== globalConfig) {
			const localOptions =
				(Reflect.getMetadata(QUICK_OPTIONS_KEY, modelClass) as
					| Record<string, unknown>
					| undefined) ?? {};
			const trigger =
				(localOptions.validationTrigger as string | undefined) ??
				(globalConfig.defaults?.validationTrigger as
					| string
					| undefined) ??
				'manual';
			triggerCache = {
				configRef: globalConfig,
				triggerOnConstruction: trigger === 'construction',
			};
			_DESERIALIZE_TRIGGER_CACHE.set(modelClass, triggerCache);
		}

		if (triggerCache.triggerOnConstruction) {
			const errors = this.integrityService.checkIntegrity(
				instance as Record<string, unknown>,
				{ modelClass }
			);
			if (errors.length > 0) {
				const errorMsgs = errors.map((err) => err.error).join('; ');
				throw new QModelError(
					`Integrity check failed during construction: ${errorMsgs}`
				);
			}
		}

		return instance;
	}

	/**
	 * Deserializes a JSON string into a model instance.
	 *
	 * @param json - JSON string to parse and deserialize
	 * @param modelClass - Model class constructor
	 * @returns Fully-typed model instance
	 * @throws {SyntaxError} If JSON parsing fails
	 */
	deserializeFromJson<TResult = TModel>(
		json: string,
		modelClass: new (data: Record<string, unknown>) => TResult
	): TResult {
		const data = JSON.parse(json) as Record<string, unknown>;
		return this.deserialize(data, modelClass);
	}
}
