/**
 * QuickModel Mock — dedicated mock-generation entry point.
 *
 * Exposes `QMockGenerator` and `QMockBuilder` without pulling in schema
 * generators, the serializer pipeline, or any other QModel machinery.
 *
 * `@faker-js/faker` is an **optional** dependency loaded lazily on first use —
 * it will NOT appear in the consumer's bundle until `.random()` / `.full()` etc.
 * is actually called.
 *
 * @example
 * ```typescript
 * // ✅ Only mock code — no schema generators, no serializer, no zod
 * import { QMockGenerator, QMockBuilder } from 'quickmodel/mock';
 * ```
 *
 * @remarks
 * Also accessible under the `quickmodel/advanced` subpath (which includes the full
 * advanced API surface) and via `QModel.mock()` (which loads QMockGenerator lazily).
 *
 * @see {@link QMockGenerator} — low-level mock generation service exported here
 * @see {@link QMockBuilder} — fluent builder API exported here
 * @see {@link QModel.mock} — high-level API that delegates to these services
 * @module quickmodel/mock
 */

export { QMockGenerator } from './core/services/mock-generator.service';
export { QMockBuilder } from './core/services/mock-builder.service';
