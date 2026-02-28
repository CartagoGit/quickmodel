# Generación de Mocks

QuickModel incluye un potente generador de mocks integrado impulsado por `@faker-js/faker`, que viene **incluido automáticamente** con la librería. No necesitas instalar nada extra.

## Uso Básico

Cada QModel tiene un método estático `.mock()` que devuelve un **Mock Builder**. Debes llamar a `.random()` o `.array()` para obtener los datos reales.

```typescript
@Quick({ name: String, email: String, isActive: Boolean })
class User extends QModel<IUser> {
	declare name: string;
	declare email: string;
	declare isActive: boolean;
}

// 1. Generar una sola instancia aleatoria
const user = User.mock().random();
console.log(user instanceof User); // true

// 2. Generar un array de 10 instancias
const users = User.mock().array(10);
console.log(users.length); // 10

// 3. Generar con sobrescrituras parciales (datos fijos)
const admin = User.mock().random({ role: 'admin' });
console.log(admin.role); // 'admin'
```

> [!NOTE] IMPORTAR TIPOS DE MOCK
> Si necesitas tipar el parámetro `type` explícitamente (e.j. `'random' | 'empty'`), puedes importar `IQMockType` desde types:
>
> ```typescript
> import type { IQMockType } from 'quickmodel/types';
> ```
>
> Para uso avanzado personalizado, `QMockGenerator` está disponible en advanced:
>
> ```typescript
> import { QMockGenerator } from 'quickmodel/advanced';
> ```

## Cómo Funciona

QuickModel infiere automáticamente datos falsos apropiados basados en tus definiciones de tipos:

QuickModel soporta la generación de mocks para todos los tipos estándar, incluyendo Primitivos, Fechas, Colecciones y datos Binarios.

> [!TIP]
> Para una lista completa de tipos soportados y alias, consulta la **[Referencia de Alias](./aliases.md)**.

**Ejemplo:**

| Tipo                  | Mock Generado    |
| :-------------------- | :--------------- |
| `String` / `'string'` | `"Hola Mundo!"`  |
| `Date` / `'date'`     | `2024-01-01T...` |

### Tipos Implícitos vs Explícitos

**Implícito (Inferido):**
En la mayoría de los casos, **¡no necesitas hacer nada!** QuickModel lee automáticamente los metadatos de TypeScript.

**Explícito (Recomendado):**
Recomendamos ser explícitos en el decorador para asegurar un comportamiento consistente en todos los entornos.

```typescript
@Quick({
  name: String, // Explícito
  age: 'number' // Alias explícito
})
```

### Inferencia Inteligente

El generador de mocks es lo suficientemente inteligente como para adivinar el contexto a partir de los nombres de las propiedades.

```typescript
@Quick({
  email: String,       // Genera "alice@example.com"
  firstName: String,   // Genera "Alice"
  avatar: URL,         // Genera "https://placeimg.com..."
  createdAt: Date      // Genera "2023-11-20T..."
})
```

### Transformadores Personalizados y Mocks

::: warning TRANSFORMADORES PERSONALIZADOS
Si usas **Transformadores Personalizados** para manejar la entrada (Deserialización), QuickModel **no puede** adivinar cómo generar datos para ellos.

**DEBES proporcionar un `mocker` personalizado**:

```typescript
@Quick({
  // El transformador espera mayúsculas
  sku: (val) => String(val).toUpperCase()
}, {
  mockers: {
    // Generar explícitamente datos compatibles
    sku: () => 'ITEM-123'
  }
})
```

Si olvidas esto, QuickModel te avisará en tiempo de ejecución y generará un valor por defecto que podría ser inválido para tu lógica.
:::

## Uso Avanzado

### Modelos Anidados

Los mocks se generan recursivamente. Los modelos anidados también serán completamente mockeados.

```typescript
@Quick({ address: Address })
class User extends QModel<IUser> {
	declare address: Address;
}

const user = User.mock().random();
console.log(user.address.city); // "Nueva York" (Aleatorio)
```

### Arrays Parciales

