# GitHub Copilot Instructions - QuickModel

Este archivo es un **índice de navegación** para consultar la documentación específica según la tarea a realizar.

## � PROHIBICION ABSOLUTA: NUNCA USAR `>` NI `>>` EN TERMINAL

> **REGLA CRITICA - NO NEGOCIABLE:** El operador `>` (y `>>`) en comandos de terminal puede disparar un prompt de aprobacion manual en VS Code. **Esta prohibido en cualquier contexto, sin excepciones.**

**Anti-patrones prohibidos — nunca los generes:**

```bash
# PROHIBIDO — redireccion con > a cualquier ruta
bun run test > ./tmp/output.txt 2>&1
head -503 src/file.ts > /tmp/tmp.ts && mv /tmp/tmp.ts src/file.ts
echo "texto" > archivo.txt
command >> ./tmp/log.txt

# PROHIBIDO — /tmp del sistema operativo (fuera del workspace)
bun run test 2>&1 | tee /tmp/output.txt
cp file.ts /tmp/file.ts
```

**Alternativas correctas:**

```bash
# Capturar output — usar tee con ./tmp/ del proyecto
bun run test:noise 2>&1 | tee ./tmp/output.txt
cat ./tmp/result.txt

# Editar archivos — SIEMPRE usar herramientas de VS Code (create_file, replace_string_in_file)
# NUNCA truncar/editar archivos con head/tail/sed/awk + >
```

**Por que?** VS Code 1.106+ (`chat.tools.terminal.blockDetectedFileWrites`) detecta redirects y puede bloquear escrituras fuera del workspace (`/tmp`). Este proyecto tiene `"blockDetectedFileWrites": false` en `.vscode/settings.json` para desactivarlo, pero el operador `>` sigue prohibido porque edita archivos sin pasar por las herramientas de VS Code (undo, validaciones, working set del chat).

**Regla especifica para editar archivos:** Nunca uses comandos de terminal para editar, truncar o reescribir archivos fuente. Usa **SIEMPRE** `replace_string_in_file`, `create_file` o `edit_notebook_file`. El patron `head -N file > tmp && mv tmp file` esta **prohibido**.

## �📁 REGLA DE ARCHIVOS TEMPORALES — SIEMPRE OBLIGATORIA

**Nunca uses `/tmp` del sistema operativo.** Usa siempre la carpeta `tmp/` del proyecto:

```bash
# ✅ Correcto — usar tee (nunca > para redirigir output)
bun run test:noise 2>&1 | tee ./tmp/output.txt
cat ./tmp/result.txt

# ❌ Incorrecto — redirección > requiere aprobación manual en VS Code
bun run test:noise > ./tmp/output.txt 2>&1

# ❌ Incorrecto — nunca /tmp del sistema
bun run test:noise 2>&1 | tee /tmp/output.txt
```

La carpeta `tmp/` está en `.gitignore` y siempre existe en el proyecto. Úsala para cualquier archivo temporal: resultados de comandos, dumps de TypeScript, outputs de tests, etc.

> **IMPORTANTE:** Usa siempre `| tee ./tmp/archivo.txt` en lugar de `> ./tmp/archivo.txt`. El operador `>` dispara un prompt de aprobación manual en VS Code Copilot aunque el comando esté en la lista de auto-aprobados. `tee` está auto-aprobado y escribe el mismo resultado.

## 🤝 COORDINACIÓN ENTRE AGENTES — OBLIGATORIA

> **REGLA CRÍTICA — SIN EXCEPCIONES:** Antes de modificar **cualquier archivo** del proyecto — ya sea mediante un skill, mediante `replace_string_in_file`, mediante un comando de terminal o de cualquier otra forma — **DEBES registrar tu trabajo en el sistema de coordinación.**

Esto incluye explícitamente:

- Implementar una feature nueva
- Refactorizar código existente (incluye mass-renames como `.$qm` → `.$q*` que tocan cientos de archivos)
- Corregir errores de lint o typecheck
- Actualizar documentación
- Cualquier otra operación de escritura sobre archivos del workspace

**Protocolo obligatorio — siempre, antes del primer cambio:**

1. Llama a `agent_coordinate` con `action: "check"` — verifica qué agentes están activos y qué archivos tienen bloqueados
    - Si `agents[]` no está vacío: **revisa sus cambios antes de empezar** — comprueba qué tienen en staged/unstaged (`git status`, `git diff`). Para un mass-rename es crítico que el otro agente haga commit o stash primero, para que tu rename parta de una base limpia
