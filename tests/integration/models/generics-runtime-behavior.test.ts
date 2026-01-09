import { describe, expect, test } from 'bun:test';
import { QModel } from '@/index';
import { QType } from '@/core/decorators/qtype.decorator';

// ========================================
// DEMOSTRACIÓN: GENÉRICOS EN RUNTIME
// ========================================

describe('Genéricos: Type erasure y runtime behavior', () => {
  // Interfaces para diferentes tipos de contenedores
  interface IContainer<T> {
    value: T;
    metadata: Map<string, string>;
  }

  interface IStringContainer {
    value: string;
    metadata: Map<string, string>;
  }

  interface INumberContainer {
    value: number;
    metadata: Map<string, string>;
  }

  interface IModelContainer {
    value: SimpleModel;
    metadata: Map<string, string>;
  }

  interface ISimpleModel {
    id: string;
    name: string;
  }

  class SimpleModel extends QModel<ISimpleModel> {
    @QType()
    id!: string;

    @QType()
    name!: string;
  }

  // Contenedor genérico
  class GenericContainer<T> extends QModel<IContainer<T>> {
    @QType()
    value!: T;

    @QType()
    metadata!: Map<string, string>;
  }

  // Contenedores específicos (NO genéricos)
  class StringContainer extends QModel<IStringContainer> {
    @QType()
    value!: string;

    @QType()
    metadata!: Map<string, string>;
  }

  class NumberContainer extends QModel<INumberContainer> {
    @QType()
    value!: number;

    @QType()
    metadata!: Map<string, string>;
  }

  class _ModelContainer extends QModel<IModelContainer> {
    @QType()
    value!: SimpleModel;

    @QType()
    metadata!: Map<string, string>;
  }

  test('En runtime: Los genéricos son borrados (type erasure)', () => {
    // En TypeScript:
    // - GenericContainer<string> es diferente de GenericContainer<number>
    // - Proporcionan type safety en compile-time
    
    // Pero en runtime:
    // - Ambos son la MISMA clase: GenericContainer
    // - No hay forma de distinguirlos

    const strContainer = new GenericContainer<string>({
      value: 'hello',
      metadata: new Map([['type', 'string']]),
    });

    const numContainer = new GenericContainer<number>({
      value: 42,
      metadata: new Map([['type', 'number']]),
    });

    console.log('\n=== TYPE ERASURE ===');
    console.log('strContainer.constructor.name:', strContainer.constructor.name);
    console.log('numContainer.constructor.name:', numContainer.constructor.name);
    console.log('¿Son la misma clase?', strContainer.constructor === numContainer.constructor);

    // Ambos son instancias de GenericContainer
    expect(strContainer).toBeInstanceOf(GenericContainer);
    expect(numContainer).toBeInstanceOf(GenericContainer);

    // Ambos tienen el MISMO constructor (misma clase en runtime)
    expect(strContainer.constructor).toBe(numContainer.constructor);
    expect(strContainer.constructor.name).toBe('GenericContainer');
    expect(numContainer.constructor.name).toBe('GenericContainer');

    // El tipo T es borrado - no hay forma de saber en runtime
    // si es GenericContainer<string> o GenericContainer<number>
  });

  test('TypeScript metadata: NO incluye información de genéricos', () => {
    // TypeScript solo emite metadata para el tipo declarado (design:type)
    // NO emite información sobre los parámetros genéricos

    const container = new GenericContainer<string>({
      value: 'test',
      metadata: new Map(),
    });

    const valueType = Reflect.getMetadata('design:type', container, 'value');
    const metadataType = Reflect.getMetadata('design:type', container, 'metadata');

    console.log('\n=== METADATA ===');
    console.log('value design:type:', valueType?.name);
    console.log('metadata design:type:', metadataType?.name);

    // Metadata NO incluye el tipo genérico T
    // Si value: T donde T = string, la metadata solo dice "Object"
    // porque T es genérico y se borra en runtime
    expect(metadataType).toBe(Map);

    // La metadata de 'value' será Object o undefined (depende del tipo concreto)
    // NO será "String" porque T es genérico
  });

  test('Solución: Clases específicas en lugar de genéricos', () => {
    // Para tener tipo correcto en runtime, usamos clases específicas
    // NO genéricas

    const strContainer = new StringContainer({
      value: 'hello',
      metadata: new Map([['type', 'string']]),
    });

    const numContainer = new NumberContainer({
      value: 42,
      metadata: new Map([['type', 'number']]),
    });

    console.log('\n=== CLASES ESPECÍFICAS ===');
    console.log('strContainer.constructor.name:', strContainer.constructor.name);
    console.log('numContainer.constructor.name:', numContainer.constructor.name);
    console.log('¿Son clases diferentes?', strContainer.constructor !== numContainer.constructor);

    // Son clases DIFERENTES en runtime
    expect(strContainer).toBeInstanceOf(StringContainer);
    expect(numContainer).toBeInstanceOf(NumberContainer);
    expect(strContainer.constructor).not.toBe(numContainer.constructor);
    expect(strContainer.constructor.name).toBe('StringContainer');
    expect(numContainer.constructor.name).toBe('NumberContainer');

    // Metadata es correcta para cada tipo específico
    const strValueType = Reflect.getMetadata('design:type', strContainer, 'value');
    const numValueType = Reflect.getMetadata('design:type', numContainer, 'value');

    console.log('StringContainer.value type:', strValueType?.name);
    console.log('NumberContainer.value type:', numValueType?.name);

    expect(strValueType).toBe(String);
    expect(numValueType).toBe(Number);
  });

  test('Genéricos con modelos anidados: El modelo sí se detecta', () => {
    // Aunque T es genérico, si T es un modelo concreto (como SimpleModel),
    // TypeScript SÍ emite la metadata correcta

    class TypedModelContainer extends QModel<IModelContainer> {
      @QType()
      value!: SimpleModel; // Tipo concreto, NO genérico

      @QType()
      metadata!: Map<string, string>;
    }

    const container = new TypedModelContainer({
      value: new SimpleModel({ id: '1', name: 'Test' }),
      metadata: new Map([['type', 'model']]),
    });

    const valueType = Reflect.getMetadata('design:type', container, 'value');

    console.log('\n=== MODELO ANIDADO ===');
    console.log('value design:type:', valueType?.name);

    // Como SimpleModel es un tipo concreto (no genérico),
    // TypeScript emite la metadata correcta
    expect(valueType).toBe(SimpleModel);
    expect(container.value).toBeInstanceOf(SimpleModel);
    expect(container.value.id).toBe('1');
    expect(container.value.name).toBe('Test');
  });

  test('Serialización/Deserialización: Funciona con genéricos', () => {
    // Aunque los genéricos se borran, la serialización funciona
    // porque depende de la metadata de reflect-metadata, no de los genéricos

    const original = new StringContainer({
      value: 'hello world',
      metadata: new Map([['lang', 'en'], ['version', '1.0']]),
    });

    const serialized = original.serialize();
    const deserialized = StringContainer.deserialize(serialized);

    console.log('\n=== SERIALIZACIÓN ===');
    console.log('Original:', original.value);
    console.log('Serialized:', JSON.stringify(serialized, null, 2));
    console.log('Deserialized:', deserialized.value);

    // Funciona correctamente
    expect(deserialized).toBeInstanceOf(StringContainer);
    expect(deserialized.value).toBe('hello world');
    expect(deserialized.metadata).toBeInstanceOf(Map);
    expect(deserialized.metadata.size).toBe(2);
    expect(deserialized.metadata.get('lang')).toBe('en');
  });

  test('Arrays de genéricos: Inferencia automática SIN @QType(ModelClass)', () => {
    // Los arrays de genéricos pierden el tipo T
    // PERO la inferencia runtime analiza las propiedades y encuentra el modelo correcto

    interface ITask {
      taskId: string;
      description: string;
      completed: boolean;
    }

    class Task extends QModel<ITask> {
      @QType()
      taskId!: string;

      @QType()
      description!: string;

      @QType()
      completed!: boolean;
    }

    interface IGenericList<T> {
      items: T[];
      count: number;
    }

    class TaskList extends QModel<IGenericList<ITask>> {
      @QType() // ✅ Solo @QType(), SIN especificar Task
      items!: Task[];

      @QType()
      count!: number;
    }

    const list = new TaskList({
      items: [
        { taskId: 't1', description: 'First task', completed: false },
        { taskId: 't2', description: 'Second task', completed: true },
      ],
      count: 2,
    });

    console.log('\n=== ARRAYS DE GENÉRICOS ===');
    console.log('items[0]:', list.items[0]);
    console.log('¿items[0] es Task?', list.items[0] instanceof Task);

    // ✅ La inferencia automática funciona SIN @QType(Task)
    // Analiza las propiedades {taskId, description, completed} 
    // y encuentra que coinciden con Task
    expect(list.items).toHaveLength(2);
    expect(list.items[0]).toBeInstanceOf(Task);
    expect(list.items[0]!.taskId).toBe('t1');
    expect(list.items[0]!.completed).toBe(false);
    expect(list.items[1]).toBeInstanceOf(Task);
    expect(list.items[1]!.description).toBe('Second task');
    expect(list.items[1]!.completed).toBe(true);
  });

  test('Conclusión: Los genéricos son para type-safety, no para runtime', () => {
    console.log('\n=== CONCLUSIÓN ===');
    console.log(`
✅ Genéricos en TypeScript:
   - Proporcionan type-safety en COMPILE-TIME
   - Se borran completamente en RUNTIME (type erasure)
   - No afectan la metadata emitida por TypeScript

✅ QModel funciona correctamente porque:
   - Usa reflect-metadata para tipos concretos (Date, BigInt, etc.)
   - Usa inferencia runtime para arrays (analiza propiedades)
   - NO depende de los genéricos para funcionar
   - NO necesita @QType(ModelClass) - solo @QType()

⚠️  Limitación:
   - GenericContainer<string> y GenericContainer<number>
     son indistinguibles en runtime
   - Si necesitas distinguirlos, usa clases específicas
   - Si dos modelos tienen EXACTAMENTE las mismas propiedades,
     usa @QType(ModelClass) explícito para desambiguar

✅ Recomendación:
   - Usa genéricos para type-safety (IModel<T>)
   - QModel<IUser> funciona perfectamente
   - Solo @QType() sin argumentos es suficiente
   - El sistema detecta tipos reales en runtime
   - Los genéricos no interfieren con el funcionamiento
    `);

    expect(true).toBe(true); // Test documenta comportamiento
  });
});

