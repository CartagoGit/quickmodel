# Integración con AJV

QuickModel y AJV (Another JSON Validator) funcionan muy bien juntos. AJV valida datos JSON contra JSON Schema Draft-07 / Draft-2020-12, mientras que QuickModel añade **coerción de tipos, transformación y serialización** encima. QuickModel también puede generar schemas compatibles con AJV desde tus definiciones de modelos, y reconstruir una clase QModel a partir de un schema AJV.

## Concepto clave: datos validados por AJV → instancia de QModel

Tras que AJV valida un objeto plano, pásalo directamente al constructor de QModel:

```typescript
import Ajv from 'ajv';
import { QModel, Quick } from 'quickmodel';

const ajv = new Ajv();

// 1. Schema AJV para validación en runtime
const userAjvSchema = {
	type: 'object',
	properties: {
		name: { type: 'string' },
		birth: { type: 'string', format: 'date-time' },
		score: { type: 'string' },
	},
	required: ['name', 'birth', 'score'],
};

const validate = ajv.compile(userAjvSchema);

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

// 3. Validar con AJV, luego coercionar con QModel
const rawData = { name: 'Ana', birth: '1990-05-20T00:00:00Z', score: '42' };

if (!validate(rawData)) {
	throw new Error(ajv.errorsText(validate.errors));
}

const user = new User(rawData); // coerciona los tipos
console.log(user.birth instanceof Date); // true
console.log(user.score); // 42 (number)
```

## Exportar un schema AJV desde QModel

Usa `getSchema('ajv')` para obtener un objeto JSON Schema compatible con AJV desde cualquier clase QModel:

```typescript
import 'quickmodel/schema'; // registrar los generadores de schema primero

const ajvSchema = User.getSchema('ajv');
// → objeto plano: { type: 'object', properties: { ... }, required: [...] }

const validate = ajv.compile(ajvSchema);
const isValid = validate(rawData);
```

El valor retornado es un `Record<string, unknown>` plano — un objeto vivo que puedes pasar directamente a `ajv.compile()`.

## `fromSchema`: generar una clase QModel desde un schema AJV

`fromSchema('ajv', ...)` acepta un objeto JSON Schema compatible con AJV y genera código fuente TypeScript para una clase `QModel`:

```typescript
import 'quickmodel/schema';

const existingSchema = {
	type: 'object',
	title: 'Product',
	properties: {
		name: { type: 'string' },
		price: { type: 'number' },
		stock: { type: 'integer' },
	},
	required: ['name', 'price'],
};

const code = QModel.fromSchema('ajv', existingSchema, 'Product');
// → string de código TypeScript para class Product extends QModel<IProduct>

// fs.writeFileSync('src/models/product.model.ts', code);
```

Esto es **scaffolding** — el resultado es un string de código para guardar como archivo `.ts`, no una clase activa.

## Round-trip: QModel → schema AJV → clase QModel

```typescript
import 'quickmodel/schema';

// Exportar desde el modelo existente
const ajvSchema = User.getSchema('ajv');

// Regenerar la definición de clase desde el schema
const code = QModel.fromSchema('ajv', ajvSchema, 'User');
// code es TypeScript válido que define class User extends QModel<IUser>
```

## Cuándo usar cada enfoque

| Escenario                                     | Herramienta                                  |
| --------------------------------------------- | -------------------------------------------- |
| Validar la forma de un input no confiable     | `ajv.compile(schema)(data)`                  |
| Coercionar strings→Date, strings→number, etc. | `new User(data)` con `@Quick({...})`         |
| Serializar un modelo a objeto plano / JSON    | `user.$qSerialize()`                         |
| Generar un schema AJV desde una clase QModel  | `User.getSchema('ajv')`                      |
| Generar una clase QModel desde un schema AJV  | `QModel.fromSchema('ajv', schema, 'Nombre')` |

## Comparativa

| Feature                                   | AJV | QuickModel                  |
| ----------------------------------------- | --- | --------------------------- |
| Validación JSON Schema                    | ✅  | Vía `getSchema('ajv')`      |
| Coerción de tipos (string→Date, etc.)     | ❌  | ✅ nativo                   |
| Exportación OpenAPI / JSON Schema         | ❌  | ✅ `getSchema()`            |
| Serialización / round-trip                | ❌  | ✅ `$qSerialize()`          |
| Modelos basados en clases con decoradores | ❌  | ✅                          |
| Scaffolding con `fromSchema`              | ❌  | ✅ `fromSchema('ajv', ...)` |

## Ver también

- [Transformadores](/es/guide/transformers) — tipos de coerción soportados
- [Validación](/es/guide/validation) — `@QRule` para reglas de negocio
- [Generación de Schema](/es/guide/schema-generation) — todos los formatos de `getSchema()`
- [Integración con Zod](/es/integrations/zod-integration) — mismo patrón de puente
