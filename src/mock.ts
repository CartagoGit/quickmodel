/**
 * QuickModel Mock — dedicated mock-generation entry point.
 *
 * Exposes `QMockGenerator` and `QMockBuilder` without pulling in schema
 * generators, the serializer pipeline, or any other QModel machinery.
 *
 * **Side-effect on import**: automatically registers mock services into the
 * `MockRegistry` so that `QModel.mock()` works without any additional setup.
 * This side-effect is intentional and is preserved even when the named exports
 * are not referenced (the file is listed in `"sideEffects"` in `package.json`).
 *
 * `@faker-js/faker` is an **optional** dependency loaded lazily on first use —
 * it will NOT appear in the consumer's bundle until `.random()` / `.full()` etc.
 * is actually called.
 *
 * @example
 * ```typescript
 * // ✅ Only mock code — no schema generators, no serializer, no zod
 * import { QMockGenerator, QMockBuilder } from 'quickmodel/mock';
 *
 * // ✅ Light core + opt-in mock support
 * import { QModel } from 'quickmodel/core';
 * import 'quickmodel/mock'; // enables QModel.mock()
 * ```
 *
 * @see {@link QMockGenerator} — low-level mock generation service exported here
 * @see {@link QMockBuilder} — fluent builder API exported here
 * @see {@link QModel.mock} — high-level API that delegates to these services
 * @module quickmodel/mock
 */

import { registerMockServices } from './core/helpers/mock-registry';
import { QMockGenerator } from './core/services/mock-generator.service';
import { QMockBuilder } from './core/services/mock-builder.service';

export { QMockGenerator } from './core/services/mock-generator.service';
export { QMockBuilder } from './core/services/mock-builder.service';

// ─── Auto-registration ────────────────────────────────────────────────────────
// Importing this module automatically wires the mock services into the registry,
// so QModel.mock() works out of the box when 'quickmodel/mock' is imported.
// The QMockGenerator singleton is created lazily on first access.
let _mockGenSingleton: QMockGenerator | undefined;

registerMockServices(() => {
	if (!_mockGenSingleton) {
		_mockGenSingleton = new QMockGenerator();
	}
	return _mockGenSingleton;
}, QMockBuilder);