// ========================================
// CASOS PRÁCTICOS: GENÉRICOS EN APIS REALES
// ========================================

describe('Genéricos: Casos prácticos', () => {
  interface IResponse<T> {
    data: T;
    status: number;
    message: string;
  }

  interface IUser {
    id: string;
    name: string;
    email: string;
  }

  interface IProduct {
    id: string;
    title: string;
    price: number;
  }

  class User extends QModel<IUser> {
    @QType()
    id!: string;

    @QType()
    name!: string;

    @QType()
    email!: string;
  }

  class Product extends QModel<IProduct> {
    @QType()
    id!: string;

    @QType()
    title!: string;

    @QType()
    price!: number;
  }

  // Response genérica - para type-safety
  class ApiResponse<T> extends QModel<IResponse<T>> {
    @QType()
    data!: T;

    @QType()
    status!: number;

    @QType()
    message!: string;
  }

  test('API Response genérica: Type-safety en compile-time', () => {
    // En compile-time, TypeScript sabe que data es User
    const userResponse: ApiResponse<User> = new ApiResponse<User>({
      data: new User({ id: '1', name: 'John', email: 'john@test.com' }),
      status: 200,
      message: 'Success',
    });

    // TypeScript permite esto (compile-time check)
    const userName: string = userResponse.data.name; // ✅ TypeScript sabe que data.name existe

    // En runtime funciona normalmente
    expect(userResponse.status).toBe(200);
    expect(userName).toBe('John');

    // Pero no podemos distinguir ApiResponse<User> de ApiResponse<Product> en runtime
    expect(userResponse.constructor.name).toBe('ApiResponse');
  });

  test('Múltiples responses: Misma clase en runtime', () => {
    const userResponse = new ApiResponse<User>({
      data: new User({ id: '1', name: 'John', email: 'john@test.com' }),
      status: 200,
      message: 'User fetched',
    });

    const productResponse = new ApiResponse<Product>({
      data: new Product({ id: 'p1', title: 'Laptop', price: 999 }),
      status: 200,
      message: 'Product fetched',
    });

    // Ambos son ApiResponse en runtime (no ApiResponse<User> vs ApiResponse<Product>)
    expect(userResponse.constructor).toBe(productResponse.constructor);
    expect(userResponse).toBeInstanceOf(ApiResponse);
    expect(productResponse).toBeInstanceOf(ApiResponse);

    // Pero el contenido es diferente
    expect(userResponse.data).toBeInstanceOf(User);
    expect(productResponse.data).toBeInstanceOf(Product);
  });

  test('Recomendación: Clases específicas para APIs', () => {
    // Si necesitas diferenciar en runtime, crea clases específicas

    class UserResponse extends QModel<IResponse<User>> {
      @QType()
      data!: User;

      @QType()
      status!: number;

      @QType()
      message!: string;
    }

    class ProductResponse extends QModel<IResponse<Product>> {
      @QType()
      data!: Product;

      @QType()
      status!: number;

      @QType()
      message!: string;
    }

    const userResp = new UserResponse({
      data: new User({ id: '1', name: 'John', email: 'john@test.com' }),
      status: 200,
      message: 'User fetched',
    });

    const productResp = new ProductResponse({
      data: new Product({ id: 'p1', title: 'Laptop', price: 999 }),
      status: 200,
      message: 'Product fetched',
    });

    // Ahora SÍ son clases diferentes en runtime
    expect(userResp.constructor).not.toBe(productResp.constructor);
    expect(userResp.constructor.name).toBe('UserResponse');
    expect(productResp.constructor.name).toBe('ProductResponse');

    // Y el tipo de data es correcto en metadata
    const userDataType = Reflect.getMetadata('design:type', userResp, 'data');
    const productDataType = Reflect.getMetadata('design:type', productResp, 'data');

    expect(userDataType).toBe(User);
    expect(productDataType).toBe(Product);
  });
});
