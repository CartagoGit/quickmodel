# Propuesta X — Rename completo a `$q*`: API de instancia unificada

> **Fecha de redacción:** 1 de marzo de 2026  
> **Prioridad:** 🔴 Alta (deuda de diseño fundamental)  
> **Objetivo entrega:** v1.x — no producción, breaking change total  
> **Depende de:** Propuesta W ✅ Completada (1 Mar 2026)  
> **Estado:** 📋 Planificada — diseño aprobado, pendiente TDD  
> **Multi-agente:** ✅ Soportado — ver §9 para zonas y coordinación

---

## 1. Resumen ejecutivo

La propuesta W introdujo `$qm` como handle: `user.$qm.serialize()`. Resolvió las
colisiones de nombres, pero creó tres capas de inconsistencia:

1. 6 métodos de `QModel` sin guard (llamables directamente sin `$qm`)
2. `QModelCollection` sin namespace propio
3. Los helpers exportados (`qCheckRules`, `qGroups`…) usan `q` sin `$`

Esta propuesta elimina el objeto `$qm` intermedio y estandariza **una sola regla**:

> **Todo símbolo de infraestructura QuickModel en una instancia lleva el prefijo `$q`
> directamente como propiedad del objeto.**

```typescript
// ANTES (propuesta W)
user.$qm.serialize();
user.$qm.isDirty('age');
user.$qm.copy({ name: 'Bob' });

// DESPUÉS (propuesta X)
user.$qSerialize();
user.$qIsDirty('age');
user.$qCopy({ name: 'Bob' });
```

---

## 2. Convención de nombrado completa del proyecto

Esta propuesta consolida y completa la convención de nombrado del proyecto:

| Prefijo | Aplica a                                              | Ejemplos                                                  |
| ------- | ----------------------------------------------------- | --------------------------------------------------------- |
| `IQ`    | Interfaces y tipos TypeScript                         | `IQRulesResult`, `IQSerializationOptions`                 |
| `Q`     | Clases de modelo y decoradores                        | `QModel`, `QModelCollection`, `QRule`, `QAlias`, `QGroup` |
| `$q`    | Métodos/propiedades de instancia + helpers exportados | `$qSerialize()`, `$qCheckRules()`, `$qGroups()`           |

**Esta convención debe reflejarse en:**

- `src/` — código fuente
- `tests/` — todos los tests
- `docs-vitepress/` — documentación EN + ES
- JSDoc de cada símbolo público
- Prompts/skills MCP
- `.github/copilot-instructions.md`

---

## 3. Tabla de rename: `$qm.*` → `$q*()`

### 3.1 Métodos ya en `$qm` (Propuesta W)

| Antes                              | Después                          | Tipo         |
| ---------------------------------- | -------------------------------- | ------------ |
| `user.$qm.serialize(opts?)`        | `user.$qSerialize(opts?)`        | sync         |
| `user.$qm.toFormData(opts?)`       | `user.$qToFormData(opts?)`       | Promise      |
| `user.$qm.toReadableStream(opts)`  | `user.$qToReadableStream(opts)`  | sync         |
| `user.$qm.isDirty(field?)`         | `user.$qIsDirty(field?)`         | sync         |
| `user.$qm.getChanges()`            | `user.$qGetChanges()`            | sync         |
| `user.$qm.patch(data)`             | `user.$qPatch(data)`             | sync         |
| `user.$qm.copy(partial?)`          | `user.$qCopy(partial?)`          | sync         |
| `user.$qm.diff(other)`             | `user.$qDiff(other)`             | sync         |
| `user.$qm.equals(other)`           | `user.$qEquals(other)`           | sync         |
| `user.$qm.version`                 | `user.$qVersion`                 | propiedad    |
| `user.$qm.hasIntegrity()`          | `user.$qHasIntegrity()`          | sync         |
| `user.$qm.isValid()`               | `user.$qIsValid()`               | sync         |
| `user.$qm.isValidAsync(opts?)`     | `user.$qIsValidAsync(opts?)`     | Promise      |
| `user.$qm.checkRules(opts?)`       | `user.$qCheckRules(opts?)`       | sync         |
| `user.$qm.checkRulesAsync(opts?)`  | `user.$qCheckRulesAsync(opts?)`  | Promise      |
| `user.$qm.validationReport()`      | `user.$qValidationReport()`      | sync         |
| `user.$qm.validationReportAsync()` | `user.$qValidationReportAsync()` | Promise      |
| `user.$qm.validate(opts?)`         | `user.$qValidate(opts?)`         | sync/Promise |

