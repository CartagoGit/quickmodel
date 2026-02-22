import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

interface IBundleFile {
	file: string;
	bytes: number;
}

/**
 * Internal tool to build the project and report resulting bundle sizes.
 *
 * Runs `bun run build` to produce the dist artifacts, then reads the output
 * directory and returns the size of each file together with the total.
 *
 * Useful for catching silent size regressions when adding new transformers
 * or features. Can be run as part of CI pre-release checks.
 */
export class QCheckBundleSizeTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'check_bundle_size';
	description =
		'Build the project and report the resulting bundle sizes from the dist/ directory. ' +
		'Useful for detecting silent size regressions when adding new transformers or features. ' +
		'Returns { status, files: [{ file, bytes }], total_bytes, summary }.';

	schema = z.object({});

	protected _spawn = spawnCommand;

	/** Override in tests to inject mock dist file list */
	protected _getDistFiles(): Promise<IBundleFile[]> {
		const distPath = join(process.cwd(), 'dist');
		return Promise.resolve(this.readDistDir(distPath));
	}

	async execute(_args: {}): Promise<{
		status: 'ok' | 'error';
		files: IBundleFile[];
		total_bytes: number;
		summary: string;
	}> {
		try {
			await this._spawn('bun', ['run', 'build']);
		} catch (err: any) {
			return {
				status: 'error',
				files: [],
				total_bytes: 0,
				summary:
					'Build failed: ' +
					((err.stderr as string | undefined) ??
						(err.message as string | undefined) ??
						'unknown error'),
			};
		}

		const files = await this._getDistFiles();
		const total_bytes = files.reduce((acc, cur) => acc + cur.bytes, 0);
		const totalKb = (total_bytes / 1024).toFixed(1);
		const fileList = files
			.map(
				(file) => `${file.file} (${(file.bytes / 1024).toFixed(1)} KB)`
			)
			.join(', ');

		const summary =
			files.length > 0
				? `Bundle OK. Total: ${totalKb} KB across ${files.length} file(s). ${fileList}`
				: 'Build succeeded but no dist files found.';

		return { status: 'ok', files, total_bytes, summary };
	}

	private readDistDir(dirPath: string): IBundleFile[] {
		const result: IBundleFile[] = [];
		let entries: ReturnType<typeof readdirSync>;
		try {
			entries = readdirSync(dirPath);
		} catch {
			return result;
		}

		for (const entry of entries) {
			const full = join(dirPath, entry);
			let stat: ReturnType<typeof statSync>;
			try {
				stat = statSync(full);
			} catch {
				continue;
			}
			if (stat.isFile()) {
				result.push({ file: entry, bytes: stat.size });
			}
		}

		return result;
	}
}
