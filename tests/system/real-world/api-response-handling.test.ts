import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

describe('System: Real World API Response Handling', () => {
	@Quick(
		{
			lastLogin: Date,
			settings: Map,
			history: [Date],
		},
		{ unknownPropertyPolicy: 'keep' }
	)
	class UserProfile extends QModel<any> {
		declare id: number;
		declare username: string;
		declare lastLogin: Date;
		declare settings: Map<string, string>;
		declare history: Date[];
	}

	@Quick(
		{
			data: UserProfile,
			meta: Map,
		},
		{ unknownPropertyPolicy: 'keep' }
	)
	class ApiResponse extends QModel<any> {
		declare status: string;
		declare data: UserProfile;
		declare meta: Map<string, any>;
		declare error: string | null;
	}

	it('should handle messy legacy API responses', () => {
		// Scenario: A legacy API returns a mix of types, extra fields, and nulls
		const messyResponse = {
			status: 'success',
			// EXTRA FIELD: should be ignored or kept depending on strict mode (default: kept)
			deprecated_field: 'ignore_me',
			data: {
				id: '123', // String instead of number (JS runtime will keep as string unless transformed)
				username: 'alice',
				// Date as timestamp number
				lastLogin: 1704067200000,
				// Map as object (QuickModel Map transformer handles [[k,v]] tuples usually, let's see how it handles this)
				// Note: Standard Map transformer expects array of tuples. If API sends object, it might fail or need custom transformer.
				// QuickModel default Map transformer usually expects array.
				settings: [
					['theme', 'dark'],
					['notif', 'on'],
				],
				// Array with mixed valid/invalid
				history: [
					'2024-01-01T00:00:00Z',
					null, // Should be handled gracefully
					'2024-01-02T00:00:00Z',
				],
				__internal_id: 999, // Should be stripped/ignored if private convention is used
			},
			meta: [
				['page', 1],
				['total', 100],
			],
			error: null,
		};

		const response = ApiResponse.create(messyResponse);

		expect(response.status).toBe('success');
		expect(response.data).toBeInstanceOf(UserProfile);
		expect(response.data.lastLogin).toBeInstanceOf(Date);
		expect(response.data.lastLogin.getTime()).toBe(1704067200000);

		expect(response.data.settings).toBeInstanceOf(Map);
		expect(response.data.settings.get('theme')).toBe('dark');

		// Verify history handling
		expect(response.data.history).toBeInstanceOf(Array);
		expect(response.data.history.length).toBe(3);
		expect(response.data.history[0]).toBeInstanceOf(Date);

		// Check extra properties preservation (Permissive by default)
		expect((response as any).deprecated_field).toBe('ignore_me');
	});

	it('should handle incomplete/partial API responses gracefully', () => {
		const partialResponse = {
			status: 'partial',
			// Missing 'data', 'meta'
		};

		const response = ApiResponse.create(partialResponse);
		expect(response.status).toBe('partial');
		expect(response.data).toBeUndefined();
	});
});
