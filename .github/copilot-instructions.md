# GitHub Copilot Instructions - QuickModel

Este archivo es un **índice de navegación** para consultar la documentación específica según la tarea a realizar.

## 🚨 REGLAS DE CÓDIGO — SIEMPRE OBLIGATORIAS

Antes de hacer **cualquier** cambio de código, verifica que el resultado cumple **todas** estas reglas.  
Usa la herramienta MCP **`check_project_rules`** para validarlas automáticamente.

### Reglas de tipado (TypeScript strict)

| Regla                      | Detalle                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `strict: true`             | Activo en `tsconfig.json`                                                                        |
| `noImplicitAny`            | Todo debe tener tipo explícito o inferible sin `any`                                             |
| `strictNullChecks`         | Nunca asumir que un valor no es `null`/`undefined`                                               |
| `noImplicitReturns`        | Todas las ramas de una función deben retornar valor                                              |
| `noUncheckedIndexedAccess` | El acceso a arrays/Maps puede ser `undefined`                                                    |
| Interfaces → prefijo `I`   | `interface IUser {}` ✅ — `interface User {}` ❌                                                 |
| Type aliases → prefijo `I` | `type IStatus = ...` ✅ — `type Status = ...` ❌                                                 |
| Path aliases               | Usar `@/core/...`, `@/transformers/...` — **nunca** rutas relativas ni `quickmodel` desde `src/` |

### Reglas de linting (ESLint)

| Regla                   | Detalle                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `id-length`             | Nombres de variables/parámetros: **mínimo 3 caracteres**                                  |
| ↳ Excepciones           | `_`, `id`, `on`, `fs`, `cb`, `md`, `ts`, `err` y prefijo `_`                              |
| `max-params`            | Máximo **3 parámetros** posicionales por función — usar objeto si hace falta más          |
| ↳ Excepción             | `src/transformers/` y `src/core/bases/` (contrato `IQTransformer`)                        |
| `no-restricted-imports` | Prohibido importar `quickmodel` (barrel) desde `src/`                                     |
| ↳                       | Prohibido importar `@mcp` sin especificar sub-ruta (usar `@mcp/server`, `@mcp/tools/...`) |
| `no-console`            | No usar `console.log` en `src/` (excepto `mcp-cli.ts` y `server.ts`)                      |
| Decoradores en tests    | Usar `@Quick({...})` — **nunca** `@QType(...)` en tests                                   |

### Verificación obligatoria antes de entregar código

```bash
# Validación rápida con MCP (estática, sin ejecutar ESLint)
mcp: check_project_rules

# Validación completa (lint + typecheck + tests)
bun run check
```

## 🔁 **METODOLOGÍA TDD — SIEMPRE**

**REGLA CRÍTICA:** Antes de implementar cualquier funcionalidad nueva:

1. ✅ **PRIMERO:** Escribir el test que falla
2. ✅ **SEGUNDO:** Implementar el código mínimo para que pase
3. ✅ **TERCERO:** Refactorizar si es necesario
4. ✅ **CUARTO:** Verificar que todos los tests pasan

**Nunca implementes código de producción sin su test correspondiente.**

## �📋 ¿Qué vas a hacer?

### 🔄 Voy a hacer un commit

➡️ Consulta: **[COMMIT_CONVENTIONS.md](./COMMIT_CONVENTIONS.md)**

- Formato de mensajes (Conventional Commits)
- Tipos de commit y versionado semántico
- Scopes del proyecto
- Ejemplos buenos y malos

### 🚀 Voy a hacer un release

➡️ Consulta: **[releasing.md](../docs-vitepress/en/guide/releasing.md)**

- Workflow de release
- Configuración de tokens
- Comando pre-release: `bun run release:check`
- Proceso automático con GitHub Actions

### 💻 Voy a escribir código

➡️ Consulta: **[contributing.md](../docs-vitepress/en/guide/contributing.md)**

- Arquitectura SOLID del proyecto
- Patrones de código
- Uso de path aliases `@/*`
- Estilo: tabs, single quotes, 100 chars
- NO usar barrel files (index.ts)
- **Ejecutar `check_project_rules` (MCP) antes de completar cualquier tarea**

### 🧪 Voy a escribir tests

➡️ Consulta: **[contributing.md](../docs-vitepress/en/guide/contributing.md)** (sección Testing)

- Ejecutar: `bun test`
- Coverage: `bun run test:coverage`
- Configuración: tsconfig.test.json
- **Usar `@Quick({...})` — nunca `@QType(...)` en tests**

### 📚 Voy a escribir documentación

➡️ Consulta: **[README.md](../README.md)**

- Estructura de la documentación
- VitePress para guías
- TypeDoc para API reference

### 🔧 Voy a modificar la configuración

➡️ Consulta: **[contributing.md](../docs-vitepress/en/guide/contributing.md)** (sección Build System)

- tsconfig.json (compilación source)
- tsconfig.test.json (compilación tests)
- tsup.config.ts (bundling)
- Linting: ESLint + Prettier

## �️ Herramientas MCP disponibles

### Validación de código (usar siempre antes de entregar)

| Herramienta            | Cuándo usarla                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `check_project_rules`  | Antes de cualquier entrega — valida id-length, max-params, naming-convention, imports prohibidos, @Quick vs @QType |
| `check_project_health` | Validación completa: lint + typecheck + tests                                                                      |
| `validate_usage`       | Verificar que un snippet sigue las convenciones de QuickModel                                                      |

### Generación

| Herramienta        | Cuándo usarla                                      |
| ------------------ | -------------------------------------------------- |
| `create_model`     | Generar una nueva clase `QModel`                   |
| `generate_mock`    | Generar datos mock para un modelo                  |
| `generate_test`    | Generar boilerplate de test para un archivo fuente |
| `scaffold_feature` | Crear scaffolding para transformer o tool nuevos   |

### Diagnóstico

| Herramienta               | Cuándo usarla                               |
| ------------------------- | ------------------------------------------- |
| `check_jsdocs`            | Detectar exports públicos sin JSDoc         |
| `check_security`          | Ejecutar suite de tests de seguridad        |
| `check_api_compatibility` | Detectar breaking changes en la API pública |

## �📖 Documentación General

- **[../README.md](../README.md)** - Overview del proyecto y features
- **[contributing.md](../docs-vitepress/en/guide/contributing.md)** - Guía completa de desarrollo
- **[docs-vitepress/](../docs-vitepress/)** - Documentación completa bilingüe (EN/ES)
