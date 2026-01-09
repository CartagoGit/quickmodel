# GitHub Copilot Instructions - QuickModel

Este archivo es un **índice de navegación** para consultar la documentación específica según la tarea a realizar.

## 📋 ¿Qué vas a hacer?

### 🔄 Voy a hacer un commit
➡️ Consulta: **[COMMIT_CONVENTIONS.md](./COMMIT_CONVENTIONS.md)**
- Formato de mensajes (Conventional Commits)
- Tipos de commit y versionado semántico
- Scopes del proyecto
- Ejemplos buenos y malos

### 🚀 Voy a hacer un release
➡️ Consulta: **[../docs/SEMANTIC_RELEASE_SETUP.md](../docs/SEMANTIC_RELEASE_SETUP.md)**
- Workflow de release
- Configuración de tokens
- Comando pre-release: `bun run release:check`
- Proceso automático con GitHub Actions

### 💻 Voy a escribir código
➡️ Consulta: **[../README-DEV.md](../docs/README-DEV.md)**
- Arquitectura SOLID del proyecto
- Patrones de código
- Uso de path aliases `@/*`
- Estilo: tabs, single quotes, 100 chars
- NO usar barrel files (index.ts)

### 🧪 Voy a escribir tests
➡️ Consulta: **[../README-DEV.md](../docs/README-DEV.md)** (sección Testing)
- Ejecutar: `bun test`
- Coverage: `bun run test:coverage`
- Configuración: tsconfig.test.json

### 📚 Voy a escribir documentación
➡️ Consulta: **[../docs/README.md](../README.md)**
- Estructura de la documentación
- VitePress para guías
- TypeDoc para API reference

### 🔧 Voy a modificar la configuración
➡️ Consulta: **[../README-DEV.md](../docs/README-DEV.md)** (sección Build System)
- tsconfig.json (compilación source)
- tsconfig.test.json (compilación tests)
- tsup.config.ts (bundling)
- Linting: ESLint + Prettier

## 📖 Documentación General

- **[../README.md](../README.md)** - Overview del proyecto y features
- **[../docs/README-DEV.md](../docs/README-DEV.md)** - Guía completa de desarrollo
- **[../docs/](../docs/)** - Documentación detallada y guías

