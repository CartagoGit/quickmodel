# Propuesta I — `$qHistory` / History Trail

> **Fecha de redacción:** 1 de marzo de 2026
> **Refactorizada:** 2 de marzo de 2026 — consolidado en sistema `history` unificado
> **Estado:** ✅ Completada e implementada

---

## Nota de refactorización (2 Mar 2026)

El diseño original contemplaba dos sistemas separados:

- `audit` — granularidad por campo (`IAuditEntry` con `field`, `from`, `to`, `at`, `method`)
- `history` — granularidad por operación (`IQHistoryEntry` con `method`, `at`, `changes`)

Tras la implementación se detectó redundancia: el `recordMode: 'field'` de `IQHistoryConfig`
cubre exactamente el caso de uso de `audit`. Los tipos `IAuditEntry/Config/Handle`,
`AuditService` y `NullAuditHandle` fueron eliminados. El sistema `history` es la única implementación.

El resto de este documento refleja la implementación real.

---

## 1. Por qué ahora (y por qué antes era cuestionable)

La propuesta estuvo diferida porque parecía solapar con `isDirty()`, `getChanges()` y `diff()`. El análisis revisado muestra que **no solapan — cubren casos distintos**:

| Herramienta       | Qué responde                                                    |
| ----------------- | --------------------------------------------------------------- |
| `isDirty(field?)` | ¿Ha cambiado este campo desde la carga inicial?                 |
| `getChanges()`    | ¿Cuáles son los valores actuales vs. los originales?            |
| `diff(other)`     | ¿En qué se diferencian dos instancias distintas?                |
| `$qHistory`       | ¿Cuándo cambió cada campo, desde qué valor y por qué operación? |

`$qHistory` añade la dimensión **temporal** — una traza cronológica de todas las mutaciones, no solo el estado actual vs. el original.

El cambio de diseño que lo desbloquea es el prefijo `$q`: la propiedad `history` es un nombre de campo extremadamente común en modelos de dominio (`Order.history`, `Document.history`, `User.history`). Exponerlo como `$qHistory` evita la colisión por completo.

---

## 2. API completa

### 2.1 Acceso al handle

```typescript
instance.$qHistory; // IQHistoryHandle — siempre disponible, nunca undefined
instance.$qHistory.value; // IQHistoryEntry[] — vacío si inactivo o sin cambios
instance.$qHistory.isActive; // boolean
```

### 2.2 Control de grabación

```typescript
instance.$qHistory.start(); // activa o reanuda la grabación
instance.$qHistory.stop(); // pausa (conserva las entradas existentes)
instance.$qHistory.clear(); // vacía las entradas (mantiene la configuración)
instance.$qHistory.configure({ maxEntries: 20 }); // cambia el límite en runtime
```

### 2.3 Estructura de una entrada

```typescript
interface IQHistoryEntry {
	method: 'patch' | 'copy' | 'populate';
	at: Date;
	/**
	 * En 'operation' mode: múltiples campos por entrada.
	 * En 'field' mode: exactamente un campo por entrada.
	 */
	changes: Readonly<
		Record<string, { readonly from: unknown; readonly to: unknown }>
	>;
}
```

Los valores `from` y `to` se almacenan **serializados** (usando el mismo mecanismo que `$qSerialize()`) para garantizar comparaciones consistentes con tipos complejos como `Date`, `bigint`, `Set`, `Map`.

### 2.4 Ejemplo completo

