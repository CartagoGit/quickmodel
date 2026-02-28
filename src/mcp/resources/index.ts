/**
 * QuickModel MCP Resources — public exports.
 *
 * @see {@link QAbstractResource} — base class for all MCP resources
 * @see {@link IQMcpResource} — interface contract every resource must fulfill
 * @see {@link QProjectStateResource} — live internal project state (internal mode)
 * @see {@link QApiReferenceResource} — versioned public API reference (external mode)
 */
export { QAbstractResource } from './abstract-resource';
export type { IQMcpResource } from './abstract-resource';
export { QProjectStateResource } from './internal/project-state.resource';
export { QApiReferenceResource } from './external/api-reference.resource';
export type { IApiManifest } from './external/api-reference.resource';