2. Llama a `agent_coordinate` con `action: "claim"`, tu `agentId`, una descripción de tu `task` y los `files` que vas a modificar
    - Para cambios acotados: `["src/mcp/tools/public/my-tool.ts", "tests/mcp/unit/public/my-tool.test.ts"]`
    - **Para refactors que tocan varios directorios: `["src/**", "tests/**"]`**
    - **Para mass-renames en todo el proyecto: `["src/**", "tests/**", "docs-vitepress/**"]`\*\*
    - **Para operaciones largas (>100 archivos), añade `ttlMs: 1800000` (30 min)** — el TTL por defecto es 2 min
3. Si la respuesta es `conflict: true` → **PARA INMEDIATAMENTE**. No toques ningún archivo. Informa al usuario qué agente tiene el conflicto y espera
4. Al terminar (todos los gates pasan), llama a `agent_coordinate` con `action: "release"` para liberar tu claim

**¿Por qué?** Sin registro, dos agentes que hacen el mismo mass-rename simultáneamente se sobreescriben entre sí y corrompen el código, obligando al usuario a parar ambos manualmente y revertir a mano.

```bash
# Tarea acotada
agent_coordinate claim agentId="copilot-1" task="add email tool" files=["src/mcp/tools/**","tests/mcp/**"]

# Mass-rename o refactor amplio — reclama TODO
agent_coordinate claim agentId="copilot-1" task="rename .$qm to .$q*" files=["src/**","tests/**","docs-vitepress/**"]

# → conflict: false → puedes proceder
# → conflict: true  → PARA y avisa al usuario
```

> **Esta regla está integrada como Step 0 en `quickmodel_implement_feature`, `quickmodel_refactor`, `quickmodel_fix_lint` y `quickmodel_fix_typecheck`.** Si usas esos skills, el Step 0 ya lo recuerda. Si no usas ningún skill (operación directa), aplica el protocolo manualmente antes de la primera escritura.

---

## 🚨 REGLAS DE CÓDIGO — SIEMPRE OBLIGATORIAS

> **Principio fundamental:** Las reglas se aplican **mientras se escribe**, no se parchean después.
> Escribir código que viola una regla y luego corregirlo es **el antipatrón en sí mismo**.
> `check_project_rules` y `bun run check` son herramientas de **confirmación**, no de corrección.

Antes de hacer **cualquier** cambio de código, verifica que el resultado cumple **todas** estas reglas.
Usa la herramienta MCP **`check_project_rules`** para validarlas automáticamente.

### Reglas de tipado (TypeScript strict)

| Regla                      | Detalle                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `strict: true`             | Activo en `tsconfig.json`                                                                                                                                                                                                                                                                                                          |
| `noImplicitAny`            | Todo debe tener tipo explícito o inferible sin `any`                                                                                                                                                                                                                                                                               |
| `strictNullChecks`         | Nunca asumir que un valor no es `null`/`undefined`                                                                                                                                                                                                                                                                                 |
| `noImplicitReturns`        | Todas las ramas de una función deben retornar valor                                                                                                                                                                                                                                                                                |
| `noUncheckedIndexedAccess` | El acceso a arrays/Maps puede ser `undefined`                                                                                                                                                                                                                                                                                      |
| Interfaces → prefijo `I`   | `interface IUser {}` ✅ — `interface User {}` ❌                                                                                                                                                                                                                                                                                   |
| Type aliases → prefijo `I` | `type IStatus = ...` ✅ — `type Status = ...` ❌                                                                                                                                                                                                                                                                                   |
| Path aliases               | Usar `@/core/...`, `@/transformers/...` — **nunca** rutas relativas ni `quickmodel` desde `src/`                                                                                                                                                                                                                                   |
| `as unknown` prohibido     | **No usar `as unknown`** fuera de tests. Si el tipo no se infiere solo, el tipado está mal — arréglalo. `as any` es aún peor: nunca. Si hay un caso realmente justificado (p.ej. simular en un test un valor imposible en runtime), añade `// @quickmodel-rule-ignore: no-as-unknown` en la línea. La norma es: arregla los tipos. |

### Reglas de linting (ESLint)

