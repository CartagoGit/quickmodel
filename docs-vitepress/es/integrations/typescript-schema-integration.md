# Integración con Interfaces TypeScript

QuickModel puede exportar cualquier modelo como un **string de código fuente de interfaz TypeScript**, y puede reconstruir una clase `QModel` desde una interfaz o tipo TypeScript existente. Útil para compartir contratos entre paquetes, generar stubs `.d.ts`, o hacer scaffolding de clases QModel desde interfaces heredadas.

## Exportar una interfaz TypeScript desde una clase QModel

Importa `quickmodel/schema` una vez para registrar los generadores, luego llama a `getSchema('typescript')`:

```typescript
import 'quickmodel/schema';
import { QModel, Quick } from 'quickmodel';

interface IUser {
	name: string;
	birth: Date;
	score: number;
	tags: string[];
}

@Quick({ birth: Date, score: Number, tags: '[String]' })
class User extends QModel<IUser> {
	declare name: string;
	declare birth: Date;
	declare score: number;
	declare tags: string[];
}

const tsInterface = User.getSchema('typescript');
/*
export interface IUser {
  name: string;
  birth: Date;
  score: number;
  tags: string[];
}
*/
```

El valor retornado es un **string** — código fuente TypeScript listo para guardar en un archivo `.ts` o `.d.ts`.

## `fromSchema`: generar una clase QModel desde una interfaz TypeScript

`fromSchema('typescript', ...)` acepta un string de interfaz TypeScript y genera una definición completa de clase `QModel`:

```typescript
import 'quickmodel/schema';

const tsInterface = `
export interface IProduct {
  name: string;
  price: number;
  createdAt: Date;
  inStock: boolean;
  tags: string[];
}
`;

const code = QModel.fromSchema('typescript', tsInterface, 'Product');
// → string de código TypeScript:
// interface IProduct { ... }
// @Quick({ price: Number, createdAt: Date, inStock: Boolean, tags: '[String]' })
// class Product extends QModel<IProduct> { ... }

// Guardar en disco e importar:
// fs.writeFileSync('src/models/product.model.ts', code);
```

Esto es **scaffolding** — el resultado es código para guardar como archivo `.ts`.

## Caso de uso: compartir contratos entre paquetes

En un monorepo, comparte contratos de modelo sin acoplar paquetes a QuickModel:

```typescript
// packages/shared/src/types.ts — generado desde QModel
// fs.writeFileSync('packages/shared/src/types.ts', User.getSchema('typescript'));

export interface IUser {
	name: string;
	birth: Date;
	score: number;
}
```

Cualquier paquete que consuma los tipos compartidos queda desacoplado de la implementación interna de QuickModel.

## Caso de uso: migrar interfaces heredadas a QModel

Si tienes interfaces TypeScript existentes y quieres migrarlas a QModel:

```typescript
import 'quickmodel/schema';

// Tu interfaz existente (de un codebase heredado o una definición de tipo de terceros)
const legacyInterface = `
interface IOrder {
  id: string;
  total: number;
  createdAt: Date;
  items: string[];
}
`;

const code = QModel.fromSchema('typescript', legacyInterface, 'Order');
// Pega el código en src/models/order.model.ts y ajusta según sea necesario
```

## Caso de uso: generar archivos de declaración `.d.ts`

```typescript
import 'quickmodel/schema';
import fs from 'node:fs';

const models = [User, Order, Product];

for (const Model of models) {
	const interfaceSrc = Model.getSchema('typescript');
	fs.writeFileSync(`dist/types/${Model.name}.d.ts`, interfaceSrc);
}
```

## Round-trip: QModel → interfaz TypeScript → clase QModel

```typescript
import 'quickmodel/schema';

const tsInterface = User.getSchema('typescript'); // exportar
const code = QModel.fromSchema('typescript', tsInterface, 'User'); // regenerar
// code es TypeScript válido que define class User extends QModel<IUser>
```

## Cuándo usar cada formato

| Necesidad                                      | Formato                         |
| ---------------------------------------------- | ------------------------------- |
| Compartir tipos entre paquetes (sin runtime)   | `getSchema('typescript')`       |
| Validar en runtime en múltiples herramientas   | `getSchema('json')`             |
| Exponer en una spec de API                     | `getSchema('openapi')`          |
| Generar un QModel desde una interfaz existente | `fromSchema('typescript', ...)` |

## Ver también

- [Generación de Schema](/es/guide/schema-generation) — referencia completa de `getSchema()`
- [Integración con JSON Schema](/es/integrations/json-schema-integration) — formato de schema portable
- [Transformadores](/es/guide/transformers) — cómo los tipos QModel se mapean a tipos TypeScript
