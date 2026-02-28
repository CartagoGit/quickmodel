# Skills MCP Internos (Mantenedores)

> [!WARNING]
> ⚠️ **Solo Uso Interno**: Estos skills son para **contribuidores de QuickModel**. Dependen de las [Herramientas Internas](./index) y aplican las reglas del proyecto (ciclos TDD, lint, typecheck, convenciones de naming) automáticamente. No son útiles para desarrolladores que instalan el paquete vía npm.

Los **skills** (también llamados **prompts**) son flujos de trabajo de IA guiados construidos sobre herramientas MCP. Los skills de mantenimiento orquestan herramientas internas para guiar a la IA a través de flujos completos de contribución — aplicando TDD, puertas de lint y typecheck, y sincronización de documentación de forma automática.

::: tip Cuándo usar un skill de mantenimiento
Usa estos skills cuando **trabajas en el código base de QuickModel**: implementando una funcionalidad, corrigiendo errores de lint/typecheck, refactorizando, aplicando principios SOLID o sincronizando el estado del proyecto y la documentación.
:::

---

## Skills Disponibles

| Nombre del skill                                                | Título                              | Descripción                                                                  |
| --------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| [`quickmodel_implement_feature`](#quickmodel_implement_feature) | Implementar Funcionalidad (TDD)     | Ciclo TDD completo con puertas `lint_check` + `typecheck`                    |
| [`quickmodel_fix_lint`](#quickmodel_fix_lint)                   | Corregir Errores ESLint             | Corrección guiada con puertas `lint_check` + `pre_commit_check`              |
| [`quickmodel_fix_typecheck`](#quickmodel_fix_typecheck)         | Corregir Errores de Tipos TS        | Corrección TS guiada con puertas `typecheck` + `pre_commit_check`            |
| [`quickmodel_refactor`](#quickmodel_refactor)                   | Refactor Seguro (con puertas TDD)   | Ciclo de refactor con puertas `run_tests`, `lint_check`, `typecheck`         |
| [`quickmodel_apply_solid`](#quickmodel_apply_solid)             | Aplicar Principios SOLID (guiado)   | Revisión por principio con puertas `run_tests`, `lint_check`, `typecheck`    |
| [`quickmodel_sync_project`](#quickmodel_sync_project)           | Sincronizar Proyecto (salud + docs) | Snapshot `project_status` → corregir fallos → regenerar docs con `sync_docs` |

---

## `quickmodel_implement_feature`

**Ciclo TDD completo para cualquier funcionalidad nueva de QuickModel, con puertas obligatorias de lint y typecheck.**

Este skill conduce a la IA por el bucle completo rojo‑verde‑refactor, reforzado por tres puertas automatizadas: `lint_check`, `typecheck` y `check_project_rules`. La IA **no puede** declarar la funcionalidad terminada hasta que las tres puertas devuelvan `passed: true`.

### Argumentos

| Argumento             | Obligatorio | Descripción                                                                 |
| --------------------- | ----------- | --------------------------------------------------------------------------- |
| `feature_description` | ✅ Sí       | Descripción en lenguaje natural de la funcionalidad a implementar           |
| `file_paths`          | ✗ No        | Lista separada por espacios de archivos a lintear (por defecto todo `src/`) |

### Flujo de trabajo

1. 🔴 **Rojo** — Escribe un test que falla describiendo el comportamiento esperado
2. 🟢 **Verde** — Implementa el código mínimo para que el test pase
3. 🚦 **Puerta lint_check** — Ejecuta `lint_check`; bloquea hasta `passed: true`
4. 🚦 **Puerta typecheck** — Ejecuta `typecheck`; bloquea hasta `passed: true`
5. 🚦 **Puerta check_project_rules** — Verifica naming, id-length, max-params, etc.
6. ✅ **Hecho** — Solo se declara terminado cuando las tres puertas pasan

### Herramientas llamadas internamente

1. `run_tests` — valida el test rojo (fallido) y la implementación verde (pasando)
2. `lint_check` — bloquea en violaciones ESLint tras la implementación
3. `typecheck` — bloquea en errores de tipos TypeScript
4. `check_project_rules` — aplica naming, id-length, max-params y reglas de imports

### Ejemplo

```
feature_description: "Añadir un QTypecheckTool que ejecute tsc --noEmit y devuelva errores parseados"
file_paths: "src/mcp/tools/internal/typecheck.tool.ts"

→ IA escribe tests/mcp/unit/internal/typecheck.test.ts (rojo)
→ IA crea src/mcp/tools/internal/typecheck.tool.ts (verde)
→ IA llama a lint_check({ targetFiles: ["src/mcp/tools/internal/typecheck.tool.ts"] })
→ IA llama a typecheck({})
→ IA llama a check_project_rules()
→ Todo pasa → funcionalidad declarada terminada
```

---

## `quickmodel_fix_lint`

**Corrección guiada paso a paso de errores ESLint tras un fallo del pre-commit hook o cuando `lint_check` devuelve `passed: false`.**

Explica cada violación en lenguaje llano, aplica la corrección mínima correcta respetando las reglas del proyecto (id-length, max-params, no-implied-eval, require-await, etc.), llama a `lint_check` tras cada cambio, y solo declara terminado cuando `pre_commit_check` devuelve `{ passed: true }`.

### Argumentos

| Argumento     | Obligatorio | Descripción                                                                                  |
| ------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `lint_errors` | ✅ Sí       | Texto completo de los errores ESLint: de `lint_check`, `pre_commit_check` o el hook de Husky |
| `file_paths`  | ✗ No        | Lista de archivos a re-verificar separados por comas (por defecto `src/`)                    |

### Flujo de trabajo

1. Parsea cada error del `lint_errors`
2. Explica la regla violada
3. Aplica la corrección mínima correcta
4. Ejecuta `lint_check` tras cada edición — bloquea hasta `passed: true`
5. Ejecuta `pre_commit_check` como puerta final
6. Solo se declara terminado cuando `pre_commit_check` devuelve `{ passed: true }`

### Herramientas llamadas internamente

1. `lint_check` — re-ejecuta ESLint tras cada corrección para confirmar que no se introducen nuevas violaciones
2. `pre_commit_check` — puerta final: lint + typecheck de archivos staged en un solo paso

### Ejemplo

```
lint_errors: """
/src/mcp/tools/public/diff-models.tool.ts
  169:10  error  Identifier name 'tA' is too short (< 3)  id-length
  170:10  error  Identifier name 'tB' is too short (< 3)  id-length
"""
file_paths: "src/mcp/tools/public/diff-models.tool.ts"

→ IA explica: id-length requiere nombres ≥ 3 chars
→ IA renombra: tA → valA, tB → valB
→ IA llama a lint_check({ targetFiles: ["src/mcp/tools/public/diff-models.tool.ts"] })
→ lint_check devuelve { passed: true }
→ IA llama a pre_commit_check({ files: ["src/mcp/tools/public/diff-models.tool.ts"] })
→ pre_commit_check devuelve { passed: true } → hecho
```

---

## `quickmodel_fix_typecheck`

**Resolución guiada paso a paso de errores de tipos TypeScript cuando `typecheck` devuelve `passed: false`.**

Explica cada código de error TS en lenguaje claro, aplica la corrección mínima de tipos (nunca `as any`), llama a `typecheck` tras cada lote de cambios, y solo declara hecho cuando `typecheck` Y `pre_commit_check` devuelvan `{ passed: true }`.

### Argumentos

| Argumento     | Requerido | Descripción                                                                                |
| ------------- | --------- | ------------------------------------------------------------------------------------------ |
| `type_errors` | ✅ Sí     | Texto completo del output de errores de TypeScript de `typecheck` o del CLI `tsc`          |
| `file_paths`  | ✗ No      | Lista de archivos separada por comas en los que enfocarse (por defecto el `src/` completo) |

### Referencia rápida de errores TS comunes

| Código | Significado                          | Estrategia de corrección                                               |
| ------ | ------------------------------------ | ---------------------------------------------------------------------- |
| TS2322 | Tipo incompatible (asignabilidad)    | Alinea los tipos; nunca uses `as any`                                  |
| TS2339 | La propiedad no existe en el tipo    | Añade la propiedad a la interfaz; usa optional chaining si es correcto |
| TS7006 | Parámetro con `any` implícito        | Añade anotación de tipo explícita al parámetro                         |
| TS2345 | Tipo de argumento incompatible       | Corrige el argumento o la firma de la función                          |
| TS2531 | El objeto puede ser null             | Añade verificación de null; usa optional chaining si aplica            |
| TS2304 | No se puede encontrar el nombre      | Importa el símbolo; verifica el alias de ruta (`@/core/...`)           |
| TS2554 | Se esperaban N args, se recibieron M | Corrige el punto de llamada o actualiza la firma                       |

### Flujo de trabajo

1. Parsear cada error de `type_errors`
2. Identificar el código TS → explicar la causa raíz
3. Aplicar la corrección mínima correcta (sin `any`, sin supresiones)
4. Llamar a `typecheck({})` tras cada lote — bloquear hasta `passed: true`
5. Llamar a `pre_commit_check` como puerta final
6. Solo se declara hecho cuando ambos devuelven `{ passed: true }`

### Herramientas llamadas internamente

1. `typecheck` — re-ejecuta `tsc --noEmit` tras cada lote de correcciones
2. `pre_commit_check` — puerta final: lint + typecheck de archivos staged en un solo paso

### Ejemplo

```
type_errors: """
src/mcp/tools/internal/my-tool.ts(15,5): error TS2322: Type 'string' is not assignable to type 'number'.
"""

→ IA explica: variable declarada como number pero se le asigna un string literal
→ IA corrige: cambia la anotación de tipo
→ IA llama a typecheck({})
→ typecheck devuelve { passed: true }
→ IA llama a pre_commit_check({ files: ["src/mcp/tools/internal/my-tool.ts"] })
→ pre_commit_check devuelve { passed: true } → hecho
```

---

## `quickmodel_refactor`

**Ciclo de refactoring seguro con puertas TDD — garantiza que no hay regresiones y que se cumplen todas las reglas del proyecto.**

Establece una línea base verde de tests, aplica el refactor y luego verifica con `run_tests` + `lint_check` + `typecheck` + `check_project_rules` antes de declarar hecho.

### Argumentos

| Argumento     | Requerido | Descripción                                                                                    |
| ------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `description` | ✅ Sí     | Qué debe refactorizarse y el objetivo (p. ej. "Extraer parseOutput a un helper privado")       |
| `file_paths`  | ✗ No      | Lista de archivos objetivo separada por comas (la IA los infiere de `description` si se omite) |

### Puertas (en orden)

| Puerta                | Qué verifica                                   |
| --------------------- | ---------------------------------------------- |
| `run_tests` (antes)   | Línea base verde — todos los tests pasan antes |
| `run_tests` (después) | No se introducen regresiones                   |
| `lint_check`          | Sin violaciones de ESLint                      |
| `typecheck`           | Sin errores de tipos TypeScript                |
| `check_project_rules` | id-length, max-params, naming, imports         |

### Flujo de trabajo

1. Llamar a `run_tests` → confirmar línea base verde
2. Aplicar el refactor
3. Llamar a `run_tests` de nuevo → sin regresiones
4. Llamar a `lint_check` → `passed: true`
5. Llamar a `typecheck({})` → `passed: true`
6. Llamar a `check_project_rules` → cero violaciones
7. Solo se declara hecho cuando todas las puertas pasan

### Herramientas llamadas internamente

1. `run_tests` — establece línea base verde y verifica que no hay regresiones tras el refactor
2. `lint_check` — verifica que no se introducen violaciones ESLint
3. `typecheck` — verifica que no se introducen errores de tipos TypeScript
4. `check_project_rules` — aplica id-length, max-params, naming y reglas de imports

### Ejemplo

```
description: "Extraer los métodos parseCount y parseFailures de QRunTestsTool a una clase helper privada"
file_paths: "src/mcp/tools/internal/run-tests.tool.ts"

→ IA llama a run_tests() → 489 pass, 0 fail (línea base)
→ IA extrae los métodos a la clase RunTestsParser
→ IA llama a run_tests() → sigue 489 pass, 0 fail
→ IA llama a lint_check({ targetFiles: ["src/mcp/tools/internal/run-tests.tool.ts"] })
→ lint_check devuelve { passed: true }
→ IA llama a typecheck({}) → { passed: true }
→ IA llama a check_project_rules() → cero violaciones → hecho
```

---

## `quickmodel_apply_solid`

**Revisión guiada de principios SOLID con refactors dirigidos y verificación obligatoria.**

Analiza los archivos contra los 5 principios SOLID (SRP, OCP, LSP, ISP, DIP), propone mejoras concretas y verifica cada cambio con `run_tests`, `lint_check` y `typecheck`.

### Argumentos

| Argumento    | Requerido | Descripción                                                                                |
| ------------ | --------- | ------------------------------------------------------------------------------------------ |
| `file_paths` | ✅ Sí     | Lista de archivos fuente separada por comas (p. ej. `"src/mcp/tools/internal/my-tool.ts"`) |
| `concern`    | ✗ No      | Problema SOLID ya identificado (p. ej. `"Violación SRP: la clase maneja parseo e IO"`)     |

### Referencia de Principios SOLID

| Principio              | Código  | Qué verificar                                                          | Solución habitual                            |
| ---------------------- | ------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| Responsabilidad Única  | **SRP** | ¿Cada clase tiene exactamente UN motivo de cambio?                     | Separar en clases/helpers distintos          |
| Abierto/Cerrado        | **OCP** | ¿Se puede extender sin modificar código existente?                     | Bases abstractas, patrón strategy            |
| Sustitución Liskov     | **LSP** | ¿Los subtipos pueden reemplazar a la base sin romper llamadores?       | No redefinir para lanzar; preservar contrato |
| Segregación Interfaces | **ISP** | ¿Las interfaces son compactas? ¿Dependen de métodos no usados?         | Dividir interfaces grandes                   |
| Inversión Dependencias | **DIP** | ¿Los módulos de alto nivel dependen de abstracciones, no concreciones? | Inyectar vía interfaz; inyección constructor |

### Puertas (en orden, tras cada cambio)

| Puerta       | Qué verifica                    |
| ------------ | ------------------------------- |
| `run_tests`  | Sin regresiones                 |
| `lint_check` | Sin violaciones ESLint          |
| `typecheck`  | Sin errores de tipos TypeScript |

### Flujo de trabajo

1. Llamar a `run_tests` → confirmar línea base verde
2. Revisar SRP → extraer si hace falta → ejecutar puertas
3. Revisar OCP → introducir abstracciones → ejecutar puertas
4. Revisar LSP → corregir overrides → ejecutar puertas
5. Revisar ISP → dividir interfaces → ejecutar puertas
6. Revisar DIP → reemplazar `new Concreto()` con abstracciones inyectadas → ejecutar puertas
7. Solo se declara hecho cuando todas las puertas pasan

### Herramientas llamadas internamente

1. `run_tests` — establece línea base verde y verifica que no hay regresiones tras cada cambio
2. `lint_check` — verifica que no hay violaciones ESLint tras cada cambio
3. `typecheck` — verifica que no hay errores de tipos TypeScript tras cada cambio

### Ejemplo

```
file_paths: "src/mcp/tools/internal/my-tool.ts"
concern: "La clase gestiona tanto la petición HTTP como el parseo JSON — violación SRP"

→ IA llama a run_tests() → línea base verde
→ IA extrae el parser en una clase helper privada
→ IA llama a run_tests() → sigue verde
→ IA llama a lint_check() → { passed: true }
→ IA llama a typecheck({}) → { passed: true } → hecho
```

---

## `quickmodel_sync_project`

**Sincronización completa del proyecto — mantiene tests, lint, typecheck y documentación al día.**

Llama a `project_status` para obtener un snapshot consolidado del estado, corrige los fallos detectados y regenera la documentación con `sync_docs`. Úsalo tras completar una funcionalidad, refactor o un lote de cambios.

### Argumentos

_Ninguno requerido._

### Puertas (en orden)

| Puerta           | Qué verifica                                         |
| ---------------- | ---------------------------------------------------- |
| `project_status` | Snapshot consolidado: tests + lint + typecheck       |
| `run_tests`      | Corregir hasta `passed: true` si los tests fallan    |
| `lint_check`     | Corregir hasta `passed: true` si hay errores lint    |
| `typecheck`      | Corregir hasta `passed: true` si hay errores TS      |
| `sync_docs`      | Regenerar referencia API y archivos de documentación |

### Flujo de trabajo

1. Llamar a `project_status` → obtener snapshot del estado actual
2. Si los tests fallan → diagnosticar y corregir → re-ejecutar `run_tests` hasta `passed: true`
3. Si hay errores lint → corregir violaciones → re-ejecutar `lint_check` hasta `passed: true`
4. Si hay errores typecheck → corregir errores TS → re-ejecutar `typecheck` hasta `passed: true`
5. Llamar a `sync_docs` → regenerar documentación
6. Llamar a `project_status` de nuevo → confirmar `passed: true` en todos los checks
7. Solo se declara hecho cuando todas las capas están en verde y la documentación regenerada

### Herramientas llamadas internamente

1. `project_status` — snapshot consolidado del estado (tests + lint + typecheck)
2. `run_tests` — corregir fallos hasta `passed: true`
3. `lint_check` — corregir violaciones hasta `passed: true`
4. `typecheck` — corregir errores TS hasta `passed: true`
5. `sync_docs` — regenerar referencia API y archivos de documentación

### Ejemplo

```
→ IA llama a project_status() → { passed: false, tests: { passed: true }, lint: { passed: false }, typecheck: { passed: true } }
→ IA corrige las violaciones lint
→ IA llama a lint_check() → { passed: true }
→ IA llama a sync_docs() → "Actualizados 6 archivos de documentación correctamente"
→ IA llama a project_status() → { passed: true } → hecho
```
