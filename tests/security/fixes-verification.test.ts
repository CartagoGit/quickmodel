import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '../../src';
import { QModelError } from '../../src/core/errors/quickmodel.error';

describe('Security Fixes Verification', () => {
	// Issue 2: URL Protocol Injection
	describe('Issue 2: URL Protocol Injection', () => {
		@Quick({ url: URL })
		class UrlModel extends QModel<{ url: string }> {
			declare url: URL;
		}

		it('should allow http/https protocols by default', () => {
			const m = new UrlModel({ url: 'https://example.com' });
			expect(m.url).toBeInstanceOf(URL);
			expect(m.url.toString()).toBe('https://example.com/');
		});

		it('should block javascript: protocol', () => {
			// Currently fails (allows it) - expecting this to pass after fix
			try {
				new UrlModel({ url: 'javascript:alert(1)' });
				// If it doesn't throw, we fail the test to show it needs fixing
				expect(true).toBe(false);
			} catch (e: any) {
				expect(e).toBeInstanceOf(QModelError);
				expect(e.message).toContain('protocol');
			}
		});
	});

	// Issue 4: Null Filtering in Arrays
	describe('Issue 4: Silent Null Filtering in Model Arrays', () => {
		class Item extends QModel<{ id: number }> {
			declare id: number;
		}

		@Quick({ items: [Item, null] })
		class List extends QModel<{ items: (Item | null)[] }> {
			declare items: (Item | null)[];
		}

		it('should preserve nulls in model arrays', () => {
			// Currently filters nulls - expecting [Item, Item] instead of [Item, null, Item]
			const data = {
				items: [{ id: 1 }, null, { id: 2 }],
			};
			const list = new List(data);

			// Should be 3 items
			expect(list.items.length).toBe(3);
			expect(list.items[1]).toBeNull();
			expect(list.items[2]).not.toBeNull();
		});
	});

	// Issue 5: Silent Discriminator Failure
	describe('Issue 5: Silent Discriminator Failure', () => {
		class A extends QModel<{ type: 'a' }> {}
		class B extends QModel<{ type: 'b' }> {}

		const thrower = () => {
			throw new Error('Malicious error');
		};

		@Quick(
			{
				items: [A, B],
			},
			{
				discriminators: {
					items: thrower,
				},
			}
		)
		class Container extends QModel<{ items: (A | B)[] }> {
			declare items: (A | B)[];
		}

		it('should throw when discriminator fails instead of silencing', () => {
			// Currently silences and returns default (A)
			try {
				new Container({ items: [{ type: 'b' }] });
				expect(true).toBe(false); // Should have thrown
			} catch (e: any) {
				// We expect the error to propagate
				expect(e.message).toContain('Malicious error');
			}
		});
	});
});
