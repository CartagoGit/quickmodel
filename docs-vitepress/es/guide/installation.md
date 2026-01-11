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

QuickModel usa decoradores, por lo que debes habilitarlos en tu `tsconfig.json`:

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true,
		"target": "ES2020",
		"lib": ["ES2020"],
		"module": "ESNext",
		"moduleResolution": "node"
	}
}
```

### Opciones Requeridas

- **`experimentalDecorators: true`** - Habilita la sintaxis de decoradores (`@Quick()`)
- **`emitDecoratorMetadata: true`** - Habilita la reflexión de tipos en tiempo de ejecución

### Opciones Recomendadas

- **`strict: true`** - Habilita todas las opciones estrictas de verificación de tipos
- **`target: "ES2020"`** - Características modernas de JavaScript
- **`module: "ESNext"`** - Sistema de módulos moderno

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
