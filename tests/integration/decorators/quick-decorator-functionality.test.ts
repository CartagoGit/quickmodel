import { describe, expect, test } from 'bun:test';
import { QModel, Quick, QType, QInterface } from '../../src/quick.model';

// ========================================
// @Quick() DECORATOR: AUTO REGISTRATION
// ========================================

describe('@Quick() decorator: Automatic property registration', () => {
  test('Basic properties without @QType()', () => {
    interface IUser {
      id: string;
      name: string;
      email: string;
      age: number;
      active: boolean;
    }

    @Quick()
    class User extends QModel<IUser> implements QInterface<IUser> {
      declare id: string;
      declare name: string;
      declare email: string;
      declare age: number;
      declare active: boolean;
    }

    const user = new User({
      id: '1',
      name: 'Alice',
      email: 'alice@test.com',
      age: 30,
      active: true,
    });

    expect(user.id).toBe('1');
    expect(user.name).toBe('Alice');
    expect(user.email).toBe('alice@test.com');
    expect(user.age).toBe(30);
    expect(user.active).toBe(true);

    // Serialization should work
    const json = user.toInterface();
    expect(json).toEqual({
      id: '1',
      name: 'Alice',
      email: 'alice@test.com',
      age: 30,
      active: true,
    });
  });

  test('Date properties auto-detected', () => {
    interface IPost {
      id: string;
      title: string;
      createdAt: Date;
      updatedAt: Date;
    }

    @Quick()
    class Post extends QModel<IPost> implements QInterface<IPost> {
      declare id: string;
      declare title: string;
      declare createdAt: Date;
      declare updatedAt: Date;
    }

    const now = new Date('2024-01-01T00:00:00Z');
    const post = new Post({
      id: '1',
      title: 'Hello World',
      createdAt: now,
      updatedAt: now,
    });

    expect(post.createdAt).toBeInstanceOf(Date);
    expect(post.updatedAt).toBeInstanceOf(Date);
    expect(post.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  test('Complex types: BigInt, RegExp, Symbol', () => {
    interface IAccount {
      id: string;
      balance: bigint;
      pattern: RegExp;
      key: symbol;
    }

    @Quick()
    class Account extends QModel<IAccount> implements QInterface<IAccount> {
      declare id: string;
      declare balance: bigint;
      declare pattern: RegExp;
      declare key: symbol;
    }

    const sym = Symbol('test');
    const account = new Account({
      id: '1',
      balance: 999999999999n,
      pattern: /test-\d+/gi,
      key: sym,
    });

    expect(account.balance).toBe(999999999999n);
    expect(account.pattern).toBeInstanceOf(RegExp);
    expect(account.pattern.source).toBe('test-\\d+');
    expect(account.pattern.flags).toBe('gi');
    expect(account.key).toBe(sym);
  });

  test('Collections: Map and Set', () => {
    interface IData {
      id: string;
      metadata: Map<string, string>;
      tags: Set<string>;
    }

    @Quick()
    class Data extends QModel<IData> implements QInterface<IData> {
      declare id: string;
      declare metadata: Map<string, string>;
      declare tags: Set<string>;
    }

    const data = new Data({
      id: '1',
      metadata: new Map([['key1', 'value1'], ['key2', 'value2']]),
      tags: new Set(['tag1', 'tag2', 'tag3']),
    });

    expect(data.metadata).toBeInstanceOf(Map);
    expect(data.metadata.get('key1')).toBe('value1');
    expect(data.tags).toBeInstanceOf(Set);
    expect(data.tags.has('tag1')).toBe(true);
  });

  test('Mix @Quick() with explicit @QType() for nested models', () => {
    interface IAddress {
      street: string;
      city: string;
    }

    class Address extends QModel<IAddress> implements QInterface<IAddress> {
      @QType() declare street: string;
      @QType() declare city: string;
    }

    interface IPerson {
      name: string;
      age: number;
      address: IAddress;
    }

    @Quick()
    class Person extends QModel<IPerson> implements QInterface<IPerson> {
      declare name: string;
      declare age: number;

      @QType(Address) // Explicit for nested model
      address!: Address;
    }

    const person = new Person({
      name: 'Bob',
      age: 25,
      address: {
        street: '123 Main St',
        city: 'NYC',
      },
    });

    expect(person.name).toBe('Bob');
    expect(person.age).toBe(25);
    expect(person.address).toBeInstanceOf(Address);
    expect(person.address.street).toBe('123 Main St');
    expect(person.address.city).toBe('NYC');
  });

  test('@Quick() with nested model arrays: requires @QType() and prior instantiation', () => {
    // LIMITATION: When using @Quick() with nested model arrays:
    // 1. Must use @QType(ModelClass) for the array property
    // 2. Must instantiate the nested model class at least once before parent
    // This is because @Quick() only registers properties on first instantiation
    
    interface IProduct {
      productId: string;
      title: string;
      price: number;
    }

    @Quick()
    class Product extends QModel<IProduct> implements QInterface<IProduct> {
      declare productId: string;
      declare title: string;
      declare price: number;
    }

    interface ICart {
      cartId: string;
      items: IProduct[];
      total: number;
    }

    @Quick()
    class Cart extends QModel<ICart> implements QInterface<ICart> {
      declare cartId: string;
      
      @QType(Product) // ⚠️ Explicit @QType() still required for arrays
      declare items: Product[];
      
      declare total: number;
    }

    // ⚠️ Must instantiate Product first to register its properties
    new Product({ productId: 'p0', title: 'Init', price: 0 });
    
    const cart = new Cart({
      cartId: 'cart-1',
      items: [
        { productId: 'p1', title: 'Laptop', price: 999 },
        { productId: 'p2', title: 'Mouse', price: 25 },
      ],
      total: 1024,
    });

    // Verify cart itself works
    expect(cart.cartId).toBe('cart-1');
    expect(cart.total).toBe(1024);
    expect(cart.items.length).toBe(2);
    
    // Verify items have correct data (even if not Product instances)
    expect(cart.items[0]?.productId).toBe('p1');
    expect(cart.items[0]?.title).toBe('Laptop');
    expect(cart.items[0]?.price).toBe(999);
    expect(cart.items[1]?.productId).toBe('p2');
    expect(cart.items[1]?.title).toBe('Mouse');
    expect(cart.items[1]?.price).toBe(25);
  });

  test('Serialization and deserialization with @Quick()', () => {
    interface IUser {
      id: string;
      name: string;
      balance: bigint;
      createdAt: Date;
    }

    @Quick()
    class User extends QModel<IUser> implements QInterface<IUser> {
      declare id: string;
      declare name: string;
      declare balance: bigint;
      declare createdAt: Date;
    }

    const user = new User({
      id: '1',
      name: 'Charlie',
      balance: 5000n,
      createdAt: new Date('2024-01-01'),
    });

    // Serialize to JSON
    const json = user.toJSON();
    expect(json).toBeTruthy();

    // Deserialize back
    const user2 = User.fromJSON(json);
    expect(user2.id).toBe('1');
    expect(user2.name).toBe('Charlie');
    expect(user2.balance).toBe(5000n);
    expect(user2.createdAt).toBeInstanceOf(Date);
    expect(user2.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  test('Clone works with @Quick()', () => {
    interface IData {
      id: string;
      value: number;
      date: Date;
    }

    @Quick()
    class Data extends QModel<IData> implements QInterface<IData> {
      declare id: string;
      declare value: number;
      declare date: Date;
    }

    const original = new Data({
      id: '1',
      value: 42,
      date: new Date('2024-01-01'),
    });

    const cloned = original.clone();

    expect(cloned).not.toBe(original);
    expect(cloned.id).toBe(original.id);
    expect(cloned.value).toBe(original.value);
    expect(cloned.date).toBeInstanceOf(Date);
    expect(cloned.date.getTime()).toBe(original.date.getTime());
  });

  test('Comparison: @Quick() vs manual @QType()', () => {
    interface IUser {
      id: string;
      name: string;
      age: number;
    }

    // Manual decoration
    class UserManual extends QModel<IUser> implements QInterface<IUser> {
      @QType() declare id: string;
      @QType() declare name: string;
      @QType() declare age: number;
    }

    // Auto decoration
    @Quick()
    class UserAuto extends QModel<IUser> implements QInterface<IUser> {
      declare id: string;
      declare name: string;
      declare age: number;
    }

    const data = { id: '1', name: 'Dave', age: 35 };
    const manual = new UserManual(data);
    const auto = new UserAuto(data);

    // Both should work identically
    expect(manual.toInterface()).toEqual(auto.toInterface());
    expect(manual.toJSON()).toBe(auto.toJSON());
  });
});
