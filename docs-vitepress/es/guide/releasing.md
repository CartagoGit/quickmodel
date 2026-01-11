# Configuración de Semantic Release

## Instrucciones de Configuración

### 1. Crear Token de NPM

1. Ve a [npmjs.com Tokens](https://www.npmjs.com/settings/YOUR_USERNAME/tokens)
2. Crea un nuevo token (Tipo Automation)
3. Copia el token

### 2. Agregar Secretos a GitHub

1. Ve a la configuración de tu repo: `Settings > Secrets and variables > Actions`
2. Agrega un nuevo secreto:
    - Nombre: `NPM_TOKEN`
    - Valor: (pega el token de npm)

### 3. Crear Tag Inicial (IMPORTANTE)

Antes de tu primer release, crea un tag base para evitar que semantic-release analice todos los commits históricos:

```bash
# Crear tag inicial
git tag v1.0.0
git push origin v1.0.0
```

Esto le dice a semantic-release: "Empieza a contar desde aquí". Todos los commits anteriores serán ignorados.

### 4. Flujo de Release

**Antes de hacer merge a main, SIEMPRE ejecuta:**

```bash
bun run release:check
```

Este script:

- ✅ Mostrará commits desde el último tag
- ✅ Analizará tipos de commit (feat, fix, breaking)
- ✅ Calculará la nueva versión esperada
- ✅ Te recordará revisar antes de lanzar

**Luego haz merge y push a main:**

```bash
git checkout main
git merge develop
git push origin main
```

GitHub Actions automáticamente:

1. Ejecutará tests
2. Compilará el proyecto
3. Semantic-release analizará commits desde el último tag
4. Creará nueva versión basada en tipos de commit
5. Actualizará `package.json` y `CHANGELOG.md`
6. Creará git tag
7. Publicará a npm
8. Creará GitHub release

### 5. Formato de Commit

```bash
feat: add new transformer       # → MINOR version (1.0.0 → 1.1.0)
fix: correct serialization bug  # → PATCH version (1.1.0 → 1.1.1)
BREAKING CHANGE: remove API     # → MAJOR version (1.1.1 → 2.0.0)
docs: update README             # → Sin cambio de versión
chore: update dependencies      # → Sin cambio de versión
```

### 6. Skip CI

Si quieres hacer push sin disparar release:

```bash
git commit -m "docs: update [skip ci]"
```

## Referencia Rápida

```bash
# Verificar qué se lanzará
bun run release:check

# Ejecutar tests con coverage
bun run test:coverage

# Build para producción
bun run build

# Merge a main (dispara release)
git checkout main && git merge develop && git push
```

## Archivos de Configuración

- `.releaserc.json` - Config de Semantic-release
- `.github/workflows/release.yml` - Workflow de GitHub Actions
- `scripts/pre-release.sh` - Script de validación pre-release