```typescript
@Quick(
	{ name: 'string', role: 'string' },
	{ history: { enabled: true, maxEntries: 50 } }
)
class Contract extends QModel<IContract> {
	declare name: string;
	declare role: string;
}

const contract = new Contract({ name: 'v1', role: 'draft' });

contract.$qPatch({ role: 'review' });
contract.$qPatch({ name: 'v2', role: 'approved' });

contract.$qHistory.value;
// → [
//   { method: 'patch', at: Date, changes: { role: { from: 'draft', to: 'review' } } },
//   { method: 'patch', at: Date, changes: { name: { from: 'v1', to: 'v2' }, role: { from: 'review', to: 'approved' } } },
// ]

// Con recordMode: 'field' (una entrada por campo)
// → [
//   { method: 'patch', at: Date, changes: { role: { from: 'draft', to: 'review' } } },
//   { method: 'patch', at: Date, changes: { name: { from: 'v1', to: 'v2' } } },
//   { method: 'patch', at: Date, changes: { role: { from: 'review', to: 'approved' } } },
// ]

contract.$qHistory.isActive; // true
contract.$qHistory.stop();
contract.$qPatch({ name: 'v3' }); // ← no se graba (history pausado)

contract.$qHistory.value.length; // sigue siendo 2
contract.$qHistory.start();
contract.$qPatch({ name: 'v4' }); // ← sí se graba
```

---

## 3. Configuración por niveles

De menor a mayor prioridad (el nivel superior sobreescribe al inferior):

```typescript
// Nivel 1 — Global (default: disabled)
QConfig.configure({
    history: {
        enabled: false,      // desactivado por defecto — zero overhead
        maxEntries: 100,
        recordMode: 'operation', // 'operation' | 'field'
    }
});

// Nivel 2 — Por clase (segundo parámetro de @Quick)
@Quick({ name: 'string' }, { history: { enabled: true, maxEntries: 50 } })
class Contract extends QModel<IContract> { ... }

// Mediante recordMode: 'field' se obtiene granularidad por campo (equivalente al antiguo 'audit')
@Quick({ name: 'string' }, { history: { enabled: true, recordMode: 'field' } })
class ContractFine extends QModel<IContract> { ... }

// Nivel 3 — Por instancia (runtime, mayor prioridad)
contract.$qHistory.configure({ maxEntries: 20 });
```

La resolución de configuración sigue el patrón ya establecido por `per-class-config` (`Propuesta Q`).

---

## 4. Garantía de zero overhead

Cuando `history.enabled` es `false` en todos los niveles (que es el default):

- **`$qHistory`** retorna el `NULL_HISTORY_HANDLE` — singleton compartido con los mismos métodos pero todos no-op.
- **`$qPatch()` / `$qCopy()` / `$qFrom()`** no capturan snapshots ni ejecutan código de history.
- **El array `IQHistoryEntry[]`** nunca se instancia.
- **El bundle no crece** para quien no lo usa.

```typescript
// Internamente en QModel.patch() (pseudocódigo):
patch(partial: Partial<T>): this {
    const auditHandle = this._getAuditHandle(); // NullAuditHandle si disabled
    const before = auditHandle.isActive ? this.$qSerialize() : null;

    // ... lógica de patch normal ...

    if (before !== null) {
        auditHandle._record(before, this.$qSerialize(), 'patch');
    }
    return this;
}
```

---

## 5. Comportamiento del `NULL_HISTORY_HANDLE`

El handle siempre está disponible — nunca hay que hacer `if (instance.$qHistory)`:

```typescript
// Cuando history está desactivado:
instance.$qHistory.value; // → [] (array vacío)
instance.$qHistory.isActive; // → false
instance.$qHistory.recordMode; // → 'operation'
instance.$qHistory.start(); // → no-op
instance.$qHistory.stop(); // → no-op
instance.$qHistory.clear(); // → no-op
instance.$qHistory.configure({}); // → no-op
```

Esto evita el patrón `if (instance.$qHistory?.isActive)` que sería necesario si el handle pudiera ser `undefined`.

---

## 6. Operaciones que generan entradas

| Operación                     | Genera entradas               | Condición                                              |
| ----------------------------- | ----------------------------- | ------------------------------------------------------ |
| `$qPatch(partial)`            | ✅ Sí                         | Solo para campos que realmente cambian                 |
| `$qCopy(partial)`             | ✅ Sí (en la nueva instancia) | La copia hereda el historial del origen + nuevo cambio |
| `$qPopulate(data)`            | ✅ Sí                         | Registra todos los campos que cambian                  |
| Constructor `new Model(data)` | ❌ No                         | La carga inicial no es una mutación                    |

