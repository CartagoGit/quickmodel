# Dot Notation - Nested Property Transformations

## ¿Qué es Dot Notation?

**Dot Notation** es una característica de QuickModel que permite especificar transformaciones para **propiedades anidadas** directamente en el decorador padre, usando la sintaxis de punto (`.`).

En lugar de decorar cada modelo anidado, puedes especificar las transformaciones necesarias desde el modelo padre usando la notación de punto para acceder a propiedades profundas.

## Sintaxis Básica

```typescript
@Quick({
  'nested.property': Type,           // 1 nivel de profundidad
  'parent.child.value': BigInt,      // 2 niveles de profundidad
  'deep.nested.path.value': Date     // N niveles de profundidad
})
class Model extends QModel<IModel> {
  // ...
}
```

## Ejemplo Completo

### Caso de Uso: E-Commerce Cart Item

```typescript
// Backend interfaces
interface IProduct {
  id: string;
  name: string;
  price: string;      // BigInt serializado
  createdAt: string;  // Date serializada
}

interface ICartItem {
  product: IProduct;
  quantity: number;
  addedAt: string;    // Date serializada
}

// Opción 1: Sin Dot Notation (más limpio)
@Quick({
  price: BigInt,
  createdAt: Date
})
class Product extends QModel<IProduct> {
  id!: string;
  price!: bigint;
  createdAt!: Date;
}

@Quick({
  product: Product,  // Product ya tiene sus transformaciones
  addedAt: Date
})
class CartItem extends QModel<ICartItem> {
  product!: Product;
  quantity!: number;
  addedAt!: Date;
}

// Opción 2: Con Dot Notation (todo en un lugar)
@Quick({
  product: Product,
  'product.price': BigInt,      // ← Dot notation
  'product.createdAt': Date,    // ← Dot notation
  addedAt: Date
})
class CartItem extends QModel<ICartItem> {
  product!: Product;
  quantity!: number;
  addedAt!: Date;
}
```

## Cuándo Usar Dot Notation

### ✅ Buenos Casos de Uso

**1. Cuando no controlas la clase anidada**
```typescript
// Usas una clase de terceros sin decoradores
import { ExternalModel } from 'external-library';

@Quick({
  model: ExternalModel,
  'model.timestamp': Date,
  'model.amount': BigInt
})
class MyModel extends QModel<IMyModel> {
  model!: ExternalModel;
}
```

**2. Para prototipos rápidos**
```typescript
// Desarrollo rápido, sin definir todas las clases
@Quick({
  'address.zipCode': String,
  'address.coordinates.lat': Number,
  'address.coordinates.lng': Number
})
class User extends QModel<IUser> {
  address!: any;
}
```

**3. Transformaciones específicas en contexto**
```typescript
// El mismo Address se usa en diferentes contextos
@Quick({
  address: Address,
  'address.deliveryDate': Date  // Solo para pedidos, no para usuarios
})
class Order extends QModel<IOrder> {
  address!: Address;
}
```

### ❌ Cuándo NO Usar Dot Notation

**1. Cuando la clase anidada se reutiliza mucho**
```typescript
// ❌ MAL: Repetir dot notation en cada lugar
@Quick({ product: Product, 'product.price': BigInt })
class CartItem extends QModel<ICartItem> { /* ... */ }

@Quick({ product: Product, 'product.price': BigInt })
class OrderItem extends QModel<IOrderItem> { /* ... */ }

@Quick({ product: Product, 'product.price': BigInt })
class WishlistItem extends QModel<IWishlistItem> { /* ... */ }

// ✅ BIEN: Decorar Product una vez
@Quick({ price: BigInt })
class Product extends QModel<IProduct> {
  price!: bigint;
}

@Quick({ product: Product })
class CartItem extends QModel<ICartItem> {
  product!: Product;
}
```

**2. Cuando la lógica es compleja**
```typescript
// ❌ MAL: Dot notation para lógica compleja
@Quick({
  'user.profile.settings.theme': (v) => validateTheme(v),
  'user.profile.settings.language': (v) => normalizeLanguage(v),
  'user.profile.settings.notifications.email': Boolean,
  'user.profile.settings.notifications.push': Boolean
})
class Account extends QModel<IAccount> { /* ... */ }

// ✅ BIEN: Modelos separados con sus propias transformaciones
@Quick({
  theme: (v) => validateTheme(v),
  language: (v) => normalizeLanguage(v)
})
class Settings extends QModel<ISettings> { /* ... */ }

@Quick({ settings: Settings })
class Profile extends QModel<IProfile> { /* ... */ }

@Quick({ profile: Profile })
class User extends QModel<IUser> { /* ... */ }
```

