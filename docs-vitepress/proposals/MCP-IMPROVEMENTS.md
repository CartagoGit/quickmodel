# MCP & Skills — Propuestas de Mejora

Documento generado tras auditoría exhaustiva de las 24 tools públicas, 28 tools internas y 27 prompts/skills del servidor MCP de QuickModel.

**Estado del proyecto al generar este documento:**

- `typecheck:src`: 0 errores
- `lint src/mcp/`: 0 errores
- `bun test tests/mcp/`: 747 pass, 0 fail

---

## 🔴 Alta prioridad

### A — `check_api_compatibility`: descripción anémica

**Archivo:** `src/mcp/tools/internal/check-api-compat.tool.ts`

**Problema actual:** La descripción es una sola línea:

```
"Compare current public API exports against a baseline to detect breaking changes."
```

No especifica: qué archivo de baseline usa (`api-manifest.json`), qué tipos de cambios detecta (eliminaciones, renombres, cambios de firma), ni el formato de retorno.

**Propuesta:**

```
'Compare current public API exports against the committed baseline (api-manifest.json) to detect breaking changes. ' +
'Detects: removed exports, renamed symbols, changed function signatures, and new @deprecated annotations. ' +
'Run this before any release or when modifying src/index.ts, src/advanced.ts, or src/types.ts. ' +
'Returns { passed, breaking[], additions[], summary }.'
```

**Esfuerzo:** Bajo (solo descripción + verificar que el campo `breaking[]` realmente existe en el retorno)

---

### B — `scaffold_feature`: sin detalles de qué genera

**Archivo:** `src/mcp/tools/internal/scaffold-feature.tool.ts`

**Problema actual:**

```
"Generate boilerplate for a new transformer or MCP tool, including a paired test skeleton.
 Always call this first when creating a new tool or transformer before writing any code."
```

No indica: qué archivos crea, en qué rutas, qué contiene el skeleton de test, ni qué convenciones sigue.

**Propuesta:**

1. Mejorar descripción para especificar rutas generadas:
    - `transformer` → `src/transformers/my-name.transformer.ts` + `tests/unit/my-name.transformer.test.ts`
    - `tool` → `src/mcp/tools/public/my-name.tool.ts` (o `internal/`) + `tests/mcp/my-name.test.ts`
2. Añadir soporte para `type: "prompt"` y `type: "resource"` en el schema (actualmente solo acepta `"transformer" | "tool"`)

**Esfuerzo:** Medio (descripción + extensión del schema + lógica de prompt/resource en el execute)

---

### C — `sync_docs` / `update_docs_content`: descripciones mínimas y solapamiento

**Archivos:**

- `src/mcp/tools/internal/sync-docs.tool.ts`
- `src/mcp/tools/internal/update-docs.tool.ts`

**Problema actual:**

- `sync_docs`: `"Auto-generate documentation files for Tools and Transformers based on current code."` — sin detalles
- `update_docs_content`: `"Internal tool to run documentation build scripts."` — extremadamente vago

**Problemas adicionales:**

- No queda claro cuándo usar cada una (¿son intercambiables? ¿se complementan?)
- `sync_docs` probablemente ejecuta `scripts/generate-docs.ts` y `scripts/update-bench-docs.ts`, pero no se menciona

**Propuesta:**

1. `sync_docs` → describir exactamente qué archivos regenera y a qué sección de docs afecta
2. `update_docs_content` → describir qué scripts ejecuta y qué secciones de `docs-vitepress/` actualiza
3. Añadir en ambas descripciones una nota de cuándo usar cada una vs la otra

**Esfuerzo:** Bajo-Medio (investigar qué hace cada una + reescribir descripciones)

---

### D — `check_jsdocs`: no documenta su retorno

**Archivo:** `src/mcp/tools/internal/check-jsdocs.tool.ts`

**Problema actual:**

```
"Scan the source code for exported members that are missing JSDoc documentation."
```

