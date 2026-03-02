/**
 * Integration Test: Nested models
 * Covers: docs-vitepress/en/guide/nested-models.md
 *
 * Validates:
 * - Simple single-level nesting
 * - Arrays of nested models with [Model] syntax
 * - 3-level recursive nesting
 * - Roundtrip: serialize → reconstruct → same values
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';

// ── Models ────────────────────────────────────────────────────────────────────

interface IAddress {
	street: string;
	city: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class AddressModel extends QModel<IAddress> {
	declare street: string;
	declare city: string;
}

interface ITag {
	name: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class TagModel extends QModel<ITag> {
	declare name: string;
}

interface IProfile {
	bio: string;
	address: AddressModel;
}

@Quick({ address: AddressModel }, { unknownPropertyPolicy: 'keep' })
class ProfileModel extends QModel<IProfile> {
	declare bio: string;
	declare address: AddressModel;
}

interface IUser {
	id: number;
	profile: ProfileModel;
	tags: TagModel[];
}

@Quick(
	{ profile: ProfileModel, tags: [TagModel] },
	{ unknownPropertyPolicy: 'keep' }
)
class UserModel extends QModel<IUser> {
	declare id: number;
	declare profile: ProfileModel;
	declare tags: TagModel[];
}

// ── 3-level nesting ───────────────────────────────────────────────────────────

interface ICity {
	name: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class CityModel extends QModel<ICity> {
	declare name: string;
}

interface IRegion {
	label: string;
	capital: CityModel;
}

@Quick({ capital: CityModel }, { unknownPropertyPolicy: 'keep' })
class RegionModel extends QModel<IRegion> {
	declare label: string;
	declare capital: CityModel;
}

interface ICountry {
	name: string;
	region: RegionModel;
}

@Quick({ region: RegionModel }, { unknownPropertyPolicy: 'keep' })
class CountryModel extends QModel<ICountry> {
	declare name: string;
	declare region: RegionModel;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: nested models (guide/nested-models.md)', () => {
	describe('single-level nesting', () => {
		test('nested model is an instance of the nested class', () => {
			const profile = new ProfileModel({
				bio: 'Developer',
				address: { street: '123 Main St', city: 'Springfield' },
			});

			expect(profile.address).toBeInstanceOf(AddressModel);
			expect(profile.address.street).toBe('123 Main St');
			expect(profile.address.city).toBe('Springfield');
		});
	});

	describe('arrays of nested models', () => {
		test('tags is an array of TagModel instances', () => {
			const user = new UserModel({
				id: 1,
				profile: { bio: 'Test', address: { street: 'A', city: 'B' } },
				tags: [{ name: 'typescript' }, { name: 'bun' }],
			});

			expect(user.tags).toHaveLength(2);
			expect(user.tags[0]).toBeInstanceOf(TagModel);
			expect(user.tags[1]).toBeInstanceOf(TagModel);
			expect(user.tags[0]?.name).toBe('typescript');
		});
	});

	describe('3-level recursive nesting', () => {
		test('each level is properly instantiated', () => {
			const country = new CountryModel({
				name: 'Ruritania',
				region: {
					label: 'Northern',
					capital: { name: 'Metropolis' },
				},
			});

			expect(country.region).toBeInstanceOf(RegionModel);
			expect(country.region.capital).toBeInstanceOf(CityModel);
			expect(country.region.capital.name).toBe('Metropolis');
		});
	});

	describe('roundtrip: serialize → reconstruct', () => {
		test('roundtrip preserves nested values', () => {
			const original = new UserModel({
				id: 42,
				profile: {
					bio: 'Alice',
					address: { street: '1 Oak Ave', city: 'Newton' },
				},
				tags: [{ name: 'admin' }],
			});

			const serialized = original.$qSerialize();
			const restored = new UserModel(serialized as unknown as IUser); // @quickmodel-rule-ignore: no-as-unknown

			expect(restored.id).toBe(42);
			expect(restored.profile).toBeInstanceOf(ProfileModel);
			expect(restored.profile.address).toBeInstanceOf(AddressModel);
			expect(restored.profile.address.city).toBe('Newton');
			expect(restored.tags[0]).toBeInstanceOf(TagModel);
			expect(restored.tags[0]?.name).toBe('admin');
		});
	});
});