### 3.2 Métodos directos residuales (de la propuesta X original)

| Antes                            | Después                            | Acción         |
| -------------------------------- | ---------------------------------- | -------------- |
| `user.checkIntegrity()`          | `user.$qCheckIntegrity()`          | Añadir + guard |
| `user.hasChanges()`              | `user.$qHasChanges()`              | Añadir + guard |
| `user.toInterface(seen?,depth?)` | `user.$qToInterface(seen?,depth?)` | Añadir + guard |
| `user.getInitInterface()`        | `user.$qGetInitInterface()`        | Añadir + guard |
| `user.reset()`                   | `user.$qReset()`                   | Añadir + guard |
| `user.toJSON()`                  | **sin cambio**                     | Ver §3.4       |

### 3.3 `QModelCollection`

| Antes                       | Después                       |
| --------------------------- | ----------------------------- |
| `users.serialize(opts?)`    | `users.$qSerialize(opts?)`    |
| `users.checkAllRules()`     | `users.$qCheckAllRules()`     |
| `users.checkRulesAsync()`   | `users.$qCheckRulesAsync()`   |
| `users.toJSON()`            | `users.$qToJSON()`            |
| `users.toCSV(opts?)`        | `users.$qToCSV(opts?)`        |
| `users.where(fn)`           | `users.$qWhere(fn)`           |
| `users.findOne(fn)`         | `users.$qFindOne(fn)`         |
| `users.findIndex(fn)`       | `users.$qFindIndex(fn)`       |
| `users.sort(fn)`            | `users.$qSort(fn)`            |
| `users.sortBy(field)`       | `users.$qSortBy(field)`       |
| `users.paginate(page,size)` | `users.$qPaginate(page,size)` |
| `users.groupBy(field)`      | `users.$qGroupBy(field)`      |
| `users.find(fn)`            | `users.$qFind(fn)`            |
| `users.sortBy(field,opts?)` | `users.$qSortBy(field,opts?)` |
| `users.paginate(page,size)` | `users.$qPaginate(page,size)` |
| `users.groupBy(field)`      | `users.$qGroupBy(field)`      |
| `users.map(fn)`             | `users.$qMap(fn)`             |
| `users.flatMap(fn)`         | `users.$qFlatMap(fn)`         |
| `users.reduce(fn,init)`     | `users.$qReduce(fn,init)`     |
| `users.first()`             | `users.$qFirst()`             |
| `users.last()`              | `users.$qLast()`              |
| `users.every(fn)`           | `users.$qEvery(fn)`           |
| `users.some(fn)`            | `users.$qSome(fn)`            |
| `users.count(fn?)`          | `users.$qCount(fn?)`          |
| `users.sum(field)`          | `users.$qSum(field)`          |
| `users.avg(field)`          | `users.$qAvg(field)`          |
| `users.min(field)`          | `users.$qMin(field)`          |
| `users.max(field)`          | `users.$qMax(field)`          |
| `users.size`                | `users.$qSize`                |
| `users.isEmpty`             | `users.$qIsEmpty`             |

### 3.4 `toJSON()` — única excepción permanente

`toJSON()` **no se renombra** en ninguna clase. La especificación JSON de JavaScript
define que `JSON.stringify(obj)` llama automáticamente a `.toJSON()` si existe. No
es una llamada del usuario — es un protocolo del lenguaje. Renombrarlo a `$qToJSON`
rompería `JSON.stringify(user)` y `JSON.stringify({ user })`.

```typescript
// Sigue funcionando automáticamente
JSON.stringify(user); // → llama user.toJSON() → delega a user.$qSerialize()
JSON.stringify(users); // → llama users.toJSON()
```

### 3.5 Helpers standalone exportados (entry point `quickmodel/forms`)

Estos son funciones de módulo, no propiedades de instancia. El prefijo `$q` aplica
igualmente según la convención del proyecto (§2).

