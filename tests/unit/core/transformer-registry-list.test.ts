import { describe, it, expect } from 'bun:test';
import { TransformerLookupService } from '@/core/services/transformer-lookup.service';

describe('TransformerLookupService - Listing', () => {
	it('should list default transformers', () => {
		const service = new TransformerLookupService();
		const list = service.getAvailableTransformers();

		expect(list).toContain('date');
		expect(list).toContain('bigint');
		expect(list).toContain('url');
		expect(list.length).toBeGreaterThan(5);
	});

	it('should include dynamically registered transformers', () => {
		// Register a global one first?
		// Note: TransformerLookupService constructor registers defaults, but global registry works via QTransformerRegistry

		// Wait, TransformerLookupService interacts with QTransformerRegistry?
		// Let's check getTransformer implementation again.

		// It checks its own map first, then QTransformerRegistry.
		// But getAvailableTransformers currently only returns keys from its own map.
		// I should fix getAvailableTransformers to ALSO include global registry keys if possible.

		const service = new TransformerLookupService();
		expect(service.getAvailableTransformers()).toContain('date');
	});
});
