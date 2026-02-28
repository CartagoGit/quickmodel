# Tamaño de Bundle y Tree-shaking

QuickModel está diseñado desde su base para minimizar el peso que añade al bundle de tu aplicación. Esta página explica cómo está estructurada la librería internamente, qué se carga de forma eager vs lazy, y cómo usar las importaciones de subpath granulares para cargar **únicamente lo que realmente utilizas**.

## Cómo funciona la build

QuickModel incluye un bundle dual **ESM + CJS** generado con [tsup](https://tsup.egoist.dev/):

- **Code splitting activado** — los internos compartidos se separan en chunks automáticamente.
- **Tree-shaking** (`preset: 'smallest'`) — las exportaciones no usadas se eliminan cuando el bundler soporta ESM.
- **`sideEffects: false`** en `package.json` — indica a los bundlers que todos los archivos son seguros para tree-shaking.
- **Salida minificada** — todos los archivos de producción están minificados.

::: tip ESM vs CJS
Los consumidores ESM obtienen la mejor experiencia de tree-shaking porque los bundlers pueden analizar estáticamente las sentencias `import`. Los consumidores CJS (`require()`) deberían preferir las **importaciones de subpath granulares** (listadas más abajo) para evitar cargar la librería completa.
:::

## Startup cost vs. tamaño de bundle

Son dos conceptos diferentes que se confunden con frecuencia:

| Concepto             | Qué significa                                                                                       | Cómo se mide                                            |
| -------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Tamaño de bundle** | Cuánto código (bytes) se envía al cliente / se incluye en la salida                                 | `bundlephobia`, webpack-bundle-analyzer, `du -sh dist/` |
| **Startup cost**     | Cuánto trabajo de CPU ocurre cuando el módulo se evalúa por primera vez (constructores, registros…) | Profiler, `console.time`, benchmarks de cold-start      |

QuickModel aborda **ambos**, pero con distintas técnicas según el tipo de dependencia:

- **Peer dependencies** (`zod`, `@faker-js/faker`) — cargadas vía `createRequire` en runtime; nunca aparecen en el grafo de importaciones estático → elimina tanto el tamaño como el startup cost.
- **Código interno** (`IntegrityService`, helpers de form-data/stream) — importado estáticamente, por lo que siempre está en el bundle, pero la **construcción se difiere** → elimina el startup cost sin cambiar la API.

## Qué se carga de forma lazy

Los siguientes componentes se difieren hasta el primer uso:

| Componente                                                           | Técnica                    | Cuándo se instancia / carga                          |
| -------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------- |
| Peer dependency `zod`                                                | `createRequire` en runtime | Primera llamada a `.getSchema('zod')`                |
| Peer dependency `@faker-js/faker`                                    | `createRequire` en runtime | Primera llamada a `.mock()`                          |
| Instancia de `QMockGenerator`                                        | Getter estático lazy       | Primera llamada a cualquier `.mock()`                |
| Instancia de `IntegrityService` (+ 14 constructores de transformers) | Getter estático lazy       | Primera llamada a `.checkIntegrity()` o `.isValid()` |

Esto significa que importar `quickmodel` y declarar clases model **no ejecuta ni un solo constructor de transformer** — las 14+ instancias de transformers dentro de `IntegrityService` solo se crean cuando se solicita validación por primera vez.

```ts
// ✅ Carga del módulo: cero constructores de transformer se ejecutan
import { QModel, Quick } from 'quickmodel';

interface IOrder {
	id: number;
	status: string;
}

@Quick({ id: Number, status: String })
class Order extends QModel<IOrder> {
	declare id: number;
	declare status: string;
}

// ✅ Todavía sin constructores — solo deserialización + serialización
const order = new Order({ id: 1, status: 'pending' });
const plain = order.serialize();

// ⚡ AQUÍ: 14+ constructores de transformer se ejecutan (una vez, cacheados)
const ok = order.isValid();
```

## Dependencias peer opcionales: `zod` y `faker`

Las peer dependencies se cargan **bajo demanda** usando `createRequire` de Node, por lo que nunca aparecen en el grafo de importaciones estático si no se invoca la funcionalidad correspondiente:

| Dependencia opcional | Funcionalidad                             | Cuándo se carga                       |
| -------------------- | ----------------------------------------- | ------------------------------------- |
| `zod`                | `ZodSchemaGenerator` / `getSchema('zod')` | Primera llamada a `.getSchema('zod')` |
| `@faker-js/faker`    | Datos aleatorios de `QMockGenerator`      | Primera llamada a `.mock()`           |

Esto significa que los bundlers **no** incluirán `zod` ni `@faker-js/faker` en tu bundle a menos que el código llegue efectivamente a esas rutas de ejecución.

### Cómo ayuda la carga lazy

```ts
// ✅ Esta importación NO arrastra zod a tu bundle
import { QModel, Quick } from 'quickmodel';

interface IUser {
	name: string;
	createdAt: string;
}

@Quick({ name: String, createdAt: Date })
class User extends QModel<IUser> {
	declare name: string;
	declare createdAt: Date;
}

// zod sólo se carga en el momento en que esta línea se ejecuta en runtime
const zodSchema = User.getSchema('zod');
```

## Importaciones de subpath granulares

Para el máximo control sobre lo que termina en tu bundle, usa los entry points dedicados en lugar del barrel principal de `quickmodel`:

| Ruta de importación                | Qué exporta                                                    | Caso de uso típico                      |
| ---------------------------------- | -------------------------------------------------------------- | --------------------------------------- |
| `quickmodel`                       | `QModel`, `@Quick`, `@QType`, `@QRule`, validators, decorators | Models principales de la aplicación     |
| `quickmodel/mock`                  | `QMockGenerator`, `QMockBuilder`                               | Archivos de test, factories de fixtures |
| `quickmodel/schema`                | Los 7 generadores de schema (Zod lazy)                         | Utilidades de exportación de schemas    |
| `quickmodel/schema/zod`            | `ZodSchemaGenerator` únicamente                                | Integración específica con Zod          |
| `quickmodel/advanced`              | Serializer, deserializer, generadores, registry, transformers  | Autores de librerías, tooling interno   |
| `quickmodel/utils`                 | `QType`, `QModelError`, `QMockBuilder`, `QLogger`              | Consumidores solo de utilidades         |
| `quickmodel/forms`                 | Helpers de formulario y rule checkers                          | Manejo de formularios                   |
| `quickmodel/validators`            | `IsEmail`, `Min`, `Max`, etc.                                  | Importaciones de validadores aisladas   |
| `quickmodel/transformers`          | Índice de todos los transformers                               | Descubrimiento de transformers          |
| `quickmodel/transformers/[nombre]` | Transformer individual                                         | Consumidores de un solo transformer     |
| `quickmodel/matchers`              | Matchers                                                       | Consumidores sólo de matchers           |
| `quickmodel/types`                 | Barrel de tipos                                                | Importaciones sólo de tipos             |
| `quickmodel/compat/ts5/forms`      | Helpers de formulario para decoradores TC39                    | Proyectos TypeScript 5+                 |
| `quickmodel/core`                  | Índice interno del core                                        | Extensión avanzada                      |

### Ejemplo práctico: mocks sólo en tests

El sistema de mocks (`faker`) nunca se instancia en código de producción — sólo en la primera llamada a `.mock()`. Puedes llamar a `.mock()` desde tests sin que afecte al bundle de producción:

```ts
// src/user.model.ts — código de producción
import { QModel, Quick } from 'quickmodel';

interface IUser {
	name: string;
	age: number;
	role: string;
}

@Quick({ name: String, age: Number, role: String })
class User extends QModel<IUser> {
	declare name: string;
	declare age: number;
	declare role: string;
}

export { User };
```

```ts
// tests/user.test.ts — código de test (faker carga aquí, no en producción)
import { User } from '../src/user.model';

// Generar una instancia aleatoria
const user = User.mock().random();

// Generar con overrides fijos
const admin = User.mock().random({ role: 'admin' });

// Generar un array de 5 instancias
const users = User.mock().array(5);
```

### Ejemplo práctico: exportación de schema únicamente

Cuando se usa `quickmodel/schema/zod` directamente, zod nunca se carga al iniciar la aplicación:

```ts
// scripts/export-schema.ts
import { ZodSchemaGenerator } from 'quickmodel/schema/zod';

// zod se carga aquí — no cuando se importa por primera vez el módulo de la app
const schema = ZodSchemaGenerator.generate({
	className: 'User',
	decoratorConfig: { name: String, age: Number, createdAt: Date },
	properties: ['name', 'age', 'createdAt'],
});
```

Alternativamente, usa el método estático en la clase model (zod sigue cargándose de forma lazy):

```ts
import { QModel, Quick } from 'quickmodel';

interface IUser {
	name: string;
	age: number;
	createdAt: string;
}

@Quick({ name: String, age: Number, createdAt: Date })
class User extends QModel<IUser> {
	declare name: string;
	declare age: number;
	declare createdAt: Date;
}

// zod se carga aquí, en la primera llamada
const zodSchema = User.getSchema('zod');
```

## Medir el footprint real

Usa [bundlephobia](https://bundlephobia.com/) o el bundle analyser de tu bundler para verificar el impacto tras la integración. Una importación mínima de `quickmodel` (sólo models + decoradores, sin activar mock ni schema) añade aproximadamente:

```
quickmodel (ESM, minificado+gzip): ~8 kB
reflect-metadata (peer):            ~3 kB
```

Funcionalidades opcionales cargadas sólo cuando se activan:

```
+ zod (si se llama getSchema('zod')): ~13 kB
+ @faker-js/faker (si se llama .mock()): ~500+ kB
```

::: warning Faker en bundles de producción
`@faker-js/faker` es una peer dependency de **desarrollo/test**. Asegúrate de que sólo se importe en código de test o detrás de una ruta lazy que nunca se alcance en las builds de producción.
:::

## Consumidores CJS: evita el barrel principal

Al consumir QuickModel vía `require()` (CJS), los bundlers no pueden hacer tree-shaking de los namespace re-exports (`export * as Advanced`, `export * as Utils`, etc.). Para evitar cargar componentes que no necesitas, importa desde los subpaths granulares:

```js
// ❌ Puede arrastrar código extra en CJS
const { QModel } = require('quickmodel');

// ✅ Preferible para CJS: usa el subpath específico
const { QMockGenerator } = require('quickmodel/mock');
const { ZodSchemaGenerator } = require('quickmodel/schema/zod');
```

## Comparativa de características

<BenchmarkChart
  :only-tabs="['features', 'coverage', 'performance']"
  default-tab="features"
/>
