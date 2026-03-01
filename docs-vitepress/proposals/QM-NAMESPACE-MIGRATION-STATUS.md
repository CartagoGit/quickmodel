# Estado de migración — Namespace `$qm` (v2.0.0)

> **Actualizado:** 1 de marzo de 2026
> **Relacionado con:** [QM-NAMESPACE-REFACTOR.md](./QM-NAMESPACE-REFACTOR.md)

---

## ✅ Lo que ya está hecho

### Implementación en `src/`

- **`src/core/models/quick.model.ts` línea 804**: getter `$qm` implementado.
  Retorna `IQMHandle<TInterface, TAliasMap, this>` con todos los métodos de infraestructura.
- Los métodos raíz de la instancia **siguen existiendo** (backward compat para v1.x).
- Los `@example` en JSDoc ya usan `user.$qm.serialize()`, `user.$qm.checkRules()`, etc.

### JSDoc en `src/` actualizados

Los siguientes archivos tienen sus JSDoc/ejemplos usando la API `$qm`:

| Archivo                                                | Estado                           |
| ------------------------------------------------------ | -------------------------------- |
| `src/core/models/quick.model.ts`                       | ✅ Todos los @example usan `$qm` |
| `src/core/decorators/qalias.decorator.ts`              | ✅                               |
| `src/core/decorators/qreadonly.decorator.ts`           | ✅                               |
| `src/core/decorators/quick.decorator.ts`               | ✅                               |
| `src/core/interfaces/quick-options.interface.ts`       | ✅                               |
| `src/core/interfaces/serialization-types.interface.ts` | ✅                               |
| `src/core/services/serializer.service.ts`              | ✅                               |
| `src/matchers.ts`                                      | ✅                               |

### Docs en `docs-vitepress/` actualizados

**Script aplicado el 1 Mar 2026:** reemplazó 722 ocurrencias de `.$qm.$qm.` → `.$qm.` en 110 archivos
(error previo de un agente que aplicó el prefijo dos veces).

Archivos de integración **completamente migrados a `$qm`**:

- `en/integrations/vue-integration.md` + ES
- `en/integrations/angular-integration.md` + ES
- `en/integrations/redux-toolkit-integration.md` + ES
- `en/integrations/zustand-integration.md` + ES
- `en/integrations/react-integration.md` + ES
- `en/integrations/bun-integration.md` + ES
- `en/integrations/nestjs-integration.md` + ES
- (todos los demás archivos de integración)

Guías **completamente migradas**:

- `en/guide/serialization.md` + ES
- `en/guide/validation.md` + ES
- `en/guide/qmodel.md` + ES
- `en/guide/qreadonly.md` + ES
- `en/guide/qalias.md` + ES
- `en/guide/i18n.md` + ES
- `en/guide/reserved-words.md` + ES
- (todas las demás guías)

---

## ⚠️ Lo que NO se debe cambiar

Los siguientes patrones **son correctos sin `$qm`** y no deben modificarse:

### 1. Constructor inline — OK sin `$qm`

```typescript
// ✅ Correcto — instancia temporal, forma idiomática v1
new UserDto(raw).$qm.serialize();
// Si la instancia se crea inline, $qm sigue siendo necesario
```

### 2. Métodos de `QCollection` — nunca usan `$qm`

```typescript
// ✅ Correcto — QCollection tiene .serialize() propio, no es QModel
users.serialize();
users.serialize({ pick: ['id', 'name'] });
```

### 3. Métodos de transformers — nunca usan `$qm`

```typescript
// ✅ Correcto — transformer.serialize() es el método del transformer, no de QModel
const serialized = transformer.serialize(money);
```

### 4. Texto descriptivo en tablas o prosa — OK sin `$qm` si es descripción

```markdown
| Serialization | `.serialize()` / `.toJSON()` |
```

→ Si la tabla describe la API, usa `` `$qm.serialize()` `` para ser preciso.

### 5. MCP tool descriptions (`instance.checkRulesAsync()`)

Las descripciones de herramientas MCP mencionan `instance.$qm.checkRules()` porque
describen el comportamiento interno. La API ya tiene `$qm` en el texto donde aplica.

---

## 🔍 Cómo verificar el estado actual

```bash
# Buscar residuos de $qm.$qm doble (debería dar 0)
find docs-vitepress -name "*.md" -exec grep -l 'qm\.\$qm' {} \; | wc -l

# Buscar API antigua sin $qm en src/ JSDoc
grep -rn "user\.\|order\." src/ --include="*.ts" | grep -E "\.(serialize|patch|copy|checkRules|validate|isValid)\b" | grep " \* " | grep -v '\$qm\.'

# Ver todos los usos de $qm en src/ (para referencia)
grep -rn '\$qm\.' src/core/models/quick.model.ts | head -20
```

---

## 📋 Checklist para el siguiente agente

- [x] `$qm` getter implementado en `quick.model.ts`
- [x] JSDoc en todos los archivos `src/` usan `$qm`
- [x] Docs EN y ES migrados a `$qm` (722 correcciones automáticas + manuales)
- [x] `$qm.$qm` dobles corregidos en 110 archivos
- [ ] Tests (`tests/unit/`, `tests/integration/`) — verificar si usan API antigua
- [ ] `CHANGELOG.md` — añadir entrada para v2.0.0 con guía de migración
- [ ] Deprecation warnings en métodos raíz (fase 1 de la propuesta)
- [ ] `IQMHandle` interface exportada desde `src/index.ts`
