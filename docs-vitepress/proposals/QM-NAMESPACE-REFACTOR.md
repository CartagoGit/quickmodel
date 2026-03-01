# Plan de Refactoring — Namespace `$qm` (v2.0.0)

> **Fecha de redacción:** 1 de marzo de 2026
> **Objetivo entrega:** v2.0.0
> **Responsable:** equipo QuickModel
> **Estado:** 📋 Planificado — pendiente de implementación

---

## 1. Por qué hacemos esto

### El problema actual

Cada instancia de `QModel` expone directamente en su prototipo todos los métodos y utilidades de la librería. En la v1.x, esto suma alrededor de **20 nombres reservados** que el usuario no puede usar como campos de su modelo:

```
serialize       populate        copy            patch
diff            equals          validate        checkRules
checkRulesAsync isValid         hasIntegrity    isDirty
getChanges      toFormData      toReadableStream fromStream
pipeStream      fromURL         configure       history
```

Esto significa que un modelo perfectamente válido desde el dominio de negocio choca silenciosamente con los métodos de la librería:

```typescript
interface IOrder {
	history: IOrderEvent[]; // campo legítimo del usuario ❌ colisión
	copy: string; // nº de copia del pedido    ❌ colisión
	validate: boolean; // flag de validación manual  ❌ colisión
	serialize: string; // formato de serialización   ❌ colisión
}

@Quick({ history: Array })
class Order extends QModel<IOrder> {
	declare history: IOrderEvent[]; // ¿el campo o el método?
}
```

### Por qué es un problema grave de adopción

- Un desarrollador que tenga un modelo con `history`, `copy` o `validate` no podrá usar QuickModel **sin renombrar su propio dominio**.
- El coste de adopción aumenta y la librería se percibe como invasiva.
- Con cada nueva feature que añadimos (como `history` del audit trail, `diff`, `patch`...) el problema empeora.

### La solución: un namespace único `$qm`

Agrupamos **todos** los métodos de infraestructura bajo una propiedad `$qm`. El usuario solo sacrifica **una palabra** en lugar de 20+:

```typescript
// Antes (v1.x)
user.serialize();
user.patch({ name: 'Alice' });
user.diff(other);
user.validate();
user.history.value;

// Después (v2.0)
user.$qm.serialize();
user.$qm.patch({ name: 'Alice' });
user.$qm.diff(other);
user.$qm.validate();
user.$qm.history.value;

// Y el modelo puede tener cualquier campo:
interface IUser {
	copy: string; // ✅ sin colisión
	history: Event[]; // ✅ sin colisión
	validate: boolean; // ✅ sin colisión
}
```

El prefijo `$` es un convenio establecido en Vue, Angular y otras librerías para señalar "infraestructura del framework, no datos de dominio".

---

## 2. Diseño de la API v2.0

### 2.1 El objeto `$qm`

```typescript
instance.$qm.serialize(options?)
instance.$qm.populate(data)
instance.$qm.copy(partial?)
instance.$qm.patch(partial)
instance.$qm.diff(other)
instance.$qm.equals(other)
instance.$qm.validate(options?)
instance.$qm.checkRules(options?)
instance.$qm.checkRulesAsync(options?)
instance.$qm.isValid()
instance.$qm.hasIntegrity()
instance.$qm.isDirty(field?)
instance.$qm.getChanges()
instance.$qm.toFormData(options?)
instance.$qm.toReadableStream(options?)
instance.$qm.fromStream(stream)
instance.$qm.pipeStream(options?)
instance.$qm.configure(options)   // per-instance config override
instance.$qm.history              // IAuditHandle (Propuesta I)
```

### 2.2 El handle `$qm.history` (Propuesta I integrada)

```typescript
instance.$qm.history.value; // IAuditEntry[]
instance.$qm.history.isActive; // boolean
instance.$qm.history.start(); // activa/reanuda grabación
instance.$qm.history.stop(); // pausa (conserva entradas)
instance.$qm.history.clear(); // vacía entradas (mantiene config)
instance.$qm.history.configure({ maxEntries: 20 });
```

### 2.3 Configuración por niveles (de menor a mayor prioridad)

```typescript
// Nivel 1 — global
QConfig.configure({
    audit: { enabled: false, maxEntries: 100 }
});

// Nivel 2 — por clase (segundo parámetro de @Quick)
@Quick({ name: 'string' }, { audit: { enabled: true, maxEntries: 50 } })
class Contract extends QModel<IContract> { ... }

// Nivel 3 — por instancia (mayor prioridad, runtime)
contract.$qm.history.configure({ maxEntries: 20 });
```

---

## 3. Estrategia de migración v1→v2

### Fase 1 — v1.x con dual API (deprecation warnings)

- Todos los métodos actuales siguen funcionando **en `$qm`**.
- Los métodos en la raíz de la instancia emiten un `console.warn` en desarrollo:

```typescript
user.serialize();
// ⚠️ [QuickModel] user.serialize() is deprecated. Use user.$qm.serialize() instead. Will be removed in v2.0.0.

user.$qm.serialize(); // ✅ sin warning
```

