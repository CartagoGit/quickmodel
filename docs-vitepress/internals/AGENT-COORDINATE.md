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
	"task": "migrar docs al namespace $qm",
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

## TTL y heartbeat implícito

- TTL por defecto: **5 minutos** (`DEFAULT_TTL_MS = 5 * 60 * 1000`)
- Cualquier llamada a `check` con `agentId` válido **renueva automáticamente** el TTL — el agente no necesita llamar a `update` mientras esté haciendo `check` periódicamente
- TTL personalizable por claim con el campo `ttlMs` (máx. 30 min)

---

## Limpieza automática

Las entradas expiradas se eliminan en tres momentos distintos:

1. **En cada `execute()`** — `readRegistry()` barre expirados antes de hacer cualquier operación y reescribe el JSON si borró algo
2. **Ticker en background** — corre cada 30 s mientras haya agentes activos; purga expirados y actualiza `agent-status.md`; se detiene solo cuando el JSON queda vacío o tras inactividad > 60 s
3. **`release` explícito** — elimina la entrada al instante sin esperar el TTL

El JSON nunca crece indefinidamente: solo contiene agentes **activos en ese momento**.

---

## Ticker (background self-healing)

Un único `setInterval` por proceso (campo estático `_tickerHandle`). Garantías:

- **No acumula** — guard `_tickerHandle !== null` evita timers duplicados aunque haya múltiples instancias de la clase
- **No retiene el proceso** — `handle.unref()` asegura que el ticker no impide el exit de Node/Bun
- **Se para solo** en dos condiciones:
    1. Inactividad > `2 × _tickerIntervalMs` (60 s por defecto) — el MCP está idle o muerto
    2. Registry vacío tras purgar expirados

### Campos inyectables para tests

```typescript
QAgentCoordinateTool._tickerIntervalMs = 50; // tick cada 50ms en tests
QAgentCoordinateTool._inactivityThresholdMs = 5000; // no parar por inactividad en el test
```

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

Si un agente tiene un claim activo (TTL no expirado) pero lleva más de 1 minuto sin heartbeat (`updatedAt` viejo), otro agente puede usar `force: true` para sobrescribir su claim. El threshold es configurable con `_staleCrashMs` (default `DEFAULT_STALE_MS = 60_000`).

```
force=true + updatedAt hace 2 min → override ✅ (asumimos crash)
force=true + updatedAt hace 30 s  → conflict ✅ (agente sigue activo)
```

---

## Cobertura de tests

Fichero: `tests/mcp/unit/internal/agent-coordinate.test.ts` — **60 tests**.

| Grupo                               | Tests |
| ----------------------------------- | ----- |
| Metadata                            | 1     |
| check                               | 3     |
| claim                               | 9     |
| release                             | 4     |
| update / heartbeat                  | 3     |
| purge                               | 4     |
| TTL auto-expiry                     | 2     |
| force (crash resilience)            | 3     |
| Registry resilience (JSON corrupto) | 3     |
| Glob edge cases                     | 3     |
| Update edge cases                   | 2     |
| agent-status.md                     | 3     |
| Implicit heartbeat                  | 4     |
| Force threshold 1 min               | 2     |
| Ticker                              | 6     |
| Lock / cross-process mutex          | 5     |

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
