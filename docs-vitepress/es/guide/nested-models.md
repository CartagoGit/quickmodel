# Modelos Anidados

QuickModel soporta anidamiento infinito de modelos, permitiéndote construir estructuras de datos complejas con transformación automática en todos los niveles.

## Anidamiento Básico

```typescript
@Quick()
class Address extends QModel<IAddress> {
	declare street: string;
	declare city: string;
}

@Quick({
	birthDate: Date,
	address: Address,
})
class Profile extends QModel<IProfile> {
	declare name: string;
	declare birthDate: Date;
	declare address: Address;
}

@Quick({ profile: Profile })
class User extends QModel<IUser> {
	declare id: number;
	declare profile: Profile;
}
```

## Arrays de Modelos Anidados

```typescript
@Quick({ price: BigInt })
class OrderItem extends QModel<IOrderItem> {
	declare productId: string;
	declare price: bigint;
}

@Quick({
	items: [OrderItem],
	createdAt: Date,
})
class Order extends QModel<IOrder> {
	declare items: OrderItem[];
	declare createdAt: Date;
}
```

## Anidamiento Profundo

QuickModel maneja profundidad de anidamiento arbitraria.

## Notación de Punto para Propiedades Anidadas

Transforma propiedades anidadas sin decorar la clase anidada:

```typescript
@Quick({
	product: Product,
	'product.price': BigInt,
	'product.createdAt': Date,
})
class CartItem extends QModel<ICartItem> {
	declare product: Product;
}
```

## Arrays Multidimensionales

```typescript
@Quick({
	data: [[Point]], // Array 2D de Points
})
class Matrix extends QModel<IMatrix> {
	declare data: Point[][];
}
```

## Modelos Polimórficos

Usa discriminadores para tipos union.

## Serialización de Modelos Anidados

`toJSON()` serializa recursivamente todos los modelos anidados.

## Mejores Prácticas

1. **Mantén el Anidamiento Poco Profundo**
2. **Usa Notación de Punto con Moderación**
3. **Define Interfaces Claramente**
4. **Valida Datos Anidados**

## Próximos Pasos

- [Decorador @Quick](/es/guide/quick-decorator) - Aprende más sobre transformaciones
- [Transformadores Personalizados](/es/guide/custom-transformers) - Crea tipos anidados personalizados