**La copia hereda el historial:**

```typescript
const v2 = contract.$qCopy({ role: 'published' });
v2.$qHistory.value;
// → [...entradas del contrato original, { method: 'copy', at: Date, changes: { role: { from: 'approved', to: 'published' } } }]
```

---

## 7. Integración con `diff()` y `getChanges()`

El audit trail **no reemplaza** a `diff()` ni a `getChanges()` — los complementa:

```typescript
// $qGetChanges() — estado actual vs. estado inicial (snapshot al crear la instancia)
contract.$qGetChanges();
// → { name: { original: 'v1', current: 'v4' }, role: { original: 'draft', current: 'published' } }

// $qHistory.value — traza cronológica completa
contract.$qHistory.value;
// → [ paso1, paso2, paso3, paso4 ] — todos los intermedios

// $qDiff(other) — diferencias entre dos instancias distintas
contractA.$qDiff(contractB);
// → { name: { before: 'v4', after: 'v5' } }
```

---

## 8. Tipos TypeScript exportados

```typescript
// Exportados desde 'quickmodel'
export interface IQHistoryEntry {
	method: 'patch' | 'copy' | 'populate';
	at: Date;
	changes: Readonly<
		Record<string, { readonly from: unknown; readonly to: unknown }>
	>;
}

export interface IQHistoryConfig {
	maxEntries?: number; // default: 500
	recordMode?: 'operation' | 'field'; // default: 'operation'
}

export interface IQHistoryHandle {
	readonly value: IQHistoryEntry[];
	readonly isActive: boolean;
	readonly recordMode: 'operation' | 'field';
	start(): void;
	stop(): void;
	clear(): void;
	configure(config: Partial<IQHistoryConfig>): void;
}
```

---

## 9. Archivos de la implementación

### Archivos de la implementación final

| Archivo                                    | Contenido                                              |
| ------------------------------------------ | ------------------------------------------------------ |
| `src/core/interfaces/history.interface.ts` | `IQHistoryEntry`, `IQHistoryConfig`, `IQHistoryHandle` |
| `src/core/services/history.service.ts`     | `HistoryService` + `ActiveHistoryHandle`               |
| `src/core/models/null-history-handle.ts`   | `NULL_HISTORY_HANDLE` (singleton no-op)                |
| `tests/unit/core/services/history.test.ts` | 32 tests                                               |

---

## 10. Tests

```
history.test.ts
├── NULL_HISTORY_HANDLE
│   ├── value retorna [] cuando history está desactivado
│   ├── isActive retorna false
│   ├── recordMode retorna 'operation'
│   ├── start() es no-op
│   ├── stop() es no-op
│   └── clear() es no-op
│
├── ActiveHistoryHandle (recordMode: 'operation')
│   ├── graba una entrada por patch() con campos cambiados
│   ├── no graba si no hay cambios
│   ├── agrupa múltiples campos en una entrada
│   ├── graba entradas de copy() en la nueva instancia
│   ├── graba entradas de populate()
│   ├── NO graba el constructor
│   ├── stop() pausa la grabación
│   ├── start() reanuda
│   ├── clear() vacía las entradas
│   └── configura maxEntries y descarta las más antiguas
│
├── ActiveHistoryHandle (recordMode: 'field')
│   ├── patch() con 2 campos emite 2 entradas
│   ├── cada entrada tiene exactamente un campo en changes
│   └── Date, bigint, Set, Map se serializan correctamente en from/to
│
└── Integración
    ├── patch() no ejecuta código de history cuando handle es null (performance)
    ├── copy() hereda historial del origen
    └── history.value no es mutable externamente
```

---

## 11. Estado final

Implementación completada y refactorizada el 2 de marzo de 2026.
El sistema `history` unificado cubre todos los casos de uso documentados en esta propuesta.
