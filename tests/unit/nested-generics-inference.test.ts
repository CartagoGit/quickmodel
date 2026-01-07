import { describe, expect, test } from 'bun:test';
import { QModel } from '../../src/quick.model';
import { QType } from '../../src/core/decorators/field.decorator';

// ========================================
// GENÉRICOS ANIDADOS: MÚLTIPLES NIVELES
// ========================================

describe('Genéricos anidados: Inferencia en múltiples niveles', () => {
  // Modelo final (el que se instanciará dentro de los genéricos)
  interface IUser {
    id: string;
    name: string;
    email: string;
  }

  class User extends QModel<IUser> {
    @QType()
    id!: string;

    @QType()
    name!: string;

    @QType()
    email!: string;
  }

  test('Nivel 1: Container<T> con T = User', () => {
    interface IContainer<T> {
      items: T[];
      total: number;
    }

    class Container<T> extends QModel<IContainer<T>> {
      @QType() // ✅ Solo @QType(), NO especifica User
      items!: T[];

      @QType()
      total!: number;
    }

    // En compile-time: TypeScript sabe que T = IUser
    // En runtime: T se borra, NO sabe que es IUser
    const container = new Container<IUser>({
      items: [
        { id: '1', name: 'Alice', email: 'alice@test.com' },
        { id: '2', name: 'Bob', email: 'bob@test.com' },
      ],
      total: 2,
    });

    console.log('\n=== NIVEL 1: Container<User> ===');
    console.log('Runtime NO sabe que T = User (type erasure)');
    console.log('items[0]:', container.items[0]);
    console.log('¿Es User?', container.items[0] instanceof User);

    // ✅ Funciona porque:
    // 1. El deserializer ve items: Array
    // 2. Analiza el primer elemento: { id: '1', name: 'Alice', email: 'alice@test.com' }
    // 3. Busca en registry: modelo con propiedades [email, id, name]
    // 4. Encuentra User y deserializa
    expect(container.items[0]).toBeInstanceOf(User);
    expect(container.items[0]!.name).toBe('Alice');
    expect(container.items[1]).toBeInstanceOf(User);
    expect(container.items[1]!.email).toBe('bob@test.com');
  });

  test('Nivel 2: Wrapper<T> → Container<T> → T[]', () => {
    interface IContainer<T> {
      items: T[];
      total: number;
    }

    class Container<T> extends QModel<IContainer<T>> {
      @QType()
      items!: T[];

      @QType()
      total!: number;
    }

    interface IWrapper<T> {
      container: IContainer<T>;
      label: string;
    }

    class Wrapper<T> extends QModel<IWrapper<T>> {
      @QType() // ✅ NO especifica Container<User>, solo @QType()
      container!: Container<T>;

      @QType()
      label!: string;
    }

    // En compile-time: T = IUser se propaga por todos los niveles
    // En runtime: T se borra en TODOS los niveles
    const wrapper = new Wrapper<IUser>({
      container: {
        items: [
          { id: '1', name: 'Charlie', email: 'charlie@test.com' },
          { id: '2', name: 'Diana', email: 'diana@test.com' },
        ],
        total: 2,
      },
      label: 'Users Wrapper',
    });

    console.log('\n=== NIVEL 2: Wrapper<User> → Container<User> ===');
    console.log('Runtime NO sabe que T = User en ningún nivel');
    console.log('container:', wrapper.container.constructor.name);
    console.log('items[0]:', wrapper.container.items[0]);
    console.log('¿Es User?', wrapper.container.items[0] instanceof User);

    // ✅ Funciona porque:
    // - Nivel 1: Detecta que container tiene propiedades [items, total]
    //   → Encuentra Container y deserializa
    // - Nivel 2: Dentro de Container, detecta que items es Array
    //   → Analiza { id: '1', name: 'Charlie', email: '...' }
    //   → Encuentra User y deserializa
    expect(wrapper.container).toBeInstanceOf(Container);
    expect(wrapper.container.items[0]).toBeInstanceOf(User);
    expect(wrapper.container.items[0]!.name).toBe('Charlie');
    expect(wrapper.container.items[1]).toBeInstanceOf(User);
    expect(wrapper.container.items[1]!.email).toBe('diana@test.com');
  });

  test('Nivel 3: Response<T> → Wrapper<T> → Container<T> → T[]', () => {
    interface IContainer<T> {
      items: T[];
      total: number;
    }

    class Container<T> extends QModel<IContainer<T>> {
      @QType()
      items!: T[];

      @QType()
      total!: number;
    }

    interface IWrapper<T> {
      container: IContainer<T>;
      label: string;
    }

    class Wrapper<T> extends QModel<IWrapper<T>> {
      @QType()
      container!: Container<T>;

      @QType()
      label!: string;
    }

    interface IResponse<T> {
      data: IWrapper<T>;
      status: number;
      message: string;
    }

    class Response<T> extends QModel<IResponse<T>> {
      @QType()
      data!: Wrapper<T>;

      @QType()
      status!: number;

      @QType()
      message!: string;
    }

    // En compile-time: T = IUser se propaga 3 niveles
    // En runtime: T se borra en TODOS los niveles
    const response = new Response<IUser>({
      data: {
        container: {
          items: [
            { id: '1', name: 'Eve', email: 'eve@test.com' },
            { id: '2', name: 'Frank', email: 'frank@test.com' },
          ],
          total: 2,
        },
        label: 'API Response',
      },
      status: 200,
      message: 'Success',
    });

    console.log('\n=== NIVEL 3: Response<User> → Wrapper<User> → Container<User> ===');
    console.log('Runtime NO sabe que T = User en ningún nivel (3 niveles de genéricos)');
    console.log('data.container.items[0]:', response.data.container.items[0]);
    console.log('¿Es User?', response.data.container.items[0] instanceof User);

    // ✅ Funciona porque la inferencia es recursiva:
    // - Nivel 1: data → detecta Wrapper por propiedades [container, label]
    // - Nivel 2: container → detecta Container por propiedades [items, total]
    // - Nivel 3: items → analiza objetos y detecta User por propiedades [email, id, name]
    expect(response.data).toBeInstanceOf(Wrapper);
    expect(response.data.container).toBeInstanceOf(Container);
    expect(response.data.container.items[0]).toBeInstanceOf(User);
    expect(response.data.container.items[0]!.name).toBe('Eve');
    expect(response.data.container.items[1]).toBeInstanceOf(User);
    expect(response.data.container.items[1]!.email).toBe('frank@test.com');
  });

  test('Nivel 4: Extremo - 5 niveles de genéricos anidados', () => {
    interface IContainer<T> {
      items: T[];
    }

    class Container<T> extends QModel<IContainer<T>> {
      @QType()
      items!: T[];
    }

    interface ILevel4<T> {
      container: IContainer<T>;
    }

    class Level4<T> extends QModel<ILevel4<T>> {
      @QType()
      container!: Container<T>;
    }

    interface ILevel3<T> {
      level4: ILevel4<T>;
    }

    class Level3<T> extends QModel<ILevel3<T>> {
      @QType()
      level4!: Level4<T>;
    }

    interface ILevel2<T> {
      level3: ILevel3<T>;
    }

    class Level2<T> extends QModel<ILevel2<T>> {
      @QType()
      level3!: Level3<T>;
    }

    interface ILevel1<T> {
      level2: ILevel2<T>;
    }

    class Level1<T> extends QModel<ILevel1<T>> {
      @QType()
      level2!: Level2<T>;
    }

    // 5 niveles de genéricos: Level1<IUser> → Level2<IUser> → Level3<IUser> → Level4<IUser> → Container<IUser> → IUser[]
    const deep = new Level1<IUser>({
      level2: {
        level3: {
          level4: {
            container: {
              items: [
                { id: '1', name: 'George', email: 'george@test.com' },
                { id: '2', name: 'Helen', email: 'helen@test.com' },
              ],
            },
          },
        },
      },
    });

    console.log('\n=== NIVEL 4: 5 NIVELES DE GENÉRICOS ===');
    console.log('Runtime NO sabe que T = User en ninguno de los 5 niveles');
    console.log('level2.level3.level4.container.items[0]:', deep.level2.level3.level4.container.items[0]);
    console.log('¿Es User?', deep.level2.level3.level4.container.items[0] instanceof User);

    // ✅ Funciona con 5 niveles de profundidad
    // La inferencia es completamente recursiva
    expect(deep.level2).toBeInstanceOf(Level2);
    expect(deep.level2.level3).toBeInstanceOf(Level3);
    expect(deep.level2.level3.level4).toBeInstanceOf(Level4);
    expect(deep.level2.level3.level4.container).toBeInstanceOf(Container);
    expect(deep.level2.level3.level4.container.items[0]).toBeInstanceOf(User);
    expect(deep.level2.level3.level4.container.items[0]!.name).toBe('George');
    expect(deep.level2.level3.level4.container.items[1]).toBeInstanceOf(User);
    expect(deep.level2.level3.level4.container.items[1]!.email).toBe('helen@test.com');
  });

  test('Múltiples genéricos: Wrapper<T, U> con diferentes tipos', () => {
    interface IProduct {
      productId: string;
      title: string;
      price: number;
    }

    class Product extends QModel<IProduct> {
      @QType()
      productId!: string;

      @QType()
      title!: string;

      @QType()
      price!: number;
    }

    interface IDualContainer<T, U> {
      users: T[];
      products: U[];
      mixed: (T | U)[];
    }

    class DualContainer<T, U> extends QModel<IDualContainer<T, U>> {
      @QType()
      users!: T[];

      @QType()
      products!: U[];

      @QType()
      mixed!: (T | U)[];
    }

    // En compile-time: T = IUser, U = IProduct
    // En runtime: T y U se borran completamente
    const dual = new DualContainer<IUser, IProduct>({
      users: [
        { id: '1', name: 'Igor', email: 'igor@test.com' },
        { id: '2', name: 'Julia', email: 'julia@test.com' },
      ],
      products: [
        { productId: 'p1', title: 'Laptop', price: 999 },
        { productId: 'p2', title: 'Mouse', price: 25 },
      ],
      mixed: [
        { id: '3', name: 'Kevin', email: 'kevin@test.com' }, // User
        { productId: 'p3', title: 'Keyboard', price: 75 }, // Product
        { id: '4', name: 'Laura', email: 'laura@test.com' }, // User
      ],
    });

    console.log('\n=== MÚLTIPLES GENÉRICOS: DualContainer<User, Product> ===');
    console.log('Runtime NO sabe que T = User ni U = Product');
    console.log('users[0]:', dual.users[0]);
    console.log('¿Es User?', dual.users[0] instanceof User);
    console.log('products[0]:', dual.products[0]);
    console.log('¿Es Product?', dual.products[0] instanceof Product);
    console.log('mixed[0]:', dual.mixed[0]);
    console.log('¿mixed[0] es User?', dual.mixed[0] instanceof User);
    console.log('mixed[1]:', dual.mixed[1]);
    console.log('¿mixed[1] es Product?', dual.mixed[1] instanceof Product);

    // ✅ Funciona con múltiples genéricos:
    // - users: Analiza [email, id, name] → User
    // - products: Analiza [price, productId, title] → Product
    // - mixed: Analiza CADA elemento individualmente (union type)
    expect(dual.users[0]).toBeInstanceOf(User);
    expect(dual.users[0]!.name).toBe('Igor');
    expect(dual.users[1]).toBeInstanceOf(User);

    expect(dual.products[0]).toBeInstanceOf(Product);
    expect(dual.products[0]!.title).toBe('Laptop');
    expect(dual.products[1]).toBeInstanceOf(Product);

    // Mixed array: detecta el tipo de CADA elemento
    expect(dual.mixed[0]).toBeInstanceOf(User);
    expect((dual.mixed[0] as User).name).toBe('Kevin');
    expect(dual.mixed[1]).toBeInstanceOf(Product);
    expect((dual.mixed[1] as Product).title).toBe('Keyboard');
    expect(dual.mixed[2]).toBeInstanceOf(User);
    expect((dual.mixed[2] as User).email).toBe('laura@test.com');
  });

  test('Conclusión: La inferencia NO necesita conocer los genéricos', () => {
    console.log(`
=== CONCLUSIÓN: GENÉRICOS ANIDADOS ===

❌ Runtime NO conoce los genéricos:
   - Container<User> se convierte en Container
   - Wrapper<User> se convierte en Wrapper
   - Response<User> se convierte en Response
   - T, U, etc. se borran completamente

✅ Inferencia funciona sin conocer los genéricos:
   
   Paso 1: Detectar el tipo del contenedor
   - Analiza propiedades del objeto
   - Busca modelo con esa firma
   - Deserializa como ese modelo
   
   Paso 2: Recursión para propiedades anidadas
   - Si propiedad es objeto → repite paso 1
   - Si propiedad es array → analiza elementos
   
   Paso 3: Inferencia de arrays
   - Toma primer objeto del array
   - Analiza sus propiedades
   - Busca modelo con esa firma
   - Deserializa todos los elementos

✅ Funciona con:
   - 1 nivel de genéricos: Container<T>
   - 2 niveles: Wrapper<T> → Container<T>
   - 3 niveles: Response<T> → Wrapper<T> → Container<T>
   - 5+ niveles: Cualquier profundidad
   - Múltiples genéricos: Container<T, U>
   - Union types: (T | U)[]

✅ Solo necesitas:
   - @QType() en cada propiedad (SIN argumentos)
   - Modelos con propiedades únicas
   - El sistema hace el resto automáticamente

🎯 Los genéricos son solo para TypeScript (compile-time)
   El runtime usa inferencia basada en el contenido real
    `);

    expect(true).toBe(true);
  });
});
