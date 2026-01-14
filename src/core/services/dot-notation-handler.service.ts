import 'reflect-metadata';
import {
	ValueTransformerService,
	IRecursiveDeserializer,
} from './value-transformer.service';
import { TransformerLookupService } from './transformer-lookup.service';
import { IQAdvancedOptions } from '../interfaces/quick-options.interface';
import { IQTransformContext } from '../interfaces/transformer.interface';
import { QUICK_OPTIONS_KEY } from '../constants/metadata-keys';

export class DotNotationHandler {
	constructor(
		private readonly transformerLookup: TransformerLookupService,
		private readonly valueTransformer: ValueTransformerService,
		private readonly recursiveDeserializer: IRecursiveDeserializer
	) {}

	public apply(
		instance: Record<string, unknown>,
		path: string,
		modelClass: Function,
		recursionContext?: { visited?: WeakSet<object> }
	): void {
		const parts = path.split('.');
		let current: Record<string, unknown> = instance;

		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
			// SECURITY: Prevent accessing/creating prototype properties via dot notation
			if (
				part === '__proto__' ||
				part === 'constructor' ||
				part === 'prototype'
			) {
				return;
			}

			if (!part || current[part] === undefined || current[part] === null)
				return;
			current = current[part] as Record<string, unknown>;
		}

		const lastKey = parts[parts.length - 1];
		// SECURITY
		if (
			lastKey === '__proto__' ||
			lastKey === 'constructor' ||
			lastKey === 'prototype'
		) {
			return;
		}
		if (!lastKey) return;
		const value = current[lastKey];
		if (value === undefined || value === null) return;

		const options: IQAdvancedOptions =
			Reflect.getMetadata(QUICK_OPTIONS_KEY, modelClass) || {};

		const context: IQTransformContext = {
			propertyKey: path,
			className: modelClass.name,
			metadata: {
				transformerOptions: options.transformerOptions?.[path],
			},
		};

		const fieldType = Reflect.getMetadata('fieldType', instance, path);
		if (fieldType) {
			const transformer =
				this.transformerLookup.getTransformer(fieldType);
			if (transformer) {
				current[lastKey] = transformer.deserialize(
					value,
					path,
					context.className,
					context
				);
				return;
			}
		}

		const arrayElementClass = Reflect.getMetadata(
			'arrayElementClass',
			instance,
			path
		);
		if (arrayElementClass) {
			if (Array.isArray(value)) {
				const transformableTypes: unknown[] = [
					Date,
					BigInt,
					Number,
					String,
					Boolean,
					RegExp,
					Symbol,
					Error,
					URL,
					URLSearchParams,
					Int8Array,
					Uint8Array,
					Uint8ClampedArray,
					Int16Array,
					Uint16Array,
					Int32Array,
					Uint32Array,
					Float32Array,
					Float64Array,
					BigInt64Array,
					BigUint64Array,
					ArrayBuffer,
					DataView,
				];

				if (transformableTypes.includes(arrayElementClass as unknown)) {
					current[lastKey] =
						this.valueTransformer.transformNestedArray(
							value,
							arrayElementClass,
							context,
							recursionContext
						);
				} else {
					current[lastKey] =
						this.valueTransformer.transformNestedModelArray(
							value,
							[arrayElementClass],
							undefined,
							context,
							recursionContext
						);
				}
			} else if (typeof value === 'object') {
				current[lastKey] = this.recursiveDeserializer.deserialize(
					value as Record<string, unknown>,
					arrayElementClass,
					recursionContext
				);
			}
		}
	}
}