| Regla                   | Detalle                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `id-length`             | Nombres de variables/parámetros: **mínimo 3 caracteres**                                                       |
| ↳ Excepciones           | `_`, `id`, `on`, `fs`, `cb`, `md`, `ts`, `err` y prefijo `_`                                                   |
| `max-params`            | Máximo **3 parámetros** posicionales por función — usar objeto si hace falta más                               |
| ↳ Excepción             | `src/transformers/` y `src/core/bases/` (contrato `IQTransformer`)                                             |
| `no-restricted-imports` | Prohibido importar `quickmodel` (barrel) desde `src/`                                                          |
| ↳                       | Prohibido importar `@mcp` sin sub-ruta fuera de `src/mcp/` (usar `@mcp/server`, `@mcp/deps`, `@mcp/tools/...`) |
| ↳                       | Dentro de `src/mcp/**`: prohibido importar `zod` directamente — usar `import { z } from '@mcp/deps'`           |
| `no-console`            | No usar `console.log` en `src/` (excepto `mcp-cli.ts` y `server.ts`)                                           |
| Decoradores en tests    | Usar `@Quick({...})` — **nunca** `@QType(...)` en tests                                                        |

### Reglas de documentación y JSDoc

| Regla                         | Detalle                                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSDoc realista                | Describe lo que el código **hace ahora** — no lo que hacía antes ni la intención original                                                                                        |
| `@see` / `@link` válidos      | Cada referencia debe apuntar a un símbolo que existe y cuya relación descrita es correcta                                                                                        |
| `@example` compilable         | El snippet debe funcionar con la **firma actual** de la API                                                                                                                      |
| Propagación al cambiar        | Al renombrar, mover o cambiar el contrato de un símbolo → actualizar **todos** sus JSDoc, `@see` y `@example` en ese mismo commit                                                |
| `description` de tools/skills | `name`, `description` y `title` de `QAbstractTool` y `QAbstractPrompt` son **siempre en inglés** — los lee el agente AI para seleccionar herramientas; inglés = mayor precisión  |
| Sin `es.mcp.ts`               | No existe locale español para MCP — solo `en.mcp.ts`. Las páginas `docs-vitepress/es/mcp/` son documentación **humana** en español que referencia los nombres de tools en inglés |
| EN↔ES sincronizados           | Toda página bajo `docs-vitepress/en/` debe tener su contraparte equivalente en `docs-vitepress/es/` y viceversa                                                                  |
| Sidebar coherente             | Cada entrada en `docs-vitepress/.vitepress/config.ts` (EN y ES) debe apuntar a un archivo que existe con título que coincide                                                     |

### Verificación final — confirmar, no corregir

Ejecuta esto para **confirmar** que el código ya fue escrito correctamente. Si falla, el problema está en cómo se escribió.

```bash
# Confirmación rápida con MCP (estática, sin ejecutar ESLint)
mcp: check_project_rules

# Confirmación completa (lint + typecheck + tests)
bun run check
```

> **Skill preferida para la confirmación final:** `quickmodel_verify_delivery`
> Ejecuta `check_project_health` → `check_project_rules` → `pre_commit_check` en secuencia.
> Si algún gate falla, redirige al skill correcto (`quickmodel_fix_lint`, `quickmodel_fix_typecheck`) en lugar de corregir silenciosamente.

### Revisión de fidelidad — siempre, varias veces

Antes de declarar cualquier tarea como terminada, **relee el objetivo original** y verifica activamente:

1. ¿Se cumplió **exactamente** lo que se pidió, sin omisiones ni interpretaciones libres?
2. ¿Hay algún caso, archivo, export o escenario que se haya pasado por alto?
3. ¿El resultado que se entrega es coherente con el resto del proyecto?

> **Repite esta revisión al menos dos veces.** La primera pasada suele encontrar lo obvio; la segunda encuentra lo que se asumió como correcto sin comprobarlo.
> Si hay duda sobre si algo entra dentro del objetivo — entra. Mejor cubrir de más que dejar un cabo suelto.

---

## 🤖 SKILLS DEL PROYECTO — ÚSALAS SIEMPRE

Este proyecto tiene **skills MCP internas** que encapsulan los workflows correctos.
**Antes de implementar cualquier cosa, invoca la skill correspondiente** en lugar de improvisar el proceso.

> **`quickmodel_implement_feature` es la skill principal.** Toda implementación no trivial debe comenzar invocándola.
> No repliques su lógica manualmente — úsala.

