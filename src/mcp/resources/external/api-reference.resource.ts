import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { QAbstractResource } from '../abstract-resource';

/**
 * Shape of the API manifest file bundled with the published npm package.
 *
 * Generated at build time by `scripts/generate-api-manifest.ts`.
 *
 * @see {@link QApiReferenceResource.read} — reads and serves this manifest
 */
export interface IApiManifest {
	/** Published package version (e.g. `"1.5.0"`). */
	version: string;
	/** ISO 8601 timestamp of when the manifest was generated. */
	generatedAt: string;
	/** All named public exports (e.g. `["QModel", "Quick", "QConfig"]`). */
	publicExports: string[];
	/** Registered transformer keys (e.g. `["date", "bigint", "regexp"]`). */
	transformers: string[];
	/** Available decorator names (e.g. `["@Quick()", "@QType()", "@QRule()"]`). */
	decorators: string[];
	/** Migration notes from the CHANGELOG for the current version. */
	migrationNotes: string;
}

/** Fallback shape returned when the manifest file is missing or unreadable. */
interface IApiReferenceFallback {
	error: string;
	suggestion: string;
}

/**
 * MCP Resource that exposes the **public API reference** for the installed
 * version of QuickModel.
 *
 * Registered when the MCP server is started from an **external** project
 * that has QuickModel installed as a dependency (i.e. `src/mcp/server.ts`
 * does NOT exist in `cwd`).
 *
 * Content is read from `api-manifest.json`, which is generated at build time
 * and bundled into the npm package. When the manifest is missing or malformed,
 * a structured error JSON is returned instead.
 *
 * @example
 * ```typescript
 * const res = new QApiReferenceResource();
 * const json = await res.read();
 * // → { version, generatedAt, publicExports, transformers, decorators, migrationNotes }
 * ```
 *
 * @see {@link QProjectStateResource} — internal counterpart for the QuickModel repo itself
 * @see {@link QMcpServer.registerResources} — registers this on the server
 * @see {@link IApiManifest} — shape of the manifest file
 */
export class QApiReferenceResource extends QAbstractResource {
	name = 'quickmodel-api-reference';
	uri = 'quickmodel://api/reference';
	description =
		'Public API reference for the installed version of QuickModel: ' +
		'all public exports, available transformers, decorators, and migration notes. ' +
		'Sourced from the api-manifest.json bundled with the package.';
	mimeType = 'application/json';

	readonly #dir: string;

	/**
	 * @param dir - Directory where `api-manifest.json` is located.
	 *   Defaults to resolving relative to this file (package root after build).
	 *   Override in tests to point to a temp directory.
	 */
	constructor(dir?: string) {
		super();
		this.#dir = dir ?? QApiReferenceResource._resolveDefaultDir();
	}

	/** @internal Resolves the package root at runtime without `import.meta.dirname` issues. */
	private static _resolveDefaultDir(): string {
		try {
			// In the compiled package: this file lives at dist/mcp/resources/external/
			// api-manifest.json lives at the package root (two levels up from dist/)
			const url = new URL(
				'../../../../api-manifest.json',
				import.meta.url
			);
			return url.pathname.replace(/\/api-manifest\.json$/, '');
		} catch {
			return process.cwd();
		}
	}

	/**
	 * Returns the API manifest content as a JSON string.
	 *
	 * Falls back to a structured error object when the manifest is missing
	 * or cannot be parsed.
	 */
	read(): Promise<string> {
		const manifestPath = join(this.#dir, 'api-manifest.json');
		if (!existsSync(manifestPath)) {
			return Promise.resolve(
				this._fallback('api-manifest.json not found')
			);
		}
		try {
			const raw = readFileSync(manifestPath, 'utf-8');
			// Validate it's parseable JSON before returning
			JSON.parse(raw);
			return Promise.resolve(raw);
		} catch {
			return Promise.resolve(
				this._fallback(
					'api-manifest.json exists but could not be parsed'
				)
			);
		}
	}

	private _fallback(reason: string): string {
		const payload: IApiReferenceFallback = {
			error: reason,
			suggestion:
				'Run `bun run build` (or `npm run build`) in the QuickModel repo to ' +
				'generate api-manifest.json, then restart the MCP server.',
		};
		return JSON.stringify(payload, null, 2);
	}
}
