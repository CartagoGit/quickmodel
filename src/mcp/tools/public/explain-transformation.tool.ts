import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import { Quick } from '../../../core/decorators/quick.decorator';
import { QModel } from '../../../core/models/quick.model';

/**
 * A per-field transformation trace entry.
 * @see {@link QExplainTransformationTool} — tool that produces these trace entries
 * @internal
 */
interface ITransformTrace {
	field: string;
	inputValue: unknown;
	inputType: string;
	transformer: string;
	outputValue: unknown;
	outputType: string;
	explanation: string;
}

/**
 * Result returned by {@link QExplainTransformationTool}.
 * @see {@link QExplainTransformationTool} — tool whose `execute` returns this shape
 * @internal
 */
interface IExplainTransformationResult {
	trace: ITransformTrace[];
	result: unknown;
	summary: string;
}

/**
 * Maps a QuickModel type token (string or constructor) to a human-readable
 * transformer name and explanation.
 * @see {@link QExplainTransformationTool} — tool that calls this mapping helper
 * @internal
 */
function describeTransformer(typeToken: unknown): {
	name: string;
	explanation: string;
} {
	if (typeToken === Date || typeToken === 'Date') {
		return {
			name: 'QDateTransformer',
			explanation:
				'Coerces ISO 8601 strings, timestamps (number), or Date objects into a Date instance. Serializes back to ISO string via toJSON().',
		};
	}
	if (typeToken === BigInt || typeToken === 'BigInt') {
		return {
			name: 'QBigIntTransformer',
			explanation:
				'Coerces numbers, strings, or booleans to BigInt. Serializes back to string to preserve precision.',
		};
	}
	if (typeToken === RegExp || typeToken === 'RegExp') {
		return {
			name: 'QRegExpTransformer',
			explanation:
				'Coerces { source, flags } objects or regex literal strings to RegExp instances. Serializes back to { source, flags }.',
		};
	}
	if (typeToken === Map || typeToken === 'Map') {
		return {
			name: 'QMapTransformer',
			explanation:
				'Coerces array of [key, value] pairs or plain objects to a Map. Serializes back to array of pairs.',
		};
	}
	if (typeToken === Set || typeToken === 'Set') {
		return {
			name: 'QSetTransformer',
			explanation:
				'Coerces arrays or iterables to a Set (deduplicates). Serializes back to array.',
		};
	}
	if (typeToken === 'string') {
		return {
			name: 'QPrimitiveTransformer (string)',
			explanation:
				'Coerces value to string via String(). Numbers, booleans, and null become their string representation.',
		};
	}
	if (typeToken === 'number') {
		return {
			name: 'QPrimitiveTransformer (number)',
			explanation:
				'Coerces value to number via Number(). Strings like "42" become 42. Non-numeric strings produce NaN.',
		};
	}
	if (typeToken === 'boolean') {
		return {
			name: 'QPrimitiveTransformer (boolean)',
			explanation:
				'Coerces value to boolean via Boolean(). Empty strings, 0, null, undefined become false.',
		};
	}
	if (Array.isArray(typeToken)) {
		const inner = describeTransformer(typeToken[0]);
		return {
			name: `QArrayTransformer<${inner.name}>`,
			explanation: `Coerces each element of the input array using ${inner.name}. Non-array inputs are wrapped in an array first.`,
		};
	}
	if (typeof typeToken === 'string') {
		return {
			name: `CustomTransformer(${typeToken})`,
			explanation: `Uses a custom-registered transformer with key "${typeToken}". Check QTransformerRegistry for the registered handler.`,
		};
	}
	return {
		name: 'QPrimitiveTransformer (identity)',
		explanation:
			'No transformer configured for this field — value is passed through as-is.',
	};
}

/** Returns a human-readable type label for a runtime value. */
function typeLabel(val: unknown): string {
	if (val === null) return 'null';
	if (val === undefined) return 'undefined';
	if (val instanceof Date) return 'Date';
	if (val instanceof RegExp) return 'RegExp';
	if (val instanceof Map) return 'Map';
	if (val instanceof Set) return 'Set';
	if (typeof val === 'bigint') return 'bigint';
	if (Array.isArray(val)) return 'Array';
	return typeof val;
}

