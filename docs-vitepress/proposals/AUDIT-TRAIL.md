# Propuesta I — `$qm.history` / Audit Trail

> **Fecha de redacción:** 1 de marzo de 2026
> **Prioridad:** 🟡 Media
> **Objetivo entrega:** v2.0.0 (junto con el namespace `$qm`)
> **Depende de:** [QM-NAMESPACE-REFACTOR.md](./QM-NAMESPACE-REFACTOR.md)
> **Estado:** 📋 Planificada — pendiente de implementación

---

## 1. Por qué ahora (y por qué antes era cuestionable)

La propuesta estuvo diferida porque parecía solapar con `isDirty()`, `getChanges()` y `diff()`. El análisis revisado muestra que **no solapan — cubren casos distintos**:

| Herramienta       | Qué responde                                                    |
| ----------------- | --------------------------------------------------------------- |
| `isDirty(field?)` | ¿Ha cambiado este campo desde la carga inicial?                 |
| `getChanges()`    | ¿Cuáles son los valores actuales vs. los originales?            |
| `diff(other)`     | ¿En qué se diferencian dos instancias distintas?                |
| `$qm.history`     | ¿Cuándo cambió cada campo, desde qué valor y por qué operación? |

`history` añade la dimensión **temporal** — una traza cronológica de todas las mutaciones, no solo el estado actual vs. el original.

El cambio de diseño que lo desbloquea es el namespace `$qm`: la propiedad `history` es un nombre de campo extremadamente común en modelos de dominio (`Order.history`, `Document.history`, `User.history`). Colocarlo bajo `$qm.history` evita la colisión por completo.

---

## 2. API completa

### 2.1 Acceso al handle

```typescript
instance.$qm.history; // IAuditHandle — siempre disponible, nunca undefined
instance.$qm.history.value; // IAuditEntry[] — vacío si inactivo o sin cambios
instance.$qm.history.isActive; // boolean
```

### 2.2 Control de grabación

```typescript
instance.$qm.history.start(); // activa o reanuda la grabación
instance.$qm.history.stop(); // pausa (conserva las entradas existentes)
instance.$qm.history.clear(); // vacía las entradas (mantiene la configuración)
instance.$qm.history.configure({ maxEntries: 20 }); // cambia el límite en runtime
```

### 2.3 Estructura de una entrada

```typescript
interface IAuditEntry {
	field: string;
	from: unknown; // valor serializado (Date → ISO string, bigint → string)
	to: unknown; // valor serializado
	at: Date;
	method: 'patch' | 'copy' | 'populate'; // qué operación lo causó
}
```

Los valores `from` y `to` se almacenan **serializados** (usando el mismo mecanismo que `serialize()`) para garantizar comparaciones consistentes con tipos complejos como `Date`, `bigint`, `Set`, `Map`.

### 2.4 Ejemplo completo

```typescript
@Quick(
	{ name: 'string', role: 'string' },
	{ audit: { enabled: true, maxEntries: 50 } }
)
class Contract extends QModel<IContract> {
	declare name: string;
	declare role: string;
}

const contract = new Contract({ name: 'v1', role: 'draft' });

contract.$qm.patch({ role: 'review' });
contract.$qm.patch({ name: 'v2', role: 'approved' });

contract.$qm.history.value;
// → [
//   { field: 'role', from: 'draft',   to: 'review',   at: Date, method: 'patch' },
//   { field: 'name', from: 'v1',      to: 'v2',        at: Date, method: 'patch' },
//   { field: 'role', from: 'review',  to: 'approved',  at: Date, method: 'patch' },
// ]

contract.$qm.history.isActive; // true
contract.$qm.history.stop();
contract.$qm.patch({ name: 'v3' }); // ← no se graba (history pausado)

contract.$qm.history.value.length; // sigue siendo 3
contract.$qm.history.start();
contract.$qm.patch({ name: 'v4' }); // ← sí se graba
```

---

## 3. Configuración por niveles

De menor a mayor prioridad (el nivel superior sobreescribe al inferior):

