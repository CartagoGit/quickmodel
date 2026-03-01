/**
 * Sanitizer for user-supplied predicate strings before they are compiled
 * with `new Function()` in MCP simulation tools.
 *
 * @remarks
 * The forbidden-keyword approach is a defence-in-depth layer. It is
 * intentionally strict: if a token appears anywhere in the predicate string
 * it is rejected, even inside a comment or string literal. False positives
 * are acceptable — the consequence is a clear error message, not a security
 * bypass.
 *
 * Safe predicates only use comparison operators, arithmetic, property access,
 * `Array`/`String` built-ins (via `value` / `data`), and literals.
 *
 * @see {@link QSimulateValidationTool} — consumer
 * @see {@link QSimulateRulesTool} — consumer
 * @see {@link QSimulateAsyncRulesTool} — consumer
 * @internal
 */

/** Keywords and identifiers forbidden in simulation predicates. */
const FORBIDDEN_TOKENS: readonly string[] = [
	'require',
	'import',
	'process',
	'global',
	'globalThis',
	'__dirname',
	'__filename',
	'eval',
	'Function',
	'Buffer',
	'fetch',
	'XMLHttpRequest',
	'setTimeout',
	'setInterval',
	'setImmediate',
	'clearTimeout',
	'clearInterval',
	'clearImmediate',
	'Bun',
	'Deno',
	'window',
	'document',
	'navigator',
	'localStorage',
	'sessionStorage',
	'indexedDB',
	'crypto',
	'Worker',
	'SharedArrayBuffer',
	'Atomics',
	'WebAssembly',
];

/**
 * Validates a predicate string for use with `new Function()` in simulation
 * tools. Throws with a descriptive security error if a forbidden token is found.
 *
 * @param predicate - The raw predicate string supplied by the MCP client.
 * @throws {Error} If the predicate contains a forbidden token.
 * @returns The predicate unchanged if it passes all checks.
 */
export const assertSafePredicate = (predicate: string): string => {
	for (const token of FORBIDDEN_TOKENS) {
		if (predicate.includes(token)) {
			throw new Error(
				`Security: predicate contains forbidden token "${token}". ` +
					`Only pure boolean expressions are allowed (comparisons, ` +
					`arithmetic, property access on \`value\` / \`data\`).`
			);
		}
	}
	return predicate;
};
