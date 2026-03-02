# Integración con TypeBox

QuickModel y TypeBox son herramientas complementarias. TypeBox construye **objetos de tipo compatibles con JSON Schema** con coste cero en runtime, proporcionando tipos TypeScript estáticos y validación en runtime desde la misma definición. QuickModel añade **coerción de tipos, transformación y serialización** encima mediante decoradores. Úsalos juntos, o exporta schemas de QuickModel en formato TypeBox para interoperabilidad.

## Concepto clave: datos validados por TypeBox → instancia de QModel

Tras que TypeBox verifica un objeto plano, pásalo directamente al constructor de QModel:

```typescript
import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { QModel, Quick } from 'quickmodel';

// 1. Schema TypeBox para tipos estáticos + validación en runtime
const UserTypeBox = Type.Object({
	name: Type.String(),
	birth: Type.String({ format: 'date-time' }),
	score: Type.String(),
});

type IUserRaw = Static<typeof UserTypeBox>;

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

// 3. Verificar con TypeBox, luego coercionar con QModel
const rawData = { name: 'Ana', birth: '1990-05-20T00:00:00Z', score: '42' };

if (!Value.Check(UserTypeBox, rawData)) {
	throw new Error(
		[...Value.Errors(UserTypeBox, rawData)].map((e) => e.message).join(', ')
	);
}

const user = new User(rawData); // coerciona los tipos
console.log(user.birth instanceof Date); // true
console.log(user.score); // 42 (number)
```

`rawData` es cualquier objeto JavaScript plano — puede venir de `req.body`, `JSON.parse()`, un registro de base de datos, un envío de formulario, o el resultado de cualquier verificación TypeBox.

## Exportar un schema QModel en formato TypeBox

Usa `getSchema('typebox')` para obtener el código del schema TypeBox de cualquier clase QModel:

```typescript
import 'quickmodel/schema'; // registrar los generadores de schema primero

const typeboxCode = User.getSchema('typebox');
// → string con código fuente TypeBox:
// import { Type } from '@sinclair/typebox';
// export const UserSchema = Type.Object({ name: Type.String(), birth: Type.String(), ... });

// Guardar en disco e importar donde se use TypeBox nativamente:
// fs.writeFileSync('src/schemas/user.schema.ts', typeboxCode);
```

El código generado es un **string de código fuente**, no un schema TypeBox activo. Está pensado para scaffolding e interoperabilidad.

## Patrón: tRPC + TypeBox

TypeBox es popular como alternativa a Zod en stacks tRPC. QModel gestiona la capa de coerción:

```typescript
import { initTRPC } from '@trpc/server';
import { Value } from '@sinclair/typebox/value';

const trpc = initTRPC.create();

const createUser = trpc.procedure
	.input((raw) => {
		if (!Value.Check(UserTypeBox, raw)) throw new Error('Input inválido');
		return raw as Static<typeof UserTypeBox>;
	})
	.mutation(({ input }) => {
		const user = new User(input); // coerción completa
		return user.$qSerialize();
	});
```

## Cuándo usar cada enfoque

| Escenario                                         | Herramienta                          |
| ------------------------------------------------- | ------------------------------------ |
| Tipos estáticos + validación en runtime           | TypeBox `Value.Check()`              |
| Coercionar strings→Date, strings→number, etc.     | `new User(data)` con `@Quick({...})` |
| Serializar un modelo a objeto plano / JSON        | `user.$qSerialize()`                 |
| Exportar un schema TypeBox desde una clase QModel | `User.getSchema('typebox')`          |

## Comparativa

| Feature                                   | TypeBox      | QuickModel         |
| ----------------------------------------- | ------------ | ------------------ |
| Tipos TypeScript estáticos desde schema   | ✅           | ✅ vía interfaces  |
| Validación en runtime                     | ✅           | ✅ vía `@QRule`    |
| Coerción de tipos (string→Date, etc.)     | Parcial      | ✅ nativo          |
| Serialización / round-trip                | ❌           | ✅ `$qSerialize()` |
| Exportación OpenAPI / JSON Schema         | Vía `Type.*` | ✅ `getSchema()`   |
| Modelos basados en clases con decoradores | ❌           | ✅                 |

## `fromSchema`: generando una clase QModel desde un schema TypeBox

`QModel.fromSchema('typebox', ...)` acepta un string fuente de `Type.Object({...})` y genera código TypeScript para una clase `QModel`:

```typescript
import 'quickmodel/schema';

const typeboxSrc = `
import { Type, Static } from '@sinclair/typebox';
const ProductSchema = Type.Object({
  price: Type.Number(),
  label: Type.String(),
  active: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
  amount: Type.BigInt(),
});
`;

const code = QModel.fromSchema('typebox', typeboxSrc, 'Product');
// → string TypeScript con la clase Product extends QModel<IProduct>

// fs.writeFileSync('src/models/product.model.ts', code);
```

`Type.String({ format: 'date-time' })` se convierte al transformer `Date`, y `Type.BigInt()` a `BigInt`.

## Round-trip: QModel → schema TypeBox → clase QModel

```typescript
import 'quickmodel/schema';

const typeboxSrc = User.getSchema('typebox');
const code = QModel.fromSchema('typebox', typeboxSrc, 'User');
// code es TypeScript válido que define class User extends QModel<IUser>
```

## Ver también

- [Transformadores](/es/guide/transformers) — tipos de coerción soportados
- [Validación](/es/guide/validation) — `@QRule` para reglas de negocio
- [Integración con Zod](/es/integrations/zod-integration) — mismo patrón de puente
- [Integración con tRPC](/es/integrations/trpc-integration) — stack tipado de extremo a extremo
