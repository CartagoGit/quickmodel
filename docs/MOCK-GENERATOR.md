# 🎭 Mock System for Testing

QModel includes a complete mock generation system using **[@faker-js/faker](https://fakerjs.dev/)** for testing and development.

## 📋 Available Methods

### Mock Instances

```typescript
import { QModel, QType, QBigInt } from '@cartago-git/quickmodel';
import type { QInterface } from '@cartago-git/quickmodel';

class User extends QModel<IUser> implements QInterface<IUser> {
  @QType() name!: string;
  @QType() age!: number;
  @QType(QBigInt) balance!: bigint;
}

// 6 types of mocks available:
User.mockEmpty()    // Empty values: { name: '', age: 0, balance: 0n }
User.mockRandom()   // Random values with faker
User.mockSample()   // Predictable values: { name: 'sample', age: 42 }
User.mockMinimal()  // Only required fields
User.mockFull()     // All fields complete
User.mock()         // Alias for mockRandom()
```

### Mock Interfaces (plain objects)

```typescript
// Without instantiating the model:
User.mockInterfaceEmpty()   // { name: '', age: 0, balance: '0' }
User.mockInterfaceRandom()  // Random
User.mockInterfaceSample()  // Predictable
User.mockInterfaceMinimal()
User.mockInterfaceFull()
User.mockInterface()        // Alias for mockInterfaceRandom()
```

### Mock Arrays

```typescript
// Instance arrays
User.mockArray(5)                    // 5 random users
User.mockArray(3, 'sample')          // 3 with predictable values
User.mockArray(2, 'empty')           // 2 with empty values

// With overrides by index
User.mockArray(3, 'sample', (i) => ({ 
  name: `User${i}` 
}))
// Result: User0, User1, User2

// Interface arrays
User.mockInterfaceArray(5)           // 5 random plain objects
User.mockInterfaceArray(3, 'sample') // 3 predictable objects
```

## 🎯 Use Cases

### 1. Unit Tests

```typescript
describe('UserService', () => {
  test('should process user', () => {
    const user = User.mockSample();
    
    const result = service.process(user);
    
    expect(result.name).toBe('sample');
  });
  
  test('should validate multiple users', () => {
    const users = User.mockArray(10);
    
    const valid = users.filter(u => service.validate(u));
    
    expect(valid.length).toBeGreaterThan(0);
  });
});
```

### 2. Custom Overrides

```typescript
// Specific override
const admin = User.mockRandom({ 
  role: 'admin',
  permissions: ['read', 'write', 'delete']
});

// Override by index in arrays
const team = User.mockArray(5, 'random', (i) => ({
  name: `Developer${i + 1}`,
  email: `dev${i + 1}@company.com`
}));
```

### 3. Database Seeds

```typescript
// Generate test data
const users = User.mockInterfaceArray(100, 'random');
await db.users.insertMany(users);

// With controlled variety
const products = Product.mockInterfaceArray(50, 'random', (i) => ({
  category: i % 5 === 0 ? 'electronics' : 'books',
  price: faker.number.int({ min: 10, max: 1000 })
}));
```

### 4. Nested Models

```typescript
interface ICompany {
  name: string;
  employees: User[];
}

class Company extends QModel<ICompany> implements QInterface<ICompany> {
  @QType() name!: string;
  @QType(User) employees!: User[];
}

// Automatically generates nested mock users
const company = Company.mockRandom();
console.log(company.employees.length); // 1-3 random users
```

## 🎲 Types of Generated Values

### `empty` - Default Values

```typescript
const user = User.mockEmpty();
// {
//   string: '',
//   number: 0,
//   boolean: false,
//   bigint: 0n,
//   date: new Date(0),
//   regexp: /(?:)/,
//   array: [],
//   map: new Map(),
//   set: new Set()
// }
```

### `random` - With Faker (Default)

```typescript
const user = User.mockRandom();
// {
//   string: 'dolor',           // faker.lorem.word()
//   number: 742,               // faker.number.int()
//   boolean: true,             // faker.datatype.boolean()
//   bigint: 84729n,            // BigInt(faker.number.int())
//   date: Date('2024-12-15'),  // faker.date.recent()
//   url: URL('https://...'),   // faker.internet.url()
//   pattern: /\w+/g            // Random from common patterns
// }
```

### `sample` - Predictable Values

```typescript
const user = User.mockSample();
// {
//   string: 'sample',
//   number: 42,
//   boolean: true,
//   bigint: 123n,
//   date: new Date('2024-01-01'),
//   regexp: /test/gi,
//   url: new URL('https://example.com')
// }
```

## 📊 Type Support

The mock system supports **all types** from QModel:

| Type | Empty | Random | Sample |
|------|-------|--------|--------|
| string | `''` | faker.lorem.word() | `'sample'` |
| number | `0` | faker.number.int() | `42` |
| boolean | `false` | faker.datatype.boolean() | `true` |
| bigint | `0n` | BigInt(faker.number.int()) | `123n` |
| symbol | `Symbol()` | Symbol(faker.lorem.word()) | `Symbol('sample')` |
| Date | `new Date(0)` | faker.date.recent() | `new Date('2024-01-01')` |
| RegExp | `/(?:)/` | Random | `/test/gi` |
| Error | `new Error()` | faker.lorem.sentence() | `'Sample error'` |
| URL | `http://localhost` | faker.internet.url() | `https://example.com` |
| Map | `new Map()` | 1 random entry | `Map([['key', 'value']])` |
| Set | `new Set()` | 2 elements | `Set(['sample'])` |
| Int8Array | `new Int8Array(0)` | 3 elements | `[1, 2, 3]` |
| BigInt64Array | `new BigInt64Array(0)` | 3 elements | `[1n, 2n, 3n]` |
| ArrayBuffer | `new ArrayBuffer(0)` | 8 bytes | Sample buffer |
| Nested Models | Recursive | Recursive | Recursive |

## 🔧 Complete API

```typescript
class QModel<T> {
  // Instances
  static mock(overrides?): T
  static mockEmpty(overrides?): T
  static mockRandom(overrides?): T
  static mockSample(overrides?): T
  static mockMinimal(overrides?): T
  static mockFull(overrides?): T
  
  // Interfaces
  static mockInterface(overrides?): any
  static mockInterfaceEmpty(overrides?): any
  static mockInterfaceRandom(overrides?): any
  static mockInterfaceSample(overrides?): any
  static mockInterfaceMinimal(overrides?): any
  static mockInterfaceFull(overrides?): any
  
  // Arrays
  static mockArray(
    count: number,
    type?: MockType,
    overrides?: (index: number) => Partial<any>
  ): T[]
  
  static mockInterfaceArray(
    count: number,
    type?: MockType,
    overrides?: (index: number) => Partial<any>
  ): any[]
}
```

## 💡 Tips

1. **Use `sample` for deterministic tests**:
   ```typescript
   // Always produces the same result
   const user = User.mockSample();
   expect(user.name).toBe('sample');
   ```

2. **Use `random` for stress testing**:
   ```typescript
   // Generates variety of cases
   const users = User.mockArray(1000);
   ```

3. **Combine types in arrays**:
   ```typescript
   const mixed = User.mockInterfaceArray(100, 'random', (i) => 
     i % 2 === 0 
       ? { type: 'admin' }
       : { type: 'user' }
   );
   ```

4. **Mocks for seeders**:
   ```typescript
   // seed.ts
   const users = User.mockInterfaceArray(100);
   const posts = Post.mockInterfaceArray(500, 'random', (i) => ({
     authorId: users[i % users.length]!.id
   }));
   ```

## 🧪 Testing

See `tests/unit/mock-generator.test.ts` for complete examples.

```bash
bun test tests/unit/mock-generator.test.ts
```

## 🎁 Bonus: Custom Mocks

For advanced cases, you can extend `MockGenerator`:

```typescript
import { MockGenerator } from '@cartago-git/quickmodel';

class CustomMockGenerator extends MockGenerator {
  // Customize generation
}
```
