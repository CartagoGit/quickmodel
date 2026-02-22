# Guía de Contribución

Guía completa para desarrolladores que contribuyen al proyecto QuickModel.

## 📋 Índice

- [Configuración del Entorno](#configuracion-del-entorno)
- [Arquitectura](#arquitectura)
- [Build System](#build-system)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commits y Releases](#commits-y-releases)

## 🚀 Configuración del Entorno

### Requisitos

- **Bun** >= 1.0 (runtime y package manager)
- **TypeScript** >= 5.7
- **Node.js** >= 20 (para herramientas de documentación)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/CartagoGit/quickmodel.git
cd quickmodel

# Instalar dependencias
bun install

# Verificar instalación
bun test
bun run build
```

## 🏗️ Arquitectura

QuickModel sigue **principios SOLID** con una arquitectura clara y mantenible.

### Estructura del Proyecto

```
src/
├── index.ts                    # Public API exports
├── core/
│   ├── models/
│   │   └── quick.model.ts      # QModel base class
│   ├── decorators/
│   │   ├── quick.decorator.ts  # @Quick() - Bulk decorator
│   │   └── qtype.decorator.ts  # @QType() - Per-property decorator
│   ├── services/
│   │   ├── model-serializer.service.ts
│   │   ├── model-deserializer.service.ts
│   │   └── validation.service.ts
│   ├── registry/
│   │   └── transformer.registry.ts
│   ├── bases/
│   │   └── base-transformer.ts
│   └── interfaces/
│       ├── model.interface.ts
│       ├── transformer.interface.ts
│       ├── serializer.interface.ts
│       └── field-symbols.interface.ts
└── transformers/
    ├── bigint.transformer.ts
    ├── date.transformer.ts
    ├── regexp.transformer.ts
    ├── symbol.transformer.ts
    ├── error.transformer.ts
    ├── map-set.transformer.ts
    ├── buffer.transformer.ts
    ├── typed-array.transformer.ts
    └── primitive.transformer.ts
```

### Principios SOLID

#### 1. Single Responsibility Principle (SRP)

- **Transformers**: Cada transformer maneja UN tipo específico
- **Services**: Servicios separados para serialización, deserialización y validación
- **Decorators**: Solo registran metadata, no contienen lógica de transformación

#### 2. Open/Closed Principle (OCP)

- Sistema extensible mediante registro de nuevos transformers
- No requiere modificar código existente para añadir tipos
- Registry pattern permite inyección de transformers custom

#### 3. Liskov Substitution Principle (LSP)

- Todos los transformers implementan `IQTransformer<TInput, TSerialized>`
- Los modelos se comportan como clases TypeScript estándar
- Sustitución transparente en jerarquías de herencia

#### 4. Interface Segregation Principle (ISP)

- Interfaces separadas para serialización (`IUser`) y runtime (`IUserTransform`)
- Clientes no dependen de interfaces que no usan
- Contratos pequeños y específicos

#### 5. Dependency Inversion Principle (DIP)

- Servicios dependen de abstracciones (`IQTransformer`), no de implementaciones
- Registry actúa como contenedor de inyección de dependencias
- Transformers no conocen detalles de serialización

### Flujo de Datos

```
┌─────────────┐
│ Constructor │ → Data llegando (JSON del backend)
└──────┬──────┘
       ↓
┌────────────────────┐
│ @Quick/@QType      │ → Metadata de transformaciones
│ (Decorators)       │
└─────────┬──────────┘
          ↓
┌──────────────────────┐
│ Deserializer    │ → Aplica transformaciones
│ Service              │
└──────────┬───────────┘
           ↓
┌─────────────────────┐
│ Transformers        │ → Transforman tipos específicos
│ (Registry lookup)   │   (string → Date, array → Set, etc.)
└──────────┬──────────┘
           ↓
┌─────────────────┐
│ QModel Instance │ → Propiedades con tipos runtime correctos
└─────────────────┘
```

## 🔨 Build System

### Scripts Principales

```bash
# Compilar proyecto (limpia, testea y build)
bun run build

# Development con watch mode
bun run dev

# Limpiar dist/
bun run clean

# Verificar tipos sin emitir
bun run typecheck
```

### Configuración TypeScript

**tsconfig.json** - Compilación del código fuente:

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "ESNext",
		"lib": ["ES2023"],
		"moduleResolution": "bundler",
		"baseUrl": ".",
		"paths": {
			"@/*": ["src/*"]
		},
		"rootDir": "./src",
		"outDir": "./dist",
		"strict": true,
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	},
	"include": ["src/**/*"],
	"exclude": ["node_modules", "dist", "tests", "run", "docs"]
}
```

**tsconfig.test.json** - Configuración para tests:

```json
{
	"extends": "./tsconfig.json",
	"compilerOptions": {
		"noEmit": true,
		"noUnusedLocals": true,
		"noUnusedParameters": true
	},
	"include": ["src/**/*", "tests/**/*"]
}
```

### Bundling con tsup

**tsup.config.ts**:

```typescript
export default defineConfig({
	entry: { index: 'src/index.ts' },
	format: ['cjs', 'esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	treeshake: true,
	external: ['reflect-metadata'],
	esbuildOptions(options) {
		options.alias = { '@': './src' };
	},
});
```

### Path Aliases

**Siempre usar path aliases `@/*` en lugar de imports relativos:**

```typescript
// ✅ CORRECTO
import { QModel } from '@/core/models/quick.model';
import { Deserializer } from '@/core/services/model-deserializer.service';

// ❌ INCORRECTO
import { QModel } from '../../core/models/quick.model';
import { Deserializer } from '../services/model-deserializer.service';
```

### NO Barrel Files

**Regla importante:** NO usar barrel files (index.ts) excepto el principal en `src/index.ts`

```typescript
// ❌ NUNCA crear archivos index.ts como estos:
// src/transformers/index.ts
// src/core/services/index.ts
// src/core/interfaces/index.ts

// ✅ Importar directamente desde los archivos fuente
import { BigIntTransformer } from '@/transformers/bigint.transformer';
```

**Razones:**

- Evita dependencias circulares
- Build más rápido (menos resoluciones de módulos)
- Mejor tree-shaking
- Imports explícitos y claros

## 🧪 Testing

### Framework

Usamos **Bun Test** (nativo, ultra-rápido, compatible con Jest/Vitest API)

### Estructura de Tests

```
tests/
├── unit/              # Tests de unidades individuales
│   ├── primitives/
│   ├── collections/
│   └── transformers/
├── integration/       # Tests de integración de features
│   └── decorators/
├── system/           # Tests de flujos completos
│   └── full-workflow/
└── e2e/              # Tests end-to-end
    └── user-scenarios/
```

### Ejecutar Tests

```bash
# Todos los tests
bun test

# Con coverage
bun run test:coverage

# Solo unit tests (rápido)
bun test tests/unit

# Solo integration tests
bun test tests/integration

# Test específico
bun test tests/unit/primitives/bigint.test.ts

# Watch mode
bun test --watch
```

### Escribir Tests

**Patrón básico:**

```typescript
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Feature Name', () => {
	test('should do something specific', () => {
		// Arrange
		const data = {
			/* ... */
		};

		// Act
		const model = new Model(data);

		// Assert
		expect(model.property).toBe(expected);
	});
});
```

**Convenciones:**

- Nombrar archivos con patrón: `feature-scenario.test.ts`
- Usar `describe` para agrupar tests relacionados
- Cada `test` debe validar UNA cosa específica
- Usar comentarios Arrange/Act/Assert en tests complejos

## 🎨 Code Style

### Herramientas

- **ESLint**: Análisis estático
- **Prettier**: Formateo automático
- **TypeScript**: Type checking

### Configuración

**package.json** (Prettier):

```json
{
	"prettier": {
		"useTabs": true,
		"tabWidth": 2,
		"singleQuote": true,
		"printWidth": 100,
		"trailingComma": "es5",
		"semi": true
	}
}
```

### Reglas Principales

1. **Indentación**: Tabs (no espacios)
2. **Comillas**: Single quotes (`'`)
3. **Longitud de línea**: Max 100 caracteres
4. **Semicolons**: Sí (siempre)
5. **Trailing commas**: ES5 style

### Scripts de Linting

```bash
# Verificar código
bun run lint

# Auto-fix problemas
bun run lint:fix

# Verificar formato
bun run format:check

# Auto-formatear
bun run format
```

### Convenciones TypeScript

**Interfaces:**

```typescript
// ✅ Prefijo I para interfaces de datos
interface IUser { ... }

// ✅ Prefijo I para interfaces de contrato
interface IQTransformer<T, S> { ... }
```

**Types vs Interfaces:**

```typescript
// ✅ Usar interface para objetos y contratos
interface IUser {
	id: number;
	name: string;
}

// ✅ Usar type para unions, tuples, utilities — siempre con prefijo I
type IStatus = 'active' | 'inactive';
type IPoint = [number, number];

// ❌ Type aliases sin prefijo I están prohibidos
type Status = 'active' | 'inactive';
```

**Longitud de identificadores (ESLint `id-length`):**

```typescript
// ✅ Mínimo 3 caracteres requerido
const age = 25;
const idx = 0;
const err = new Error();

// ✅ Nombres cortos permitidos: id, on, fs, cb, md, ts, err, _
const id = model.id;
const cb = () => {};
const [_, second] = list;

// ❌ Violaciones de nombre corto
const a = 1;
const fn = () => {};
```

**Máximo parámetros por función (ESLint `max-params`):**

```typescript
// ✅ Hasta 3 parámetros ok
function create(name: string, age: number, active: boolean) {}

// ✅ Más de 3 — usar objeto de opciones
function create(options: ICreateOptions) {}

// ❌ 4+ parámetros posicionales prohibido (excepto en src/transformers/ y src/core/bases/)
function process(a: string, b: number, c: boolean, d: object) {}
```

**Imports restringidos:**

```typescript
// ✅ Usar path aliases internos
import { QModel } from '@/core/models/quick.model';
import { McpServer } from '@mcp/server';

// ❌ Nunca auto-importar el paquete publicado desde src/
import { QModel } from '@cartago-git/quickmodel';

// ❌ Nunca importar el barrel @mcp sin ruta
import { something } from '@mcp';
```

### Validación automática rápida

Usar la herramienta MCP `check_project_rules` antes de completar cualquier tarea. Verifica estáticamente todas las reglas anteriores sin ejecutar ESLint:

```bash
# Via herramienta MCP (rápido, sin proceso externo)
mcp: check_project_rules

# Validación completa (lint + typecheck + tests)
bun run check
```

**Property Declaration:**

```typescript
// ✅ Opción 1: declare (recomendado)
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
}

// ✅ Opción 2: definite assignment (!)
class User extends QModel<IUser> {
	id!: number;
	name!: string;
}
```

## 📝 Commits y Releases

### Conventional Commits

**Formato obligatorio:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Tipos principales:**

- `feat`: Nueva feature (MINOR bump)
- `fix`: Bug fix (PATCH bump)
- `docs`: Solo documentación
- `style`: Formateo, sin cambio de código
- `refactor`: Refactorización
- `test`: Añadir o modificar tests
- `chore`: Mantenimiento
- `perf`: Mejora de performance (PATCH bump)

**Scopes del proyecto:**

- `transformers`, `decorators`, `services`, `core`, `tests`, `docs`, `build`, `deps`

**Ejemplos:**

```bash
feat(transformers): add URL transformer support
fix(serializer): correct BigInt serialization bug
docs(readme): update installation instructions
chore(deps): update typescript to 5.7.2
```

### Release Workflow

**Antes de hacer release:**

```bash
# 1. Verificar commits desde último tag
bun run release:check

# 2. Ejecutar tests
bun test

# 3. Verificar build
bun run build
```

**Proceso de release (automático):**

```bash
# 1. Merge a main
git checkout main
git merge develop
git push origin main

# 2. GitHub Actions se encarga de:
#    - Ejecutar tests
#    - Build del proyecto
#    - Analizar commits (semantic-release)
#    - Calcular nueva versión
#    - Crear tag
#    - Actualizar CHANGELOG
#    - Publicar a npm
#    - Crear GitHub release
```

### Semantic Versioning

```
MAJOR.MINOR.PATCH
```

- **MAJOR** (2.0.0): Breaking changes (`feat!:` o `BREAKING CHANGE:`)
- **MINOR** (1.1.0): Nuevas features (`feat:`)
- **PATCH** (1.0.1): Bug fixes (`fix:`, `perf:`)

## 📚 Documentación

### Herramientas

- **TypeDoc**: Genera API reference desde JSDoc comments
- **VitePress**: Sitio estático para guías y tutoriales

### Generar Documentación

```bash
# API Reference (TypeDoc)
bun run docs:api

# VitePress dev server
bun run docs:dev

# Build VitePress
bun run docs:build

# Preview VitePress build
bun run docs:preview
```

### Escribir JSDoc

````typescript
/**
 * Transforms BigInt values for serialization
 *
 * @remarks
 * Serializes as string to maintain precision in JSON
 *
 * @example
 * ```ts
 * const transformer = new BigIntTransformer();
 * transformer.serialize(123n); // "123"
 * transformer.deserialize("123"); // 123n
 * ```
 */
export class BigIntTransformer implements IQTransformer<bigint, string> {
	// ...
}
````

## 🤝 Contribuir

### Workflow Recomendado

1. **Fork y clone**
2. **Crear branch**: `git checkout -b feat/new-feature`
3. **Desarrollar** con tests
4. **Commit** siguiendo Conventional Commits
5. **Push** y crear Pull Request
6. **Review** y merge

### Checklist antes de PR

- ✅ Tests pasan: `bun test`
- ✅ Build funciona: `bun run build`
- ✅ Lint OK: `bun run lint`
- ✅ Formato OK: `bun run format:check`
- ✅ Types OK: `bun run typecheck`
- ✅ Commits siguen Conventional Commits
- ✅ Documentación actualizada (si aplica)

## 📖 Referencias

- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Bun Documentation](https://bun.sh/docs)
- [Semantic Release](https://semantic-release.gitbook.io/)
