# Integración de Storage & Persistencia

QuickModel ofrece una API orientada a la serialización que se integra de forma natural con cualquier capa de persistencia: desde `localStorage` hasta IndexedDB, SQLite, Capacitor Preferences, cachés en memoria y APIs de almacenamiento del navegador como OPFS.

## Patrones Clave

| Capa de almacenamiento | Patrón QuickModel                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `localStorage`         | `dto.serialize()` → `JSON.stringify()` → almacenar                                        |
| IndexedDB              | `dto.serialize()` → object store → `new MyDto(raw)`                                       |
| SQLite                 | `dto.toInterface()` → consulta parametrizada                                              |
| Capacitor Preferences  | `JSON.stringify(dto.serialize())` → `Preferences.set()`                                   |
| LRU en memoria         | Almacenar instancias de `MyDto` directamente                                              |
| BroadcastChannel       | `dto.serialize()` → payload del mensaje                                                   |
| OPFS / Service Worker  | `new TextEncoder().encode(JSON.stringify(dto.serialize()))`                               |
| Migración de esquema   | `new MyDto(oldPayload)` — campos desconocidos eliminados, faltantes con valor por defecto |

## Configuración del Modelo

```typescript
import { QModel, Quick, QRule, QField, QComputed, QGroup } from 'quickmodel';

interface IUserRecord {
	uid: string;
	name: string;
	email: string;
	age: number;
	role: string;
	active: boolean;
	score: number;
	summary?: string;
}

@Quick(
	{
		uid: 'string',
		name: 'string',
		email: 'string',
		age: 'number',
		role: 'string',
		active: 'boolean',
		score: 'number',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserRecordDto extends QModel<IUserRecord> {
	declare uid: string;

	@QGroup('profile')
	@QField({ label: 'Nombre', required: true })
	@QRule((val: string) => val.length >= 2, 'Nombre demasiado corto')
	declare name: string;

	@QGroup('credentials')
	@QField({ label: 'Correo', required: true })
	@QRule((val: string) => val.includes('@'), 'Correo inválido')
	declare email: string;

	@QGroup('profile')
	@QField({ label: 'Edad' })
	@QRule((val: number) => val >= 0 && val <= 120, 'Edad inválida')
	declare age: number;

	@QGroup('credentials')
	@QField({ label: 'Rol' })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Rol inválido'
	)
	declare role: string;

	declare active: boolean;
	declare score: number;

	@QComputed()
	get summary(): string {
		return `${this.name} <${this.email}> | ${this.role} | score: ${this.score}`;
	}
}
```

La opción `unknownPropertyPolicy: 'strip'` garantiza que las filas de base de datos con columnas extra o propiedades heredadas se eliminen automáticamente. `coercionStrategy: 'loose'` gestiona el tipado débil de SQLite (enteros como strings, booleanos como 0/1).

## localStorage

### Roundtrip Básico

```typescript
const dto = new UserRecordDto({
	uid: 'u1',
	name: 'Alice',
	email: 'alice@example.com',
	age: 30,
	role: 'user',
	active: true,
	score: 100,
});

// Persistir
localStorage.setItem('user', JSON.stringify(dto.serialize()));

// Restaurar
const stored = localStorage.getItem('user');
const restored = new UserRecordDto(JSON.parse(stored!) as object);
```

### Versionado de Esquema

Cuando el esquema del modelo evoluciona, los campos desconocidos del payload antiguo se eliminan y los faltantes reciben valores por defecto:

```typescript
// Payload antiguo de una versión anterior de la app
const oldPayload = {
	uid: 'u1',
	name: 'Alice',
	email: 'a@b.com',
	legacy_id: 9999,
};
const dto = new UserRecordDto(oldPayload);
// legacy_id → undefined (eliminado) ✅
// age → 0 (valor por defecto del tipo) ✅
// role → '' (valor por defecto del tipo) ✅
```

### Detectar Cambios Antes de Guardar

```typescript
const original = new UserRecordDto(raw);
const updated = original.copy({ score: 200 });
if (updated.isDirty()) {
	localStorage.setItem('user', JSON.stringify(updated.serialize()));
}
```

## IndexedDB

### Almacenar Múltiples Registros

```typescript
const db = new Map<string, unknown>(); // simula un object store de IDB

const rawList = await fetchUsersFromApi();
const { instances } = UserRecordDto.createMany(rawList);
instances.forEach((dto) => db.set(dto.uid, dto.serialize()));
```

### Búsqueda por Índice (Rol)

```typescript
const admins = [...db.values()]
	.map((raw) => new UserRecordDto(raw as object))
	.filter((dto) => dto.role === 'admin');
```

### Actualizar en IDB

```typescript
const updated = dto.copy({ score: 500 });
db.set(updated.uid, updated.serialize()); // reemplaza la entrada existente
```

## Mapeo de Filas SQLite

`coercionStrategy: 'loose'` gestiona el sistema de tipos débil de SQLite — booleanos de 0/1, fechas de strings ISO, números de columnas de texto:

