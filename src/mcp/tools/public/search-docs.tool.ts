import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

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
			// Grep recursively in docs/ folder, case insensitive, show line number
			const cmd = `grep -rnC 2 -i "${args.query.replace(
				/"/g,
				'"'
			)}" docs/ docs-vitepress/guide`;
			const { stdout } = await execAsync(cmd).catch((e) => ({
				stdout: e.stdout || '',
			}));
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