| Situación                                                  | Skill a invocar                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| Vas a implementar cualquier feature, tool, prompt o módulo | **`quickmodel_implement_feature`** — workflow completo de 9 fases       |
| Vas a declarar cualquier trabajo como terminado            | **`quickmodel_verify_delivery`** — gates: tests + lint + tipos + reglas |
| Vas a refactorizar código existente                        | `quickmodel_refactor`                                                   |
| Hay errores de lint que corregir                           | `quickmodel_fix_lint` — no los corrijas manualmente sin esta skill      |
| Hay errores de typecheck que corregir                      | `quickmodel_fix_typecheck` — ídem                                       |
| Vas a convertir una interfaz TypeScript a modelo           | `quickmodel_from_typescript`                                            |
| Vas a depurar un modelo con comportamiento inesperado      | `quickmodel_debug_model`                                                |
| Vas a escribir una guía de documentación                   | `quickmodel_write_guide`                                                |
| Quieres revisar si el código cumple SOLID                  | `quickmodel_apply_solid`                                                |
| Vas a revisar seguridad                                    | `quickmodel_security_review`                                            |
| Acabas de hacer cambios y quieres sincronizar el proyecto  | `quickmodel_sync_project`                                               |
| Quieres auditar coherencia de docs (JSDoc, EN↔ES, sidebar) | `quickmodel_check_docs_coherence`                                       |
| Necesitas ejecutar un script Python / bash / Node externo  | `quickmodel_run_script` — audita, ejecuta e integra el resultado        |

---

## 🔁 **METODOLOGÍA TDD — SIEMPRE**

**REGLA CRÍTICA:** Antes de implementar cualquier funcionalidad nueva:

1. ✅ **PRIMERO:** Escribir el test que falla
2. ✅ **SEGUNDO:** Implementar el código mínimo para que pase — **aplicando todas las reglas de tipado y linting desde el primer carácter**, no después
3. ✅ **TERCERO:** Refactorizar si es necesario
4. ✅ **CUARTO:** Verificar que todos los tests pasan

**Nunca implementes código de producción sin su test correspondiente.**

---

## 📋 ¿Qué vas a hacer?

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

➡️ Invoca primero: **skill `quickmodel_implement_feature`**
➡️ Referencia: **[contributing.md](../docs-vitepress/en/guide/contributing.md)**

- Arquitectura SOLID del proyecto
- Patrones de código
- Uso de path aliases `@/*`
- Estilo: tabs, single quotes, 100 chars
- NO usar barrel files (index.ts)
- **Las reglas se aplican mientras se escribe — `check_project_rules` confirma, no corrige**

### 🧪 Voy a escribir tests

➡️ Consulta: **[contributing.md](../docs-vitepress/en/guide/contributing.md)** (sección Testing)

- Ejecutar: `bun test`
- Coverage: `bun run test:coverage`
- Configuración: tsconfig.test.json
- **Usar `@Quick({...})` — nunca `@QType(...)` en tests**

### 📚 Voy a escribir documentación

➡️ Invoca: **skill `quickmodel_write_guide`** para páginas nuevas
➡️ Audita al final: **skill `quickmodel_check_docs_coherence`**
➡️ Consulta: **[README.md](../README.md)**

- **`name`, `description`, `title` de tools/skills → siempre en inglés** (el agente AI los lee directamente)
- Las páginas `docs-vitepress/es/mcp/` son documentación humana en español que referencia los nombres de tools en inglés — eso es correcto y esperado
- Solo existe `src/mcp/locales/en.mcp.ts` — no hay ni debe haber `es.mcp.ts`
- Toda nueva página en `en/` debe tener su par en `es/` en el mismo commit (y viceversa)
- El sidebar `docs-vitepress/.vitepress/config.ts` debe actualizarse al añadir/eliminar páginas en ambos locales

### 🔧 Voy a modificar la configuración

➡️ Consulta: **[contributing.md](../docs-vitepress/en/guide/contributing.md)** (sección Build System)

- tsconfig.json (compilación source)
- tsconfig.test.json (compilación tests)
- tsup.config.ts (bundling)
- Linting: ESLint + Prettier

---

## 🛠️ Herramientas MCP disponibles

### Validación de código (usar siempre antes de entregar)

| Herramienta            | Cuándo usarla                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `check_project_rules`  | Antes de cualquier entrega — valida id-length, max-params, naming-convention, imports prohibidos, @Quick vs @QType, **no-as-unknown** |
| `check_project_health` | Validación completa: lint + typecheck + tests                                                                                         |
| `validate_usage`       | Verificar que un snippet sigue las convenciones de QuickModel                                                                         |

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

### Corrección guiada (no corregir manualmente sin estas skills)

| Herramienta                | Cuándo usarla                               |
| -------------------------- | ------------------------------------------- |
| `quickmodel_fix_lint`      | Cuando `lint_check` retorna `passed: false` |
| `quickmodel_fix_typecheck` | Cuando `typecheck` retorna `passed: false`  |

---

## 📖 Documentación General

- **[../README.md](../README.md)** - Overview del proyecto y features
- **[contributing.md](../docs-vitepress/en/guide/contributing.md)** - Guía completa de desarrollo
- **[docs-vitepress/](../docs-vitepress/)** - Documentación completa bilingüe (EN/ES)
