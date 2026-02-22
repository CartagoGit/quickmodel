# Decorador @QType

Aunque el decorador de clase [`@Quick`](./quick-decorator) es la forma **recomendada** de definir modelos (es más limpio y evita redundancia), QuickModel también proporciona el decorador de propiedad `@QType` para un control granular.

::: info RECOMENDACIÓN
Recomendamos encarecidamente usar **`@Quick`** para el 95% de los casos. Mantiene los tipos ordenados en un solo lugar y evita ensuciar la clase con decoradores. Usa `@QType` solo cuando necesites sobrescrituras específicas para un solo campo o prefieras una decoración explícita.
:::

## Uso

Coloca `@QType` antes de una declaración de propiedad para indicar explícitamente a QuickModel cómo manejar esa propiedad.

```typescript
class User extends QModel<IUser> {
	// 1. Uso Estándar (Constructor)
	@QType(Date)
	declare createdAt: Date;

	// 2. Alias de Cadena
	@QType('bigint')
	declare balance: bigint;

	// 3. Transformador Personalizado (Deserializador)
	@QType((val) => String(val).toUpperCase())
	declare code: string;

	// 4. Opciones Avanzadas (Transformador + Serializador)
	@QType(Date, {
		serializer: (date) => date.toISOString(),
	})
	declare modifiedAt: Date;
}
```

## Sintaxis de campos — `declare` vs `!`

La sintaxis correcta para los campos depende del modo de decoradores de TypeScript que estés usando.

| Modo       | `tsconfig.json`                | Sintaxis de campo requerida |
| ---------- | ------------------------------ | --------------------------- |
| **Legacy** | `experimentalDecorators: true` | `declare nombreCampo: Tipo` |
| **TC39**   | _(sin configuración)_          | `nombreCampo!: Tipo`        |

### Modo legacy — usa `declare`

Cuando `experimentalDecorators: true` está configurado, los campos decorados **deben** usar la palabra clave `declare`.

```typescript
// Modo legacy (experimentalDecorators: true)
class User extends QModel<IUser> {
	@QType(String)
	declare name: string; // ✅ Solo emite metadatos — sin código inicializador JS
}
```

Esto asegura que TypeScript emita los metadatos de tipo pero **no** genere código de inicialización que sobrescribiría los getters/setters de QuickModel.

#### ❌ Incorrecto en modo legacy

```typescript
// ❌ MAL: Sin `@Quick`, el inicializador '!' corre DESPUÉS del decorador
// y sobrescribe el getter/setter que QuickModel puso en el prototipo.
class User extends QModel<IUser> {
	@QType(String)
	name!: string; // el inicializador pone this.name = undefined → sombrea el getter ❌
}

// ✅ BIEN: @Quick() limpia los efectos secundarios del inicializador.
@Quick()
class User extends QModel<IUser> {
	@QType(String)
	name!: string; // Funciona — @Quick gestiona el ciclo de vida
}

// ❌ MAL: Los inicializadores de valor también se ejecutan después de la deserialización.
class User extends QModel<IUser> {
	@QType(String)
	status = 'Default'; // sobrescribe los datos deserializados ❌
}
```

::: tip RECOMENDACIÓN
**Siempre usa `@Quick()` en la clase** si defines valores por defecto (`name = "default"`) o inicialización estricta (`name!`). Esto garantiza un comportamiento robusto al dejar que QuickModel gestione el ciclo de vida de la propiedad.
:::

#### ¿Por qué falla esto?

1. **Los decoradores corren primero** — QuickModel reemplaza la propiedad con un getter/setter en el prototipo.
2. **Los inicializadores corren segundo** — `name!: string` o `name = "x"` genera `this.name = void 0` / `this.name = "x"` dentro del constructor.
3. **Sombreado** — La asignación directa en la instancia oculta el getter/setter del prototipo. La propiedad se convierte en una propiedad plana desconectada de QuickModel.

### Modo TC39 — usa `!`

En el modo de decoradores TC39 (`experimentalDecorators` ausente o `false`), TypeScript **no llama a los decoradores de campo en campos `declare`**. Debes usar `!` en cada campo decorado con `@QType`.

```typescript
// Modo TC39 (sin experimentalDecorators)
@Quick()
class User extends QModel<IUser> {
	@QType(Date)
	createdAt!: Date; // ✅ Modo TC39 — usa ! (no declare)

	@QType(String)
	name!: string; // ✅
}
```

::: warning TC39 sin `@Quick`
Incluso en modo TC39, omitir `@Quick()` junto con `useDefineForClassFields: true` (por defecto en targets ES2022+) puede hacer que el inicializador del campo sombree el getter de QuickModel. Siempre combina `@Quick()` con `@QType()` en modo TC39.
:::

## Modo TC39 — comportamiento de `addInitializer`

En modo TC39, `@QType` registra los metadatos del campo mediante el callback `addInitializer` provisto por el contexto del decorador TC39. Esto significa:

- Los metadatos se registran **en la primera creación de instancia**, no en tiempo de definición de la clase.
- Las instanciaciones posteriores están protegidas por una guardia de deduplicación interna (WeakSet), por lo que los metadatos se escriben una sola vez por clase.
- El timing es seguro: `addInitializer` se ejecuta antes de que `QModel.initialize()` lea los metadatos.

```typescript
// Modo TC39 — los metadatos se registran cuando se crea la primera instancia
@Quick()
class Post extends QModel<IPost> {
	@QType(Date)
	publishedAt!: Date;

	@QType([String]) // array de strings
	tags!: string[];
}

// ← En este punto la clase está definida pero los metadatos AÚN NO están registrados
const post = Post.create({
	publishedAt: '2025-01-01',
	tags: ['ts', 'decorators'],
});
// ← addInitializer ejecutado: metadatos registrados → publishedAt es Date ✅
```

## ¿Cuándo usar @QType?

Aunque `@Quick` es preferible, `@QType` brilla en escenarios específicos:

### 1. Estrategias Mixtas

Quieres auto-mapear todo con `@Quick()` pero sobrescribir manualmente un campo específico.

```typescript
@Quick() // Auto-detecta la mayoría de campos
class Product extends QModel<IProduct> {
	declare name: string;
	declare price: number;

	// Sobrescribir específicamente para este campo
	@QType((val) => Number(val) * 100)
	declare centAmount: number;
}
```

### 2. Control Manual

Prefieres la decoración explícita en cada campo para mayor visibilidad, similar a librerías como `TypeORM` o `class-validator`.

### 3. Uso Aislado

Estás modificando una clase heredada y solo quieres introducir propiedades de QuickModel una por una.

## Opciones Avanzadas

`@QType` acepta un segundo argumento para control avanzado localizado, similar a las opciones globales de `@Quick` pero con alcance al propiedad individual.

```typescript
@QType(String, {
  // Deserialización Personalizada (JSON -> Modelo)
  transformer: (val) => val.trim(),

  // Serialización Personalizada (Modelo -> JSON)
  serializer: (val) => val + "_serialized",

  // Generación de Mock Personalizada
  mocker: () => "mocked_value"
})
declare myField: string;
```