| Antes                               | Después                              |
| ----------------------------------- | ------------------------------------ |
| `qCheckRules(instance, opts?)`      | `$qCheckRules(instance, opts?)`      |
| `qCheckRulesAsync(instance, opts?)` | `$qCheckRulesAsync(instance, opts?)` |
| `qCheckRulesByGroup(instance)`      | `$qCheckRulesByGroup(instance)`      |
| `qCheckRulesByGroupAsync(instance)` | `$qCheckRulesByGroupAsync(instance)` |
| `qGetGroups(instance)`              | `$qGetGroups(instance)`              |
| `qGroups(...names)`                 | `$qGroups(...names)`                 |
| `qGroups5([...names])` (compat)     | `$qGroups5([...names])`              |

> **Nota:** `user.$qCheckRules()` (método de instancia) y `$qCheckRules(user)`
> (helper standalone) coexisten sin conflicto — uno es propiedad de objeto, el otro
> es export de módulo.

### 3.6 Rename de símbolos internos

| Antes                    | Después                                      | Archivo                  |
| ------------------------ | -------------------------------------------- | ------------------------ |
| `_qmCallActive`          | `_qCallActive`                               | `quick.model.ts`         |
| `_assertQmCall(method)`  | `_assertQCall(method)`                       | `quick.model.ts`         |
| `_withQmFlag(fn)`        | `_withQFlag(fn)`                             | `quick.model.ts`         |
| getter `get $qm()`       | eliminado — reemplazado por 22 métodos `$q*` | `quick.model.ts`         |
| `IQMHandle` (interfaz)   | eliminada — sin handle object                | `qm-handle.interface.ts` |
| `qm-handle.interface.ts` | archivo eliminado                            | `src/core/interfaces/`   |

---

## 4. Arquitectura de implementación

### 4.1 Antes (Propuesta W): getter `$qm` que retorna un handle object

```typescript
get $qm(): IQMHandle<TInterface, TAliasMap, this> {
    const self = this;
    return {
        serialize: (opts?) => _withQmFlag(() => self.serialize(opts)),
        isDirty:   (field?) => _withQmFlag(() => self.isDirty(field)),
        // ... 17 métodos dentro del objeto handle
    };
}
```

**Problema:** el objeto `$qm` es intermediario — no aporta semántica real, solo
indirección. Pasar `user.$qm` como `IQMHandle` a una función es el único caso de
uso no trivial, y es rarísimo en la práctica.

### 4.2 Después (Propuesta X): cada método es una propiedad `$q*` directa

```typescript
// Cada método expone directamente la implementación con guard integrado
$qSerialize(opts?: IQSerializationOptions) {
    _assertQCall('$qSerialize');
    _qCallActive = true;
    try {
        return this._serializeImpl(opts);
    } finally {
        _qCallActive = false;
    }
}

$qIsDirty(field?: string): boolean {
    _assertQCall('$qIsDirty');
    _qCallActive = true;
    try {
        return this._isDirtyImpl(field);
    } finally {
        _qCallActive = false;
    }
}

// ... 22 métodos en QModel + 24 en QModelCollection
```

El flag `_qCallActive` sigue siendo necesario para `super.$qSerialize()` cuando
una subclase hace override. El guard se activa al inicio del propio `$q*()`.

### 4.3 Trade-off: pérdida del tipado del handle

Con la propuesta W era posible:

```typescript
function processHandle(handle: IQMHandle<IUser, {}, User>) {
	const data = handle.serialize();
	// ...
}
processHandle(user.$qm); // tipado fuerte
```

Con la propuesta X ese patrón desaparece. El handle object no existe.
Se puede emular con un tipo utilitario si hace falta:

```typescript
type IQInstanceApi<T> = Pick<T, `$q${string}`>;
```

Pero la necesidad real de pasar el handle como argumento es muy rara. El trade-off
es aceptable: API más simple y consistente para el 99% de los casos de uso.

---

## 5. Tests — TDD obligatorio

### 5.1 Orden de trabajo

```
1. Escribir los tests nuevos con la API $q*  →  fallan ("not a function")
2. Implementar el rename en src/
3. Confirmar que los tests nuevos pasan (verde)
4. Actualizar los tests existentes (1085 ocurrencias en 107 archivos)
5. Confirmar suite completa: 0 fallos
```

**Nunca implementar antes de tener los tests que fallen.**

### 5.2 Archivo de tests nuevos (escribir primero)

`tests/unit/q-namespace-v2.test.ts` — debe fallar completamente antes de la implementación:

