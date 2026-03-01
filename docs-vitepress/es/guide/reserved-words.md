# Palabras reservadas y el namespace `$qm`

## Por qué existe esta página

QuickModel añade un conjunto de métodos a cada instancia de modelo: `serialize`, `copy`, `patch`, `diff`, `validate` y otros. Son la infraestructura de la librería — pero viven **directamente en la instancia**, lo que significa que tu modelo no puede tener campos con esos nombres.

Esta es una limitación real. Un modelo de dominio perfectamente válido como este entra en conflicto:

```typescript
interface IOrder {
	history: IOrderEvent[]; // ❌ colisiona con la futura API history
	copy: string; // ❌ colisiona con copy()
	validate: boolean; // ❌ colisiona con validate()
}
```

---

## Palabras reservadas actuales (v1.x)

Los siguientes nombres **no pueden usarse como campos** en ningún modelo:

| Método             | Descripción                                   |
| ------------------ | --------------------------------------------- |
| `serialize`        | Convierte la instancia en objeto plano        |
| `populate`         | Rellena campos desde datos planos             |
| `copy`             | Retorna una nueva copia inmutable con cambios |
| `patch`            | Muta la instancia in-place                    |
| `diff`             | Retorna diferencias campo por campo           |
| `equals`           | Compara dos instancias                        |
| `validate`         | Validación unificada sync/async               |
| `checkRules`       | Ejecuta predicados `@QRule`                   |
| `checkRulesAsync`  | Versión async de `checkRules`                 |
| `isValid`          | Shortcut de conveniencia                      |
| `hasIntegrity`     | Comprobación de integridad                    |
| `isDirty`          | Si la instancia tiene cambios no guardados    |
| `getChanges`       | Retorna campos modificados                    |
| `toFormData`       | Convierte a FormData                          |
| `toReadableStream` | Convierte a ReadableStream                    |
| `fromStream`       | Rellena desde un stream                       |
| `pipeStream`       | Conecta a un writable stream                  |
| `configure`        | Override de config por instancia              |

Si usas alguno de estos como nombre de campo, el método de la librería lo solapará y el comportamiento será impredecible.

---

## La solución: namespace `$qm` (llega en v2.0)

En v2.0, todos los métodos de la librería se moverán bajo una única propiedad `$qm`. Esto significa que tu modelo solo necesita evitar **un nombre** en lugar de 20+.

```typescript
// v1.x
user.$qm.serialize();
user.$qm.patch({ name: 'Alice' });
user.$qm.diff(other);

// v2.0
user.$qm.$qm.serialize();
user.$qm.$qm.patch({ name: 'Alice' });
user.$qm.$qm.diff(other);
```

Con `$qm`, tus campos de modelo quedan completamente libres:

```typescript
interface IOrder {
	history: IOrderEvent[]; // ✅ sin colisión
	copy: string; // ✅ sin colisión
	validate: boolean; // ✅ sin colisión
	serialize: string; // ✅ sin colisión
}
```

El prefijo `$` es una convención bien establecida — Vue, Angular y otros frameworks lo usan para señalar "infraestructura del framework, no datos de dominio".

---

## Plan de migración

La transición de v1 a v2 será gradual:

**Fase 1 — v1.x (API dual)**

- Todos los métodos siguen disponibles directamente en la instancia (retrocompatible).
- El namespace `$qm` también está disponible con la API completa.
- Los métodos en la raíz de la instancia emiten un `@deprecated` en TypeScript y un `console.warn` en desarrollo.

```typescript
user.$qm.serialize();
// ⚠️ [QuickModel] user.$qm.serialize() está deprecado.
//    Usa user.$qm.$qm.serialize() en su lugar. Se eliminará en v2.0.0.

user.$qm.$qm.serialize(); // ✅ sin warning
```

**Fase 2 — v2.0.0 (release breaking)**

- Se eliminan los métodos en la raíz de la instancia.
- Solo existe `$qm`.
- Se publicará una guía de migración completa en `CHANGELOG.md`.

---

## El handle `$qm.history` (Audit Trail)

Una de las razones de este cambio es poder introducir limpiamente `$qm.history`, un registro de auditoría opcional para rastrear mutaciones de campos a lo largo del tiempo. Como `history` es un nombre de campo muy común en modelos de dominio, ponerlo bajo `$qm` evita el conflicto por completo.

```typescript
// Solo activo cuando se habilita explícitamente:
@Quick({ name: 'string' }, { audit: { enabled: true, maxEntries: 50 } })
class Contract extends QModel<IContract> {
	declare name: string;
}

contract.$qm.$qm.patch({ name: 'v2' });

contract.$qm.history.value;
// → [{ field: 'name', from: 'v1', to: 'v2', at: Date, method: 'patch' }]

contract.$qm.history.isActive; // boolean
contract.$qm.history.stop(); // pausa la grabación
contract.$qm.history.start(); // reanuda
contract.$qm.history.clear(); // vacía entradas (conserva config)
contract.$qm.history.configure({ maxEntries: 20 });
```

**Zero overhead cuando está desactivado:** cuando `audit.enabled` es false (valor por defecto), el array de historial nunca se instancia y `patch()` / `copy()` no ejecutan código extra.

### Niveles de configuración del audit

De menor a mayor prioridad:

```typescript
// 1. Global
QConfig.configure({ audit: { enabled: false, maxEntries: 100 } });

// 2. Por clase (segundo parámetro de @Quick)
@Quick({ name: 'string' }, { audit: { enabled: true, maxEntries: 50 } })
class Contract extends QModel<IContract> { ... }

// 3. Por instancia (runtime, mayor prioridad)
contract.$qm.history.configure({ maxEntries: 20 });
```

---

## Calendario

| Versión      | Estado                                                       |
| ------------ | ------------------------------------------------------------ |
| v1.x actual  | Métodos en la raíz de la instancia. `$qm` aún no disponible. |
| v1.x próxima | `$qm` disponible. Métodos raíz marcados como `@deprecated`.  |
| v2.0.0       | Métodos raíz eliminados. Solo `$qm`.                         |

::: info Plan técnico detallado
La especificación técnica completa de este refactoring está documentada en
[`proposals/QM-NAMESPACE-REFACTOR.md`](https://github.com/your-org/quickmodel/blob/develop/docs-vitepress/proposals/QM-NAMESPACE-REFACTOR.md).
:::
