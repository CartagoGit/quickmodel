import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { TransformerLookupService } from '../../../core/services/transformer-lookup.service';

/**
 * Tool to list all available transformers in the registry.
 */
export class QListTransformersTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'list_transformers';
	description =
		'List all available data transformers in QuickModel (e.g., string, date, email).';
	schema = z.object({});

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
