# Convenciones de Nombrado — `IQ`, `Q` y `$q`

QuickModel utiliza un sistema de nomenclatura de tres capas en toda su API pública. Cada símbolo — ya sea un tipo, una clase, un decorador o un método de instancia — pertenece exactamente a una de estas tres capas. Entender el sistema hace que el código sea instantáneamente legible y predecible.

## Las Tres Capas de un Vistazo

| Prefijo | Capa                                               | Ejemplos                                         |
| ------- | -------------------------------------------------- | ------------------------------------------------ |
| `IQ`    | Tipos e interfaces (solo en tiempo de compilación) | `IQImplements`, `IQConfig`, `IQValidationReport` |
| `Q`     | Clases y decoradores (entidades runtime)           | `QModel`, `QField`, `QAlias`, `QDefault`         |
| `$q`    | Métodos de instancia inyectados por el framework   | `$qSerialize()`, `$qCopy()`, `$qValidate()`      |

---

## Capa 1 — `IQ`: Tipos e Interfaces

El prefijo `IQ` marca los tipos e interfaces de TypeScript que pertenecen a QuickModel. Existen **solo en tiempo de compilación** y se borran completamente en runtime.

El prefijo combina dos convenciones:

- `I` — el prefijo estándar de TypeScript para interfaces (usado en todo este proyecto)
- `Q` — el namespace de QuickModel

Este doble prefijo separa claramente los tipos del framework de tus propios tipos de dominio. Cuando ves `IUser` en un codebase, ese es tu tipo. Cuando ves `IQValidationReport`, pertenece a la librería.

```typescript
import {
	IQImplements, // asegura el contrato clase ↔ interfaz
	IQConfig, // forma de la configuración global
	IQValidationReport, // resultado de $qValidate()
	IQCreateManyResult, // resultado de QModel.createMany()
	IQFormSchemaEntry, // forma de una entrada de esquema @QField
} from 'quickmodel';

interface IUser {
	// ← tu tipo de dominio — prefijo "I" simple
	id: number;
	name: string;
	createdAt: string;
}

interface IUserTransforms {
	// ← también tuyo
	createdAt: Date;
}

@Quick({ createdAt: Date }) // ← tipo de la librería
class User
	extends QModel<IUser>
	implements IQImplements<IUser, IUserTransforms>
{
	declare id: number;
	declare name: string;
	declare createdAt: Date;
}
```

> [!TIP] Distinguir al instante
> `IUser` → tu tipo. `IQUser` → pertenecería a QuickModel (aunque la librería no tiene ese tipo). La `Q` en medio es la señal del namespace.

---

## Capa 2 — `Q`: Clases y Decoradores

El prefijo `Q` marca **entidades runtime** que forman parte de la API pública: clases base y decoradores.

```typescript
// Clase base — todos los modelos extienden esta
class User extends QModel<IUser> { ... }
class UserCollection extends QModelCollection<User> { ... }

// Decoradores — aplicados a la clase o sus propiedades
@Quick({ createdAt: Date })          // mapa de transformaciones
@QField({ label: 'Nombre completo' }) // metadatos del campo
@QAlias('first_name')                // reemplazo de clave
@QDefault('active')                  // valor por defecto
@QReadonly()                         // campo inmutable
@QTransform(v => v.trim())           // transformación personalizada
@QRule(v => v.id > 0, 'id > 0')     // regla de negocio
```

### ¿Por qué `Q` y no la palabra completa?

Considera qué pasaría si el prefijo fuera `QuickModel`:

```typescript
// ❌ Verboso — difícil de leer, ruidoso en los diffs
class User
	extends QuickModelBase<IUser>
	implements QuickModelImplements<IUser, IUserTransforms>
{
	@QuickModelField({ label: 'Nombre' })
	@QuickModelAlias('full_name')
	declare name: string;
}

// ✅ Conciso — la Q ya señala el namespace sin ambigüedad
class User
	extends QModel<IUser>
	implements IQImplements<IUser, IUserTransforms>
{
	@QField({ label: 'Nombre' })
	@QAlias('full_name')
	declare name: string;
}
```

`Q` es suficientemente corto para escribirlo decenas de veces al día sin fricción, pero suficientemente distintivo para que no haya colisión realista con nombres de clases del usuario (`Queue`, `Query`, etc. son comunes, pero `QModel` no lo es).

Esto sigue el mismo patrón que otras librerías populares: React exporta `Component`, no `ReactComponent`; RxJS exporta `Observable`, no `RxJSObservable`.

