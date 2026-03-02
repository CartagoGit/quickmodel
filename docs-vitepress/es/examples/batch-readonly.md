# Creación en Lote e Inmutabilidad

Aprende a procesar arrays de datos desde APIs con `createMany()` y a crear instancias inmutables con `createReadonly()`.

## createMany() — Procesar Arrays

Cuando recibes un array de la API, `createMany()` procesa todos los elementos, separa los válidos de los erróneos y te da visibilidad completa sobre qué falló.

### Uso Básico

```typescript
import { QModel, Quick, QRule } from 'quickmodel';

interface IEmployee {
	id: string;
	name: string;
	email: string;
	salary: number;
	department: string;
}

@Quick()
class Employee extends QModel<IEmployee> {
	declare id: string;

	@QRule({
		predicate: (val: string) => val.trim().length >= 2,
		message: 'El nombre debe tener al menos 2 caracteres',
	})
	declare name: string;

	@QRule({
		predicate: (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		message: 'El email no tiene un formato válido',
	})
	declare email: string;

	@QRule({
		predicate: (val: number) => val >= 0,
		message: 'El salario no puede ser negativo',
	})
	declare salary: number;

	declare department: string;
}

// Datos de importación masiva (algunos erróneos)
const importData: IEmployee[] = [
	{
		id: '1',
		name: 'Ana García',
		email: 'ana@company.com',
		salary: 38000,
		department: 'Eng',
	},
	{ id: '2', name: 'B', email: 'no-email', salary: 40000, department: 'HR' }, // ❌
	{
		id: '3',
		name: 'Carlos Ruiz',
		email: 'carlos@company.com',
		salary: -500,
		department: 'Fin',
	}, // ❌
	{
		id: '4',
		name: 'Diana Torre',
		email: 'diana@company.com',
		salary: 42000,
		department: 'Mkt',
	},
	{
		id: '5',
		name: 'Eva Martín',
		email: 'eva@company.com',
		salary: 35000,
		department: 'Eng',
	},
];

const { instances, errors } = Employee.createMany(importData);

console.log(`Importados correctamente: ${instances.length}`); // 3
console.log(`Con errores: ${errors.length}`); // 2

// Registrar los errores
errors.forEach(({ index, instance, errors: errs }) => {
	console.log(`Fila ${index} (ID: ${instance.id}):`);
	errs.forEach(({ field, message }) =>
		console.log(`  - ${field}: ${message}`)
	);
});
// Fila 1 (ID: 2):
//   - name: El nombre debe tener al menos 2 caracteres
//   - email: El email no tiene un formato válido
// Fila 2 (ID: 3):
//   - salary: El salario no puede ser negativo

// Los válidos son instancias reales del modelo
instances.forEach((emp) => {
	console.log(`${emp.name} (${emp.department})`);
});
```

### Incluir Instancias Erróneas

Cuando necesitas acceder a las instancias inválidas también:

```typescript
const { instances: all, errors } = Employee.createMany(importData, {
	includeErrorInstances: true,
});

console.log(`Total procesado: ${all.length}`); // 5 (válidos + inválidos)

// Marcar los erróneos para mostrarlos en UI
all.forEach((emp) => {
	const hasError = errors.some(({ instance }) => instance.id === emp.id);
	console.log(`${emp.name}: ${hasError ? '❌ Tiene errores' : '✅ Válido'}`);
});
```

### Caso Real: Importación CSV con Feedback de Errores

```typescript
async function importEmployees(csvData: IEmployee[]): Promise<void> {
	const { instances, errors } = Employee.createMany(csvData);

	// Guardar los válidos
	if (instances.length > 0) {
		await fetch('/api/employees/bulk', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(instances.map((emp) => emp.$qSerialize())),
		});
	}

	// Reportar errores al usuario
	if (errors.length > 0) {
		const report = errors.map(({ index, errors: errs }) => ({
			row: index + 1,
			issues: errs.map((e) => e.message),
		}));
		console.error('Filas con problemas:', report);
	}

	console.log(
		`Importación completa: ${instances.length} correctos, ${errors.length} con errores`
	);
}
```

### createMany() con Transformaciones de Tipos

`createMany()` aplica todas las transformaciones de `@Quick` igual que el constructor:

```typescript
interface IEvent {
	id: string;
	name: string;
	startDate: string;
	endDate: string;
	attendees: string[];
}

@Quick({ startDate: Date, endDate: Date, attendees: Set })
class Event extends QModel<IEvent> {
	declare id: string;
	declare name: string;
	declare startDate: Date;
	declare endDate: Date;
	declare attendees: Set<string>;
}

const rawEvents: IEvent[] = [
	{
		id: 'E1',
		name: 'Conferencia TS',
		startDate: '2026-06-01',
		endDate: '2026-06-03',
		attendees: ['alice', 'bob'],
	},
	{
		id: 'E2',
		name: 'Hackathon',
		startDate: '2026-07-15',
		endDate: '2026-07-16',
		attendees: ['bob', 'bob'],
	},
];

const { instances } = Event.createMany(rawEvents);
console.log(instances[0].startDate instanceof Date); // true ✅
console.log(instances[1].attendees instanceof Set); // true ✅
console.log(instances[1].attendees.size); // 1 (duplicado eliminado)
```

