import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { spawn } from 'child_process';

/**
 * Tool to search the documentation.
 */
export class QSearchDocsTool extends QAbstractTool<
	z.ZodObject<{ query: z.ZodString }>
> {
	name = 'search_docs';
	description = 'Search the QuickModel documentation for a query string.';
	schema = z.object({
		query: z.string().describe('The search term or phrase'),
	});

	async execute(args: { query: string }): Promise<{ matches: string[] }> {
		try {
			// Use spawn to avoid shell injection vulnerabilities
			const grepArgs = [
				'-rnC',
				'2',
				'-i',
				'-e', // Treat next argument as pattern, preventing flag injection
				args.query,
				'docs/',
				'docs-vitepress/guide',
			];

			const child = spawn('grep', grepArgs);

			let stdout = '';

			// Collect stdout
			for await (const chunk of child.stdout) {
				stdout += chunk;
			}

			// Wait for process to exit
			await new Promise((resolve) => {
				child.on('close', resolve);
			});

			const lines = stdout
				.split('\n')
				.filter((block: string) => block.length > 0)
				.slice(0, 20); // Limit results
			return { matches: lines };
		} catch (_error) {
			return { matches: [] };
		}
	}
}
