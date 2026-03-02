# Palabras Reservadas

## Por qué existe esta página

En v1.0, QuickModel resolvió definitivamente el problema de colisión de nombres de campos. Todos los métodos de la librería llevan ahora un prefijo **`$q`** — `$qSerialize()`, `$qCopy()`, `$qCheckRules()`, etc. — de forma que nunca chocan con tus campos de dominio.

**No existen nombres de campo reservados** en v1.0. Cualquier nombre plano está disponible para tu modelo de dominio.

---

## Sin nombres de campo reservados

Cualquier nombre que se te ocurra es seguro como nombre de campo. Campos como `history`, `copy`, `serialize`, `validate` o `checkRules` funcionan sin ningún conflicto:

```typescript
// ✅ Todos válidos en v1.0
interface IOrder {
	history: IOrderEvent[]; // ✅ sin conflicto
	copy: string; // ✅ sin conflicto
	validate: boolean; // ✅ sin conflicto
	serialize: string; // ✅ sin conflicto
	checkRules: number; // ✅ sin conflicto
}

@Quick({
	history: 'array',
	copy: 'string',
	validate: 'boolean',
	serialize: 'string',
	checkRules: 'number',
})
class Order extends QModel<IOrder> {
	declare history: IOrderEvent[];
	declare copy: string;
	declare validate: boolean;
	declare serialize: string;
	declare checkRules: number;
}
```

Este es el objetivo de diseño central del prefijo `$q*`: la infraestructura de la librería y los datos del dominio viven en espacios de nombres completamente separados.

---

## Los métodos `$q*` — referencia rápida

Todos los métodos de instancia expuestos por QuickModel usan el prefijo `$q`:

| Método                     | Descripción                                            |
| -------------------------- | ------------------------------------------------------ |
| `$qSerialize()`            | Convierte la instancia en un objeto plano              |
| `$qCopy(changes?)`         | Devuelve una nueva copia inmutable con cambios         |
| `$qPatch(changes)`         | Muta la instancia en su lugar                          |
| `$qPopulate(data)`         | Rellena campos desde datos planos                      |
| `$qDiff(other)`            | Devuelve las diferencias campo a campo                 |
| `$qEquals(other)`          | Compara dos instancias                                 |
| `$qCheckRules()`           | Ejecuta los predicados `@QRule` (síncrono)             |
| `$qCheckRulesAsync()`      | Versión asíncrona de `$qCheckRules`                    |
| `$qIsValid()`              | Atajo de conveniencia — ejecuta todas las validaciones |
| `$qCheckIntegrity()`       | Comprobación de integridad                             |
| `$qIsDirty()`              | Si la instancia tiene cambios no guardados             |
| `$qGetChanges()`           | Devuelve los campos cambiados                          |
| `$qToFormData()`           | Convierte a FormData                                   |
| `$qToReadableStream()`     | Convierte a ReadableStream                             |
| `$qFromStream()`           | Puebla desde un stream                                 |
| `$qPipeStream()`           | Conecta a un writable stream                           |
| `$qConfigure()`            | Configuración por instancia                            |
| `$qGetFormSchema()`        | Devuelve el schema de formulario QField                |
| `$qGetFormSchemaGrouped()` | Devuelve el schema agrupado por `@QGroup`              |

Los métodos estáticos (llamados en la clase, no en una instancia) **no** usan el prefijo `$q` porque no existe riesgo de colisión:

```typescript
User.getSchema('json');
User.getFormSchema();
User.getFormSchemaGrouped();
```

---

## Resumen

| Comportamiento en v1.0                                    | Detalles                                              |
| --------------------------------------------------------- | ----------------------------------------------------- |
| Nombres de campo reservados                               | **Ninguno**                                           |
| Todos los nombres planos (`history`, `copy`, …)           | Disponibles libremente como nombres de campo          |
| Métodos de instancia de la librería                       | Todos llevan prefijo `$q` — sin colisiones            |
| Métodos estáticos de clase (`getSchema`, `getFormSchema`) | Sin prefijo — se llaman en la clase, no en instancias |