---

## createReadonly() — Instancias Inmutables

Cuando quieres garantizar que un modelo no se modifique accidentalmente (configuración, datos de lectura, constantes):

### Uso Básico

```typescript
interface IConfig {
	apiUrl: string;
	timeout: number;
	retries: number;
	features: string[];
}

@Quick({ features: Set })
class AppConfig extends QModel<IConfig> {
	declare apiUrl: string;
	declare timeout: number;
	declare retries: number;
	declare features: Set<string>;
}

const config = AppConfig.createReadonly({
	apiUrl: 'https://api.example.com',
	timeout: 5000,
	retries: 3,
	features: ['auth', 'payments', 'analytics'],
});

// ✅ Lectura normal
console.log(config.apiUrl); // 'https://api.example.com'
console.log(config.timeout); // 5000

// ❌ Cualquier mutación lanza TypeError en modo strict
try {
	(config as any).apiUrl = 'http://hacked.com';
} catch {
	console.log('Inmutable: no se puede modificar');
}

// Congelar también propiedades anidadas
console.log(Object.isFrozen(config)); // true
```

### Objetos de Configuración Globales

```typescript
// config/app.config.ts
const RAW_CONFIG = {
	apiUrl: process.env.API_URL ?? 'https://api.example.com',
	timeout: 5000,
	retries: 3,
	features: ['auth', 'payments'],
};

export const APP_CONFIG = AppConfig.createReadonly(RAW_CONFIG);
// Exporta un objeto de configuración que nadie puede mutar accidentalmente
```

### Diferencia con create()

```typescript
// ✅ create(): instancia mutable
const mutableUser = User.create({ name: 'Ana', email: 'ana@test.com' });
mutableUser.name = 'Beatriz'; // OK

// ✅ createReadonly(): instancia inmutable profunda
const readonlyUser = User.createReadonly({
	name: 'Ana',
	email: 'ana@test.com',
});
readonlyUser.name = 'Beatriz'; // ❌ TypeError: Cannot assign to read only property
```

### Inmutabilidad en Tests

```typescript
// Las instancias readonly son perfectas como fixtures inmutables de test
const FIXTURE_USER = User.createReadonly({
	id: '1',
	name: 'Test User',
	email: 'test@example.com',
	createdAt: '2026-01-01T00:00:00.000Z',
	// ...
});

// Ningún test puede mutar accidentalmente el fixture
describe('UserCard', () => {
	it('muestra el nombre correctamente', () => {
		render(<UserCard user={FIXTURE_USER} />);
		expect(screen.getByText(FIXTURE_USER.name)).toBeInTheDocument();
	});
});
```

---

## Combinando createMany() y createReadonly()

```typescript
interface IPermission {
	code: string;
	description: string;
	resource: string;
	actions: string[];
}

@Quick({ actions: Set })
class Permission extends QModel<IPermission> {
	declare code: string;
	declare description: string;
	declare resource: string;
	declare actions: Set<string>;
}

const rawPermissions: IPermission[] = [
	{
		code: 'read:users',
		description: 'Leer usuarios',
		resource: 'users',
		actions: ['GET'],
	},
	{
		code: 'write:users',
		description: 'Escribir usuarios',
		resource: 'users',
		actions: ['POST', 'PUT'],
	},
	{
		code: 'delete:users',
		description: 'Borrar usuarios',
		resource: 'users',
		actions: ['DELETE'],
	},
];

// Procesar en lote
const { instances: permissions } = Permission.createMany(rawPermissions);

// Acceso rápido por código (Map inmutable de configuración)
const PERMISSIONS_MAP = new Map(permissions.map((perm) => [perm.code, perm]));
Object.freeze(PERMISSIONS_MAP);

// Verificar permisos en la app
function hasPermission(code: string, action: string): boolean {
	const perm = PERMISSIONS_MAP.get(code);
	return perm?.actions.has(action) ?? false;
}

console.log(hasPermission('read:users', 'GET')); // true
console.log(hasPermission('read:users', 'DELETE')); // false
```

## Mejores Prácticas

```typescript
// ✅ createMany() para importaciones desde APIs o CSVs
const { instances, errors } = MyModel.createMany(apiArray);

// ✅ createReadonly() para configuración y constantes
export const CONFIG = ConfigModel.createReadonly(rawConfig);

// ✅ Siempre revisa errors[] cuando procesas datos externos
if (errors.length > 0) {
	logger.warn(`${errors.length} registros fallaron la validación`);
}

// ❌ Evitar usar createReadonly() para datos que necesitas actualizar
const user = User.createReadonly(data); // ❌ si después harás user.name = '...'
const user = User.create(data); // ✅ usa create() para datos mutables
```

## Próximos Pasos

- [Validación](/es/examples/validation) - Reglas de negocio con `@QRule`
- [Mocks y Testing](/es/examples/mocks) - Mock de modelos para tests
