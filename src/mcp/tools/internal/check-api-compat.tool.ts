import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { join } from 'path';

/**
 * Tool to check API compatibility.
 * Compares current exports against a simple baseline to detect breaking changes.
 */
export class QCheckApiCompatibilityTool extends QAbstractTool<
	z.ZodObject<{ baselineFile: z.ZodOptional<z.ZodString> }>
> {
	name = 'check_api_compatibility';
	description =
		'Compare current public API exports against a baseline to detect breaking changes.';
	schema = z.object({
		baselineFile: z
			.string()
			.optional()
			.describe(
				'Path to the API baseline JSON file. Defaults to api-baseline.json.'
			),
	});

	protected _fs = fs;

	async execute(args: { baselineFile?: string }): Promise<{
		status: 'compatible' | 'breaking' | 'baseline_created';
		changes: string[];
	}> {
		await Promise.resolve();
		const cwd = process.cwd();
		const baselinePath = pathResolve(
			cwd,
			args.baselineFile || 'api-baseline.json'
		);

		// 1. Generate current API surface
		const currentApi = this.scanExports(join(cwd, 'src'));

		// 2. Load baseline
		if (!this._fs.existsSync(baselinePath)) {
			this._fs.writeFileSync(
				baselinePath,
				JSON.stringify(currentApi, null, 2)
			);
			return {
				status: 'baseline_created',
				changes: [
					'No baseline found. Created new baseline from current source.',
				],
			};
		}

		const baselineApi = JSON.parse(
			this._fs.readFileSync(baselinePath, 'utf-8')
		);

		// 3. Compare
		const changes: string[] = [];
		let isBreaking = false;

		// Check for missing exports (Breaking)
		for (const [key, _value] of Object.entries(baselineApi)) {
			if (!currentApi[key]) {
				changes.push(`[BREAKING] Missing export: ${key}`);
				isBreaking = true;
			}
		}

		// Check for new exports (Compatible)
		for (const key of Object.keys(currentApi)) {
			if (!baselineApi[key]) {
				changes.push(`[NEW] Added export: ${key}`);
			}
		}

		return {
			status: isBreaking ? 'breaking' : 'compatible',
			changes,
		};
	}

	private scanExports(dir: string): Record<string, boolean> {
		const exports: Record<string, boolean> = {};
		const files = this.getAllFiles(dir);

		for (const file of files) {
			const content = this._fs.readFileSync(file, 'utf-8');
			// Simple regex match for "export class X", "export const Y", "export function Z"
			const matches = content.matchAll(
				/export\s+(class|const|function|interface|type|enum)\s+(\w+)/g
			);
			for (const match of matches) {
				if (match[2]) {
					exports[match[2]] = true;
				}
			}
		}
		return exports;
	}

	private getAllFiles(dir: string): string[] {
		let results: string[] = [];
		const list = this._fs.readdirSync(dir);
		for (const file of list) {
			const fullPath = join(dir, file);
			const stat = this._fs.statSync(fullPath);
			if (stat && stat.isDirectory()) {
				results = results.concat(this.getAllFiles(fullPath));
			} else if (
				file.endsWith('.ts') &&
				!file.endsWith('.d.ts') &&
				!file.endsWith('.test.ts')
			) {
				results.push(fullPath);
			}
		}
		return results;
	}
}

import { resolve as pathResolve } from 'path';
