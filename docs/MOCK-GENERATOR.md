# 🎭 Sistema de Mocks para Testing

QuickModel incluye un sistema completo de generación de mocks usando **[@faker-js/faker](https://fakerjs.dev/)** para testing y desarrollo.

## 📋 Métodos Disponibles

### Instancias Mock

```typescript
class User extends QuickModel<IUser> {
  @Field() name!: string;
  @Field() age!: number;
  @Field(BigIntField) balance!: bigint;
}

// 6 tipos de mocks disponibles:
User.mockEmpty()    // Valores vacíos: { name: '', age: 0, balance: 0n }
User.mockRandom()   // Valores aleatorios con faker
User.mockSample()   // Valores predecibles: { name: 'sample', age: 42 }
User.mockMinimal()  // Solo campos requeridos
User.mockFull()     // Todos los campos completos
User.mock()         // Alias de mockRandom()
```

### Interfaces Mock (objetos planos)

```typescript
// Sin instanciar el modelo:
User.mockInterfaceEmpty()   // { name: '', age: 0, balance: '0' }
User.mockInterfaceRandom()  // Aleatorio
User.mockInterfaceSample()  // Predecible
User.mockInterfaceMinimal()
User.mockInterfaceFull()
User.mockInterface()        // Alias de mockInterfaceRandom()
```

### Arrays de Mocks

```typescript
// Arrays de instancias
User.mockArray(5)                    // 5 usuarios aleatorios
User.mockArray(3, 'sample')          // 3 con valores predecibles
User.mockArray(2, 'empty')           // 2 con valores vacíos

// Con overrides por índice
User.mockArray(3, 'sample', (i) => ({ 
  name: `User${i}` 
}))
// Resultado: User0, User1, User2

// Arrays de interfaces
User.mockInterfaceArray(5)           // 5 objetos planos aleatorios
User.mockInterfaceArray(3, 'sample') // 3 objetos predecibles
```

## 🎯 Casos de Uso

### 1. Tests Unitarios

```typescript
describe('UserService', () => {
  test('debe procesar usuario', () => {
    const user = User.mockSample();
    
    const result = service.process(user);
    
    expect(result.name).toBe('sample');
  });
  
  test('debe validar múltiples usuarios', () => {
    const users = User.mockArray(10);
    
    const valid = users.filter(u => service.validate(u));
    
    expect(valid.length).toBeGreaterThan(0);
  });
});
```

### 2. Overrides Personalizados

```typescript
// Override específico
const admin = User.mockRandom({ 
  role: 'admin',
  permissions: ['read', 'write', 'delete']
});

// Override por índice en arrays
const team = User.mockArray(5, 'random', (i) => ({
  name: `Developer${i + 1}`,
  email: `dev${i + 1}@company.com`
}));
```

### 3. Seeds para BD

```typescript
// Generar datos de prueba
const users = User.mockInterfaceArray(100, 'random');
await db.users.insertMany(users);

// Con variedad controlada
const products = Product.mockInterfaceArray(50, 'random', (i) => ({
  category: i % 5 === 0 ? 'electronics' : 'books',
  price: faker.number.int({ min: 10, max: 1000 })
}));
```

### 4. Modelos Anidados

```typescript
interface ICompany {
  name: string;
  employees: User[];
}

class Company extends QuickModel<ICompany> {
  @Field() name!: string;
  @Field(User) employees!: User[];
}

// Genera automáticamente usuarios mock anidados
const company = Company.mockRandom();
console.log(company.employees.length); // 1-3 usuarios aleatorios
```

## 🎲 Tipos de Valores Generados

### `empty` - Valores por Defecto

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

### `random` - Con Faker (Por Defecto)

```typescript
const user = User.mockRandom();
// {
//   string: 'dolor',           // faker.lorem.word()
//   number: 742,               // faker.number.int()
//   boolean: true,             // faker.datatype.boolean()
//   bigint: 84729n,            // BigInt(faker.number.int())
//   date: Date('2024-12-15'),  // faker.date.recent()
//   url: URL('https://...'),   // faker.internet.url()
//   pattern: /\w+/g            // Aleatorio de patterns comunes
// }
```

### `sample` - Valores Predecibles

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

## 📊 Soporte de Tipos

El sistema mock soporta **todos los tipos** de QuickModel:

| Tipo | Empty | Random | Sample |
|------|-------|--------|--------|
| string | `''` | faker.lorem.word() | `'sample'` |
| number | `0` | faker.number.int() | `42` |
| boolean | `false` | faker.datatype.boolean() | `true` |
| bigint | `0n` | BigInt(faker.number.int()) | `123n` |
| symbol | `Symbol()` | Symbol(faker.lorem.word()) | `Symbol('sample')` |
| Date | `new Date(0)` | faker.date.recent() | `new Date('2024-01-01')` |
| RegExp | `/(?:)/` | Aleatorio | `/test/gi` |
| Error | `new Error()` | faker.lorem.sentence() | `'Sample error'` |
| URL | `http://localhost` | faker.internet.url() | `https://example.com` |
| Map | `new Map()` | 1 entry aleatoria | `Map([['key', 'value']])` |
| Set | `new Set()` | 2 elementos | `Set(['sample'])` |
| Int8Array | `new Int8Array(0)` | 3 elementos | `[1, 2, 3]` |
| BigInt64Array | `new BigInt64Array(0)` | 3 elementos | `[1n, 2n, 3n]` |
| ArrayBuffer | `new ArrayBuffer(0)` | 8 bytes | Buffer de muestra |
| Nested Models | Recursivo | Recursivo | Recursivo |

## 🔧 API Completa

```typescript
class QuickModel<T> {
  // Instancias
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

1. **Usa `sample` para tests determinísticos**:
   ```typescript
   // Siempre produce el mismo resultado
   const user = User.mockSample();
   expect(user.name).toBe('sample');
   ```

2. **Usa `random` para stress testing**:
   ```typescript
   // Genera variedad de casos
   const users = User.mockArray(1000);
   ```

3. **Combina tipos en arrays**:
   ```typescript
   const mixed = User.mockInterfaceArray(100, 'random', (i) => 
     i % 2 === 0 
       ? { type: 'admin' }
       : { type: 'user' }
   );
   ```

4. **Mocks para seeders**:
   ```typescript
   // seed.ts
   const users = User.mockInterfaceArray(100);
   const posts = Post.mockInterfaceArray(500, 'random', (i) => ({
     authorId: users[i % users.length]!.id
   }));
   ```

## 🧪 Testing

Ver `tests/unit/mock-generator.test.ts` para ejemplos completos.

```bash
bun test tests/unit/mock-generator.test.ts
```

## 🎁 Bonus: Custom Mocks

Para casos avanzados, puedes extender `MockGenerator`:

```typescript
import { MockGenerator } from '@cartago-git/quickmodel';

class CustomMockGenerator extends MockGenerator {
  // Personaliza la generación
}
```
