# Mobile Integration

QuickModel works seamlessly in mobile development environments including React Native, Expo, Capacitor, Ionic, and Cordova. No native packages are required — all patterns rely on pure TypeScript logic.

## Key Patterns

| Pattern                     | QuickModel API                             |
| --------------------------- | ------------------------------------------ |
| TextInput coercion          | `coercionStrategy: 'loose'` in `@Quick()`  |
| Persist to AsyncStorage     | `dto.$qSerialize()` → `JSON.stringify()`   |
| Rehydrate from storage      | `new MyDto(JSON.parse(stored))`            |
| Capacitor Preferences + TTL | `serialize()` + timestamp in stored object |
| Dynamic form rendering      | `dto.$qGetFormSchema()`                    |
| Validate before native API  | `qCheckRules()` / `qCheckRulesAsync()`     |
| Immutable state updates     | `dto.$qCopy({ field: value })`             |
| Change detection            | `dto.$qIsDirty()`                          |
| Bulk list population        | `MyDto.createMany(apiArray)`               |

## Installation

```bash
npm install quickmodel
```

Enable decorators in `tsconfig.json`:

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## Model Setup

Define interfaces with the `I` prefix and extend `QModel<IInterface>`:

```typescript
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

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

	@QField({ label: 'Full Name', required: true })
	@QRule((val: string) => val.length >= 2, 'Name too short')
	declare name: string;

	@QField({ label: 'Age' })
	@QRule((val: number) => val >= 0 && val <= 120, 'Invalid age')
	declare age: number;

	@QField({ label: 'Email', required: true })
	@QRule((val: string) => val.includes('@'), 'Invalid email')
	declare email: string;

	@QField({ label: 'Phone' })
	@QRule((val: string) => val.length >= 7, 'Phone too short')
	declare phone: string;

	declare isVerified: boolean;

	@QComputed()
	get displayLabel(): string {
		return `${this.name} (${this.email})`;
	}
}
```

The `coercionStrategy: 'loose'` option is the key to supporting mobile platforms: all string values coming from native text inputs are automatically coerced to the correct type.

## React Native / Expo

### TextInput Coercion

React Native `TextInput` always returns strings. With `coercionStrategy: 'loose'`, QuickModel handles the conversion automatically:

```typescript
const dto = new UserProfileDto({
	uid: 'u01',
	name: 'Alice',
	age: '25', // string from TextInput → coerced to number
	email: 'a@b.com',
	phone: '1234567',
	isVerified: 'true', // string → coerced to boolean
});

console.assert(dto.age === 25); // number ✅
console.assert(dto.isVerified === true); // boolean ✅
```

### Validation

```typescript
import { qCheckRules } from 'quickmodel/forms';

const result = qCheckRules(dto);
if (!result.valid) {
	result.errors.forEach((err) => {
		console.warn(`${err.field}: ${err.message}`);
	});
}
```

### AsyncStorage Roundtrip

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Persist
const dto = new UserProfileDto({
	uid: 'u01',
	name: 'Alice',
	age: 25 /* ... */,
});
await AsyncStorage.setItem('user', JSON.stringify(dto.$qSerialize()));

// Rehydrate
const stored = await AsyncStorage.getItem('user');
if (stored) {
	const restored = new UserProfileDto(JSON.parse(stored));
}
```

### Bulk List Restore

```typescript
const rawList = JSON.parse(
	(await AsyncStorage.getItem('products')) ?? '[]'
) as object[];
const { instances, errors } = UserProfileDto.createMany(rawList);
// instances: UserProfileDto[] — fully typed
```

### Expo Router — Route Actions

```typescript
// app/profile/edit.tsx (action)
export async function action({ request }: { request: Request }) {
	const body = (await request.json()) as object;
	const dto = new UserProfileDto(body);
	const result = qCheckRules(dto);

	if (!result.valid) {
		return { errors: result.errors };
	}
	return { success: true };
}
```

## Capacitor

### Preferences Storage

```typescript
import { Preferences } from '@capacitor/preferences';
import { qCheckRulesAsync } from 'quickmodel/forms';

async function saveSettings(dto: AppSettingsDto): Promise<void> {
	const result = await qCheckRulesAsync(dto);
	if (!result.valid) throw new Error('Invalid settings');
	await Preferences.set({
		key: 'settings',
		value: JSON.stringify(dto.$qSerialize()),
	});
}

async function loadSettings(): Promise<AppSettingsDto> {
	const { value } = await Preferences.get({ key: 'settings' });
	return new AppSettingsDto(value ? (JSON.parse(value) as object) : {});
}
```

### TTL Pattern

```typescript
interface ICachedEntry<T> {
	data: T;
	exp: number;
}

async function saveWithTtl(dto: AppSettingsDto, ttlMs: number): Promise<void> {
	const entry: ICachedEntry<object> = {
		data: dto.$qSerialize() as object,
		exp: Date.now() + ttlMs,
	};
	await Preferences.set({
		key: 'settings_ttl',
		value: JSON.stringify(entry),
	});
}

async function loadIfFresh(): Promise<AppSettingsDto | null> {
	const { value } = await Preferences.get({ key: 'settings_ttl' });
	if (!value) return null;
	const entry = JSON.parse(value) as ICachedEntry<object>;
	if (entry.exp < Date.now()) return null; // expired
	return new AppSettingsDto(entry.data);
}
```

## Ionic

### Dynamic Fields with `getFormSchema()`

```typescript
const dto = new UserProfileDto({
	uid: 'u01',
	name: '',
	age: 0,
	email: '',
	phone: '',
	isVerified: false,
});
const fields = dto.$qGetFormSchema();
// Render each field as an ion-input in your Ionic page
```

### Validate before AlertInput

```typescript
const result = qCheckRules(dto);
if (!result.valid) {
	await alertController
		.create({
			header: 'Validation Error',
			message: result.errors[0]?.message ?? 'Please fix the form',
			buttons: ['OK'],
		})
		.then((alert) => alert.present());
	return;
}
```

### Immutable Ion-Item State

```typescript
const original = activeProduct;
const updated = original.$qCopy({ price: 15.99 });
// original.price is still unchanged
```

## Cordova (Legacy)

```typescript
document.addEventListener(
	'deviceready',
	() => {
		const dto = new UserProfileDto({
			uid: 'cord01',
			name: 'Sara',
			age: 34,
			email: 's@b.com',
			phone: '5554321',
			isVerified: true,
		});
		localStorage.setItem('user', JSON.stringify(dto.$qSerialize()));
	},
	false
);

const stored = localStorage.getItem('user');
if (stored) {
	const dto = new UserProfileDto(JSON.parse(stored) as object);
}
```

The serialization contract is **identical** between Cordova's `localStorage` and Capacitor's `Preferences` — migrating between them requires no changes to your QuickModel code.

> **Migration note:** Capacitor is the recommended successor to Cordova. Since QuickModel's serialization API is platform-agnostic, migrating storage from `localStorage` to `Preferences` is a simple swap of the storage call — the model code stays the same.
