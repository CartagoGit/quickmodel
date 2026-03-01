import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import { TransformerLookupService } from '../../../core/services/transformer-lookup.service';

/**
 * MCP tool that returns a sorted list of all transformer names registered in
 * the {@link TransformerLookupService} registry.
 *
 * @remarks
 * The list reflects the current default registrations (Date, BigInt, RegExp,
 * Map, Set, Symbol, Error, URL, TypedArray, Buffer, SpecialFloat, Primitive…).
 * Any custom transformers registered at runtime will also appear.
 *
 * @returns A `Promise<string[]>` of lowercase transformer identifiers,
 * e.g. `["bigint", "boolean", "date", "number", "string", ...]`.
 *
 * @see {@link QSimulateTransformationTool} — simulate a specific transformation
 * @see {@link QListValidatorsTool} — list built-in validator decorators
 * @see {@link QTransformerRegistry} — registry that backs this tool's list
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QListTransformersTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'list_transformers';
	description =
		'List all built-in data transformers registered in QuickModel. ' +
		'Each transformer corresponds to a type token accepted by @Quick() (e.g. Date, Number, Boolean, BigInt, Set, Map, RegExp, URL). ' +
		'Returns { transformers[] } — sorted list of all available transformer identifiers.';
	schema = z.object({});

	/**
	 * Returns a sorted list of all transformer identifiers registered in the built-in registry.
	 *
	 * @returns Sorted array of lowercase transformer names (e.g. `["bigint", "boolean", "date", ...]`).
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 * @see {@link QListValidatorsTool} — list built-in validator decorators
	 */
	execute(): Promise<string[]> {
		// Use the service to get the real list
		const service = new TransformerLookupService();
		const transformers = service.getAvailableTransformers();

		// If empty (shouldn't happen as default ones are registered in constructor), fallback
		if (transformers.length === 0) {
			return Promise.resolve([
				'string',
				'number',
				'boolean',
				'date',
				'bigint',
			]);
		}

		return Promise.resolve(transformers.sort());
	}
}