```typescript
import { Quick } from 'quickmodel';
import { QModel } from 'quickmodel';

@Quick({ createdAt: Date })
class User extends QModel<{ name: string; age: number; createdAt: Date }> {
	declare name: string;
	declare age: number;
	declare createdAt: Date;
}

describe('API $q* — nueva convención', () => {
	const user = new User({ name: 'Alice', age: 30, createdAt: new Date() });

	it('$qSerialize() retorna objeto plano', () => {
		expect(user.$qSerialize()).toEqual(
			expect.objectContaining({ name: 'Alice' })
		);
	});
	it('$qIsDirty() es false al inicio', () => {
		expect(user.$qIsDirty()).toBe(false);
	});
	it('$qIsDirty(field) es false al inicio', () => {
		expect(user.$qIsDirty('name')).toBe(false);
	});
	it('$qPatch() muta y $qGetChanges() refleja el cambio', () => {
		const usr = new User({ name: 'Alice', age: 30, createdAt: new Date() });
		usr.$qPatch({ age: 31 });
		expect(usr.$qIsDirty('age')).toBe(true);
		expect(usr.$qGetChanges()).toEqual({ age: 31 });
	});
	it('$qCopy() retorna nueva instancia', () => {
		const clone = user.$qCopy({ name: 'Bob' });
		expect(clone).toBeInstanceOf(User);
		expect(clone.name).toBe('Bob');
	});
	it('$qDiff() retorna diferencias campo a campo', () => {
		const usr = new User({ name: 'Alice', age: 30, createdAt: new Date() });
		const other = usr.$qCopy({ age: 31 });
		expect(usr.$qDiff(other)).toMatchObject({
			age: { before: 30, after: 31 },
		});
	});
	it('$qEquals() es true para instancias iguales', () => {
		const dateStr = '2026-01-01T00:00:00.000Z';
		const a1 = new User({
			name: 'Alice',
			age: 30,
			createdAt: new Date(dateStr),
		});
		const a2 = new User({
			name: 'Alice',
			age: 30,
			createdAt: new Date(dateStr),
		});
		expect(a1.$qEquals(a2)).toBe(true);
	});
	it('$qHasIntegrity() es true para datos correctos', () => {
		expect(user.$qHasIntegrity()).toBe(true);
	});
	it('$qIsValid() es true para datos sin @QRule', () => {
		expect(user.$qIsValid()).toBe(true);
	});
	it('$qCheckRules() retorna { valid: true }', () => {
		expect(user.$qCheckRules().valid).toBe(true);
	});
	it('$qValidationReport() tiene las tres claves', () => {
		const report = user.$qValidationReport();
		expect(report).toHaveProperty('valid');
		expect(report).toHaveProperty('integrity');
		expect(report).toHaveProperty('rules');
	});
	it('$qCheckIntegrity() retorna array vacío', () => {
		expect(user.$qCheckIntegrity()).toEqual([]);
	});
	it('$qHasChanges() es false al inicio', () => {
		expect(user.$qHasChanges()).toBe(false);
	});
	it('$qToInterface() retorna estado actual', () => {
		expect(user.$qToInterface().name).toBe('Alice');
	});
	it('$qGetInitInterface() retorna snapshot inicial', () => {
		expect(user.$qGetInitInterface().name).toBe('Alice');
	});
	it('$qReset() revierte cambios', () => {
		const usr = new User({ name: 'Alice', age: 30, createdAt: new Date() });
		usr.$qPatch({ age: 99 });
		usr.$qReset();
		expect(usr.age).toBe(30);
	});
});

describe('Guard enforcement — acceso sin $q lanza error', () => {
	it('serialize() sin $q lanza', () => {
		expect(() =>
			(
				new User({ name: 'X', age: 1, createdAt: new Date() }) as any
			).serialize()
		).toThrow('[QuickModel]');
	});
	it('isDirty() sin $q lanza', () => {
		expect(() =>
			(
				new User({ name: 'X', age: 1, createdAt: new Date() }) as any
			).isDirty()
		).toThrow('[QuickModel]');
	});
	it('checkIntegrity() sin $q lanza', () => {
		expect(() =>
			(
				new User({ name: 'X', age: 1, createdAt: new Date() }) as any
			).checkIntegrity()
		).toThrow('[QuickModel]');
	});
	it('reset() sin $q lanza', () => {
		expect(() =>
			(
				new User({ name: 'X', age: 1, createdAt: new Date() }) as any
			).reset()
		).toThrow('[QuickModel]');
	});
});
```

`tests/unit/q-collection-namespace.test.ts` — colecciones:

