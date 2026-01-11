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

## La palabra clave `declare` (CRÍTICO)

Cuando uses `@QType` (o `@Quick`), **DEBES** usar la palabra clave `declare` para tus propiedades.

### ✅ Uso Correcto

```typescript
class User extends QModel<IUser> {
	@QType(String)
	declare name: string; // ✅ Crea definición de metadatos, NO código JavaScript
}
```

Esto asegura que TypeScript emita los metadatos de tipo pero **no** genere código de inicialización de propiedades que sobrescribiría los getters/setters de QuickModel.

### ❌ Uso Incorrecto

**NO uses `!` (Aserción de Asignación Definitiva) ni `=` (Inicializadores).**

```typescript
// ❌ MAL: ¡Sin `@Quick`, esto falla!
// El operador '!' (con useDefineForClassFields: true) crea un inicializador de propiedad
// que corre DESPUÉS del decorador, sobrescribiendo tu getter con 'undefined'.
class User extends QModel<IUser> {
  @QType(String)
  name!: string;
}

// ✅ BIEN: ¡Si usas `@Quick` en la clase, esto se arregla automáticamente!
@Quick()
class User extends QModel<IUser> {
  @QType(String)
  name!: string; // Funciona porque @Quick limpia la instancia
}

// ❌ MAL: Los inicializadores se ejecutan DESPUÉS de que se crea el modelo.
// Esto sobrescribe los datos deserializados con "Default".
@QType(String)
status = 'Default';
}
```

### ¿Por qué falla esto?

1.  **Los decoradores corren primero**: QuickModel reemplaza tu propiedad con un Getter/Setter para interceptar lecturas/escrituras y manejar los datos subyacentes.
2.  **Los inicializadores corren segundo**: Cuando haces `name!: string` o `name = "x"`, TypeScript/Babel genera código en el constructor: `this.name = void 0` o `this.name = "x"`.
3.  **Sombreado (Shadowing)**: Esta asignación directa en la instancia **sombrea** (oculta) el Getter/Setter definido en el prototipo. Tu propiedad se convierte en una propiedad plana y tonta, desconectada de QuickModel.

**Usa siempre `declare`.**

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
	@QType((v) => Number(v) * 100)
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
