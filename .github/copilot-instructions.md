# GitHub Copilot Instructions - QuickModel

Este archivo es un **índice de navegación** para consultar la documentación específica según la tarea a realizar.

## � **METODOLOGÍA TDD - SIEMPRE**

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

### 🧪 Voy a escribir tests

➡️ Consulta: **[contributing.md](../docs-vitepress/en/guide/contributing.md)** (sección Testing)

- Ejecutar: `bun test`
- Coverage: `bun run test:coverage`
- Configuración: tsconfig.test.json

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

## 📖 Documentación General

- **[../README.md](../README.md)** - Overview del proyecto y features
- **[contributing.md](../docs-vitepress/en/guide/contributing.md)** - Guía completa de desarrollo
- **[docs-vitepress/](../docs-vitepress/)** - Documentación completa bilingüe (EN/ES)
