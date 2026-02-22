import { describe, test, expect, spyOn } from 'bun:test';
import { Quick, QModel } from '@/index';
import { Logger } from '@/core/helpers/logger.helper';
import { PopulationService } from '@/core/services/population.service';

@Quick({ name: String })
class DebugModel extends QModel<any> {
	declare name: string;
}

describe('_debug spy behavior', () => {
	test('spy captures Logger.warn from populateInstance', () => {
		const spy = spyOn(Logger, 'warn').mockImplementation(() => {});
		PopulationService._clearWarnedPolicyCache();
		DebugModel.create({ name: 'test' });
		const numCalls = spy.mock.calls.length;
		const firstCall = spy.mock.calls[0]?.[0] ?? '(no calls)';
		spy.mockRestore();
		// Log to help debug
		console.log('Spy call count:', numCalls);
		console.log('First call[0]:', String(firstCall).slice(0, 100));
		expect(numCalls).toBeGreaterThan(0);
	});
});
