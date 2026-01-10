# QuickModel Documentation

Documentación completa del proyecto QuickModel.

## 📚 Índice de Documentación

### Para Usuarios

- **[Installation Guide](INSTALLATION.md)** - Guía de instalación y configuración inicial
- **[API Reference](https://cartagogit.github.io/quickmodel/)** - Referencia completa de la API (generada con TypeDoc)
- **[User Guide](https://cartagogit.github.io/quickmodel/guide/getting-started)** - Tutoriales y ejemplos (VitePress)
- **[Dot Notation Guide](DOT-NOTATION.md)** - Guía completa de transformaciones anidadas con dot notation

### Para Desarrolladores

- **[Development Guide (README-DEV.md)](README-DEV.md)** - Guía completa de desarrollo
  - Configuración del entorno
  - Arquitectura SOLID
  - Build system
  - Testing
  - Code style
  - Commits y releases

- **[Semantic Release Setup](SEMANTIC_RELEASE_SETUP.md)** - Configuración de releases automáticos

- **[SOLID Architecture](SOLID-ARCHITECTURE.md)** - Detalles de la arquitectura del proyecto

### Para Contribuidores

- **[Commit Conventions](../.github/COMMIT_CONVENTIONS.md)** - Formato de mensajes de commit
- **[Contributing Guidelines](#)** - Guía para contribuir al proyecto

## 🏗️ Estructura de Documentación

```
docs/
├── README.md                    # Este archivo (índice)
├── README-DEV.md                # Guía de desarrollo completa
├── INSTALLATION.md              # Instalación
├── SOLID-ARCHITECTURE.md        # Arquitectura
├── SEMANTIC_RELEASE_SETUP.md    # Releases
└── (otros archivos .md estáticos)

docs-vitepress/                        # Código fuente de VitePress
├── .vitepress/
│   └── config.ts                # Configuración VitePress
├── index.md                     # Homepage
├── guide/                       # Guías de usuario
│   ├── getting-started.md
│   ├── installation.md
│   ├── quick-start.md
│   └── ...
└── examples/                    # Ejemplos
    └── ...

# Generado por VitePress (git-ignored excepto .md):
docs/.vitepress/                 # Build de VitePress
docs/guide/                      # HTML generado
docs/api/                        # API Reference (TypeDoc)
```

## 🛠️ Generar Documentación

### API Reference (TypeDoc)

```bash
bun run docs:api
```

Genera documentación de la API en `docs/api/` a partir de JSDoc comments.

### User Guide (VitePress)

```bash
# Development server
bun run docs:dev

# Build para producción
bun run docs:build

# Preview del build
bun run docs:preview
```

VitePress lee de `docs-vitepress/` y genera el sitio en `docs/` (configurado en `outDir`).

## 📖 Escribir Documentación

### TypeDoc (API Reference)

Agregar JSDoc comments en el código:

```typescript
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
 * ```
 */
export class BigIntTransformer { ... }
```

### VitePress (Guides)

Crear/editar archivos markdown en `docs-vitepress/`:

```bash
# Crear nueva guía
touch docs-vitepress/guide/my-guide.md

# Agregar al sidebar en docs-vitepress/.vitepress/config.ts
```

### Markdown Estático

Archivos como `README-DEV.md` se mantienen directamente en `docs/` y no son procesados por VitePress.

## 🔗 Enlaces Útiles

- [TypeDoc Documentation](https://typedoc.org/)
- [VitePress Documentation](https://vitepress.dev/)
- [Markdown Guide](https://www.markdownguide.org/)

---

**Nota:** El directorio `docs/` contiene tanto archivos estáticos (.md) como el output generado por VitePress. El `.gitignore` está configurado para ignorar los archivos generados pero mantener los .md estáticos.
