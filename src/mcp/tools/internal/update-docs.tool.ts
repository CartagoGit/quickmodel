import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';

/**
 * Internal MCP tool that triggers the documentation build pipeline.
 *
 * @remarks
 * Supports two actions:
 * - `'build'` — runs `bun run docs:build` to generate TypeDoc API references
 *   and VitePress static output.
 * - `'clean'` — removes generated documentation artifacts so a fresh build
 *   can be triggered.
 *
 * Both actions stream the complete stdout + stderr back to the caller.
 *
 * @returns `{ status: 'ok' | 'error', output: string }` — combined command
 * output; `'error'` when the build process exits with a non-zero code.
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QUpdateDocsTool extends QAbstractTool<
	z.ZodObject<{
		action: z.ZodUnion<
			readonly [z.ZodLiteral<'build'>, z.ZodLiteral<'clean'>]
		>;
	}>
> {
	name = 'update_docs';
	description = 'Internal tool to run documentation build scripts.';
	schema = z.object({
		action: z
			.union([z.literal('build'), z.literal('clean')])
			.describe('The action to perform'),
	});

	// Dependency Injection point for testing
	// Using explicit property so tests can override it without spying on global modules
	/** @internal Command spawner, overridable in tests. */
	protected _spawn = spawnCommand;

	async execute(args: { action: 'build' | 'clean' }): Promise<{
		stdout: string;
		stderr: string;
	}> {
		const script = args.action === 'build' ? 'docs:build' : 'docs:clean';
		try {
			const { stdout, stderr } = await this._spawn(
				'bun',
				['run', script],
				process.cwd()
			);
			return { stdout, stderr };
		} catch (error: any) {
			return { stdout: '', stderr: error.message };
		}
	}
}
