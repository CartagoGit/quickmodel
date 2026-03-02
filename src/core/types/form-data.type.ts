/**
 * Valid HTTP method values for `toFormData({ spoofMethod })`.
 *
 * Includes:
 * - RFC 7231 standard methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, TRACE, CONNECT)
 * - WebDAV methods (RFC 4918)
 * - DeltaV / versioning methods (RFC 3253)
 * - Practical extras (PURGE, SEARCH)
 * - Open catch-all via `string & {}` for custom/non-standard methods
 *   (preserves autocomplete for the known values above)
 *
 * `GET` and `POST` are included for completeness even though spoofing them has
 * no practical purpose in normal usage.
 *
 * @public
 * @see {@link IToFormDataOptions} — parent options interface that uses this type
 * @see {@link QModel.$qToFormData} — method that accepts `spoofMethod` via `IToFormDataOptions`
 * @see {@link plainObjectToFormData} — internal helper that reads `spoofMethod` at serialization time
 */
export type IQSpoofMethod =
	// ── RFC 7231 — standard HTTP/1.1 ──────────────────────────────────────
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'PATCH'
	| 'DELETE'
	| 'HEAD'
	| 'OPTIONS'
	| 'TRACE'
	| 'CONNECT'
	// ── WebDAV — RFC 4918 ─────────────────────────────────────────────────
	| 'PROPFIND'
	| 'PROPPATCH'
	| 'MKCOL'
	| 'COPY'
	| 'MOVE'
	| 'LOCK'
	| 'UNLOCK'
	// ── DeltaV / versioning — RFC 3253 ────────────────────────────────────
	| 'REPORT'
	| 'CHECKOUT'
	| 'CHECKIN'
	| 'UNCHECKOUT'
	| 'MKWORKSPACE'
	| 'UPDATE'
	| 'LABEL'
	| 'MERGE'
	| 'BASELINE-CONTROL'
	| 'MKACTIVITY'
	// ── Practical extras ──────────────────────────────────────────────────
	| 'PURGE'
	| 'SEARCH'
	// ── Open catch-all (custom / non-standard) ────────────────────────────
	| (string & {});