Sin información del formato de retorno ni de qué considera "incompleto" (¿solo ausencia total o también falta de `@param`/`@returns`?).

**Propuesta:**

```
'Scan src/ for exported symbols missing JSDoc or with incomplete documentation. ' +
'Flags: (1) exports with no JSDoc block at all, (2) exports with @param or @returns missing. ' +
'Run before any PR to confirm all public API surface is documented. ' +
'Returns { passed, missing[], incomplete[], total, summary }.'
```

**Esfuerzo:** Bajo

---

## 🟡 Media prioridad

### E — `scaffold_feature`: no soporta `prompt` ni `resource`

_(Ver propuesta B — este es el sub-ítem de lógica)_

**Coste/beneficio:** Añadir `"prompt"` y `"resource"` al schema de `scaffold_feature` permite que la skill `quickmodel_implement_feature` use la tool correctamente cuando se le pide crear un nuevo prompt o resource MCP, en lugar de requerir que el agente genere el boilerplate manualmente.

---

### F — `roundtrip`: diff poco accionable cuando s1 ≠ s2

**Archivo:** `src/mcp/tools/public/roundtrip.tool.ts`

**Problema actual:** Cuando la serialización no es idempotente (`lossless: false`), el campo `diff` devuelve los dos strings serializados completos. Con modelos grandes esto es difícil de leer — el agente debe comparar manualmente los dos JSONs.

**Propuesta:** Cuando `lossless: false`, generar un diff por campo:

```json
{
	"lossless": false,
	"diff": {
		"changed": {
			"birthDate": {
				"s1": "2024-01-01T00:00:00.000Z",
				"s2": "Mon Jan 01 2024"
			}
		},
		"added": {},
		"removed": {}
	}
}
```

**Esfuerzo:** Medio (modificar el execute + añadir helper de diff por clave)

---

### G — `list_validators`: descripción escueta y retorno no documentado

**Archivo:** `src/mcp/tools/public/list-validators.tool.ts`

**Problema actual:**

```
"List all built-in validator decorators available in QuickModel (e.g., @IsEmail, @Min, @MaxLength)."
```

No documenta: qué información se devuelve por validator (¿solo nombre? ¿también parámetros, tipo objetivo, mensaje por defecto?), ni el formato del retorno.

**Propuesta:**

```
'List all built-in @QRule-compatible validator decorators registered in QuickModel. ' +
'Returns metadata per validator: name, description, target field types, and accepted parameters. ' +
'Use this to discover which validators apply to a given field type before writing @QRule predicates. ' +
'Returns { validators[] } — sorted list with name, targetTypes[], and parameterCount.'
```

**Esfuerzo:** Bajo (verificar qué devuelve realmente la tool + ajustar descripción)

---

### H — `check-doc-drift`: heurística frágil sin documentar su limitación

**Archivo:** `src/mcp/tools/internal/check-doc-drift.tool.ts`

**Problema actual:** La descripción menciona "heuristic" pero no explica cuándo puede dar falsos positivos (refactors que solo mueven código sin cambiar semántica, renombres de variables).

**Propuesta:** Añadir al final de la descripción:

```
'Note: this is a line-count heuristic — it may report false positives for pure refactors ' +
'(moves, renames). A result here is a candidate for review, not a confirmed gap.'
```

**Esfuerzo:** Muy bajo

---

### I — `patch_jsdoc`: no soporta batch (un símbolo por llamada)

**Archivo:** `src/mcp/tools/internal/patch-jsdoc.tool.ts`

**Problema actual:** Solo acepta un `symbolName` por invocación. Cuando `check_jsdocs` reporta 10 símbolos sin documentar, el agente debe invocar `patch_jsdoc` 10 veces secuencialmente.

**Propuesta:** Añadir un modo `action="batch"` que acepte un array de `{ symbolName, jsdoc }` y aplique todos los cambios en un solo pass del archivo.