## Profundidad de Anidamiento

Dot notation soporta cualquier nivel de profundidad:

```typescript
@Quick({
  'level1.value': BigInt,                                    // 1 nivel
  'level1.level2.value': Date,                               // 2 niveles
  'level1.level2.level3.value': RegExp,                      // 3 niveles
  'level1.level2.level3.level4.value': Symbol                // 4 niveles
  // ... N niveles soportados
})
class DeepModel extends QModel<IDeepModel> {
  level1!: any;
}
```

## Combinación con Arrays

Dot notation funciona con arrays:

```typescript
interface IUser {
  posts: IPost[];
}

interface IPost {
  id: string;
  publishedAt: string;
  metadata: [string, any][];
}

@Quick({
  posts: [Post],                     // Array de Posts
  'posts.publishedAt': Date,         // Transforma publishedAt en cada Post
  'posts.metadata': Map              // Transforma metadata en cada Post
})
class User extends QModel<IUser> {
  posts!: Post[];
}
```

## Ventajas y Desventajas

### ✅ Ventajas

1. **Centralización**: Todas las transformaciones en un solo lugar
2. **Flexibilidad**: No necesitas modificar clases externas
3. **Rapidez**: Ideal para prototipos y desarrollo ágil
4. **Contexto**: Transformaciones específicas para cada uso

### ❌ Desventajas

1. **Duplicación**: Si reutilizas el modelo, repites la dot notation
2. **Mantenibilidad**: Más difícil de seguir con muchas propiedades
3. **Verboso**: Más código que decorar la clase directamente
4. **Type Safety**: TypeScript no valida paths anidados (strings)

## Reglas de Prioridad

Cuando combinas dot notation con decoradores en el modelo anidado:

```typescript
@Quick({ price: BigInt })
class Product extends QModel<IProduct> {
  price!: bigint;  // Transformación definida aquí
}

@Quick({
  product: Product,
  'product.price': String  // ← Esta transformación sobrescribe la de Product
})
class CartItem extends QModel<ICartItem> {
  product!: Product;
}
```

**Regla**: **El decorador más cercano (padre) tiene prioridad** sobre el decorador del modelo anidado.

## Patrones Recomendados

### Patrón 1: Clases Propias (Sin Dot Notation)

```typescript
// ✅ RECOMENDADO: Para modelos que controlas
@Quick({ createdAt: Date })
class Address extends QModel<IAddress> {
  createdAt!: Date;
}

@Quick({ address: Address })
class User extends QModel<IUser> {
  address!: Address;
}
```

### Patrón 2: Clases Externas (Con Dot Notation)

```typescript
// ✅ RECOMENDADO: Para clases que no controlas
import { ThirdPartyModel } from 'external';

@Quick({
  model: ThirdPartyModel,
  'model.timestamp': Date,
  'model.value': BigInt
})
class MyModel extends QModel<IMyModel> {
  model!: ThirdPartyModel;
}
```

### Patrón 3: Híbrido

```typescript
// ✅ VÁLIDO: Mezcla según necesidad
@Quick({ createdAt: Date })
class Product extends QModel<IProduct> {
  price!: bigint;        // Sin transformación por defecto
  createdAt!: Date;      // Siempre transformado
}

// En Cart: price se transforma a BigInt
@Quick({
  items: [CartItem],
  'items.product': Product,
  'items.product.price': BigInt  // Contexto específico
})
class Cart extends QModel<ICart> {
  items!: CartItem[];
}

// En Wishlist: price se deja como number
@Quick({
  items: [WishlistItem],
  'items.product': Product
  // 'items.product.price' NO se transforma aquí
})
class Wishlist extends QModel<IWishlist> {
  items!: WishlistItem[];
}
```

## Referencias

- [Quick Decorator API](../src/core/decorators/quick.decorator.ts)
- [QType Decorator](../src/core/decorators/qtype.decorator.ts)
- [Deserializer Service](../src/core/services/deserializer.service.ts)
- [Array Transformations](./ARRAY-TRANSFORMATIONS.md)

## Testing

Para ejemplos de uso en tests:

- [E-Commerce Cart System](../tests/system/real-world/e-commerce-cart-system.test.ts) - Ejemplo real de dot notation
- [API Response Transformation](../tests/system/full-workflow/api-response-transformation-workflow.test.ts)

---

**Resumen**: Usa dot notation con moderación. Para código de producción, prefiere decorar cada clase. Para prototipos o clases externas, dot notation es perfecta.
