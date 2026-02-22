/**
 * Vue 3 Integration Patterns — QuickModel
 *
 * Verifies QuickModel patterns as used in Vue 3 / Nuxt apps.
 * No Vue packages imported — pure TypeScript logic only.
 *
 * Key patterns:
 * - Composition API: reactive state wrapping QModel
 * - Pinia store simulation: actions mutate state via merge() / patch()
 * - VeeValidate-like adapter: qCheckRules() as validation resolver
 * - useAsyncValidator: async email uniqueness check
 * - defineModel / v-model: two-way binding simulation
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick, QRule, QComputed, QField, QGroup } from '@/index';
import { qGroups } from '@/core/helpers/q-groups';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';
import { qCheckRulesByGroup } from '@/core/helpers/q-check-rules-by-group';

// ---------------------------------------------------------------------------
// 1. Vue Composition API — reactive form validation (plain TS class)
// ---------------------------------------------------------------------------

const FormSections = qGroups('personal', 'address');

class ContactForm {
	@QField({ label: 'First Name', required: true })
	@QGroup(FormSections.personal)
	@QRule(
		(value: string) => value.trim().length >= 2,
		'First name must be at least 2 chars'
	)
	firstName = '';

	@QField({ label: 'Last Name', required: true })
	@QGroup(FormSections.personal)
	@QRule(
		(value: string) => value.trim().length >= 2,
		'Last name must be at least 2 chars'
	)
	lastName = '';

	@QField({ label: 'Email', widget: 'email', required: true })
	@QGroup(FormSections.personal)
	@QRule(
		(value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
		'Must be a valid email'
	)
	email = '';

	@QField({ label: 'City', required: true })
	@QGroup(FormSections.address)
	@QRule((value: string) => value.trim().length >= 2, 'City is required')
	city = '';

	@QField({ label: 'Postal Code' })
	@QGroup(FormSections.address)
	@QRule(
		(value: string) => /^\d{4,10}$/.test(value),
		'Postal code: 4-10 digits'
	)
	postalCode = '';
}

describe('Vue 3 — Composition API reactive form validation', () => {
	let form: ContactForm;

	beforeEach(() => {
		form = new ContactForm();
	});

	test('empty form fails validation', () => {
		const result = qCheckRules(form);
		expect(result.valid).toBe(false);
	});

	test('fully valid form passes', () => {
		form.firstName = 'Marie';
		form.lastName = 'Curie';
		form.email = 'marie@example.com';
		form.city = 'Paris';
		form.postalCode = '75001';
		const result = qCheckRules(form);
		expect(result.valid).toBe(true);
	});

	test('invalid postal code fails with correct message', () => {
		form.firstName = 'Ada';
		form.lastName = 'Lovelace';
		form.email = 'ada@example.com';
		form.city = 'London';
		form.postalCode = 'abc'; // not digits
		const result = qCheckRules(form);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'postalCode')).toBe(
			true
		);
	});

	test('group validation — personal section only', () => {
		form.firstName = 'Lise';
		form.lastName = 'Meitner';
		form.email = 'lise@example.com';
		const groupResults = qCheckRulesByGroup(form);
		expect(groupResults['personal']?.valid).toBe(true);
		expect(groupResults['address']?.valid).toBe(false);
	});

	test('each group returns its field errors independently', () => {
		form.firstName = 'A'; // too short
		form.city = 'NY';
		const groups = qCheckRulesByGroup(form);
		expect(
			groups['personal']?.errors.some((err) => err.field === 'firstName')
		).toBe(true);
		expect(
			groups['address']?.errors.some((err) => err.field === 'postalCode')
		).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 2. Pinia store simulation — QModel as state
// ---------------------------------------------------------------------------

interface IArticle {
	id: string;
	title: string;
	content: string;
	published: boolean;
	publishedAt: Date;
}

@Quick(
	{
		id: 'string',
		title: 'string',
		content: 'string',
		published: 'boolean',
		publishedAt: Date,
	},
	{ unknownPropertyPolicy: 'strip' }
)
class ArticleModel extends QModel<IArticle> {
	declare id: string;
	declare title: string;
	declare content: string;
	declare published: boolean;
	declare publishedAt: Date;

	@QComputed()
	get excerpt(): string {
		return this.content.slice(0, 100);
	}

	@QComputed()
	get wordCount(): number {
		return this.content.split(/\s+/).filter(Boolean).length;
	}
}

// Simulate a Pinia store (defineStore pattern)
class ArticlePiniaStore {
	private articles = new Map<string, ArticleModel>();
	private selectedId: string | null = null;

	// action: addArticle
	addArticle(data: object): void {
		const article = new ArticleModel(data);
		this.articles.set(
			(article as unknown as Record<string, unknown>)['id'] as string,
			article
		);
	}

	// action: updateArticle (immutable via merge)
	updateArticle(idArg: string, patch: Partial<IArticle>): boolean {
		const article = this.articles.get(idArg);
		if (!article) return false;
		const updated = article.copy(patch);
		this.articles.set(idArg, updated);
		return true;
	}

	// action: selectArticle
	selectArticle(idArg: string): void {
		this.selectedId = idArg;
	}

	// getter: selectedArticle
	get selectedArticle(): object | undefined {
		if (!this.selectedId) return undefined;
		const art = this.articles.get(this.selectedId);
		return art ? art.serialize() : undefined;
	}

	// getter: publishedArticles
	get publishedArticles(): object[] {
		return [...this.articles.values()]
			.filter((art) => art.published)
			.map((art) => art.serialize());
	}

	// getter: allArticles
	get allArticles(): object[] {
		return [...this.articles.values()].map((art) => art.serialize());
	}
}

describe('Vue 3 — Pinia store with QModel state', () => {
	let store: ArticlePiniaStore;

	beforeEach(() => {
		store = new ArticlePiniaStore();
	});

	test('addArticle() stores and coerces the article', () => {
		store.addArticle({
			id: 'a1',
			title: 'Hello Vue',
			content: 'Vue 3 is great',
			published: true,
			publishedAt: '2024-01-01T00:00:00.000Z',
		});
		expect(store.allArticles).toHaveLength(1);
	});

	test('@QComputed excerpt and wordCount in serialized output', () => {
		store.addArticle({
			id: 'a2',
			title: 'Long Article',
			content: 'One two three four five',
			published: true,
			publishedAt: new Date(),
		});
		const [art] = store.allArticles as Record<string, unknown>[];
		expect(art['excerpt']).toBe('One two three four five');
		expect(art['wordCount']).toBe(5);
	});

	test('updateArticle() via immutable merge updates the store', () => {
		store.addArticle({
			id: 'a3',
			title: 'Draft',
			content: 'Draft content',
			published: false,
			publishedAt: new Date(),
		});
		const success = store.updateArticle('a3', {
			published: true,
			title: 'Published!',
		});
		expect(success).toBe(true);
		const [art] = store.allArticles as Record<string, unknown>[];
		expect(art['title']).toBe('Published!');
		expect(art['published']).toBe(true);
	});

	test('updateArticle() returns false for unknown id', () => {
		expect(store.updateArticle('nonexistent', { published: true })).toBe(
			false
		);
	});

	test('selectArticle() + selectedArticle getter returns serialized model', () => {
		store.addArticle({
			id: 'a4',
			title: 'Selected',
			content: 'Some content',
			published: true,
			publishedAt: new Date(),
		});
		store.selectArticle('a4');
		const sel = store.selectedArticle as Record<string, unknown>;
		expect(sel['title']).toBe('Selected');
	});

	test('publishedArticles getter filters by published flag', () => {
		store.addArticle({
			id: 'p1',
			title: 'Pub',
			content: 'c',
			published: true,
			publishedAt: new Date(),
		});
		store.addArticle({
			id: 'p2',
			title: 'Draft',
			content: 'c',
			published: false,
			publishedAt: new Date(),
		});
		expect(store.publishedArticles).toHaveLength(1);
	});

	test('publishedAt is coerced to Date instance', () => {
		store.addArticle({
			id: 'a5',
			title: 'Title',
			content: 'Content',
			published: false,
			publishedAt: '2024-06-15T12:00:00.000Z',
		});
		// Access the raw model to verify coercion
		const out = store.allArticles[0] as Record<string, unknown>;
		expect(typeof out['publishedAt']).toBe('string'); // ISO string after serialize()
	});
});

// ---------------------------------------------------------------------------
// 3. VeeValidate-like adapter — useField validation rules
// ---------------------------------------------------------------------------

// Simulate VeeValidate useForm + useField output:
// { value, errorMessage, meta: { valid, dirty } }
interface IVueField<TVal> {
	value: TVal;
	errorMessage: string | null;
	meta: { valid: boolean };
}

function useVueField<TInst extends object, TKey extends keyof TInst>(
	instance: TInst,
	field: TKey
): IVueField<TInst[TKey]> {
	const result = qCheckRules(instance);
	const fieldErrors = result.errors.filter(
		(err) => err.field === String(field)
	);
	return {
		value: instance[field],
		errorMessage: fieldErrors[0]?.message ?? null,
		meta: { valid: fieldErrors.length === 0 },
	};
}

describe('Vue 3 — VeeValidate-like field adapter', () => {
	test('valid field has null errorMessage and meta.valid true', () => {
		const form = new ContactForm();
		form.firstName = 'Ada';
		form.lastName = 'Lovelace';
		form.email = 'ada@example.com';
		form.city = 'London';
		form.postalCode = '12345';
		const field = useVueField(form, 'email');
		expect(field.errorMessage).toBeNull();
		expect(field.meta.valid).toBe(true);
	});

	test('invalid field has error message and meta.valid false', () => {
		const form = new ContactForm();
		form.firstName = 'Ada';
		form.lastName = 'Lovelace';
		form.email = 'bad-email';
		form.city = 'London';
		form.postalCode = '12345';
		const field = useVueField(form, 'email');
		expect(field.errorMessage).not.toBeNull();
		expect(field.meta.valid).toBe(false);
	});

	test('field value matches the instance property', () => {
		const form = new ContactForm();
		form.firstName = 'Marie';
		form.lastName = 'Curie';
		form.email = 'marie@example.com';
		form.city = 'Paris';
		form.postalCode = '75001';
		const field = useVueField(form, 'firstName');
		expect(field.value).toBe('Marie');
	});
});

// ---------------------------------------------------------------------------
// 4. Vue 3 v-model simulation (defineModel pattern)
// ---------------------------------------------------------------------------

class SettingsForm {
	@QField({ label: 'Theme' })
	@QRule(
		(value: string) => ['light', 'dark', 'auto'].includes(value),
		'Theme must be light, dark, or auto'
	)
	theme = 'auto';

	@QField({ label: 'Language' })
	@QRule(
		(value: string) => ['en', 'es', 'fr', 'de'].includes(value),
		'Unsupported language'
	)
	language = 'en';

	@QField({ label: 'Notifications' })
	@QRule((value: boolean) => typeof value === 'boolean', 'Must be boolean')
	notifications = true;
}

// Simulate Vue defineModel — a wrapper that fires update events
class VueModelBinding<TInst extends object> {
	private instance: TInst;
	private updateCallbacks: Array<(key: string, value: unknown) => void> = [];

	constructor(initial: TInst) {
		this.instance = initial;
	}

	get value(): TInst {
		return this.instance;
	}

	set<TKey extends keyof TInst>(key: TKey, val: TInst[TKey]): void {
		this.instance[key] = val;
		this.updateCallbacks.forEach((cb) => cb(String(key), val));
	}

	onUpdate(cb: (key: string, value: unknown) => void): void {
		this.updateCallbacks.push(cb);
	}
}

describe('Vue 3 — v-model / defineModel binding simulation', () => {
	test('set() updates the bound instance property', () => {
		const form = new SettingsForm();
		const binding = new VueModelBinding(form);
		binding.set('theme', 'dark');
		expect(binding.value.theme).toBe('dark');
	});

	test('onUpdate callback fires when value changes', () => {
		const form = new SettingsForm();
		const binding = new VueModelBinding(form);
		const events: Array<{ key: string; value: unknown }> = [];
		binding.onUpdate((key, value) => events.push({ key, value }));
		binding.set('language', 'es');
		expect(events).toHaveLength(1);
		expect(events[0].key).toBe('language');
		expect(events[0].value).toBe('es');
	});

	test('validation works on the bound instance after set()', () => {
		const form = new SettingsForm();
		const binding = new VueModelBinding(form);
		binding.set('theme', 'invalid-theme');
		const result = qCheckRules(binding.value);
		expect(result.errors.some((err) => err.field === 'theme')).toBe(true);
	});

	test('valid settings pass qCheckRules', () => {
		const form = new SettingsForm();
		const binding = new VueModelBinding(form);
		binding.set('theme', 'dark');
		binding.set('language', 'fr');
		const result = qCheckRules(binding.value);
		expect(result.valid).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 5. Nuxt useAsyncData pattern — createMany() for list page
// ---------------------------------------------------------------------------

interface IProduct {
	id: number;
	name: string;
	price: number;
	inStock: boolean;
	updatedAt: Date;
}

@Quick(
	{
		id: 'number',
		name: 'string',
		price: 'number',
		inStock: 'boolean',
		updatedAt: Date,
	},
	{ unknownPropertyPolicy: 'strip' }
)
class ProductModel extends QModel<IProduct> {
	declare id: number;
	declare name: string;
	declare price: number;
	declare inStock: boolean;
	declare updatedAt: Date;

	@QComputed()
	get displayPrice(): string {
		return `$${this.price.toFixed(2)}`;
	}
}

// Simulate Nuxt useAsyncData fetching a product list
async function useFetchProductList(rawData: object[]): Promise<{
	products: object[];
	failedCount: number;
}> {
	await Bun.sleep(1); // simulate async fetch
	const { instances, errors } = ProductModel.createMany(rawData);
	return {
		products: instances.map((item) => item.serialize()),
		failedCount: errors.length,
	};
}

describe('Vue 3/Nuxt — useAsyncData with createMany()', () => {
	test('createMany() coerces all products from raw API response', async () => {
		const raw = [
			{
				id: 1,
				name: 'Laptop',
				price: 999.99,
				inStock: true,
				updatedAt: '2024-01-01T00:00:00.000Z',
			},
			{
				id: 2,
				name: 'Mouse',
				price: 29.99,
				inStock: false,
				updatedAt: '2024-02-01T00:00:00.000Z',
			},
		];
		const { products, failedCount } = await useFetchProductList(raw);
		expect(products).toHaveLength(2);
		expect(failedCount).toBe(0);
	});

	test('@QComputed displayPrice formats price as "$X.XX"', async () => {
		const raw = [
			{
				id: 3,
				name: 'Keyboard',
				price: 79.5,
				inStock: true,
				updatedAt: new Date(),
			},
		];
		const { products } = await useFetchProductList(raw);
		const prod = products[0] as Record<string, unknown>;
		expect(prod['displayPrice']).toBe('$79.50');
	});

	test('updatedAt is coerced from ISO string to Date for processing', () => {
		const item = new ProductModel({
			id: 4,
			name: 'Monitor',
			price: 299,
			inStock: true,
			updatedAt: '2024-03-15T09:00:00.000Z',
		});
		expect(item.updatedAt).toBeInstanceOf(Date);
	});

	test('unknown API fields are stripped', async () => {
		const raw = [
			{
				id: 5,
				name: 'Headset',
				price: 49.99,
				inStock: true,
				updatedAt: new Date(),
				_secret: 'sensitive',
				internalCode: 'XYZ',
			},
		];
		const { products } = await useFetchProductList(raw);
		const prod = products[0] as Record<string, unknown>;
		expect('_secret' in prod).toBe(false);
		expect('internalCode' in prod).toBe(false);
	});

	test('createMany() result shape has instances and errors arrays', () => {
		const raw = [
			{
				id: 6,
				name: 'Webcam',
				price: 59.99,
				inStock: true,
				updatedAt: new Date(),
			},
		];
		const result = ProductModel.createMany(raw);
		expect(Array.isArray(result.instances)).toBe(true);
		expect(Array.isArray(result.errors)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 6. Async validation — username uniqueness (Vue async composable)
// ---------------------------------------------------------------------------

const takenUsernames = new Set(['admin', 'superuser', 'root']);

class VueRegisterForm {
	@QField({ label: 'Username', required: true })
	@QRule(async (value: string) => {
		await Bun.sleep(3);
		return !takenUsernames.has(value.toLowerCase());
	}, 'Username already taken')
	@QRule(
		(value: string) => value.length >= 3,
		'Username must be at least 3 chars'
	)
	username = '';

	@QField({ label: 'Email', widget: 'email' })
	@QRule(
		(value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
		'Invalid email'
	)
	email = '';
}

describe('Vue 3 — async username uniqueness (useAsyncValidation)', () => {
	test('available username passes async check', async () => {
		const form = new VueRegisterForm();
		form.username = 'vue_dev';
		form.email = 'dev@vue.js';
		const result = await qCheckRulesAsync(form);
		expect(result.valid).toBe(true);
	});

	test('taken username fails async check', async () => {
		const form = new VueRegisterForm();
		form.username = 'admin';
		form.email = 'dev@vue.js';
		const result = await qCheckRulesAsync(form);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'username')).toBe(
			true
		);
	});

	test('short username fails sync rule before async', async () => {
		const form = new VueRegisterForm();
		form.username = 'ab';
		form.email = 'dev@vue.js';
		const result = await qCheckRulesAsync(form, { mode: 'serial' });
		expect(result.valid).toBe(false);
		const msg = result.errors.find(
			(err) => err.field === 'username'
		)?.message;
		expect(msg).toContain('3 chars');
	});
});
