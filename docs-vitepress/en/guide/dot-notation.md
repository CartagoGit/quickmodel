# Dot Notation - Nested Property Transformations

## What is Dot Notation?

**Dot Notation** is a feature of QuickModel that allows you to specify transformations for **nested properties** directly in the parent decorator, using dot syntax (`.`).

Instead of decorating every nested model, you can specify the necessary transformations from the parent model using dot notation to access deep properties.

## Basic Syntax

```typescript
@Quick({
	'nested.property': Type, // 1 level deep
	'parent.child.value': BigInt, // 2 levels deep
	'deep.nested.path.value': Date, // N levels deep
})
class Model extends QModel<IModel> {
	// ...
}
```

## Complete Example

### Use Case: E-Commerce Cart Item

```typescript
// Backend interfaces
interface IProduct {
	id: string;
	name: string;
	price: string; // Serialized BigInt
	createdAt: string; // Serialized Date
}

interface ICartItem {
	product: IProduct;
	quantity: number;
	addedAt: string; // Serialized Date
}

// Option 1: Without Dot Notation (cleaner)
@Quick({
	price: BigInt,
	createdAt: Date,
})
class Product extends QModel<IProduct> {
	declare id: string;
	declare price: bigint;
	declare createdAt: Date;
}

@Quick({
	product: Product, // Product already has its transformations
	addedAt: Date,
})
class CartItem extends QModel<ICartItem> {
	declare product: Product;
	declare quantity: number;
	declare addedAt: Date;
}

// Option 2: With Dot Notation (everything in one place)
@Quick({
	product: Product,
	'product.price': BigInt, // ← Dot notation
	'product.createdAt': Date, // ← Dot notation
	addedAt: Date,
})
class CartItem extends QModel<ICartItem> {
	declare product: Product;
	declare quantity: number;
	declare addedAt: Date;
}
```

## When to Use Dot Notation

### ✅ Good Use Cases

**1. When you don't control the nested class**

```typescript
// Using a third-party class without decorators
import { ExternalModel } from 'external-library';

@Quick({
	model: ExternalModel,
	'model.timestamp': Date,
	'model.amount': BigInt,
})
class MyModel extends QModel<IMyModel> {
	declare model: ExternalModel;
}
```

**2. For rapid prototyping**

```typescript
// Rapid development, without defining all classes
@Quick({
	'address.zipCode': String,
	'address.coordinates.lat': Number,
	'address.coordinates.lng': Number,
})
class User extends QModel<IUser> {
	address!: any;
}
```

**3. Context-specific transformations**

```typescript
// The same Address is used in different contexts
@Quick({
	address: Address,
	'address.deliveryDate': Date, // Only for orders, not for users
})
class Order extends QModel<IOrder> {
	address!: Address;
}
```

### ❌ When NOT to Use Dot Notation

**1. When the nested class is reused heavily**

```typescript
// ❌ BAD: Repeating dot notation everywhere
@Quick({ product: Product, 'product.price': BigInt })
class CartItem extends QModel<ICartItem> {
	/* ... */
}

@Quick({ product: Product, 'product.price': BigInt })
class OrderItem extends QModel<IOrderItem> {
	/* ... */
}

@Quick({ product: Product, 'product.price': BigInt })
class WishlistItem extends QModel<IWishlistItem> {
	/* ... */
}

// ✅ GOOD: Decorate Product once
@Quick({ price: BigInt })
class Product extends QModel<IProduct> {
	price!: bigint;
}

@Quick({ product: Product })
class CartItem extends QModel<ICartItem> {
	product!: Product;
}
```

**2. When logic is complex**

```typescript
// ❌ BAD: Dot notation for complex logic
@Quick({
	'user.profile.settings.theme': (v) => validateTheme(v),
	'user.profile.settings.language': (v) => normalizeLanguage(v),
	'user.profile.settings.notifications.email': Boolean,
	'user.profile.settings.notifications.push': Boolean,
})
class Account extends QModel<IAccount> {
	/* ... */
}

// ✅ GOOD: Separate models with their own transformations
@Quick({
	theme: (v) => validateTheme(v),
	language: (v) => normalizeLanguage(v),
})
class Settings extends QModel<ISettings> {
	/* ... */
}

@Quick({ settings: Settings })
class Profile extends QModel<IProfile> {
	/* ... */
}

@Quick({ profile: Profile })
class User extends QModel<IUser> {
	/* ... */
}
```

## Nesting Depth

Dot notation supports any depth level:

```typescript
@Quick({
	'level1.value': BigInt, // 1 level
	'level1.level2.value': Date, // 2 levels
	'level1.level2.level3.value': RegExp, // 3 levels
	'level1.level2.level3.level4.value': Symbol, // 4 levels
	// ... N levels supported
})
class DeepModel extends QModel<IDeepModel> {
	level1!: any;
}
```

## Combining with Arrays

Dot notation works with arrays:

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
	posts: [Post], // Array of Posts
	'posts.publishedAt': Date, // Transforms publishedAt in each Post
	'posts.metadata': Map, // Transforms metadata in each Post
})
class User extends QModel<IUser> {
	posts!: Post[];
}
```

## Pros and Cons

### ✅ Pros

1. **Centralization**: All transformations in one place
2. **Flexibility**: No need to modify external classes
3. **Speed**: Ideal for prototypes and agile development
4. **Context**: Specific transformations for each usage

### ❌ Cons

1. **Duplication**: If you reuse the model, you repeat the dot notation
2. **Maintainability**: Harder to follow with many properties
3. **Verbose**: More code than decorating the class directly
4. **Type Safety**: TypeScript does not validate nested paths (strings)

## Priority Rules

When combining dot notation with decorators in the nested model:

```typescript
@Quick({ price: BigInt })
class Product extends QModel<IProduct> {
	price!: bigint; // Transformation defined here
}

@Quick({
	product: Product,
	'product.price': String, // ← This transformation overrides Product's
})
class CartItem extends QModel<ICartItem> {
	product!: Product;
}
```

**Rule**: **The closest decorator (parent) takes priority** over the nested model's decorator.

## Recommended Patterns

### Pattern 1: Own Classes (Without Dot Notation)

```typescript
// ✅ RECOMMENDED: For models you control
@Quick({ createdAt: Date })
class Address extends QModel<IAddress> {
	createdAt!: Date;
}

@Quick({ address: Address })
class User extends QModel<IUser> {
	address!: Address;
}
```

### Pattern 2: External Classes (With Dot Notation)

```typescript
// ✅ RECOMMENDED: For classes you don't control
import { ThirdPartyModel } from 'external';

@Quick({
	model: ThirdPartyModel,
	'model.timestamp': Date,
	'model.value': BigInt,
})
class MyModel extends QModel<IMyModel> {
	model!: ThirdPartyModel;
}
```

### Pattern 3: Hybrid

```typescript
// ✅ VALID: Mix as needed
@Quick({ createdAt: Date })
class Product extends QModel<IProduct> {
	price!: bigint; // No default transformation
	createdAt!: Date; // Always transformed
}

// In Cart: price is transformed to BigInt
@Quick({
	items: [CartItem],
	'items.product': Product,
	'items.product.price': BigInt, // Context specific
})
class Cart extends QModel<ICart> {
	items!: CartItem[];
}

// In Wishlist: price remains as number
@Quick({
	items: [WishlistItem],
	'items.product': Product,
	// 'items.product.price' is NOT transformed here
})
class Wishlist extends QModel<IWishlist> {
	items!: WishlistItem[];
}
```

## Summary

Use dot notation sparingly. For production code, prefer decorating each class. For prototypes or external classes, dot notation is perfect.
