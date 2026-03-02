/**
 * Integration Test: fromURL
 * Covers: docs-vitepress/en/guide/fromurl.md
 *
 * Validates:
 * - QModel.fromURL() with URLSearchParams
 * - Type coercions: Number, Boolean, Date, BigInt
 * - Array fields use getAll(): [String], [Number]
 * - Absent fields remain undefined
 * - @QDefault applies for absent fields
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QDefault } from '@/decorators';

// ── Model ─────────────────────────────────────────────────────────────────────

interface ISearchFilter {
	query: string;
	page: number;
	active: boolean;
	since: Date;
	tags: string[];
	ids: number[];
}

@Quick({
	page: Number,
	active: Boolean,
	since: Date,
	tags: [String],
	ids: [Number],
})
class SearchFilterDto extends QModel<ISearchFilter> {
	declare query: string;
	declare page: number;
	declare active: boolean;
	declare since: Date;
	declare tags: string[];
	declare ids: number[];
}

interface IPagedQuery {
	page: number;
	limit: number;
	search: string;
}

@Quick({ page: Number, limit: Number })
class PagedQueryDto extends QModel<IPagedQuery> {
	@QDefault(1)
	declare page: number;

	@QDefault(20)
	declare limit: number;

	declare search: string;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: fromURL (guide/fromurl.md)', () => {
	describe('basic type coercions', () => {
		test('Number: string "42" becomes 42', () => {
			const params = new URLSearchParams('page=42');
			const dto = SearchFilterDto.fromURL(params);

			expect(dto.page).toBe(42);
			expect(typeof dto.page).toBe('number');
		});

		test('Boolean: string "true" becomes true', () => {
			const params = new URLSearchParams('active=true');
			const dto = SearchFilterDto.fromURL(params);

			expect(dto.active).toBe(true);
			expect(typeof dto.active).toBe('boolean');
		});

		test('Boolean: string "false" becomes false', () => {
			const params = new URLSearchParams('active=false');
			const dto = SearchFilterDto.fromURL(params);

			expect(dto.active).toBe(false);
		});

		test('Date: ISO string becomes Date instance', () => {
			const params = new URLSearchParams(
				'since=2026-01-15T12:00:00.000Z'
			);
			const dto = SearchFilterDto.fromURL(params);

			expect(dto.since).toBeInstanceOf(Date);
			expect(dto.since.toISOString()).toContain('2026-01-15');
		});

		test('plain string field stays as string', () => {
			const params = new URLSearchParams('query=hello');
			const dto = SearchFilterDto.fromURL(params);

			expect(dto.query).toBe('hello');
		});
	});

	describe('array fields use getAll()', () => {
		test('[String]: repeated tags become string[]', () => {
			const params = new URLSearchParams(
				'tags=read&tags=write&tags=admin'
			);
			const dto = SearchFilterDto.fromURL(params);

			expect(Array.isArray(dto.tags)).toBe(true);
			expect(dto.tags).toHaveLength(3);
			expect(dto.tags).toContain('read');
			expect(dto.tags).toContain('write');
			expect(dto.tags).toContain('admin');
		});

		test('[Number]: repeated ids become number[]', () => {
			const params = new URLSearchParams('ids=1&ids=2&ids=3');
			const dto = SearchFilterDto.fromURL(params);

			expect(Array.isArray(dto.ids)).toBe(true);
			expect(dto.ids).toHaveLength(3);
			expect(dto.ids[0]).toBe(1);
			expect(dto.ids[1]).toBe(2);
			expect(dto.ids[2]).toBe(3);
		});
	});

	describe('absent fields', () => {
		test('absent fields are undefined when no @QDefault', () => {
			const params = new URLSearchParams('query=test');
			const dto = SearchFilterDto.fromURL(params);

			// page, active, since, tags, ids are not in params
			expect(dto.page).toBeUndefined();
			expect(dto.since).toBeUndefined();
		});

		test('@QDefault applies for absent fields via fromURL', () => {
			const params = new URLSearchParams('search=hello');
			const dto = PagedQueryDto.fromURL(params);

			// page and limit use @QDefault
			expect(dto.page).toBe(1);
			expect(dto.limit).toBe(20);
			expect(dto.search).toBe('hello');
		});
	});

	describe('combined usage', () => {
		test('full query string with multiple types', () => {
			const params = new URLSearchParams(
				'query=items&page=3&active=true&since=2026-06-01&tags=ts&tags=bun&ids=10&ids=20'
			);
			const dto = SearchFilterDto.fromURL(params);

			expect(dto.query).toBe('items');
			expect(dto.page).toBe(3);
			expect(dto.active).toBe(true);
			expect(dto.since).toBeInstanceOf(Date);
			expect(dto.tags).toEqual(['ts', 'bun']);
			expect(dto.ids).toEqual([10, 20]);
		});

		test('result is a proper QModel instance with $q methods', () => {
			const params = new URLSearchParams('query=test&page=1');
			const dto = SearchFilterDto.fromURL(params);

			expect(dto).toBeInstanceOf(SearchFilterDto);
			expect(typeof dto.$qSerialize).toBe('function');
			expect(typeof dto.$qCheckRules).toBe('function');
		});
	});
});
