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

## Las dependencias opcionales se cargan de forma lazy

Varias funcionalidades opcionales dependen de peer dependencies pesadas. QuickModel las carga **bajo demanda** usando `createRequire` de Node, por lo que nunca aparecen en el grafo de importaciones estático si no se invoca la funcionalidad correspondiente:

| Dependencia opcional | Funcionalidad                             | Cuándo se carga                       |
| -------------------- | ----------------------------------------- | ------------------------------------- |
| `zod`                | `ZodSchemaGenerator` / `getSchema('zod')` | Primera llamada a `.getSchema('zod')` |
| `@faker-js/faker`    | Datos aleatorios de `QMockGenerator`      | Primera llamada a `.mock()`           |

Esto significa que los bundlers **no** incluirán `zod` ni `@faker-js/faker` en tu bundle a menos que el código llegue efectivamente a esas rutas de ejecución.

### Cómo ayuda la carga lazy

```ts
// ✅ Esta importación NO arrastra zod a tu bundle
import { QModel, Quick } from 'quickmodel';

class User extends QModel<User> {
	@Quick() name: string = '';
}

// zod sólo se requiere en el momento en que esta línea se ejecuta en runtime
const schema = User.getSchema('zod');
```

## `QMockGenerator` se inicializa de forma lazy

La instancia de `QMockGenerator` (que puede referenciar `@faker-js/faker`) se crea **sólo cuando se realiza la primera llamada a `.mock()`** en cualquier clase model. Importar `quickmodel` no la instancia.

```ts
import { QModel, Quick } from 'quickmodel';

class Product extends QModel<Product> {
	@Quick() name: string = '';
}

// QMockGenerator NO se instancia hasta aquí
const mock = Product.mock();
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

### Ejemplo práctico: utilidades de test

Si tus archivos de test generan datos mock pero el código fuente nunca lo hace, aisla el sistema de mock en los tests:

```ts
// src/user.model.ts — código de producción
import { QModel, Quick } from 'quickmodel'; // el sistema de mock no se carga

class User extends QModel<User> {
	@Quick() name: string = '';
	@Quick() age: number = 0;
}
```

```ts
// tests/user.factory.ts — código de test
import { QMockBuilder } from 'quickmodel/mock'; // sólo mock, sin el overhead de QModel

const mockUser = new QMockBuilder({ name: 'Alice', age: 30 });
```

### Ejemplo práctico: exportación de schema únicamente

```ts
// scripts/export-schema.ts
import { ZodSchemaGenerator } from 'quickmodel/schema/zod';

const gen = new ZodSchemaGenerator();
// zod se carga aquí — no al arrancar la aplicación
const schema = gen.generate(MyModel);
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

Al consumir QuickModel vía `require()` (CJS), los bundlers no pueden hacer tree-shaking de los namespace re-exports. Para evitar cargar componentes que no necesitas, importa desde los subpaths granulares:

```js
// ❌ Puede arrastrar código extra en CJS
const { QModel } = require('quickmodel');

// ✅ Preferible para CJS: usa el subpath específico
const { QMockGenerator } = require('quickmodel/mock');
const { ZodSchemaGenerator } = require('quickmodel/schema/zod');
```
