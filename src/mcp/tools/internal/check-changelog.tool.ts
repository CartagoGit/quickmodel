import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { readFileSync, existsSync } from 'fs';
import { join, resolve, sep } from 'path';

/**
 * Internal tool to verify that CHANGELOG.md contains an entry for the
 * current version defined in package.json.
 *
 * Prevents releases where the changelog has not been updated.
 * Looks for patterns like "## [1.2.3]" or "## 1.2.3" in CHANGELOG.md.
 */
export class QCheckChangelogTool extends QAbstractTool<
	z.ZodObject<{
		projectDir: z.ZodOptional<z.ZodString>;
	}>
> {
	name = 'check_changelog';
	description =
		'Verify that CHANGELOG.md contains an entry for the current version in package.json. ' +
		'Prevents releases without a changelog update. ' +
		'Returns { found, version, excerpt, status } where status is "ok" or "error".';

	schema = z.object({
		projectDir: z
			.string()
			.optional()
			.describe(
				'Project root directory containing package.json and CHANGELOG.md. ' +
					'Defaults to process.cwd().'
			),
	});

	/**
	 * Verifies that `CHANGELOG.md` contains an entry for the version declared in
	 * `package.json`, preventing a release without a changelog update.
	 *
	 * @param args - Check configuration.
	 * @param args.projectDir - Directory containing `package.json` and
	 * `CHANGELOG.md`. Defaults to `process.cwd()`.
	 * @returns `{ found, version, excerpt, status, message? }` — `found` is `true`
	 * when the current version appears in `CHANGELOG.md`; `excerpt` is the matching
	 * line; `status` is `'ok'` on success or `'error'` when the file is missing or
	 * the version is not documented.
	 * @throws {Error} When `projectDir` resolves outside the project root
	 * (path-traversal guard).
	 */
	async execute(args: { projectDir?: string }): Promise<{
		found: boolean;
		version: string;
		excerpt: string;
		status: 'ok' | 'error';
		message?: string;
	}> {
		await Promise.resolve();

		const cwd = process.cwd();
		const safeCwd = cwd.endsWith(sep) ? cwd : cwd + sep;

		const rawDir = args.projectDir ? resolve(cwd, args.projectDir) : cwd;
		const safeDir = rawDir.endsWith(sep) ? rawDir : rawDir + sep;

		if (!safeDir.startsWith(safeCwd) && rawDir !== cwd) {
			throw new Error(
				'Security Error: projectDir is outside project root.'
			);
		}

		const pkgPath = join(rawDir, 'package.json');
		const changelogPath = join(rawDir, 'CHANGELOG.md');

		if (!existsSync(pkgPath)) {
			return {
				found: false,
				version: '',
				excerpt: '',
				status: 'error',
				message: `package.json not found at ${pkgPath}`,
			};
		}

		if (!existsSync(changelogPath)) {
			return {
				found: false,
				version: '',
				excerpt: '',
				status: 'error',
				message: `CHANGELOG.md not found at ${changelogPath}`,
			};
		}

		let version: string;
		try {
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
				version?: string;
			};
			version = pkg.version ?? '';
		} catch {
			return {
				found: false,
				version: '',
				excerpt: '',
				status: 'error',
				message: 'Failed to parse package.json',
			};
		}

		if (!version) {
			return {
				found: false,
				version: '',
				excerpt: '',
				status: 'error',
				message: 'No "version" field found in package.json',
			};
		}

		let changelog: string;
		try {
			changelog = readFileSync(changelogPath, 'utf-8');
		} catch {
			return {
				found: false,
				version,
				excerpt: '',
				status: 'error',
				message: 'Failed to read CHANGELOG.md',
			};
		}

		// Look for the version in common formats: ## [1.2.3] or ## 1.2.3
		const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		// eslint-disable-next-line security/detect-non-literal-regexp
		const versionPattern = new RegExp(
			`^##\\s*\\[?${escapedVersion}\\]?`,
			'm'
		);
		const found = versionPattern.test(changelog);

		let excerpt = '';
		if (found) {
			const match = versionPattern.exec(changelog);
			if (match) {
				const startIdx = match.index;
				// Grab up to 300 chars from the matched heading
				excerpt = changelog.slice(startIdx, startIdx + 300).trim();
			}
		}

		return {
			found,
			version,
			excerpt,
			status: 'ok',
			message: found
				? `Version ${version} found in CHANGELOG.md`
				: `Version ${version} NOT found in CHANGELOG.md — please add a changelog entry before releasing`,
		};
	}
}
