/**
 * Mobile Integration Patterns — QuickModel
 *
 * Verifies QuickModel patterns for mobile development:
 * React Native / Expo, Capacitor, Cordova, and Ionic.
 * No native packages imported — pure TypeScript logic only.
 *
 * Key patterns:
 * - TextInput coercion: coercionStrategy 'loose' handles string inputs
 * - AsyncStorage roundtrip: serialize() / new Dto(parsed) for persistence
 * - Capacitor Preferences: typed storage with TTL pattern
 * - Ionic forms: getFormSchema() for dynamic fields
 * - checkRulesAsync() for native API validation
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick, QRule, QField, QComputed } from '@/index';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

interface IUserProfile {
	uid: string;
	name: string;
	age: number;
	email: string;
	phone: string;
	isVerified: boolean;
	displayLabel?: string;
}

@Quick(
	{
		uid: 'string',
		name: 'string',
		age: 'number',
		email: 'string',
		phone: 'string',
		isVerified: 'boolean',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserProfileDto extends QModel<IUserProfile> {
	declare uid: string;

	@QField({ widget: 'input', label: 'Full Name', required: true })
	@QRule((val: string) => val.length >= 2, 'Name too short')
	declare name: string;

	@QField({ widget: 'input', label: 'Age' })
	@QRule((val: number) => val >= 0 && val <= 120, 'Invalid age')
	declare age: number;

	@QField({ widget: 'input', label: 'Email', required: true })
	@QRule((val: string) => val.includes('@'), 'Invalid email')
	declare email: string;

	@QField({ widget: 'input', label: 'Phone' })
	@QRule((val: string) => val.length >= 7, 'Phone too short')
	declare phone: string;

	declare isVerified: boolean;

	@QComputed()
	get displayLabel(): string {
		return `${this.name} (${this.email})`;
	}
}

interface IAppSettings {
	theme: string;
	language: string;
	notifications: boolean;
	fontSize: number;
	version: number;
}

@Quick(
	{
		theme: 'string',
		language: 'string',
		notifications: 'boolean',
		fontSize: 'number',
		version: 'number',
	},
	{ coercionStrategy: 'loose' }
)
class AppSettingsDto extends QModel<IAppSettings> {
	@QRule(
		(val: string) => ['light', 'dark', 'system'].includes(val),
		'Invalid theme'
	)
	declare theme: string;

	@QRule((val: string) => val.length >= 2, 'Invalid language')
	declare language: string;

	declare notifications: boolean;

	@QRule((val: number) => val >= 10 && val <= 32, 'Font size out of range')
	declare fontSize: number;

	declare version: number;
}

interface IProduct {
	pid: string;
	title: string;
	price: number;
	qty: number;
	tag: string;
}

@Quick(
	{
		pid: 'string',
		title: 'string',
		price: 'number',
		qty: 'number',
		tag: 'string',
	},
	{ coercionStrategy: 'loose', unknownPropertyPolicy: 'strip' }
)
class ProductDto extends QModel<IProduct> {
	declare pid: string;
	declare title: string;

	@QRule((val: number) => val > 0, 'Price must be positive')
	declare price: number;

	@QRule((val: number) => val >= 0, 'Qty cannot be negative')
	declare qty: number;

	declare tag: string;
}

interface IContactForm {
	fullName: string;
	msg: string;
	email: string;
	subject: string;
	rating: number;
}

@Quick(
	{
		fullName: 'string',
		msg: 'string',
		email: 'string',
		subject: 'string',
		rating: 'number',
	},
	{ coercionStrategy: 'loose' }
)
class ContactFormDto extends QModel<IContactForm> {
	@QField({ widget: 'input', label: 'Full Name', required: true })
	@QRule((val: string) => val.length >= 2, 'Name too short')
	declare fullName: string;

	@QField({ widget: 'input', label: 'Message', required: true })
	@QRule((val: string) => val.length >= 10, 'Message too short')
	declare msg: string;

	@QField({ widget: 'input', label: 'Email', required: true })
	@QRule((val: string) => val.includes('@'), 'Invalid email')
	declare email: string;

	@QField({ widget: 'input', label: 'Subject' })
	declare subject: string;

	@QField({ widget: 'input', label: 'Rating' })
	@QRule((val: number) => val >= 1 && val <= 5, 'Rating must be 1-5')
	declare rating: number;
}

// ---------------------------------------------------------------------------
// 1. React Native — TextInput coercion
// ---------------------------------------------------------------------------

describe('React Native — TextInput coercion', () => {
	test('coerces string age from TextInput to number', () => {
		const dto = new UserProfileDto({
			uid: 'u01',
			name: 'Alice',
			age: '25',
			email: 'a@b.com',
			phone: '1234567',
			isVerified: false,
		});
		expect(dto.age).toBe(25);
		expect(typeof dto.age).toBe('number');
	});

	test('coerces string isVerified to boolean', () => {
		const dto = new UserProfileDto({
			uid: 'u02',
			name: 'Bob',
			age: 30,
			email: 'b@b.com',
			phone: '9876543',
			isVerified: 'true',
		});
		expect(dto.isVerified).toBe(true);
	});

	test('coerces all TextInput string values', () => {
		const dto = new UserProfileDto({
			uid: 'u03',
			name: 'Carol',
			age: '40',
			email: 'c@b.com',
			phone: '5551234',
			isVerified: 'false',
		});
		expect(typeof dto.uid).toBe('string');
		expect(typeof dto.name).toBe('string');
		expect(typeof dto.age).toBe('number');
		expect(typeof dto.email).toBe('string');
		expect(typeof dto.phone).toBe('string');
		expect(typeof dto.isVerified).toBe('boolean');
	});

	test('checkRules passes for valid profile data', () => {
		const dto = new UserProfileDto({
			uid: 'u04',
			name: 'Dana',
			age: 25,
			email: 'd@example.com',
			phone: '1234567',
			isVerified: false,
		});
		const result = qCheckRules(dto);
		expect(result.valid).toBe(true);
	});

	test('checkRules fails when name is too short', () => {
		const dto = new UserProfileDto({
			uid: 'u05',
			name: 'A',
			age: 25,
			email: 'a@example.com',
			phone: '1234567',
			isVerified: false,
		});
		const result = qCheckRules(dto);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'name')).toBe(true);
	});

	test('checkRules fails for invalid email', () => {
		const dto = new UserProfileDto({
			uid: 'u06',
			name: 'Eve',
			age: 25,
			email: 'not-an-email',
			phone: '1234567',
			isVerified: false,
		});
		const result = qCheckRules(dto);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'email')).toBe(true);
	});

	test('coerces string false to boolean false', () => {
		const dto = new UserProfileDto({
			uid: 'u07',
			name: 'Frank',
			age: 33,
			email: 'f@b.com',
			phone: '1234567',
			isVerified: 'false',
		});
		expect(dto.isVerified).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// 2. React Native — AsyncStorage roundtrip
// ---------------------------------------------------------------------------

describe('React Native — AsyncStorage roundtrip', () => {
	let dto: UserProfileDto;

	beforeEach(() => {
		dto = new UserProfileDto({
			uid: 'as01',
			name: 'Grace',
			age: 28,
			email: 'g@example.com',
			phone: '4441234',
			isVerified: true,
		});
	});

	test('serialize produces plain object safe for JSON.stringify', () => {
		const serialized = dto.serialize();
		expect(() => JSON.stringify(serialized)).not.toThrow();
	});

	test('new dto from JSON.parse(serialize()) restores values', () => {
		const stored = JSON.stringify(dto.serialize());
		const parsed = JSON.parse(stored) as Record<string, unknown>;
		const restored = new UserProfileDto(parsed);
		expect(restored.serialize()).toEqual(dto.serialize());
	});

	test('createMany restores list from AsyncStorage array', () => {
		const rawList = [
			{
				uid: 'x1',
				name: 'Hank',
				age: 22,
				email: 'h@b.com',
				phone: '1234567',
				isVerified: false,
			},
			{
				uid: 'x2',
				name: 'Iris',
				age: 31,
				email: 'i@b.com',
				phone: '2345678',
				isVerified: true,
			},
		];
		const { instances, errors } = UserProfileDto.createMany(
			rawList as any[]
		);
		expect(errors.length).toBe(0);
		expect(instances.length).toBe(2);
		expect(instances[0]?.name).toBe('Hank');
	});

	test('copy preserves original before write', () => {
		const updated = dto.copy({ name: 'Nueva' });
		expect(dto.name).toBe('Grace');
		expect(updated.name).toBe('Nueva');
	});

	test('isDirty detects pending changes', () => {
		const updated = dto.copy({ name: 'Nueva' });
		expect(updated.isDirty()).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 3. Expo Router — route validation
// ---------------------------------------------------------------------------

describe('Expo Router — route validation', () => {
	type IRouteResult =
		| { success: true; data: IUserProfile }
		| { success: false; errors: Array<{ field: string; message: string }> };

	function routeAction(params: Record<string, unknown>): IRouteResult {
		const dto = new UserProfileDto(params);
		const result = qCheckRules(dto);
		if (!result.valid) {
			return { success: false, errors: result.errors };
		}
		return { success: true, data: dto.serialize() as IUserProfile };
	}

	test('route action validates before submit', () => {
		const result = routeAction({
			uid: 'r01',
			name: 'Jake',
			age: 25,
			email: 'j@b.com',
			phone: '1234567',
			isVerified: false,
		});
		expect(result.success).toBe(true);
	});

	test('route action returns errors on invalid data', () => {
		const result = routeAction({
			uid: 'r02',
			name: 'K',
			age: 25,
			email: 'not-email',
			phone: '1234567',
			isVerified: false,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors.length).toBeGreaterThan(0);
		}
	});

	test('route action returns success on valid data', () => {
		const result = routeAction({
			uid: 'r03',
			name: 'Lena',
			age: 30,
			email: 'lena@example.com',
			phone: '9876543',
			isVerified: true,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe('Lena');
		}
	});

	test('coerces numeric route params from string', () => {
		const dto = new UserProfileDto({
			uid: 'r04',
			name: 'Mike',
			age: '35',
			email: 'm@b.com',
			phone: '1234567',
			isVerified: 'true',
		});
		expect(dto.age).toBe(35);
		expect(dto.isVerified).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 4. Capacitor Preferences — typed storage
// ---------------------------------------------------------------------------

describe('Capacitor Preferences — typed storage', () => {
	const prefs = new Map<string, string>();

	const validSettings = {
		theme: 'dark',
		language: 'en',
		notifications: true,
		fontSize: 16,
		version: 2,
	};

	test('serialize output is safe for Preferences.set', () => {
		const dto = new AppSettingsDto(validSettings);
		const raw = JSON.stringify(dto.serialize());
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const restored = new AppSettingsDto(parsed);
		expect(restored.theme).toBe('dark');
		expect(restored.fontSize).toBe(16);
	});

	test('populate rehydrates settings from Preferences.get', () => {
		const dto = new AppSettingsDto(validSettings);
		prefs.set('settings', JSON.stringify(dto.serialize()));
		const stored = prefs.get('settings');
		expect(stored).toBeDefined();
		const restored = new AppSettingsDto(
			JSON.parse(stored!) as Record<string, unknown>
		);
		expect(restored.language).toBe('en');
		expect(restored.notifications).toBe(true);
	});

	test('TTL pattern stores expiry with data', () => {
		const dto = new AppSettingsDto(validSettings);
		const ttlEntry = { data: dto.serialize(), exp: Date.now() + 1000 };
		expect(ttlEntry.exp).toBeGreaterThan(Date.now());
	});

	test('expired TTL entry is detected', () => {
		const dto = new AppSettingsDto(validSettings);
		const ttlEntry = { data: dto.serialize(), exp: Date.now() - 1 };
		expect(ttlEntry.exp).toBeLessThan(Date.now());
	});

	test('checkRulesAsync validates before native API call', async () => {
		const dto = new AppSettingsDto(validSettings);
		const result = await qCheckRulesAsync(dto);
		expect(result.valid).toBe(true);
	});

	test('checkRules detects invalid theme', () => {
		const dto = new AppSettingsDto({ ...validSettings, theme: 'rainbow' });
		const result = qCheckRules(dto);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'theme')).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 5. Ionic — form patterns
// ---------------------------------------------------------------------------

describe('Ionic — form patterns', () => {
	test('getFormSchema returns fields for ion-input rendering', () => {
		const dto = new UserProfileDto({
			uid: 'ion1',
			name: 'Nina',
			age: 27,
			email: 'n@b.com',
			phone: '1234567',
			isVerified: false,
		});
		const schema = dto.getFormSchema();
		expect(Array.isArray(schema)).toBe(true);
		expect(schema.length).toBeGreaterThan(0);
	});

	test('ion-input coercion handles string number', () => {
		const dto = new UserProfileDto({
			uid: 'ion2',
			name: 'Omar',
			age: '29',
			email: 'o@b.com',
			phone: '7654321',
			isVerified: false,
		});
		expect(dto.age).toBe(29);
	});

	test('createMany populates IonList from API data', () => {
		const apiData = [
			{
				pid: 'p1',
				title: 'Item A',
				price: '9.99',
				qty: '2',
				tag: 'sale',
			},
			{
				pid: 'p2',
				title: 'Item B',
				price: '4.50',
				qty: '10',
				tag: 'new',
			},
			{
				pid: 'p3',
				title: 'Item C',
				price: '14.99',
				qty: '5',
				tag: 'sale',
			},
		];
		const { instances } = ProductDto.createMany(apiData as any[]);
		expect(instances.length).toBe(3);
		expect(typeof instances[0]?.price).toBe('number');
	});

	test('checkRules validates before AlertInput confirm', () => {
		const dto = new ContactFormDto({
			fullName: 'Paula',
			msg: 'Hello world, this is a test message',
			email: 'p@b.com',
			subject: 'Test',
			rating: 5,
		});
		const result = qCheckRules(dto);
		expect(result.valid).toBe(true);
	});

	test('copy prevents mutation of cached ion-item', () => {
		const dto = new ProductDto({
			pid: 'p99',
			title: 'Widget',
			price: 10,
			qty: 3,
			tag: 'hot',
		});
		const updated = dto.copy({ price: 15 });
		expect(dto.price).toBe(10);
		expect(updated.price).toBe(15);
	});
});

// ---------------------------------------------------------------------------
// 6. Ionic + Angular — reactive forms
// ---------------------------------------------------------------------------

describe('Ionic + Angular — reactive forms', () => {
	test('qCheckRules errors map to AbstractControl errors structure', () => {
		const dto = new ContactFormDto({
			fullName: 'Q',
			msg: 'short',
			email: 'bad',
			subject: 'Hi',
			rating: 10,
		});
		const result = qCheckRules(dto);
		expect(result.valid).toBe(false);

		const controlErrors = result.errors.reduce<Record<string, string>>(
			(acc, err) => {
				acc[err.field] = err.message;
				return acc;
			},
			{}
		);

		expect(typeof controlErrors['fullName']).toBe('string');
		expect(typeof controlErrors['rating']).toBe('string');
	});

	test('valid form submits dto.toInterface()', () => {
		const dto = new ContactFormDto({
			fullName: 'Rosa',
			msg: 'This is a valid message with enough content',
			email: 'r@example.com',
			subject: 'Test subject',
			rating: 4,
		});
		const result = qCheckRules(dto);
		expect(result.valid).toBe(true);
		const iface = dto.toInterface();
		expect(iface.fullName).toBe('Rosa');
		expect(iface.rating).toBe(4);
	});
});

// ---------------------------------------------------------------------------
// 7. Cordova — localStorage persistence
// ---------------------------------------------------------------------------

describe('Cordova — localStorage persistence', () => {
	const profile = {
		uid: 'cord01',
		name: 'Sara',
		age: 34,
		email: 's@example.com',
		phone: '5554321',
		isVerified: true,
	};

	test('serialize is safe for JSON.stringify/parse roundtrip', () => {
		const dto = new UserProfileDto(profile);
		const stored = JSON.stringify(dto.serialize());
		expect(() => JSON.parse(stored)).not.toThrow();
	});

	test('populate restores from parsed storage value', () => {
		const dto = new UserProfileDto(profile);
		const stored = JSON.stringify(dto.serialize());
		const restored = new UserProfileDto(
			JSON.parse(stored) as Record<string, unknown>
		);
		expect(restored.name).toBe('Sara');
		expect(restored.age).toBe(34);
	});

	test('deviceready pattern initializes dto from storage', () => {
		const storage = new Map<string, string>();
		const dto = new UserProfileDto(profile);
		storage.set('user', JSON.stringify(dto.serialize()));

		const raw = storage.get('user');
		expect(raw).toBeDefined();
		const initialized = new UserProfileDto(
			JSON.parse(raw!) as Record<string, unknown>
		);
		expect(initialized.uid).toBe('cord01');
	});

	test('same serialize/populate contract works in both Cordova and Capacitor', () => {
		const cordovaDto = new UserProfileDto(profile);
		const serialized = cordovaDto.serialize();

		const capacitorDto = new UserProfileDto(
			serialized as Record<string, unknown>
		);
		expect(capacitorDto.name).toBe(cordovaDto.name);
		expect(capacitorDto.email).toBe(cordovaDto.email);
		expect(capacitorDto.isVerified).toBe(cordovaDto.isVerified);
	});
});