- Se activa con `QConfig.configure({ deprecationWarnings: true })` (default `true` en dev, `false` en prod).
- Los tipos TypeScript marcan los métodos raíz como `@deprecated`.

### Fase 2 — v2.0.0 (breaking release)

- Se eliminan todos los métodos de la raíz del prototipo.
- Solo existe `$qm`.
- Se actualiza `CHANGELOG.md` con guía de migración detallada.

---

## 4. Impacto en archivos fuente

### Archivos a modificar en `src/`

| Archivo                                   | Cambio                                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `src/core/models/quick.model.ts`          | Mover todos los métodos de instancia a un getter `$qm` que retorne `IQMHandle`    |
| `src/core/interfaces/`                    | Añadir `IQMHandle` interface con todos los métodos                                |
| `src/core/services/audit.service.ts`      | Nuevo — lógica del audit trail                                                    |
| `src/core/decorators/qaudit.decorator.ts` | Nuevo — `@QAudit` opt-in por clase (alternativa al segundo parámetro de `@Quick`) |
| `src/index.ts`                            | Export `IQMHandle`, `IAuditEntry`, `IAuditHandle`, `QAudit`                       |
| `src/types.ts`                            | Añadir tipos nuevos                                                               |

### Archivos de tests a actualizar

- Todos los tests de `tests/unit/core/models/` que llamen a métodos directamente en la instancia.
- Añadir `tests/unit/core/models/qm-namespace.test.ts` — tests del handle `$qm`.
- Añadir `tests/unit/core/services/audit.test.ts` — tests del audit trail.

### Archivos de docs a actualizar

- **Todas las guías** bajo `docs-vitepress/en/guide/` y `docs-vitepress/es/guide/` que muestren ejemplos con `user.serialize()`, `user.copy()`, etc.
- Añadir `en/guide/reserved-words.md` + ES (ya existe — explica el problema y la migración).
- Actualizar `en/guide/getting-started.md` + ES.
- Actualizar todas las guías de integración (Angular, React, Vue, etc.).

---

## 5. Implementación del audit trail (Propuesta I)

### Zero overhead cuando está desactivado

```typescript
// Si audit.enabled === false en todos los niveles:
// - instance.$qm.history es un NullAuditHandle (métodos no-op)
// - patch() / copy() no ejecutan ningún código de audit
// - El array de entradas NUNCA se instancia
```

### Estructura de una entrada de audit

```typescript
interface IAuditEntry {
	field: string;
	from: unknown; // valor serializado (consistente con Date, bigint, etc.)
	to: unknown; // valor serializado
	at: Date;
	method: 'patch' | 'copy' | 'populate'; // qué operación lo causó
}
```

### Archivos nuevos a crear

```
src/core/services/audit.service.ts
src/core/decorators/qaudit.decorator.ts
src/core/interfaces/audit.interface.ts
tests/unit/core/services/audit.test.ts
```

---

## 6. Estimación de esfuerzo

| Tarea                                                      | Estimación  |
| ---------------------------------------------------------- | ----------- |
| Implementar `IQMHandle` + getter `$qm` en `quick.model.ts` | 3-4h        |
| Deprecation warnings en métodos raíz                       | 1h          |
| Audit trail (`AuditService` + `@QAudit`)                   | 3-4h        |
| Tests nuevos (namespace + audit)                           | 2-3h        |
| Actualizar todos los tests existentes                      | 3-4h        |
| Actualizar todas las guías de docs (37 EN + 37 ES)         | 4-6h        |
| **Total estimado**                                         | **~16-22h** |

---

## 7. Criterios de aceptación

- [ ] `$qm` handle disponible en toda instancia de `QModel`
- [ ] Todos los métodos actuales accesibles via `$qm`
- [ ] Métodos raíz emiten `@deprecated` en TypeScript + `console.warn` en runtime (dev)
- [ ] `$qm.history` con `value`, `isActive`, `start()`, `stop()`, `clear()`, `configure()`
- [ ] Audit trail: zero overhead si `enabled: false`
- [ ] Configuración en 3 niveles: global → clase → instancia
- [ ] Suite completa: 4400+ tests pasando
- [ ] Guía `reserved-words.md` EN+ES publicada
- [ ] `CHANGELOG.md` con guía de migración v1→v2

---

## 8. Decisiones de diseño explícitas

| Decisión                               | Alternativas consideradas            | Razón elegida                                                                                                |
| -------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Prefijo `$qm`                          | `qm`, `_qm`, `$`                     | `$` es convención "framework-internal"; `qm` es corto y sin ambigüedad                                       |
| Un solo namespace                      | Múltiples: `$serialize`, `$patch`... | Un punto de entrada es más predecible y no contamina el autocompletado                                       |
| `@QAudit` + segundo parámetro `@Quick` | Solo uno de los dos                  | Consistencia con otros decoradores del proyecto; el segundo parámetro es más conciso para usuarios avanzados |
| NullAuditHandle cuando desactivado     | `undefined` / `null` check           | Evita `if (instance.$qm.history)` en cada uso; el usuario llama `history.value` siempre                      |
| Deprecation warnings solo en dev       | Siempre / nunca                      | No penalizar producción; alertar activamente en desarrollo                                                   |
