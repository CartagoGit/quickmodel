# Complex Types

Advanced examples demonstrating complex type transformations and patterns.

## BigInt for Large Numbers

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IAccount {
	id: string;
	balance: string; // BigInt as string
	total_transactions: string;
}

@Quick({
	balance: BigInt,
	total_transactions: BigInt,
})
class Account extends QModel<IAccount> {
	declare id: string;
	declare balance: bigint;
	declare total_transactions: bigint;
}

const account = new Account({
	id: 'ACC001',
	balance: '999999999999999999',
	total_transactions: '1234567890',
});

console.log(typeof account.balance); // 'bigint'
console.log(account.balance > 1000n); // true
```

## Collections (Set and Map)

```typescript
interface IPost {
	id: string;
	title: string;
	tags: string[]; // Will become Set
	metadata: [string, any][]; // Will become Map
	categories: string[][]; // Will become Set[]
}

@Quick({
	tags: Set,
	metadata: Map,
	categories: [Set],
})
class Post extends QModel<IPost> {
	declare id: string;
	declare title: string;
	declare tags: Set<string>;
	declare metadata: Map<string, any>;
	declare categories: Set<string>[];
}

const post = new Post({
	id: '1',
	title: 'My Post',
	tags: ['typescript', 'node', 'typescript'], // Duplicates removed
	metadata: [
		['author', 'John'],
		['views', 100],
	],
	categories: [
		['tech', 'programming'],
		['web', 'frontend'],
	],
});

console.log(post.tags.size); // 2 (duplicates removed)
console.log(post.metadata.get('author')); // 'John'
console.log(post.categories[0] instanceof Set); // true
```

## Deep Nesting

```typescript
interface IAddress {
	street: string;
	city: string;
}

interface IProfile {
	name: string;
	birth_date: string;
	address: IAddress;
}

interface IUser {
	id: number;
	email: string;
	profile: IProfile;
	created_at: string;
}

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
	declare email: string;
	declare profile: Profile;
	declare created_at: Date;
}

const user = new User({
	id: 1,
	email: 'john@example.com',
	profile: {
		name: 'John Doe',
		birth_date: '1990-01-01',
		address: {
			street: '123 Main St',
			city: 'New York',
		},
	},
	created_at: '2026-01-10',
});

console.log(user.profile instanceof Profile); // true
console.log(user.profile.address instanceof Address); // true
console.log(user.profile.birth_date instanceof Date); // true
```

## Polymorphic Models

```typescript
interface IPayment {
	id: string;
	amount: number;
	type: 'credit_card' | 'paypal' | 'crypto';
	created_at: string;
}

interface ICreditCardPayment extends IPayment {
	type: 'credit_card';
	card_number: string;
}

interface IPayPalPayment extends IPayment {
	type: 'paypal';
	email: string;
}

interface ICryptoPayment extends IPayment {
	type: 'crypto';
	wallet_address: string;
	currency: string;
}

@Quick({ created_at: Date })
class CreditCardPayment extends QModel<ICreditCardPayment> {
	declare type: 'credit_card';
	declare id: string;
	declare amount: number;
	declare created_at: Date;
	declare card_number: string;
}

@Quick({ created_at: Date })
class PayPalPayment extends QModel<IPayPalPayment> {
	declare type: 'paypal';
	declare id: string;
	declare amount: number;
	declare created_at: Date;
	declare email: string;
}

@Quick({ created_at: Date })
class CryptoPayment extends QModel<ICryptoPayment> {
	declare type: 'crypto';
	declare id: string;
	declare amount: number;
	declare created_at: Date;
	declare wallet_address: string;
	declare currency: string;
}

type Payment = CreditCardPayment | PayPalPayment | CryptoPayment;

function createPayment(data: IPayment): Payment {
	switch (data.type) {
		case 'credit_card':
			return new CreditCardPayment(data as ICreditCardPayment);
		case 'paypal':
			return new PayPalPayment(data as IPayPalPayment);
		case 'crypto':
			return new CryptoPayment(data as ICryptoPayment);
	}
}

const payment = createPayment({
	id: 'PAY001',
	amount: 99.99,
	type: 'credit_card',
	card_number: '****1234',
	created_at: '2026-01-10',
});

console.log(payment instanceof CreditCardPayment); // true
```

## Binary Data

```typescript
interface IFile {
	name: string;
	data: number[]; // Will become Uint8Array
	created_at: string;
}

@Quick({
	data: Uint8Array,
	created_at: Date,
})
class File extends QModel<IFile> {
	declare name: string;
	declare data: Uint8Array;
	declare created_at: Date;
}

const file = new File({
	name: 'document.pdf',
	data: [72, 101, 108, 108, 111], // "Hello" in ASCII
	created_at: '2026-01-10',
});

console.log(file.data instanceof Uint8Array); // true
```

## Multi-Dimensional Arrays

```typescript
interface IMatrix {
	name: string;
	data: string[][]; // 2D array of dates
}

@Quick({
	data: [[Date]],
})
class Matrix extends QModel<IMatrix> {
	declare name: string;
	declare data: Date[][];
}

const matrix = new Matrix({
	name: 'Date Matrix',
	data: [
		['2026-01-01', '2026-01-02'],
		['2026-01-03', '2026-01-04'],
	],
});

console.log(matrix.data[0][0] instanceof Date); // true
```

## Next Steps

- [Custom Transformers](/en/guide/custom-transformers) - Create your own types
- [Nested Models](/en/guide/nested-models) - Deep dive into nesting