```typescript
// Extensión del schema
action: z.union([
  z.literal('add'),
  z.literal('update'),
  z.literal('remove'),
  z.literal('batch'),   // ← nuevo
]),
batch: z.array(z.object({
  symbolName: z.string(),
  jsdoc: z.string(),
})).optional(),
```

**Esfuerzo:** Medio-Alto

---

### J — `quickmodel_integrate` debería ser `QAbstractInternalPrompt`

**Archivo:** `src/mcp/prompts/public/integrate.prompt.ts`

**Problema actual:** El skill `quickmodel_integrate` extiende `QAbstractPrompt` (skills user-facing, visibles en el servidor público). Sin embargo, su flujo — analizar tipos de una librería, generar DTOs, escribir tests de integración — es un workflow de desarrollo, equivalente a `quickmodel_implement_feature` que extiende `QAbstractInternalPrompt`.

**Propuesta:** Mover a `QAbstractInternalPrompt`. Evaluar si debe moverse también a `src/mcp/prompts/internal/` o si es correcto mantenerlo en `public/` pero con la clase base interna.

**Impacto:** Este skill aparece en el servidor público MCP cuando probablemente debería estar reservado para agentes de desarrollo.

**Esfuerzo:** Bajo (cambiar import + clase base + tests)

---

### K — `validate-usage`: no detecta `@QField` con `label` que no es string

**Archivo:** `src/mcp/tools/public/validate-usage.tool.ts`

**Problema:** El check de `@QField` verifica que exista junto a `@QRule`, pero no detecta errores comunes como:

- `@QField({ label: undefined })` — label no inicializado
- `@QField({ type: 'number' })` con campo declarado como `declare name: string` — mismatch de tipo

**Propuesta:** Añadir al menos:

1. Detección de `@QField` con `label` ausente (pattern: `@QField({` sin `label:`)
2. Warning cuando `@QField({ type: 'X' })` y el tipo del `declare` no coincide

**Esfuerzo:** Medio

---

## 🟢 Baja prioridad / Mejoras de calidad

### L — Resources: verificar actualización con los 13 formatos de schema

**Archivos:**

- `src/mcp/resources/api-reference.resource.ts`
- `src/mcp/resources/project-state.resource.ts`

**Pendiente:** Verificar que `api-reference.resource.ts` lista los 13 formatos soportados (`json, openapi, zod, mongo, typescript, graphql, ajv, prisma, valibot, yup, drizzle, typebox, effect-schema`) y no solo los 12 originales (se añadió `effect-schema` en esta sesión de auditoría).

Verificar que `project-state.resource.ts` refleja las 28 tools internas actuales (2 fueron registradas en esta sesión).

**Esfuerzo:** Muy bajo

---

### M — Tests de integración para tools de docs

**Archivos:**

- `src/mcp/tools/internal/add-to-sidebar.tool.ts`
- `src/mcp/tools/internal/create-guide-page.tool.ts`
- `src/mcp/tools/internal/sync-docs.tool.ts`

**Problema:** Estas tres tools modifican archivos del sistema (`docs-vitepress/.vitepress/config.ts`, archivos `.md`). Sus tests actuales (si existen) probablemente mockean el filesystem con `_fs`. Conviene revisar si los tests cubren:

- El caso en que la sección del sidebar no existe (graceful fail)
- El caso en que el archivo `.md` de destino ya existe (no sobreescribir)
- La paridad EN/ES (ambos archivos creados o ninguno)

**Esfuerzo:** Medio

---

### N — `explain_error`: ampliar casos de error documentados

**Archivo:** `src/mcp/tools/public/explain-error.tool.ts`

_(Nota: ya mejorado en esta sesión con COERCION_FAILED, RULE_FAILED, RULE_ASYNC_FAILED)_

**Siguiente nivel:** Añadir soporte para errores de Zod nativos que puedan propagarse cuando se usa `QModel` con validación adicional, y para `INTEGRITY_ERROR` que emite `check-integrity`.

