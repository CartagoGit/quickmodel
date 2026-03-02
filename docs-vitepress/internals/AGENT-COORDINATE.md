# agent_coordinate — Diseño e implementación

> **Documentación interna** — no se publica en la web. Describe el diseño completo del sistema de coordinación entre agentes AI paralelos.

---

## Propósito

Cuando hay varios agentes AI trabajando en el mismo workspace (p. ej. tres ventanas de VS Code abiertas en el mismo repositorio, cada una con su agente Copilot), existe riesgo de que dos agentes editen los mismos archivos al mismo tiempo y se sobreescriban mutuamente.

`agent_coordinate` es una herramienta MCP **interna** (solo para el servidor del propio repositorio QuickModel) que implementa un registro compartido en `tmp/agent-registry.json`. Antes de empezar cualquier tarea, el agente declara qué archivos va a tocar; si hay conflicto con otro agente activo, recibe un error y puede esperar o forzar la toma si el otro crasheó.

---

## Acciones disponibles

| Acción    | Cuándo usarla                                                                               |
| --------- | ------------------------------------------------------------------------------------------- |
| `check`   | **Siempre primero.** Lista todos los agentes activos y sus archivos.                        |
| `claim`   | Registra la tarea + archivos que va a tocar. Devuelve `conflict: true` si hay solapamiento. |
| `release` | Libera el claim al terminar o abortar.                                                      |
| `update`  | Heartbeat manual — renueva el TTL para tareas largas (cada ~15 min).                        |
| `purge`   | Limpia claims atascados sin esperar el TTL.                                                 |

---

## Campos de cada entrada en el JSON

```json
{
	"agentId": "copilot-session-1",
	"task": "actualizar guias de documentacion",
	"files": ["docs-vitepress/en/**", "docs-vitepress/es/**"],
	"startedAt": "2026-03-01T10:00:00.000Z",
	"updatedAt": "2026-03-01T10:04:30.000Z",
	"expiresAt": "2026-03-01T10:05:00.000Z"
}
```

| Campo       | Descripción                                                                |
| ----------- | -------------------------------------------------------------------------- |
| `agentId`   | Identificador único del agente (libre, p. ej. `copilot-session-1`)         |
| `task`      | Título corto de lo que está haciendo                                       |
| `files`     | Paths o globs de los archivos que bloquea (detección de solape glob-aware) |
| `startedAt` | Cuándo se creó el claim (se preserva en re-claims)                         |
| `updatedAt` | Último heartbeat — usado por `force` para detectar crashes                 |
| `expiresAt` | Cuándo expira automáticamente si no hay más heartbeats                     |

---

## Ficheros en disco

```
tmp/
  agent-registry.json       ← registro activo (JSON plano)
  agent-registry.json.lock  ← centinela atómico de escritura (ver abajo)
  agent-status.md           ← tabla legible por humanos, actualizada en cada operación
```

El `tmp/` está en `.gitignore` — nunca se commitea.

---

## Detección de conflictos (glob-aware)

La detección no es por string exacto sino por prefijo de base:

```
src/**          vs  src/core/qm.ts       → conflicto ✅
docs/en/**      vs  docs/es/**           → sin conflicto ✅
*.ts            vs  src/cualquier.ts     → conflicto ✅ (root glob = todo)
src/a.ts        vs  src/b.ts            → sin conflicto ✅
```

Función clave: `patternsOverlap(patA, patB)` → conservadora (prefiere falso positivo sobre falso negativo).

---

## TTL, ticker y heartbeat implícito

- TTL por defecto: **30 minutos** (`DEFAULT_TTL_MS = 30 * 60 * 1000`)
- **El ticker es el mecanismo principal de keepalive**: mientras el proceso MCP esté vivo (VS Code abierto), el ticker corre cada 60 s y renueva automáticamente el `expiresAt` de todos los agentes activos al llamar a `claim` al inicio de la sesión, el agente queda registrado y vivo sin necesitar `update` explícito
- Si `check` se llama con `agentId` válido, también renueva el TTL de ese agente (heartbeat implícito)
- TTL personalizable por claim con el campo `ttlMs` (máx. 7 200 000 ms = 2 h)

### ¿Qué pasa cuando VS Code se reinicia?

1. El proceso MCP muere → el ticker se para
2. El archivo `tmp/agent-registry.json` queda congelado en disco tal como estaba
3. Las entradas **no se borran automáticamente** — persisten hasta que `execute()` las lee y las purga por expiradas
4. Cuando VS Code vuelve a arrancar y el agente reanuda trabajo, **debe llamar a `claim` de nuevo** con su `agentId`:
    - Si la entrada todavía existe en disco (no expiró → la purga no la limpió), `re-claim` preserva `startedAt` y renueva TTL
    - Si expiró y fue purgada, `claim` crea una entrada nueva
    - En ambos casos el resultado es el mismo: el agente queda correctamente registrado y el nuevo ticker empieza a renovarle el TTL

**El re-claim es completamente idempotente — siempre es seguro llamarlo al inicio de cada sesión.**

