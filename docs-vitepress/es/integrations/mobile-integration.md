# Integración Mobile

QuickModel funciona de forma transparente en entornos de desarrollo móvil, incluyendo React Native, Expo, Capacitor, Ionic y Cordova. No se requieren paquetes nativos — todos los patrones se basan en lógica TypeScript pura.

## Patrones Clave

| Patrón                               | API de QuickModel                                 |
| ------------------------------------ | ------------------------------------------------- |
| Coerción de TextInput                | `coercionStrategy: 'loose'` en `@Quick()`         |
| Persistir en AsyncStorage            | `dto.serialize()` → `JSON.stringify()`            |
| Rehidratar desde almacenamiento      | `new MyDto(JSON.parse(stored))`                   |
| Capacitor Preferences + TTL          | `serialize()` + timestamp en el objeto almacenado |
| Renderizado dinámico de campos       | `dto.getFormSchema()`                             |
| Validar antes de una API nativa      | `qCheckRules()` / `qCheckRulesAsync()`            |
| Actualizaciones de estado inmutables | `dto.copy({ field: value })`                      |
| Detección de cambios                 | `dto.isDirty()`                                   |
| Población de listas en bulk          | `MyDto.createMany(apiArray)`                      |

## Instalación

```bash
npm install quickmodel
```

Habilita los decoradores en `tsconfig.json`:

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## Configuración del Modelo

Define las interfaces con el prefijo `I` y extiende `QModel<IInterface>`:

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

	@QField({ label: 'Nombre Completo', required: true })
	@QRule((val: string) => val.length >= 2, 'Nombre demasiado corto')
	declare name: string;

	@QField({ label: 'Edad' })
	@QRule((val: number) => val >= 0 && val <= 120, 'Edad inválida')
	declare age: number;

	@QField({ label: 'Correo', required: true })
	@QRule((val: string) => val.includes('@'), 'Correo inválido')
	declare email: string;

	@QField({ label: 'Teléfono' })
	@QRule((val: string) => val.length >= 7, 'Teléfono demasiado corto')
	declare phone: string;

	declare isVerified: boolean;

	@QComputed()
	get displayLabel(): string {
		return `${this.name} (${this.email})`;
	}
}
```

La opción `coercionStrategy: 'loose'` es la clave para soportar plataformas móviles: todos los valores de tipo string provenientes de inputs de texto nativos se convierten automáticamente al tipo correcto.

## React Native / Expo

### Coerción de TextInput

El componente `TextInput` de React Native siempre devuelve strings. Con `coercionStrategy: 'loose'`, QuickModel maneja la conversión automáticamente:

```typescript
const dto = new UserProfileDto({
	uid: 'u01',
	name: 'Alice',
	age: '25', // string de TextInput → coercionado a number
	email: 'a@b.com',
	phone: '1234567',
	isVerified: 'true', // string → coercionado a boolean
});

console.assert(dto.age === 25); // number ✅
console.assert(dto.isVerified === true); // boolean ✅
```

### Validación

```typescript
import { qCheckRules } from 'quickmodel';

const result = qCheckRules(dto);
if (!result.valid) {
	result.errors.forEach((err) => {
		console.warn(`${err.field}: ${err.message}`);
	});
}
```

### Roundtrip con AsyncStorage

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Persistir
const dto = new UserProfileDto({
	uid: 'u01',
	name: 'Alice',
	age: 25 /* ... */,
});
await AsyncStorage.setItem('user', JSON.stringify(dto.serialize()));

// Rehidratar
const stored = await AsyncStorage.getItem('user');
if (stored) {
	const restored = new UserProfileDto(JSON.parse(stored) as object);
}
```

### Restaurar una Lista en Bulk

```typescript
const rawList = JSON.parse(
	(await AsyncStorage.getItem('products')) ?? '[]'
) as object[];
const { instances, errors } = UserProfileDto.createMany(rawList);
// instances: UserProfileDto[] — completamente tipado
```

### Expo Router — Acciones de Ruta

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

### Almacenamiento en Preferences

```typescript
import { Preferences } from '@capacitor/preferences';
import { qCheckRulesAsync } from 'quickmodel';

async function saveSettings(dto: AppSettingsDto): Promise<void> {
	const result = await qCheckRulesAsync(dto);
	if (!result.valid) throw new Error('Ajustes inválidos');
	await Preferences.set({
		key: 'settings',
		value: JSON.stringify(dto.serialize()),
	});
}

async function loadSettings(): Promise<AppSettingsDto> {
	const { value } = await Preferences.get({ key: 'settings' });
	return new AppSettingsDto(value ? (JSON.parse(value) as object) : {});
}
```

### Patrón TTL

```typescript
interface ICachedEntry<T> {
	data: T;
	exp: number;
}

async function saveWithTtl(dto: AppSettingsDto, ttlMs: number): Promise<void> {
	const entry: ICachedEntry<object> = {
		data: dto.serialize() as object,
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
	if (entry.exp < Date.now()) return null; // expirado
	return new AppSettingsDto(entry.data);
}
```

## Ionic

### Campos Dinámicos con `getFormSchema()`

```typescript
const dto = new UserProfileDto({
	uid: 'u01',
	name: '',
	age: 0,
	email: '',
	phone: '',
	isVerified: false,
});
const fields = dto.getFormSchema();
// Renderiza cada field como un ion-input en tu página Ionic
```

### Validar antes de AlertInput

```typescript
const result = qCheckRules(dto);
if (!result.valid) {
	await alertController
		.create({
			header: 'Error de Validación',
			message:
				result.errors[0]?.message ?? 'Por favor corrige el formulario',
			buttons: ['OK'],
		})
		.then((alert) => alert.present());
	return;
}
```

### Estado Inmutable en Ion-Item

```typescript
const original = activeProduct;
const updated = original.copy({ price: 15.99 });
// original.price no cambia
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
		localStorage.setItem('user', JSON.stringify(dto.serialize()));
	},
	false
);

const stored = localStorage.getItem('user');
if (stored) {
	const dto = new UserProfileDto(JSON.parse(stored) as object);
}
```

El contrato de serialización es **idéntico** entre `localStorage` de Cordova y `Preferences` de Capacitor — migrar entre ellos no requiere cambios en el código de QuickModel.

> **Nota de migración:** Capacitor es el sucesor recomendado de Cordova. Dado que la API de serialización de QuickModel es agnóstica a la plataforma, migrar el almacenamiento de `localStorage` a `Preferences` es un simple cambio en la llamada de almacenamiento — el código del modelo permanece igual.