---

## Capa 3 — `$q`: Métodos de Instancia

El prefijo `$q` marca métodos que QuickModel **inyecta en cada instancia del modelo**. Esta es la capa más importante de entender, porque resuelve un problema técnico concreto.

### El problema de las colisiones

Una instancia de QuickModel lleva tanto tus datos de dominio _como_ los métodos del framework en el mismo objeto. Si el framework usara nombres de métodos simples, cualquier campo que definieras podría silenciosamente ocultar un método del framework:

```typescript
// Imagina que el framework usara nombres simples:
class Order extends QModel<IOrder> {
	declare id: number;
	declare serialize: string; // ← campo de tu API
}

const order = new Order({ id: 1, serialize: 'json' });
order.$qSerialize(); // ← 💥 TypeError: order.serialize is not a function
//    el campo ocultó el método del framework
```

El carácter `$` es válido en identificadores de JavaScript pero **nunca aparece en nombres de campos reales**. Ningún payload JSON llega con una clave como `$qSerialize`. Esto hace que `$q` sea un namespace libre de colisiones:

```typescript
class Order extends QModel<IOrder> {
	declare id: number;
	declare serialize: string; // ← tu campo, intacto
}

const order = new Order({ id: 1, serialize: 'json' });
order.serialize; // ← 'json'      — tu campo
order.$qSerialize(); // ← { id: 1, serialize: 'json' } — método del framework
```

### La convención `$` viene del mundo de los frameworks

Angular introdujo `$scope.$watch()` y `$http.get()` exactamente por esta razón. Vue usa `vm.$emit()`, `vm.$refs`, `vm.$router`. El prefijo `$` señala _"esto pertenece al framework, no a tus datos"_. QuickModel lo precisa aún más con `q` para evitar chocar con otras librerías que también usan `$`.

### Todos los métodos `$q`

Cada instancia de `QModel` expone el conjunto completo de métodos del framework bajo el prefijo `$q`. Las categorías siguientes los agrupan por área de responsabilidad:

```typescript
const user = new User({ id: 1, name: 'Alice', createdAt: '2026-01-01' });

// Serialización
user.$qSerialize(); // → objeto plano (compatible con JSON)
user.$qToJSON(); // → cadena JSON
user.$qToFormData(); // → FormData (para formularios multipart)
user.$qToReadableStream(); // → ReadableStream (para server-sent events)

// Validación / integridad
user.$qCheckIntegrity(); // → IQIntegrityResult (comprobación de tipos)
user.$qHasIntegrity(); // → boolean
user.$qCheckRules(); // → IQRulesResult (reglas de negocio, sync)
user.$qIsValid(); // → boolean
user.$qValidate(); // → IQValidationReport
user.$qValidationReport(); // → igual que $qValidate() pero retorna solo el informe
await user.$qCheckRulesAsync(); // → IQRulesResult (reglas async)
await user.$qIsValidAsync(); // → boolean
await user.$qValidationReportAsync(); // → IQValidationReport

// Seguimiento de estado
user.$qToInterface(); // → IUser (objeto plano tipado)
user.$qGetInitInterface(); // → estado inicial cuando se creó la instancia
user.$qHasChanges(); // → boolean
user.$qGetChangedFields(); // → array de claves de campos cambiados
user.$qGetDirtyFields(); // → alias de $qGetChangedFields()
user.$qIsDirty(); // → boolean
user.$qGetChanges(); // → mapa de valores anteriores → nuevos

// Helpers de mutación
user.$qReset(); // → restaura la instancia a su estado inicial
user.$qPatch(data); // → aplica una actualización parcial
user.$qCopy(); // → copia profunda de la instancia
user.$qDiff(other); // → diferencia a nivel de campo con otra instancia
user.$qEquals(other); // → igualdad profunda booleana
user.$qFrom(data); // → crea una nueva instancia desde datos planos
user.$qFromJSON(json); // → crea una nueva instancia desde una cadena JSON

// Esquema y metadatos
user.$qToPlain(); // → objeto plano sin metadatos del framework
user.$qGetFormSchema(); // → esquema de formulario plano de los decoradores @QField
user.$qGetFormSchemaGrouped(); // → esquema de formulario agrupado por @QGroup
user.$qGetMetadata(); // → mapa completo de metadatos de campos
user.$qGetSchema('json'); // → JSON Schema para este modelo
user.$qGetSchema('zod'); // → esquema Zod para este modelo
```