> **Regla de oro:** En cualquier sesión nueva o tras cualquier reinicio de VS Code, lo primero que debe hacer un agente es llamar a `agent_coordinate claim` con su `agentId` y tarea. Sin ese call, el ticker no registra al agente y su trabajo queda invisible para el sistema de coordinación.

---

## Protocolo para mass-renames y refactors amplios

Un mass-rename (p. ej. renombrar métodos legacy a prefijo `$q*` en todo el proyecto) puede tocar cientos de archivos en `src/`, `tests/` y `docs-vitepress/` simultáneamente. Es el caso **más peligroso** de conflicto entre agentes: si dos agentes hacen el mismo rename en paralelo, el último en escribir sobrescribe al primero y el código queda corrupto.

### Protocolo obligatorio para refactors amplios

```bash
# 1. Verifica quién está trabajando
agent_coordinate check

# 2. Si hay otros agentes activos:
#    - Pídeles que hagan commit o stash de sus cambios antes de que empieces
#    - Si sus archivos solapan con los tuyos → espera a que terminen o a que el usuario resuelva
#    - Si sus archivos NO solapan → puedes proceder, pero avísales

# 3. Reclama TODO el scope → nunca infra-reclames en operaciones amplias
agent_coordinate claim agentId="agent-A" task="rename legacy methods to $q* everywhere" \
  files=["src/**","tests/**","docs-vitepress/**"] \
  ttlMs=1800000

# 4. Lee cada archivo ANTES de editarlo — tu contexto puede estar obsoleto si otro agente
#    lo modificó mientras estabas trabajando. Si cambió: adapta, fusiona o salta el edit.
# 5. Haz el rename
# 6. Libera SIEMPRE al terminar (incluso si falla)
agent_coordinate release agentId="agent-A"
```

### Reglas de scope (qué poner en `files`)

| Tipo de operación                        | Qué reclamar                                                 |
| ---------------------------------------- | ------------------------------------------------------------ |
| Cambio en 1-10 archivos específicos      | Paths exactos: `["src/core/qm.ts", "tests/unit/qm.test.ts"]` |
| Cambio en un módulo                      | Sub-árbol: `["src/mcp/tools/**"]`                            |
| Refactor de varios módulos               | Múltiples sub-árboles: `["src/**", "tests/**"]`              |
| Mass-rename / cambio en todo el proyecto | Todo: `["src/**", "tests/**", "docs-vitepress/**"]`          |

> **Regla de oro**: en caso de duda, reclama más amplio. Un falso positivo de conflicto (bloquear cuando no era necesario) es trivialmente resolvible con `release`. Un falso negativo (no reclamar lo suficiente) puede corromper cientos de archivos sin posibilidad de auto-recuperación.

### Por qué no hay merge automático

El sistema es un **mutex de escritura exclusiva**, no un sistema de merge. Los archivos del workspace son texto plano y no hay forma de combinar automáticamente dos edits concurrentes sobre el mismo archivo. El "último en escribir gana" y sobreescribe todo lo anterior sin advertencia.

### Lectura previa a escritura (read-before-write)

El mutex previene que **dos agentes editen el mismo archivo al mismo tiempo**, pero no protege contra un problema más sutil: **contexto obsoleto**. Un agente puede cargar el contenido de un archivo en su ventana de contexto, luego otro agente lo modifica, y el primero — sin saberlo — sobreescribe la versión nueva con sus edits basados en el estado antiguo.

**Regla obligatoria:** Inmediatamente antes de modificar cada archivo, lee su contenido actual del disco (no confíes en lo que tienes en contexto). Compara con lo que recuerdas:

- Si el archivo **no cambió** → aplica tu edit normalmente.
- Si el archivo **cambió parcialmente** → adapta tu edit al nuevo estado; nunca sobreescribas cambios ajenos.
- Si el archivo **cambió de forma incompatible** → para y avisa al usuario antes de continuar.

Esta regla está incorporada como paso 4 en el Step 0 de todos los prompts de escritura del proyecto.

---

## Limpieza automática

Las entradas expiradas se eliminan en tres momentos distintos:

1. **En cada `execute()`** — `readRegistry()` barre expirados antes de hacer cualquier operación y reescribe el JSON si borró algo
2. **Ticker en background** — corre cada 60 s mientras haya agentes activos; **renueva el TTL de todos los agentes activos** (keepalive), purga los ya expirados y actualiza `agent-status.md`; se detiene solo cuando el JSON queda vacío o tras inactividad > 120 s
3. **`release` explícito** — elimina la entrada al instante sin esperar el TTL

El JSON nunca crece indefinidamente: solo contiene agentes **activos en ese momento**.

---

## Ticker (background self-healing)

Un único `setInterval` por proceso (campo estático `_tickerHandle`). Garantías:

- **No acumula** — guard `_tickerHandle !== null` evita timers duplicados aunque haya múltiples instancias de la clase
- **No retiene el proceso** — `handle.unref()` asegura que el ticker no impide el exit de Node/Bun
- **Auto-renueva TTLs** — en cada tick, todos los agentes activos (no expirados) reciben `expiresAt = now + 30 min` y su `updatedAt` se actualiza en el JSON. Los agentes no necesitan llamar a `update` explícitamente
- **Se para solo** en dos condiciones:
    1. Inactividad > `2 × _tickerIntervalMs` (60 s por defecto) — el MCP está idle o muerto
    2. Registry vacío tras purgar expirados