```typescript
// Nivel 1 — Global (default: disabled)
QConfig.configure({
    audit: {
        enabled: false,     // desactivado por defecto — zero overhead
        maxEntries: 100,
    }
});

// Nivel 2 — Por clase (segundo parámetro de @Quick)
@Quick({ name: 'string' }, { audit: { enabled: true, maxEntries: 50 } })
class Contract extends QModel<IContract> { ... }

// Nivel 3 — Por instancia (runtime, mayor prioridad)
contract.$qm.history.configure({ maxEntries: 20 });
```

La resolución de configuración sigue el patrón ya establecido por `per-class-config` (`Propuesta Q`).

---

## 4. Garantía de zero overhead

Cuando `audit.enabled` es `false` en todos los niveles (que es el default):

- **`$qm.history`** retorna un `NullAuditHandle` — un objeto con los mismos métodos pero todos no-op.
- **`patch()` / `copy()` / `populate()`** no ejecutan ningún código de audit en su ruta de ejecución.
- **El array `IAuditEntry[]`** nunca se instancia.
- **El bundle no crece** para quien no lo usa — la clase `AuditService` se importa de forma condicional en runtime, no en módulo top-level.

```typescript
// Internamente en QModel.patch() (pseudocódigo):
patch(partial: Partial<T>): this {
    const auditHandle = this._getAuditHandle(); // NullAuditHandle si disabled
    const before = auditHandle.isActive ? this.$qm.serialize() : null;

    // ... lógica de patch normal ...

    if (before !== null) {
        auditHandle._record(before, this.$qm.serialize(), 'patch');
    }
    return this;
}
```

---

## 5. Comportamiento del `NullAuditHandle`

El handle siempre está disponible — nunca hay que hacer `if (instance.$qm.history)`:

```typescript
// Cuando audit está desactivado:
instance.$qm.history.value; // → [] (array vacío)
instance.$qm.history.isActive; // → false
instance.$qm.history.start(); // → no-op (no activa si no hay config)
instance.$qm.history.stop(); // → no-op
instance.$qm.history.clear(); // → no-op
instance.$qm.history.configure({}); // → no-op (sin config no puede activarse)

// Solo activa si se habilita a nivel global o de clase primero
```

Esto evita el patrón `if (instance.$qm.history?.isActive)` que sería necesario si el handle pudiera ser `undefined`.

---

## 6. Operaciones que generan entradas

| Operación                     | Genera entradas               | Condición                                              |
| ----------------------------- | ----------------------------- | ------------------------------------------------------ |
| `$qm.patch(partial)`          | ✅ Sí                         | Solo para campos que realmente cambian                 |
| `$qm.copy(partial)`           | ✅ Sí (en la nueva instancia) | La copia hereda el historial del origen + nuevo cambio |
| `$qm.populate(data)`          | ✅ Sí                         | Registra todos los campos que cambian                  |
| Constructor `new Model(data)` | ❌ No                         | La carga inicial no es una mutación                    |

**La copia hereda el historial:**

```typescript
const v2 = contract.$qm.copy({ role: 'published' });
v2.$qm.history.value;
// → [...entradas del contrato original, { field: 'role', from: 'approved', to: 'published', ... }]
```

---

## 7. Integración con `diff()` y `getChanges()`

El audit trail **no reemplaza** a `diff()` ni a `getChanges()` — los complementa:

```typescript
// getChanges() — estado actual vs. estado inicial (snapshot al crear la instancia)
contract.$qm.getChanges();
// → { name: { original: 'v1', current: 'v4' }, role: { original: 'draft', current: 'published' } }

// history.value — traza cronológica completa
contract.$qm.history.value;
// → [ paso1, paso2, paso3, paso4 ] — todos los intermedios

// diff(other) — diferencias entre dos instancias distintas
contractA.$qm.diff(contractB);
// → { name: { before: 'v4', after: 'v5' } }
```

---

## 8. Tipos TypeScript exportados

```typescript
// Exportados desde 'quickmodel'
export interface IAuditEntry {
	field: string;
	from: unknown;
	to: unknown;
	at: Date;
	method: 'patch' | 'copy' | 'populate';
}

export interface IAuditConfig {
	enabled: boolean;
	maxEntries?: number; // default: Infinity (sin límite)
}

export interface IAuditHandle {
	readonly value: IAuditEntry[];
	readonly isActive: boolean;
	start(): void;
	stop(): void;
	clear(): void;
	configure(config: Partial<IAuditConfig>): void;
}
```

