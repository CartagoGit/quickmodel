# Tipos Complejos

Ejemplos avanzados que demuestran transformaciones de tipos complejos y patrones.

## BigInt para Números Grandes

```typescript
@Quick({
	balance: BigInt,
	total_transactions: BigInt,
})
class Account extends QModel<IAccount> {
	declare id: string;
	declare balance: bigint;
	declare total_transactions: bigint;
}
```

## Colecciones (Set y Map)

```typescript
@Quick({
	tags: Set,
	metadata: Map,
	categories: [Set],
})
class Post extends QModel<IPost> {
	declare id: string;
	declare tags: Set<string>;
	declare metadata: Map<string, any>;
	declare categories: Set<string>[];
}
```

## Anidamiento Profundo

```typescript
@Quick()
class Address extends QModel<IAddress> {
	declare street: string;
	declare city: string;
}

@Quick({
	birth_date: Date,
	address: Address,
})
class Profile extends QModel<IProfile> {
	declare name: string;
	declare birth_date: Date;
	declare address: Address;
}

@Quick({
	profile: Profile,
	created_at: Date,
})
class User extends QModel<IUser> {
	declare id: number;
	declare profile: Profile;
	declare created_at: Date;
}
```

## Modelos Polimórficos

```typescript
@Quick({ created_at: Date })
class CreditCardPayment extends QModel<ICreditCardPayment> {
	declare type: 'credit_card';
	declare card_number: string;
	declare created_at: Date;
}

@Quick({ created_at: Date })
class PayPalPayment extends QModel<IPayPalPayment> {
	declare type: 'paypal';
	declare email: string;
	declare created_at: Date;
}

function createPayment(data: IPayment): Payment {
	switch (data.type) {
		case 'credit_card':
			return new CreditCardPayment(data);
		case 'paypal':
			return new PayPalPayment(data);
	}
}
```

## Datos Binarios

```typescript
@Quick({
	data: Uint8Array,
	created_at: Date,
})
class File extends QModel<IFile> {
	declare name: string;
	declare data: Uint8Array;
	declare created_at: Date;
}
```

## Arrays Multidimensionales

```typescript
@Quick({
	data: [[Date]],
})
class Matrix extends QModel<IMatrix> {
	declare name: string;
	declare data: Date[][];
}
```

## Próximos Pasos

- [Transformadores Personalizados](/es/guide/custom-transformers) - Crea tus propios tipos
- [Modelos Anidados](/es/guide/nested-models) - Profundiza en el anidamiento