### Campos inyectables para tests

```typescript
QAgentCoordinateTool._tickerIntervalMs = 50; // tick cada 50ms en tests
QAgentCoordinateTool._inactivityThresholdMs = 5000; // no parar por inactividad
QAgentCoordinateTool._autoRefreshOnTick = false; // deshabilitar auto-renovación para tests de expiración
```

> `_autoRefreshOnTick` por defecto es `true` (producción). Se pone a `false` en los tests que verifican el path de expiración por ticker — de lo contrario el ticker renovaría el TTL en vez de purgar la entrada.

---

## Lock file atómico (mutex cross-proceso)

Cada ventana de VS Code corre su propio Extension Host + servidor MCP. Sin un mecanismo de exclusión mutua, dos procesos podrían hacer `readRegistry → modificar → writeRegistry` de forma intercalada, corrompiendo el JSON.

### Mecanismo

```
openSync(lockPath, 'wx')   ← atómico garantizado por el SO
```

El flag `'wx'` es creación exclusiva: solo **uno** de los N procesos que intenten crear el fichero simultáneamente tendrá éxito. Los demás reciben `EEXIST` internamente y lo manejan con retry.

### Flujo con 3 ventanas concurrentes

```
Ventana A → openSync('wx') ✅ → read + write + unlinkSync(lock)
Ventana B → openSync('wx') ❌ → espera 10ms → retry → ✅ (A ya liberó) → read + write...
Ventana C → openSync('wx') ❌ → espera 10ms → retry → ✅ (B ya liberó) → read + write...
```

El llamante nunca ve el `EEXIST` — el `catch` lo captura y hace `await sleep(lockRetryMs)`. El resultado observable es simplemente que las tres ventanas ejecutan en serie, ordenadas por quién llegó primero.

### Parámetros configurables

| Campo          | Default  | Descripción                                                                            |
| -------------- | -------- | -------------------------------------------------------------------------------------- |
| `_lockRetries` | 20       | Intentos máximos antes de lanzar error                                                 |
| `_lockRetryMs` | 10 ms    | Espera entre intentos                                                                  |
| `_lockStaleMs` | 5 000 ms | Antigüedad a partir de la cual un lock se considera del proceso crasheado y se elimina |

Tolerancia total por defecto: `20 × 10 ms = 200 ms`. Si en 200 ms nadie libera el lock y no es stale (< 5 s), se lanza `Error('agent_coordinate: failed to acquire registry lock...')`.

### Lock stale (proceso crasheado)

Si el proceso que tenía el lock crasheó sin llamar a `_releaseLock()`, el `.lock` queda en disco. Al intentar adquirirlo:

```
statSync(lockPath).mtimeMs → antigüedad > _lockStaleMs → unlinkSync(lockPath) → retry inmediato
```

---

## `force` — tomar el control de un agente crasheado

Si un agente tiene un claim activo (TTL no expirado) pero lleva más de 30 segundos sin heartbeat (`updatedAt` viejo), otro agente puede usar `force: true` para sobrescribir su claim. El threshold es configurable con `_staleCrashMs` (default `DEFAULT_STALE_MS = 30_000`).

```
force=true + updatedAt hace 2 min  → override ✅ (asumimos crash)
force=true + updatedAt hace 20 s   → conflict ✅ (agente sigue activo)
```

---

## Cobertura de tests

Fichero: `tests/mcp/unit/internal/agent-coordinate.test.ts` — **68 tests**.

| Grupo                                     | Tests |
| ----------------------------------------- | ----- |
| Metadata                                  | 1     |
| check                                     | 3     |
| claim                                     | 9     |
| release                                   | 4     |
| update / heartbeat                        | 3     |
| purge                                     | 4     |
| TTL auto-expiry                           | 2     |
| force (crash resilience)                  | 3     |
| Registry resilience (JSON corrupto)       | 3     |
| Glob edge cases                           | 3     |
| Update edge cases                         | 2     |
| agent-status.md                           | 3     |
| Implicit heartbeat                        | 4     |
| Force threshold 30 s                      | 2     |
| Ticker (incl. auto-renew TTL)             | 7     |
| Lock / cross-process mutex                | 5     |
| Real-world: agent sin heartbeat           | 5     |
| Real-world: status.md stale tras reinicio | 2     |

---

## Localización del código

| Elemento                 | Ruta                                               |
| ------------------------ | -------------------------------------------------- |
| Tool                     | `src/mcp/tools/internal/agent-coordinate.tool.ts`  |
| Tests                    | `tests/mcp/unit/internal/agent-coordinate.test.ts` |
| Registry en disco        | `tmp/agent-registry.json`                          |
| Status legible           | `tmp/agent-status.md`                              |
| Lock                     | `tmp/agent-registry.json.lock`                     |
| Registro en servidor MCP | `src/mcp/server.ts`                                |
