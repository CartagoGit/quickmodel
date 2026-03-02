# Integración con Effect Schema

QuickModel y Effect Schema (`@effect/schema`) son herramientas complementarias. Effect Schema proporciona **schemas declarativos con integración de primera clase en Effect**, parseo, encoding y transformación. QuickModel añade **coerción basada en decoradores, serialización y validación de reglas de negocio** encima. Úsalos juntos en backends basados en Effect, o exporta schemas de QuickModel en formato Effect Schema para interoperabilidad.

## Concepto clave: salida de Effect Schema → instancia de QModel

Tras que Effect Schema decodifica un valor, pasa el resultado al constructor de QModel:

```typescript
import { Schema, ParseResult } from '@effect/schema';
import { Effect } from 'effect';
import { QModel, Quick } from 'quickmodel';

// 1. Effect Schema para parseo / decodificación
const UserEffectSchema = Schema.Struct({
	name: Schema.String,
	birth: Schema.String, // string ISO de la red
	score: Schema.String, // puede llegar como string de un formulario
});

type IUserRaw = Schema.Schema.Type<typeof UserEffectSchema>;

// 2. Clase QModel para coerción + serialización
interface IUser {
	name: string;
	birth: Date;
	score: number;
}

@Quick({ birth: Date, score: Number })
class User extends QModel<IUser> {
	declare name: string;
	declare birth: Date;
	declare score: number;
}

// 3. Decodificar con Effect Schema, luego coercionar con QModel
const rawData = { name: 'Ana', birth: '1990-05-20T00:00:00Z', score: '42' };

const program = Effect.gen(function* () {
	const validated = yield* Schema.decode(UserEffectSchema)(rawData);
	const user = new User(validated); // coerciona los tipos
	return user;
});

// user.birth es Date, user.score es number
```

Para contextos fuera de Effect, usa el decodificador síncrono:

```typescript
import { Schema } from '@effect/schema';

const validated = Schema.decodeSync(UserEffectSchema)(rawData);
const user = new User(validated);
```

## Exportar un schema QModel en formato Effect Schema

Usa `getSchema('effect-schema')` para obtener el código del schema Effect Schema de cualquier clase QModel:

```typescript
import 'quickmodel/schema'; // registrar los generadores de schema primero

const effectCode = User.getSchema('effect-schema');
// → string con código fuente Effect Schema:
// import { Schema } from '@effect/schema';
// export const UserSchema = Schema.Struct({ name: Schema.String, birth: Schema.String, ... });

// Guardar en disco e importar donde se use Effect nativamente:
// fs.writeFileSync('src/schemas/user.schema.ts', effectCode);
```

El código generado es un **string de código fuente**, no un objeto schema activo. Está pensado para scaffolding e interoperabilidad.

## Patrón: pipeline Effect con QModel

El `$qSerialize()` de QModel se integra limpiamente en pipelines Effect:

```typescript
const processUser = (raw: unknown) =>
	Effect.gen(function* () {
		const validated = yield* Schema.decode(UserEffectSchema)(raw);
		const user = new User(validated);

		// Aplicar lógica de negocio con reglas QModel
		const isValid = yield* Effect.promise(() => user.$qCheckRules());
		if (!isValid.passed) {
			yield* Effect.fail(new Error(isValid.errors.join(', ')));
		}

		return user.$qSerialize();
	});
```

## Cuándo usar cada enfoque

| Escenario                                        | Herramienta                           |
| ------------------------------------------------ | ------------------------------------- |
| Parseo / encoding declarativo con Effect         | `Schema.decode()` / `Schema.encode()` |
| Coercionar strings→Date, strings→number, etc.    | `new User(data)` con `@Quick({...})`  |
| Validación de reglas de negocio                  | `user.$qCheckRules()`                 |
| Serializar un modelo a objeto plano / JSON       | `user.$qSerialize()`                  |
| Exportar un Effect Schema desde una clase QModel | `User.getSchema('effect-schema')`     |

## Comparativa

| Feature                                   | Effect Schema   | QuickModel                  |
| ----------------------------------------- | --------------- | --------------------------- |
| Parseo + encoding declarativo             | ✅              | Vía `@Quick({...})`         |
| Integración nativa con Effect             | ✅              | Se puede envolver en Effect |
| Coerción de tipos (string→Date, etc.)     | ✅              | ✅ nativo                   |
| Validación de reglas de negocio           | Vía refinements | ✅ `@QRule`                 |
| Serialización / round-trip                | Vía encoding    | ✅ `$qSerialize()`          |
| Exportación OpenAPI / JSON Schema         | ❌              | ✅ `getSchema()`            |
| Modelos basados en clases con decoradores | ❌              | ✅                          |

## Ver también

- [Transformadores](/es/guide/transformers) — tipos de coerción soportados
- [Validación](/es/guide/validation) — `@QRule` para reglas de negocio
- [Generación de Schema](/es/guide/schema-generation) — todos los formatos de `getSchema()`
- [Integración con Zod](/es/integrations/zod-integration) — mismo patrón de puente
