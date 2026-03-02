# Integración con Zod

QuickModel y Zod cumplen funciones complementarias: Zod destaca en **validación en runtime y declaración de schemas**, mientras que QuickModel se encarga de la **coerción de tipos, transformación y serialización** mediante decoradores. Puedes usarlos juntos o migrar de Zod a QuickModel de forma progresiva.

## Concepto clave: salida de Zod → instancia de QModel

`rawData` en el contexto de abajo significa **cualquier objeto JavaScript plano** — puede venir de:

- el cuerpo de una petición HTTP (`req.body`)
- una respuesta JSON parseada con `JSON.parse()`
- un registro de base de datos
- un envío de formulario
- o la salida de `ZodSchema.parse()`

Una vez que tienes ese objeto plano, lo pasas directamente al constructor de `QModel`:

```typescript
import { z } from 'zod';
import { QModel, Quick } from 'quickmodel';

// 1. Schema Zod para validación / parseo en runtime
const UserZodSchema = z.object({
	name: z.string(),
	birth: z.string(), // string ISO desde JSON
	score: z.string(), // puede llegar como string desde un formulario
});

// 2. Clase QuickModel para coerción + serialización
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

// 3. Validar con Zod primero, luego coercionar con QModel
const rawData = { name: 'Ana', birth: '1990-05-20T00:00:00Z', score: '42' };

const validated = UserZodSchema.parse(rawData); // lanza si es inválido
const user = new User(validated); // coerciona los tipos

console.log(user.birth instanceof Date); // true
console.log(user.score); // 42 (number, no string)
```

`rawData` aquí es simplemente un objeto plano. Tras el `.parse()` de Zod sigue siendo un objeto plano — el constructor de QuickModel lo acepta y aplica las transformaciones de `@Quick({...})` encima.

## Patrón: capa de API

Un patrón habitual para los límites entre backend y frontend:

```typescript
// Validar el input crudo de la red
const parsed = UserZodSchema.safeParse(req.body);
if (!parsed.success) {
	return res.status(400).json(parsed.error.flatten());
}

// Coercionar y enriquecer con QModel
const user = new User(parsed.data);

// Serializar a objeto plano para la respuesta
return res.json(user.$qSerialize());
```

## Patrón: datos de formulario

Los inputs de formulario siempre llegan como strings. Zod valida la forma, QModel coerciona los tipos:

```typescript
const FormSchema = z.object({
	age: z.string().regex(/^\d+$/),
	createdAt: z.string().datetime(),
});

interface IProfile {
	age: number;
	createdAt: Date;
}

@Quick({ age: Number, createdAt: Date })
class Profile extends QModel<IProfile> {
	declare age: number;
	declare createdAt: Date;
}

const formData = { age: '25', createdAt: '2024-01-15T00:00:00Z' };

const profile = new Profile(FormSchema.parse(formData));
console.log(profile.age); // 25 (number)
console.log(profile.createdAt); // objeto Date
```

## `fromSchema`: generar una clase QModel desde un schema Zod

`QModel.fromSchema` es una herramienta de **generación de código** — produce código fuente TypeScript como string. No está relacionado con crear instancias en runtime.

Úsalo cuando tienes un schema Zod y quieres generar la definición de clase `QModel` correspondiente para guardarla como archivo `.ts`:

```typescript
import 'quickmodel/schema'; // registrar los generadores de schema

const code = QModel.fromSchema('zod', UserZodSchema, 'User');
// → string con código fuente TypeScript:
// interface IUser { ... }
// @Quick({ ... })
// class User extends QModel<IUser> { ... }

// Guardar en disco, importar y usar:
// fs.writeFileSync('src/models/user.model.ts', code);
```

**Este es un flujo de scaffolding, no de runtime.** Una vez que tienes el archivo `.ts` generado, lo importas e instancias normalmente:

```typescript
import { User } from './src/models/user.model';

const user = new User(rawData);
```

## Cuándo usar cada enfoque

| Escenario                                              | Herramienta                                     |
| ------------------------------------------------------ | ----------------------------------------------- |
| Validar la forma de un input no confiable              | Zod `.parse()` / `.safeParse()`                 |
| Coercionar strings→Date, strings→number, etc.          | `new User(data)` con `@Quick({...})`            |
| Serializar un modelo a objeto plano / JSON             | `user.$qSerialize()`                            |
| Generar una clase QModel desde un schema Zod existente | `QModel.fromSchema('zod', schema, 'ClassName')` |

## Comparativa

| Feature                                       | Zod     | QuickModel         |
| --------------------------------------------- | ------- | ------------------ |
| Validación en runtime                         | ✅      | ✅ vía `@QRule`    |
| Coerción de tipos (string→Date, etc.)         | Parcial | ✅ nativo          |
| Serialización / round-trip                    | ❌      | ✅ `$qSerialize()` |
| Exportación de schema (JSON Schema, OpenAPI…) | ❌      | ✅ `getSchema()`   |
| Modelos basados en clases con decoradores     | ❌      | ✅                 |

## Ver también

- [Transformadores](/es/guide/transformers) — tipos de coerción soportados
- [Validación](/es/guide/validation) — `@QRule` para reglas de negocio
- [Generación de Schema](/es/guide/schema-generation) — `getSchema()` y `fromSchema()`
- [Integración con tRPC](/es/integrations/trpc-integration) — stack tipado de extremo a extremo