```typescript
// Fila tal como la devuelve un driver SQLite (todos los valores pueden estar como strings)
const sqliteRow = {
	rowId: '42',
	payload: '{"x":1}',
	created: '2025-01-01T00:00:00.000Z',
	updated: '2025-06-01T00:00:00.000Z',
	deleted: 0,
};

const dto = new DbRowDto(sqliteRow);
// dto.rowId === 42        (number) ✅
// dto.created instanceof Date ✅
// dto.deleted === false  (boolean) ✅
```

### Patrón de Borrado Blando (Soft Delete)

```typescript
const deleted = dto.copy({ deleted: true, updated: new Date() });
await db.run('UPDATE rows SET deleted=?, updated=? WHERE rowId=?', [
	1,
	deleted.updated.toISOString(),
	deleted.rowId,
]);
```

### Seed / Inserción en Bloque

```typescript
const { instances } = DbRowDto.createMany(csvRows);
const params = instances.map((dto) => dto.toInterface());
await db.run('INSERT INTO table_rows VALUES (?, ?, ?, ?, ?)', params);
```

## Capacitor Preferences

```typescript
import { Preferences } from '@capacitor/preferences';

// Guardar
const dto = new AppCacheDto({
	key: 'settings',
	value: '...',
	hits: 0,
	ttl: 3600,
	tag: 'config',
});
await Preferences.set({ key: dto.key, value: JSON.stringify(dto.serialize()) });

// Cargar
const { value } = await Preferences.get({ key: 'settings' });
const restored = new AppCacheDto(value ? (JSON.parse(value) as object) : {});
```

### Patrón TTL

```typescript
interface ICachedEntry<T> {
	data: T;
	exp: number;
}

async function saveWithTtl(dto: AppCacheDto, ttlMs: number) {
	const entry: ICachedEntry<object> = {
		data: dto.serialize() as object,
		exp: Date.now() + ttlMs,
	};
	await Preferences.set({ key: dto.key, value: JSON.stringify(entry) });
}

async function loadIfFresh(key: string): Promise<AppCacheDto | null> {
	const { value } = await Preferences.get({ key });
	if (!value) return null;
	const entry = JSON.parse(value) as ICachedEntry<object>;
	if (entry.exp < Date.now()) return null; // expirado
	return new AppCacheDto(entry.data);
}
```

## LRU en Memoria

Almacena DTOs de QuickModel como valores de primera clase en cualquier estructura de caché:

```typescript
class LruCache<T> {
	private map = new Map<string, T>();
	constructor(private readonly max: number) {}
	set(key: string, val: T) {
		if (this.map.has(key)) this.map.delete(key);
		if (this.map.size >= this.max)
			this.map.delete(this.map.keys().next().value!);
		this.map.set(key, val);
	}
	get(key: string): T | undefined {
		return this.map.get(key);
	}
}

const cache = new LruCache<UserRecordDto>(100);

// Poblar desde API
const { instances } = UserRecordDto.createMany(apiResponse);
instances.forEach((dto) => cache.set(dto.uid, dto));

// Leer y actualizar de forma inmutable
const user = cache.get('u1')!;
const updated = user.copy({ score: user.score + 10 });
cache.set('u1', updated);
```

## BroadcastChannel — Sincronización Entre Pestañas

```typescript
const channel = new BroadcastChannel('user-sync');

// Pestaña emisora
const dto = new UserRecordDto(updatedUser);
channel.postMessage({ type: 'UPDATE_USER', payload: dto.serialize() });

// Pestaña receptora
channel.addEventListener('message', (event: MessageEvent) => {
	const msg = event.data as { type: string; payload: object };
	if (msg.type === 'UPDATE_USER') {
		const restored = new UserRecordDto(msg.payload);
		updateLocalState(restored);
	}
});
```

## OPFS y Service Worker

```typescript
// Escribir en OPFS
const dto = new UserRecordDto(user);
const root = await navigator.storage.getDirectory();
const fileHandle = await root.getFileHandle('user.json', { create: true });
const writable = await fileHandle.createWritable();
await writable.write(new TextEncoder().encode(JSON.stringify(dto.serialize())));
await writable.close();

// Leer desde OPFS
const file = await fileHandle.getFile();
const text = await file.text();
const restored = new UserRecordDto(JSON.parse(text) as object);
```

## Validación Asíncrona Antes de Persistir

Usa `qCheckRulesAsync` para ejecutar reglas de negocio asíncronas (p. ej. comprobaciones de unicidad) antes de escribir en cualquier capa de almacenamiento:

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

async function save(dto: UserRecordDto) {
	const result = await qCheckRulesAsync(dto, {
		asyncRules: {
			email: [
				async (val) => {
					const exists = await db.findByEmail(val as string);
					return !exists; // false = error de validación
				},
			],
		},
	});

	if (!result.valid) {
		throw new Error(result.errors[0]?.message ?? 'Validación fallida');
	}

	await db.save(dto.toInterface());
}
```
