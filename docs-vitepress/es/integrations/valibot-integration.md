# Integración con Valibot

QuickModel y Valibot son herramientas complementarias. Valibot se centra en la **validación de schemas ligera en runtime**, mientras que QuickModel gestiona la **coerción de tipos, transformación y serialización**. Úsalos juntos en el mismo pipeline o exporta schemas de QuickModel en formato Valibot para interoperabilidad.

## Concepto clave: salida de Valibot → instancia de QModel

Tras que Valibot parsea y valida un objeto plano, pasa el resultado directamente al constructor de QModel:

```typescript
import * as v from 'valibot';
import { QModel, Quick } from 'quickmodel';

// 1. Schema Valibot para validación en runtime
const UserValibotSchema = v.object({
	name: v.string(),
	birth: v.string(), // string ISO de la red
	score: v.string(), // puede llegar como string de un formulario
});

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

// 3. Validar con Valibot, luego coercionar con QModel
const rawData = { name: 'Ana', birth: '1990-05-20T00:00:00Z', score: '42' };

const validated = v.parse(UserValibotSchema, rawData); // lanza si es inválido
const user = new User(validated); // coerciona los tipos

console.log(user.birth instanceof Date); // true
console.log(user.score); // 42 (number)
```

`rawData` es cualquier objeto JavaScript plano — puede venir de `req.body`, `JSON.parse()`, un registro de base de datos, un envío de formulario, o la salida de cualquier llamada a `v.parse()`.

## Exportar un schema QModel en formato Valibot

Usa `getSchema('valibot')` para obtener el código del schema Valibot de una clase QModel. Útil para compartir la definición del dominio con otras partes de la base de código que usan Valibot de forma nativa:

```typescript
import 'quickmodel/schema'; // registrar los generadores de schema primero

const valibotCode = User.getSchema('valibot');
// → string con código fuente Valibot:
// import * as v from 'valibot';
// export const UserSchema = v.object({ name: v.string(), birth: v.string(), ... });

// Guardar en disco e importar donde se use Valibot nativamente:
// fs.writeFileSync('src/schemas/user.schema.ts', valibotCode);
```

El código generado es un **string de código fuente**, no un objeto schema de Valibot activo. Está pensado para scaffolding e interoperabilidad, no para uso directo en runtime.

## Patrón: capa de API

```typescript
const result = v.safeParse(UserValibotSchema, req.body);
if (!result.success) {
	return res.status(400).json(result.issues);
}

const user = new User(result.output);
return res.json(user.$qSerialize());
```

## Patrón: datos de formulario

Los inputs de formulario llegan como strings — Valibot valida la forma, QModel coerciona los tipos:

```typescript
const FormSchema = v.object({
	age: v.pipe(v.string(), v.regex(/^\d+$/)),
	createdAt: v.pipe(v.string(), v.isoTimestamp()),
});

@Quick({ age: Number, createdAt: Date })
class Profile extends QModel<{ age: number; createdAt: Date }> {
	declare age: number;
	declare createdAt: Date;
}

const profile = new Profile(v.parse(FormSchema, formData));
```

## Cuándo usar cada enfoque

| Escenario                                         | Herramienta                           |
| ------------------------------------------------- | ------------------------------------- |
| Validar la forma de un input no confiable         | Valibot `v.parse()` / `v.safeParse()` |
| Coercionar strings→Date, strings→number, etc.     | `new User(data)` con `@Quick({...})`  |
| Serializar un modelo a objeto plano / JSON        | `user.$qSerialize()`                  |
| Exportar un schema Valibot desde una clase QModel | `User.getSchema('valibot')`           |

## Comparativa

| Feature                                       | Valibot        | QuickModel         |
| --------------------------------------------- | -------------- | ------------------ |
| Validación en runtime                         | ✅             | ✅ vía `@QRule`    |
| Bundle size (tree-shakeable)                  | ✅ muy pequeño | ✅                 |
| Coerción de tipos (string→Date, etc.)         | Parcial        | ✅ nativo          |
| Serialización / round-trip                    | ❌             | ✅ `$qSerialize()` |
| Exportación de schema (OpenAPI, JSON Schema…) | ❌             | ✅ `getSchema()`   |
| Modelos basados en clases con decoradores     | ❌             | ✅                 |

## `fromSchema`: generando una clase QModel desde un schema Valibot

`QModel.fromSchema('valibot', ...)` acepta un string fuente de `v.object({...})` de Valibot y genera código TypeScript para una clase `QModel`:

```typescript
import 'quickmodel/schema';

const valibotSrc = `
import * as v from 'valibot';
export const ProductSchema = v.object({
  price: v.number(),
  label: v.string(),
  active: v.boolean(),
  createdAt: v.date(),
});
`;

const code = QModel.fromSchema('valibot', valibotSrc, 'Product');
// → string TypeScript con la clase Product extends QModel<IProduct>

// fs.writeFileSync('src/models/product.model.ts', code);
```

Esto es **scaffolding** — el resultado es un string de código para guardar como `.ts`, no una clase activa.

## Round-trip: QModel → schema Valibot → clase QModel

```typescript
import 'quickmodel/schema';

const valibotSrc = User.getSchema('valibot');
const code = QModel.fromSchema('valibot', valibotSrc, 'User');
// code es TypeScript válido que define class User extends QModel<IUser>
```

## Ver también

- [Transformadores](/es/guide/transformers) — tipos de coerción soportados
- [Validación](/es/guide/validation) — `@QRule` para reglas de negocio
- [Integración con Zod](/es/integrations/zod-integration) — mismo patrón con Zod
- [Generación de Schema](/es/guide/schema-generation) — formatos de `getSchema()`