```typescript
describe('QModelCollection — API $q*', () => {
	const users = UserModel.collection([{ name: 'Alice', age: 30 }]);

	it('$qSerialize() retorna array de objetos planos', () => {
		expect(users.$qSerialize()).toEqual([
			expect.objectContaining({ name: 'Alice' }),
		]);
	});
	it('$qWhere() filtra instancias', () => {
		expect(users.$qWhere((usr) => usr.age > 20).$qSize).toBe(1);
	});
	it('$qCheckAllRules() retorna IQCollectionRulesResult', () => {
		const result = users.$qCheckAllRules();
		expect(result).toHaveProperty('valid');
		expect(result).toHaveProperty('errors');
	});
	it('$qSize retorna número de elementos', () => {
		expect(users.$qSize).toBe(1);
	});
	it('$qIsEmpty es false con elementos', () => {
		expect(users.$qIsEmpty).toBe(false);
	});
	it('toJSON() sigue funcionando — no renombrado (spec JS)', () => {
		expect(() => users.toJSON()).not.toThrow();
	});
	it('$qFind() retorna la primera instancia que cumple el predicado', () => {
		const found = users.$qFind((usr) => usr.name === 'Alice');
		expect(found?.name).toBe('Alice');
	});
	it('$qFirst() retorna el primer elemento', () => {
		expect(users.$qFirst()?.name).toBe('Alice');
	});
	it('$qLast() retorna el último elemento', () => {
		expect(users.$qLast()?.name).toBe('Alice');
	});
});
```

---

## 6. Archivos a modificar — catálogo completo

### 6.1 `src/` — código fuente (33 archivos afectados + renames de archivos)

#### Zona A — Core (hacerla primero, sin dependencias)