/**
 * Public MCP tool that explains step-by-step how QuickModel transforms each
 * field in a given input object, given a `@Quick()` configuration map.
 *
 * @remarks
 * Unlike `simulate_transformation` (which only returns the transformed result),
 * this tool returns a per-field **trace** showing:
 * - which transformer was activated and why
 * - the raw input value and its type
 * - the transformed output value and its type
 * - a plain-English explanation of the transformer's behaviour
 *
 * This is the "verbose/debug" companion to `simulate_transformation` and is
 * particularly useful for onboarding, debugging unexpected coercions, and
 * understanding which transformer handles each type.
 *
 * @returns `{ trace, result, summary }` — `trace` is one entry per field,
 * `result` is the fully serialized output (same as `simulate_transformation`).
 *
 * @see {@link QSimulateTransformationTool} — faster version without field traces
 * @see {@link QListTransformersTool} — enumerate all registered transformers
 * @see {@link QCheckIntegrityTool} — validate integrity constraints on transformed data
 *
 * @public Part of the QuickModel MCP public tool surface.
 */
export class QExplainTransformationTool extends QAbstractTool<
	z.ZodObject<{
		data: z.ZodRecord<z.ZodString, z.ZodAny>;
		options: z.ZodRecord<z.ZodString, z.ZodAny>;
	}>
> {
	name = 'explain_transformation';
	description =
		'Explains step-by-step how QuickModel transforms each field in an input object. ' +
		'For each field: shows which transformer was activated, the input value/type, ' +
		'output value/type, and a plain-English explanation. ' +
		'Use this to debug unexpected coercions or understand transformer behaviour. ' +
		'Returns { trace: [{ field, inputValue, inputType, transformer, outputValue, outputType, explanation }], result, summary }.';

	schema = z.object({
		data: z
			.record(z.string(), z.any())
			.describe(
				'The raw input data object (same as simulate_transformation)'
			),
		options: z
			.record(z.string(), z.any())
			.describe(
				'The @Quick() configuration map (e.g. { createdAt: "Date", count: "number" })'
			),
	});

	/**
	 * Runs the transformation and builds a per-field trace.
	 *
	 * @param args - Tool arguments.
	 * @param args.data - Raw input data.
	 * @param args.options - `@Quick()` transformer config.
	 * @returns `{ trace, result, summary }`.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 */
	async execute(args: {
		data: Record<string, unknown>;
		options: Record<string, unknown>;
	}): Promise<IExplainTransformationResult> {
		await Promise.resolve();
		const hydratedOptions = this.hydrateOptions(args.options);

		@Quick(hydratedOptions)
		/** @internal Ephemeral model for transformation trace. */
		class TraceModel extends QModel<any> {
			[key: string]: any;
		}

		const instance = TraceModel.create(args.data);
		const serialized = JSON.parse(instance.$qToJSON());

		// Build per-field trace
		const allFields = new Set([
			...Object.keys(args.data),
			...Object.keys(args.options),
		]);

		const trace: ITransformTrace[] = [];

		for (const field of allFields) {
			const inputVal = args.data[field];
			const typeToken = args.options[field];
			const { name: transformerName, explanation } =
				typeToken !== undefined
					? describeTransformer(typeToken)
					: {
							name: 'identity (no transformer)',
							explanation:
								'Field is not in the @Quick() config — value passed through unchanged.',
						};

			const outputVal = serialized[field];

			trace.push({
				field,
				inputValue: inputVal,
				inputType: typeLabel(inputVal),
				transformer: transformerName,
				outputValue: outputVal,
				outputType: typeLabel(outputVal),
				explanation,
			});
		}

		const transformedCount = trace.filter(
			(traceItem) => traceItem.transformer !== 'identity (no transformer)'
		).length;
		const summary = `Traced ${trace.length} field(s): ${transformedCount} transformed, ${trace.length - transformedCount} passed through unchanged`;

		return { trace, result: serialized, summary };
	}

	/**
	 * Hydrates string type tokens into the corresponding global constructors.
	 *
	 * @param options - Raw options object from the MCP call.
	 * @returns Hydrated options suitable for `@Quick()`.
	 */
	private hydrateOptions(options: any): any {
		if (typeof options === 'string') {
			switch (options) {
				case 'Date':
					return Date;
				case 'BigInt':
					return BigInt;
				case 'RegExp':
					return RegExp;
				case 'Map':
					return Map;
				case 'Set':
					return Set;
				default:
					return options;
			}
		}
		if (Array.isArray(options)) {
			return options.map((item: any) => this.hydrateOptions(item));
		}
		if (typeof options === 'object' && options !== null) {
			const hydrated: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(options)) {
				hydrated[key] = this.hydrateOptions(val);
			}
			return hydrated;
		}
		return options;
	}
}
