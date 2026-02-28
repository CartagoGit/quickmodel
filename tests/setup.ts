/**
 * Global test setup for QuickModel test suite.
 *
 * Background:
 * Commit 44116cc changed the default `unknownPropertyPolicy` from 'keep' to 'strip'.
 * This broke existing tests that were written assuming the original 'keep' default.
 *
 * This setup file restores the 'keep' default behavior for all tests,
 * ensuring backward compatibility while allowing individual tests to override
 * the policy as needed for their specific test scenarios.
 */

import { beforeEach, afterEach } from 'bun:test';
import { QConfig } from '../src/core/config/quick.config';

// Restore the original default unknownPropertyPolicy: 'keep' before each test
// so that existing tests that don't explicitly set this option continue to work.
beforeEach(() => {
	QConfig.configure({
		defaults: {
			unknownPropertyPolicy: 'keep',
		},
	});
});

// Reset QConfig after each test to avoid state contamination between tests.
afterEach(() => {
	QConfig.reset();
});