| Archivo                                     | Cambios clave                                                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/core/models/quick.model.ts`            | Eliminar getter `$qm`; añadir 22 métodos `$q*` directos; renombrar `_qmCallActive/assertQmCall/withQmFlag` |
| `src/core/models/quick-collection.model.ts` | Renombrar los 24 métodos públicos a `$q*`; mantener `toJSON()`                                             |

#### Zona B — Interfaces, decoradores y config

| Archivo                                       | Cambios clave                                     |
| --------------------------------------------- | ------------------------------------------------- |
| `src/core/interfaces/qm-handle.interface.ts`  | **Eliminar archivo**                              |
| `src/core/interfaces/model.interface.ts`      | Eliminar referencia a `IQMHandle` si existe       |
| `src/core/decorators/qalias.decorator.ts`     | Actualizar JSDoc: `$qm.serialize` → `$qSerialize` |
| `src/core/decorators/qcomputed.decorator.ts`  | Ídem                                              |
| `src/core/decorators/qreadonly.decorator.ts`  | Ídem                                              |
| `src/core/decorators/qrule.decorator.ts`      | Ídem                                              |
| `src/core/decorators/qsensitive.decorator.ts` | Ídem                                              |
| `src/core/decorators/qversion.decorator.ts`   | Ídem                                              |
| `src/core/decorators/validators.ts`           | Ídem                                              |
| `src/core/config/quick.config.ts`             | Actualizar referencias a API pública              |

#### Zona C — Helpers, transformers y entry points

| Archivo                                            | Cambios clave                                          |
| -------------------------------------------------- | ------------------------------------------------------ |
| `src/core/helpers/form-data.helpers.ts`            | Actualizar JSDoc                                       |
| `src/core/helpers/q-check-rules.ts`                | Export `qCheckRules` → `$qCheckRules`                  |
| `src/core/helpers/q-check-rules-async.ts`          | `qCheckRulesAsync` → `$qCheckRulesAsync`               |
| `src/core/helpers/q-check-rules-by-group.ts`       | `qCheckRulesByGroup` → `$qCheckRulesByGroup`           |
| `src/core/helpers/q-check-rules-by-group-async.ts` | `qCheckRulesByGroupAsync` → `$qCheckRulesByGroupAsync` |
| `src/core/helpers/q-get-groups.ts`                 | `qGetGroups` → `$qGetGroups`                           |
| `src/core/helpers/q-groups.ts`                     | `qGroups` → `$qGroups`                                 |
| `src/forms.ts`                                     | Renombrar re-exports                                   |
| `src/index.ts`                                     | Revisar re-exports de helpers                          |
| `src/matchers.ts`                                  | Actualizar JSDoc                                       |
| `src/transformers/*.ts` (9 archivos)               | Actualizar ejemplos en JSDoc                           |

#### Zona D — MCP

| Archivo                                     | Cambios clave                          |
| ------------------------------------------- | -------------------------------------- |
| `src/mcp/prompts/public/add-qgroup.ts`      | Strings con `$qm.` → `$q*()`           |
| `src/mcp/prompts/public/alias-computed.ts`  | Ídem                                   |
| `src/mcp/prompts/public/async-rules.ts`     | Ídem                                   |
| `src/mcp/prompts/public/drizzle.ts`         | Ídem                                   |
| `src/mcp/prompts/public/form-data.ts`       | Ídem                                   |
| `src/mcp/prompts/public/form-validation.ts` | Ídem                                   |
| `src/mcp/prompts/public/full-pipeline.ts`   | Ídem                                   |
| `src/mcp/tools/public/*.ts` (6 afectados)   | descriptions y examples                |
| `src/mcp/locales/en.mcp.ts`                 | descriptions que mencionen API pública |

### 6.2 `tests/` — 107 archivos, 1085 ocurrencias

Todos los `.$qm.METHOD(` → `.$qMETHOD(` en cada test.

- **Zona E:** `tests/unit/` (~60 archivos)
- **Zona F:** `tests/integration/` + `tests/e2e/` + `tests/security/` + `tests/performance/` + `tests/system/` + `tests/mcp/` (~47 archivos)

### 6.3 `docs-vitepress/` — ~100 archivos markdown

Todos los `.$qm.METHOD(` → `.$qMETHOD(` en bloques de código de ejemplo.

- **Zona G:** `docs-vitepress/en/guide/` + `en/examples/` + `en/integrations/`
- **Zona H:** `docs-vitepress/es/guide/` + `es/examples/` + `es/integrations/`
- **Zona I:** `docs-vitepress/en/mcp/` + `docs-vitepress/es/mcp/`

### 6.4 Instrucciones de agente y configuración

- **Zona J:** `.github/copilot-instructions.md` — añadir regla `$q` en tabla de naming (ver §8)
- **Zona J:** `docs-vitepress/proposals/TASKS.md` — marcar X como completada al terminar

---

## 7. Fase de JSDoc — auditoría individual

Tras completar la implementación y los tests, auditar cada símbolo público:

```bash
# Ver referencias al patrón viejo que puedan haber quedado en JSDoc
grep -rn '\$qm\.' src/ --include="*.ts"
grep -rn '\bqCheckRules\b\|\bqGroups\b\|\bqGetGroups\b' src/ --include="*.ts" | grep -v '\$q'
```

Cada símbolo público debe tener su JSDoc con:

- Descripción usando `$q*` como nombre canónico
- `@example` que use la nueva API
- `@see` apuntando a los nuevos nombres si había referencias cruzadas

Herramienta disponible: `mcp: check_jsdocs` detecta exports públicos sin JSDoc o con JSDoc vacío.

---

## 8. Norma a añadir en `.github/copilot-instructions.md`

En la sección **"Reglas de tipado (TypeScript strict)"**, añadir a la tabla:

```markdown
| Convención de prefijos | `IQ` → interfaces/tipos · `Q` → clases modelo/decoradores · `$q` → métodos de instancia y helpers exportados |
```

En la sección de **Herramientas MCP (`validate_usage`)**, añadir:

```markdown
Además de los checks existentes, detecta uso de `$qm.` (patrón v1 — debe ser `$q*()`)
```

---

## 9. Coordinación multi-agente

Este trabajo cubre ~140 archivos de código + ~100 docs. Usar el MCP
`mcp_quickmodel_agent_coordinate` para evitar conflictos entre agentes en paralelo.

### 9.1 Zonas de trabajo independientes

| Zona  | Archivos / Globs                                                                                                            | Depende de                    |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **A** | `src/core/models/**`                                                                                                        | Ninguna — hacerla **primero** |
| **B** | `src/core/interfaces/**` + `src/core/decorators/**` + `src/core/config/**`                                                  | Paralela a C                  |
| **C** | `src/core/helpers/**` + `src/transformers/**` + `src/matchers.ts` + `src/forms.ts` + `src/index.ts`                         | Paralela a B                  |
| **D** | `src/mcp/**`                                                                                                                | Paralela a B y C              |
| **E** | `tests/unit/**`                                                                                                             | Requiere A completada         |
| **F** | `tests/integration/**` + `tests/e2e/**` + `tests/security/**` + `tests/performance/**` + `tests/system/**` + `tests/mcp/**` | Requiere A completada         |
| **G** | `docs-vitepress/en/guide/**` + `docs-vitepress/en/examples/**` + `docs-vitepress/en/integrations/**`                        | Independiente                 |
| **H** | `docs-vitepress/es/guide/**` + `docs-vitepress/es/examples/**` + `docs-vitepress/es/integrations/**`                        | Independiente                 |
| **I** | `docs-vitepress/en/mcp/**` + `docs-vitepress/es/mcp/**`                                                                     | Independiente                 |
| **J** | `.github/copilot-instructions.md` + `docs-vitepress/proposals/**`                                                           | Independiente                 |

### 9.2 Protocolo de trabajo por agente

```typescript
// 1. SIEMPRE al inicio — verificar que la zona no está reclamada
mcp_quickmodel_agent_coordinate({ action: 'check' });

// 2. Reclamar antes de empezar
mcp_quickmodel_agent_coordinate({
	action: 'claim',
	agentId: 'agent-zona-A-001', // identificador único por sesión
	task: 'Rename $qm → $q* en quick.model.ts y quick-collection.model.ts',
	files: ['src/core/models/**'],
	ttlMs: 1800000, // 30 min para zonas grandes
});

// 3. Actualizar heartbeat cada ~15 min en tareas largas
mcp_quickmodel_agent_coordinate({
	action: 'update',
	agentId: 'agent-zona-A-001',
});

// 4. SIEMPRE al terminar — liberar la zona
mcp_quickmodel_agent_coordinate({
	action: 'release',
	agentId: 'agent-zona-A-001',
});
```

### 9.3 Orden de ejecución recomendado (sprints)

```
Sprint 1 (paralelo): A + B + C + D + J
    ↓
Sprint 2 (paralelo, requiere A completa): E + F
    ↓
Sprint 3 (paralelo, independiente): G + H + I
    ↓
Sprint 4: JSDoc audit completo (§7)
    ↓
Sprint 5: bun run check + mcp check_security → misión cumplida
```

### 9.4 Criterios de "Zona completada"

1. `bunx tsc --noEmit` → 0 errores _(solo aplica al terminar A+B+C+D)_
2. Tests de la zona → 0 fallos
3. `mcp: check_project_rules` → 0 violaciones en esa zona
4. Zona liberada en el coordinador

---

## 10. Criterios de "Propuesta X completada"

```bash
# 1. TypeScript
bunx tsc --noEmit                                              # → 0 errores

# 2. Suite completa (incluye q-namespace-v2 y q-collection-namespace)
bun test                                                       # → 0 fallos

# 3. Sin rastro del patrón viejo en src/
grep -rn '\$qm\.' src/ --include="*.ts"                        # → 0 resultados
grep -rn '\bqCheckRules\b\|\bqGroups\b\|\bqGetGroups\b' src/ --include="*.ts" | grep -v '\$q'  # → 0

# 4. Sin rastro del patrón viejo en tests/
grep -rn '\$qm\.' tests/ --include="*.ts"                      # → 0 resultados

# 5. Sin rastro del patrón viejo en docs/
grep -rn '\$qm\.' docs-vitepress/ --include="*.md" | grep -v 'reserved-words'  # → 0

# 6. Seguridad intacta
mcp: check_security                                            # → passed: true

# 7. Reglas del proyecto
mcp: check_project_rules                                       # → 0 violaciones
```

---

## 11. Esfuerzo estimado por zona

| Zona                                      | Archivos | Estimación  |
| ----------------------------------------- | -------- | ----------- |
| A — Núcleo                                | 2        | 3-4h        |
| B — Interfaces + decoradores + config     | 10       | 2h          |
| C — Helpers + transformers + entry points | 14       | 2h          |
| D — MCP                                   | ~13      | 1.5h        |
| E — `tests/unit/`                         | ~60      | 3h          |
| F — `tests/` resto                        | ~47      | 2.5h        |
| G — docs EN                               | ~50      | 2h          |
| H — docs ES                               | ~50      | 2h          |
| I — docs MCP                              | ~8       | 45m         |
| J — instrucciones + proposals             | 2        | 30m         |
| JSDoc audit (Sprint 4)                    | 33       | 2h          |
| **Total**                                 | **~289** | **~21-24h** |