**Esfuerzo:** Bajo

---

### O — `simulate_transformation`: documentar comportamiento con nested QModel

**Archivo:** `src/mcp/tools/public/simulate-transformation.tool.ts`

**Problema:** La descripción menciona "nested QModel subclasses" como tipo soportado, pero no explica cómo se deben pasar (¿como nombre de clase string? ¿como código completo de la clase?). Esto genera confusión cuando el agente intenta simular un modelo con relaciones.

**Propuesta:** Añadir un ejemplo en la descripción o en el `@example` JSDoc:

```
'Nested models: pass the class name as the token — e.g. { user: "UserModel" }. ' +
'The tool will attempt to resolve the type from a registered model registry if available.'
```

Y actualizar el JSDoc con un `@example` que muestre nested models.

**Esfuerzo:** Bajo

---

### P — Locale `en.mcp.ts`: añadir categorías de tools para documentación

**Archivo:** `src/mcp/locales/en.mcp.ts`

**Problema:** El locale actual solo tiene labels de UI básicos. Las 51 tools y 27 prompts no están agrupadas por categoría, lo que dificulta generar documentación de referencia categorizada.

**Propuesta:** Añadir un bloque `toolCategories` al locale:

```typescript
toolCategories: {
  generation: ['create_model', 'json_to_model', 'interface_to_model', 'generate_mock', 'scaffold_feature'],
  validation: ['validate_usage', 'check_integrity', 'simulate_validation', 'simulate_rules', 'simulate_async_rules'],
  schema: ['get_model_schema', 'export_schema', 'get_form_schema'],
  docs: ['search_docs', 'add_to_sidebar', 'create_guide_page', 'sync_docs'],
  diagnostics: ['inspect_model', 'explain_error', 'explain_transformation', 'debug_model'],
  analysis: ['check_api_compatibility', 'check_bundle_size', 'check_doc_drift', 'coverage_report'],
}
```

**Esfuerzo:** Bajo (solo datos, sin lógica)

---

## 📊 Resumen ejecutivo

| ID  | Área                                           | Prioridad | Esfuerzo   | Tipo                 |
| --- | ---------------------------------------------- | --------- | ---------- | -------------------- |
| A   | `check_api_compatibility` descripción          | Alta      | Bajo       | Descripción          |
| B   | `scaffold_feature` descripción + tipos         | Alta      | Medio      | Descripción + Lógica |
| C   | `sync_docs` / `update_docs_content`            | Alta      | Bajo-Medio | Descripción          |
| D   | `check_jsdocs` retorno no documentado          | Alta      | Bajo       | Descripción          |
| E   | `scaffold_feature` sin soporte prompt/resource | Media     | Medio      | Lógica               |
| F   | `roundtrip` diff poco accionable               | Media     | Medio      | Lógica               |
| G   | `list_validators` descripción escueta          | Media     | Bajo       | Descripción          |
| H   | `check_doc_drift` heurística sin advertencia   | Media     | Muy bajo   | Descripción          |
| I   | `patch_jsdoc` sin modo batch                   | Media     | Medio-Alto | Lógica               |
| J   | `quickmodel_integrate` clase base incorrecta   | Media     | Bajo       | Arquitectura         |
| K   | `validate_usage` checks adicionales            | Media     | Medio      | Lógica               |
| L   | Resources desactualizados                      | Baja      | Muy bajo   | Datos                |
| M   | Tests tools de docs                            | Baja      | Medio      | Tests                |
| N   | `explain_error` ampliar errores                | Baja      | Bajo       | Lógica               |
| O   | `simulate_transformation` nested docs          | Baja      | Bajo       | Descripción          |
| P   | Locale categorías de tools                     | Baja      | Bajo       | Datos                |

**Propuestas accionables inmediatas (esfuerzo bajo, impacto alto):** A, D, G, H, L, O
**Propuestas de mayor impacto en usabilidad del agente:** B, F, I, J
