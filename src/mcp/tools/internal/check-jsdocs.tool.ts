import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { join } from 'path';

/**
 * Tool to check for missing JSDocs in the codebase.
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
					for (let i = 0; i < lines.length; i++) {
						const line = (lines[i] || '').trim();
						if (line.startsWith('/**')) inComment = true;
						if (line.endsWith('*/')) inComment = false;

						if (
							!inComment &&
							line.startsWith('export') &&
							!line.includes('from')
						) {
							// Check if previous line end was */
							let hasDoc = false;
							if (i > 0) {
								const prev = lines[i - 1];
								if (prev && prev.trim().endsWith('*/'))
									hasDoc = true;
							}
							if (!hasDoc) {
								missingDocs.push(
									`${fullPath}:${i + 1} ${line}`
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
		} catch (e: any) {
			return {
				filesWithMissingDocs: [],
				summary: 'Failed to scan: ' + e.message,
			};
		}

		return {
			filesWithMissingDocs: missingDocs.slice(0, 50),
			summary: `Found ${missingDocs.length} potential missing JSDocs.`,
		};
	}
}