---

## 9. Archivos a crear/modificar

### Archivos nuevos

| Archivo                                  | Contenido                                                |
| ---------------------------------------- | -------------------------------------------------------- |
| `src/core/services/audit.service.ts`     | `AuditService` + `NullAuditHandle` + `ActiveAuditHandle` |
| `src/core/interfaces/audit.interface.ts` | `IAuditEntry`, `IAuditConfig`, `IAuditHandle`            |
| `tests/unit/core/services/audit.test.ts` | ~25 tests                                                |
| `docs-vitepress/en/guide/audit-trail.md` | Guía pública EN                                          |
| `docs-vitepress/es/guide/audit-trail.md` | Guía pública ES                                          |

### Archivos a modificar

| Archivo                                  | Cambio                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/core/models/quick.model.ts`         | Exponer `$qm.history` en el handle; llamar a `AuditService` en `patch()`, `copy()`, `populate()` |
| `src/core/config/quick.config.ts`        | Añadir `audit?: IAuditConfig` a `IQConfig`                                                       |
| `src/core/decorators/quick.decorator.ts` | Añadir `audit?: IAuditConfig` al segundo parámetro de `@Quick`                                   |
| `src/index.ts`                           | Exportar `IAuditEntry`, `IAuditConfig`, `IAuditHandle`                                           |
| `src/types.ts`                           | Añadir tipos al barrel de tipos                                                                  |
| `docs-vitepress/.vitepress/config.ts`    | Añadir `audit-trail.md` al sidebar Advanced EN+ES                                                |

---

## 10. Plan de tests (TDD)

Los tests se escriben **antes** de la implementación, siguiendo la metodología del proyecto.

```
audit.test.ts
├── NullAuditHandle
│   ├── value retorna [] cuando audit está desactivado
│   ├── isActive retorna false
│   ├── start() es no-op (no activa sin config)
│   ├── stop() es no-op
│   ├── clear() es no-op
│   └── configure() es no-op
│
├── ActiveAuditHandle
│   ├── graba entradas de patch() con campos que cambian
│   ├── no graba campos que no cambian en patch()
│   ├── graba entradas de copy() en la nueva instancia
│   ├── graba entradas de populate()
│   ├── NO graba el constructor (carga inicial)
│   ├── stop() pausa la grabación
│   ├── start() reanuda la grabación
│   ├── clear() vacía las entradas
│   ├── configura maxEntries y descarta las más antiguas al superarlo
│   └── serializa Date, bigint, Set, Map correctamente en from/to
│
├── Configuración por niveles
│   ├── global enabled=false → NullAuditHandle
│   ├── global enabled=false + clase enabled=true → ActiveAuditHandle
│   ├── clase maxEntries sobreescribe global maxEntries
│   └── instancia configure() sobreescribe clase
│
└── Integración
    ├── patch() no ejecuta código audit cuando handle es Null (performance)
    ├── copy() hereda historial del origen
    └── history.value no es mutable externamente (readonly array)
```

---

## 11. Estimación de esfuerzo

| Tarea                                                         | Estimación |
| ------------------------------------------------------------- | ---------- |
| `AuditService` + `NullAuditHandle` + `ActiveAuditHandle`      | 2h         |
| Integración en `quick.model.ts` (`patch`, `copy`, `populate`) | 1h         |
| Config: `IQConfig.audit` + `@Quick` segundo param             | 30min      |
| Tests (~25)                                                   | 2h         |
| Guía `audit-trail.md` EN+ES                                   | 1h         |
| Sidebar + doc parity                                          | 15min      |
| **Total estimado**                                            | **~7h**    |

> ⚠️ Esta propuesta **debe implementarse junto con o después de** el namespace `$qm`
> (ver [QM-NAMESPACE-REFACTOR.md](./QM-NAMESPACE-REFACTOR.md)), ya que
> `$qm.history` es parte del contrato del handle `IQMHandle`.
