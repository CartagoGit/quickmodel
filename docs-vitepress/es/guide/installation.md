# Instalación

## Requisitos Previos

Antes de instalar QuickModel, asegúrate de tener:

- **Node.js** >= 18.0.0
- **TypeScript** >= 5.0.0
- Un gestor de paquetes: npm, yarn, pnpm o bun

## Instalar QuickModel

Elige tu gestor de paquetes preferido:

::: code-group

```bash [npm]
npm install @cartago-git/quickmodel
```

```bash [yarn]
yarn add @cartago-git/quickmodel
```

```bash [pnpm]
pnpm add @cartago-git/quickmodel
```

```bash [bun]
bun add @cartago-git/quickmodel
```

:::

## Configuración de TypeScript

QuickModel admite **dos modos de decoradores**. Elige el que se adapte a tu proyecto:

### Modo 1 — Decoradores legacy (clásico, mayor compatibilidad con herramientas)

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"target": "ES2022",
		"lib": ["ES2022"],
		"module": "ESNext",
		"moduleResolution": "node"
	}
}
```

### Modo 2 — Decoradores estándar TC39 (TypeScript 5+, sin flags legacy)

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"lib": ["ES2022"],
		"module": "ESNext",
		"moduleResolution": "node"
	}
}
```

::: info Modo TC39 — ¿qué cambia?
Cuando `experimentalDecorators` está **ausente o es `false`**, TypeScript compila los decoradores con la especificación TC39 Stage-3. QuickModel lo gestiona de forma transparente:

- **`@Quick`** — sin cambios. Los decoradores de clase siguen recibiendo el constructor como primer argumento.
- **`@QType`** — los metadatos se registran dentro de un callback `addInitializer` que se ejecuta en la **primera creación de instancia**, en vez de en tiempo de definición de clase. En la práctica esto es invisible: los metadatos siempre están disponibles antes de que `QModel.initialize()` los lea.
- **`@QRule`** — el tipo del parámetro del predicado se **infiere automáticamente** desde el tipo del campo. No se necesita anotación manual:

```typescript
// Modo TC39 — val infiere tipo Date automáticamente ✅
@QRule((val) => val > new Date('2000-01-01'), 'Debe ser posterior al año 2000')
createdAt!: Date;

// Modo legacy — se requiere anotación
@QRule((val: Date) => val > new Date('2000-01-01'), 'Debe ser posterior al año 2000')
declare createdAt: Date;
```

:::

::: warning La sintaxis de campos cambia con TC39
En **modo TC39**, los decoradores de campo (`@QType`, `@QRule`) **no pueden aplicarse a campos `declare`** — usa `!` (aserción de asignación definitiva) en su lugar:

```typescript
// ✅ Modo TC39
@QType(Date)
createdAt!: Date;

// ✅ Modo legacy (experimentalDecorators: true)
@QType(Date)
declare createdAt: Date;
```

Los campos sin decorar que solo necesitan seguimiento de tipos (sin `@QType` / `@QRule`) pueden seguir usando `declare` en ambos modos.
:::

### Opciones Requeridas

- **`experimentalDecorators: true`** _(solo modo legacy)_ — habilita la sintaxis PropertyDecorator legacy. Omítela (o ponla en `false`) para usar el modo TC39.

### Opciones Recomendadas

- **`strict: true`** - Habilita todas las opciones estrictas de verificación de tipos de **TypeScript** (no relacionado con `unknownPropertyPolicy` de QuickModel)
- **`target: "ES2020"`** - Características modernas de JavaScript
- **`module: "ESNext"`** - Sistema de módulos moderno

::: warning emitDecoratorMetadata NO es necesario
A diferencia de muchas otras librerías, **QuickModel NO requiere `"emitDecoratorMetadata": true`**.

QuickModel se basa en el **mapeo explícito de tipos** (ej: `@Quick({ date: Date })`) como única fuente de verdad. Esto asegura un comportamiento robusto independientemente de tu configuración de compilador o herramienta de construcción (esbuild, swc, babel, etc.).

**Caso específico:** Cuando usas `@QType()` **sin argumentos**, QuickModel intenta leer metadatos. Si `emitDecoratorMetadata` está desactivado, simplemente recurre a tratar el valor **"tal cual"** (sin transformación). Esto funciona perfectamente para primitivos, pero significa que debes usar mapeo explícito para tipos especiales (Date, BigInt, etc.).
:::

## Estructura de Importación

QuickModel utiliza una estructura de importación modular para mantener tu proyecto limpio:

- **Core**: Clases principales y decoradores (`QModel`, `Quick`, `QType`)
    ```typescript
    import { QModel, Quick } from '@cartago-git/quickmodel';
    ```
- **Definiciones de Tipos**: Interfaces y tipos auxiliares (`IQSerializedInterface`, `IQSpec`, etc.)
    ```typescript
    import type { IQSerializedInterface } from '@cartago-git/quickmodel/types';
    ```
- **Utilidades Avanzadas**: Utilidades en tiempo de ejecución para usuarios avanzados (`QMockGenerator`)
    ```typescript
    import { QMockGenerator } from '@cartago-git/quickmodel/advanced';
    ```

## Verificar la Instalación

Crea un archivo de prueba simple para verificar que todo funciona:

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IUser {
	id: number;
	name: string;
	createdAt: string;
}

@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
}

const user = new User({
	id: 1,
	name: 'John Doe',
	createdAt: '2026-01-10T00:00:00.000Z',
});

console.log(user.createdAt instanceof Date); // true ✅
```

Si esto se ejecuta sin errores e imprime `true`, ¡estás listo!

## Próximos Pasos

- [Inicio Rápido](/es/guide/quick-start) - Construye tu primer modelo
- [QModel](/es/guide/qmodel) - Aprende sobre la clase base del modelo
- [Ejemplos](/es/examples/) - Ve ejemplos del mundo real
