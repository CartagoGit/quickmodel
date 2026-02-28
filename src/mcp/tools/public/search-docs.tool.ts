import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import { spawn } from 'child_process';

/**
 * MCP tool that performs a case-insensitive full-text search over the
 * QuickModel documentation files (`docs/` and `docs-vitepress/guide/`).
 *
 * @remarks
 * Internally uses `grep -rnC2` for context-aware matches, sanitised via
 * `spawn` to prevent shell-injection attacks.
 * Results are capped at 20 lines to keep the response size manageable.
 *
 * @returns `{ matches: string[] }` — up to 20 matching lines with 2 lines of
 * surrounding context.
 *
 * @see {@link QExplainErrorTool} — explain a specific QuickModel error
 * @see {@link QInspectModelTool} — inspect a model definition
 * @see {@link QCheckMissingJSDocsTool} — scan for undocumented exports
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QSearchDocsTool extends QAbstractTool<
	z.ZodObject<{ query: z.ZodString }>
> {
	name = 'search_docs';
	description = 'Search the QuickModel documentation for a query string.';
	schema = z.object({
		query: z.string().describe('The search term or phrase'),
	});

	/**
	 * Searches the project documentation for a given term using `grep`.
	 *
	 * @param args - Tool arguments.
	 * @param args.query - The search term or phrase to look for (case-insensitive).
	 * @returns `{ matches }` — array of matching lines with 2 lines of context each.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 * @see {@link QExplainErrorTool} — explain a specific QuickModel error message
	 */
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