> [!NOTE] `$q` solo en `QModel` y `QModelCollection`
> El prefijo `$q` existe específicamente para evitar colisiones entre los métodos del framework y los **nombres de campos definidos por el usuario**. Por eso solo es necesario en las clases que los usuarios extienden con sus propias propiedades — `QModel` y `QModelCollection`.
>
> Las clases utilitarias del framework que los usuarios instancian pero **no extienden** — `QMockBuilder`, `QSerializer`, `QDeserializer`, `QJsonSchemaGenerator`, `QModelConfigService` y el resto — usan nombres de métodos simples (`empty()`, `random()`, `generate()`) porque en esas clases no existe ningún conflicto posible con nombres de campos.

### Beneficio en el autocompletado del IDE

Como todos los métodos del framework comparten el prefijo `$q`, obtienes una lista de autocompletado enfocada en el momento en que escribes `.$q`:

```
user.$q|
        ├── $qCheckIntegrity()
        ├── $qCheckRules()
        ├── $qCopy()
        ├── $qDiff()
        ├── $qEquals()
        ├── $qFrom()
        ├── $qFromJSON()
        ├── $qGetChangedFields()
        ├── $qGetChanges()
        ├── $qGetDirtyFields()
        ├── $qGetFormSchema()
        ├── $qGetFormSchemaGrouped()
        ├── $qGetInitInterface()
        ├── $qGetMetadata()
        ├── $qGetSchema()
        ├── $qHasChanges()
        ├── $qHasIntegrity()
        ├── $qIsDirty()
        ├── $qIsValid()
        ├── $qIsValidAsync()
        ├── $qPatch()
        ├── $qReset()
        ├── $qSerialize()
        ├── $qToFormData()
        ├── $qToInterface()
        ├── $qToJSON()
        ├── $qToPlain()
        ├── $qToReadableStream()
        ├── $qValidate()
        ├── $qValidationReport()
        └── $qValidationReportAsync()
```

Tus propiedades de dominio (`id`, `name`, `createdAt`) aparecen por separado y nunca se mezclan con los métodos del framework.

---

## Todo Junto

Un modelo completo que usa las tres capas:

```typescript
import {
	QModel, // Q  — clase base
	IQImplements, // IQ — tipo de contrato en tiempo de compilación
	IQValidationReport, // IQ — tipo para el resultado de validación
	Quick, // Q  — decorador
	QField, // Q  — decorador
	QAlias, // Q  — decorador
	QRule, // Q  — decorador
} from 'quickmodel';

// Tus tipos de dominio (prefijo "I" simple — no son parte de QuickModel)
interface IUser {
	id: number;
	full_name: string;
	created_at: string;
}
interface IUserTransforms {
	created_at: Date;
}

// La clase del modelo
@Quick({ created_at: Date }) // Q
// IQ
class User
	extends QModel<IUser>
	implements IQImplements<IUser, IUserTransforms>
{
	declare id: number;

	@QField({ label: 'Nombre completo' }) // Q
	@QAlias('full_name') // Q
	declare name: string;

	@QRule((u) => u.id > 0, 'El ID debe ser positivo') // Q
	declare created_at: Date;
}

// Uso — los métodos $q siempre están disponibles
const user = new User({ id: 1, full_name: 'Alice', created_at: '2026-01-01' });

const json = user.$qSerialize(); // $q — método del framework
const copy = user.$qCopy(); // $q — método del framework
const report: IQValidationReport = await user.$qValidate(); // IQ — tipo // $q — método del framework
```

---

## ¿Por Qué No `quickmodel_`?

Para completar el cuadro, esta es la razón por la que se descartó la alternativa obvia:

| Criterio                                  | `quickmodel_serialize()`     | `$qSerialize()`      |
| ----------------------------------------- | ---------------------------- | -------------------- |
| Caracteres a escribir                     | 24                           | 13                   |
| Trigger de autocompletado                 | debes escribir `quickmodel_` | escribe `.$q`        |
| Legibilidad en línea de 100 chars         | ruidoso                      | limpio               |
| Riesgo de colisión con campos del usuario | casi nulo (igual que `$q`)   | casi nulo            |
| Precedente de convención                  | ninguno                      | Angular, Vue, jQuery |

Los prefijos cortos ganan en ergonomía sin sacrificar claridad, que es el principio rector de todo el sistema de nomenclatura de QuickModel.