Puedes crear arrays donde todos los elementos compartan algunas propiedades comunes:

```typescript
// 10 usuarios, todos con isActive = true
const activeUsers = User.mock().array(10, { isActive: true });
```

Esto genera 10 usuarios únicos, pero **fuerza** que todos tengan `isActive: true`.

## Patrones de Testing

### Tests Unitarios

```typescript
describe('UserService', () => {
	it('should create a valid user', () => {
		const mockUser = User.mock().random({
			name: 'Usuario Test',
		});

		const savedUser = service.save(mockUser);
		expect(savedUser.name).toBe('Usuario Test');
	});
});
```

### Poblado de Base de Datos

Perfecto para poblar bases de datos locales:

```typescript
async function seedKeywords() {
	const users = User.mock().array(50);
	await db.insertMany('users', users);
	// output: 'Seeded 50 users!'
}
```

## Mejores Prácticas

1. **Sobrescrituras Explícitas**: Si un test depende de un valor específico (e.g., `role: 'admin'`), SIEMPRE sobrescríbelo. No confíes en el azar.
2. **Fixtures**: Crea un archivo `fixtures.ts` dedicado para exportar configuraciones comunes de mocks.

```typescript
// fixtures.ts
export const mockAdmin = User.mock().random({ role: 'admin' });
export const mockGuest = User.mock().random({ role: 'guest' });
```

---

## Referencia API Mock Builder

El método `.mock()` devuelve un `QMockBuilder` con una API fluida.

### Generación de Instancias (Modelos)

Devuelve instancias reales de tu clase (`instanceof User` será true).

| Método                                | Descripción                                                                              | Firma                                                           |
| :------------------------------------ | :--------------------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| **`random(overrides?)`**              | Genera 1 instancia con datos **aleatorios** realistas (Faker).                           | `(overrides?: Partial<T>) => T`                                 |
| **`empty(overrides?)`**               | Genera 1 instancia con valores **vacíos/nulos**.                                         | `(overrides?: Partial<T>) => T`                                 |
| **`minimal(overrides?)`**             | Genera 1 instancia solo con campos **obligatorios**.                                     | `(overrides?: Partial<T>) => T`                                 |
| **`full(overrides?)`**                | Genera 1 instancia con **todos** los campos (req + opcionales).                          | `(overrides?: Partial<T>) => T`                                 |
| **`sample(overrides?)`**              | Genera 1 instancia con datos de muestra **deterministas/estáticos**.                     | `(overrides?: Partial<T>) => T`                                 |
| **`array(count, type?, overrides?)`** | Genera `count` instancias. `type` por defecto es `'random'`. `overrides` es un callback. | `(n: number, type?: IQMockType, fn?: (i) => Partial<T>) => T[]` |

```typescript
// Array con overrides personalizados por ítem
User.mock().array(5, 'random', (index) => ({
	name: `Usuario ${index}`,
}));
```

### Generación de Interfaces Planas

Devuelve objetos JavaScript planos (POJOs), **no** instancias de clase. Útil para mockear respuestas de API donde no quieres métodos de clase.

| Método                             | Descripción                        |
| :--------------------------------- | :--------------------------------- |
| **`interfaceRandom(overrides?)`**  | Objeto plano con datos aleatorios. |
| **`interfaceEmpty(overrides?)`**   | Objeto plano con datos vacíos.     |
| **`interfaceSample(overrides?)`**  | Objeto plano con datos de muestra. |
| **`interfaceMinimal(overrides?)`** | Objeto plano con datos mínimos.    |
| **`interfaceFull(overrides?)`**    | Objeto plano con datos completos.  |
| **`interfaceArray(count, ...)`**   | Array de objetos planos.           |

```typescript
// Devuelve { name: "..." } en lugar de User { name: "..." }
const userJson = User.mock().interfaceRandom();
```

## Rendimiento

<BenchmarkChart
  :only-scenarios="['mocks']"
  :only-libs="['QuickModel', 'faker (manual)']"
  :only-tabs="['performance']"
  default-tab="performance"
/>
