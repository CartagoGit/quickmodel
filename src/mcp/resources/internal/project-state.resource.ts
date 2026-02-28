import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { QAbstractResource } from '../abstract-resource';
import { spawnCommand } from '../../tools/internal/utils';

/**
 * Shape of the live project state snapshot returned by this resource.
 *
 * @see {@link QProjectStateResource.read} — serializes this as JSON
 */
interface IProjectStateSnapshot {
	/** Current version from `package.json`. */
	version: string;
	/** Files modified/added/deleted since last commit (`git diff HEAD --name-status`). */
	changedFiles: string[];
	/** Named exports from `src/index.ts` (public API surface). */
	publicExports: string[];
	/** TypeScript path aliases from `tsconfig.json`. */
	pathAliases: Record<string, string[]>;
	/** ISO 8601 timestamp of when this snapshot was generated. */
	generatedAt: string;
}

/**
 * MCP Resource that exposes the **live internal state** of the QuickModel project.
 *
 * Registered when the MCP server is started from inside the QuickModel repo itself
 * (detected by the presence of `src/mcp/server.ts` in `cwd`).
 *
 * Content is regenerated on every `resources/read` request — never stale.
 *
 * **Layers returned:**
 * 1. Live state: version, uncommitted changed files
 * 2. Public API surface: named exports from `src/index.ts`
 * 3. Internal structure: TypeScript path aliases
 * 4. Metadata: `generatedAt` timestamp
 *
 * @example
 * ```typescript
 * const res = new QProjectStateResource();
 * const json = await res.read();
 * // → { version, changedFiles, publicExports, pathAliases, generatedAt }
 * ```
 *
 * @see {@link QApiReferenceResource} — external counterpart for consumer projects
 * @see {@link QMcpServer.registerResources} — registers this on the server
 */
export class QProjectStateResource extends QAbstractResource {
	name = 'quickmodel-project-state';
	uri = 'quickmodel://project/state';
	description =
		'Live state of the QuickModel project: version, uncommitted changed files, ' +
		'public API exports, TypeScript path aliases, and generation timestamp. ' +
		'Refreshed on every read — never stale.';
	mimeType = 'application/json';

	readonly #cwd: string;

	/**
	 * @param cwd - Project root directory. Defaults to `process.cwd()`.
	 *   Override in tests to point to a temp directory.
	 */
	constructor(cwd?: string) {
		super();
		this.#cwd = cwd ?? process.cwd();
	}

	/**
	 * Spawn function used to run `git diff HEAD --name-status`.
	 *
	 * @internal Override in tests to inject a mock without touching the filesystem.
	 * @see {@link spawnCommand} — default implementation
	 */
	protected _spawnGit = spawnCommand;

	/**
	 * Builds and returns a JSON snapshot of the current project state.
	 *
	 * @returns A pretty-printed JSON string matching {@link IProjectStateSnapshot}.
	 */
	async read(): Promise<string> {
		const snapshot = await this._buildSnapshot();
		return JSON.stringify(snapshot, null, 2);
	}

	private async _buildSnapshot(): Promise<IProjectStateSnapshot> {
		return {
			version: this._readVersion(),
			changedFiles: await this._readChangedFiles(),
			publicExports: this._readPublicExports(),
			pathAliases: this._readPathAliases(),
			generatedAt: new Date().toISOString(),
		};
	}

	private _readVersion(): string {
		try {
			const raw = readFileSync(join(this.#cwd, 'package.json'), 'utf-8');
			const pkg = JSON.parse(raw) as Record<string, unknown>;
			return typeof pkg['version'] === 'string'
				? pkg['version']
				: '0.0.0';
		} catch {
			return '0.0.0';
		}
	}

	private async _readChangedFiles(): Promise<string[]> {
		try {
			const { stdout } = await this._spawnGit(
				'git',
				['diff', 'HEAD', '--name-status'],
				this.#cwd
			);
			return stdout
				.split('\n')
				.filter((row) => row.trim().length > 0)
				.map((row) => {
					const parts = row.split('\t');
					return parts[1]?.trim() ?? '';
				})
				.filter((val) => val.length > 0);
		} catch {
			return [];
		}
	}

	private _readPublicExports(): string[] {
		try {
			const indexPath = join(this.#cwd, 'src', 'index.ts');
			if (!existsSync(indexPath)) return [];
			const content = readFileSync(indexPath, 'utf-8');
			const collected: string[] = [];
			const pattern = /export\s+(?:type\s+)?{([^}]+)}/g;
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				const block = match[1];
				if (!block) continue;
				for (const entry of block.split(',')) {
					const name = entry.trim().split(/\s+/).at(0)?.trim();
					if (name && name.length > 0) collected.push(name);
				}
			}
			return [...new Set(collected)];
		} catch {
			return [];
		}
	}

	private _readPathAliases(): Record<string, string[]> {
		try {
			const raw = readFileSync(join(this.#cwd, 'tsconfig.json'), 'utf-8');
			// Strip single-line and multi-line comments (tsconfig is JSONC)
			const cleaned = raw
				.replace(/\/\/[^\n]*/g, '')
				.replace(/\/\*[\s\S]*?\*\//g, '');
			const cfg = JSON.parse(cleaned) as Record<string, unknown>;
			const opts = cfg['compilerOptions'] as
				| Record<string, unknown>
				| undefined;
			const paths = opts?.['paths'];
			if (
				paths !== null &&
				paths !== undefined &&
				typeof paths === 'object' &&
				!Array.isArray(paths)
			) {
				return paths as Record<string, string[]>;
			}
			return {};
		} catch {
			return {};
		}
	}
}
