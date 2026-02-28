import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { join } from 'path';

/**
 * Internal MCP tool that scans the `src/` directory for exported members
 * (classes, functions, interfaces, constants) that are missing JSDoc blocks.
 *
 * @remarks
 * Uses a custom file-walk + regex approach (no TypeScript compiler) so it
 * runs instantly without a build step.
 *
 * @returns `{ filesWithMissingDocs: string[], summary: string }` — a list of
 * file paths where at least one exported member lacks JSDoc, plus a human-
 * readable summary count.
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QCheckMissingJSDocsTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'check_jsdocs';
	description =
		'Scan the source code for exported members that are missing JSDoc documentation.';
	schema = z.object({});

	protected _fs = fs;

	async execute(): Promise<{
		filesWithMissingDocs: string[];
		summary: string;
	}> {
		const missingDocs: string[] = [];
		const self = this;

		/**
		 * Recursively scans a directory tree for undocumented TypeScript exports.
		 * @param dir - Absolute path to the directory to scan
		 */
		function scanDir(dir: string) {
			const files = self._fs.readdirSync(dir);
			for (const file of files) {
				// readdirSync returns string[] | Buffer[] or Dirent[] based on options.
				// Default is string[]. We assume string[].
				const fileName = String(file);
				const fullPath = join(dir, fileName);

				if (self._fs.statSync(fullPath).isDirectory()) {
					scanDir(fullPath);
				} else if (
					fileName.endsWith('.ts') &&
					!fileName.endsWith('.d.ts')
				) {
					const content = self._fs.readFileSync(fullPath, 'utf-8');
					const lines = content.split('\n');
					let inComment = false;
					for (let idx = 0; idx < lines.length; idx++) {
						const line = (lines[idx] || '').trim();
						if (line.startsWith('/**')) inComment = true;
						if (line.endsWith('*/')) inComment = false;

						if (
							!inComment &&
							line.startsWith('export') &&
							!line.includes('from')
						) {
							// Check if previous line end was */
							let hasDoc = false;
							if (idx > 0) {
								const prev = lines[idx - 1];
								if (prev && prev.trim().endsWith('*/'))
									hasDoc = true;
							}
							if (!hasDoc) {
								missingDocs.push(
									`${fullPath}:${idx + 1} ${line}`
								);
							}
						}
					}
				}
			}
		}

		try {
			await Promise.resolve(); // Async compliance if needed
			// Start scan on src
			// Note: "src" is hardcoded here relative to cwd
			scanDir(join(process.cwd(), 'src'));
		} catch (err: any) {
			return {
				filesWithMissingDocs: [],
				summary: 'Failed to scan: ' + err.message,
			};
		}

		return {
			filesWithMissingDocs: missingDocs.slice(0, 50),
			summary: `Found ${missingDocs.length} potential missing JSDocs.`,
		};
	}
}
