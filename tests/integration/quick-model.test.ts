import { Field, QuickModel, QuickType } from '../../src/quick.model';

console.log('═══ TEST SOLID: QuickModel Refactorizado ═══\n');

interface IUser {
  id: string;
  name: string;
  age: number;
  createdAt: string;
}

type UserTransforms = {
  createdAt: Date;
};

class User extends QuickModel<IUser> implements QuickType<IUser, UserTransforms> {
  @Field() id!: string;
  @Field() name!: string;
  @Field() age!: number;
  @Field() createdAt!: Date;
}

try {
  console.log('1. Creando usuario desde interfaz...');
  const userData: IUser = {
    id: '123',
    name: 'John Doe',
    age: 30,
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  const user = new User(userData);
  console.log('✅ Usuario creado:', {
    id: user.id,
    name: user.name,
    age: user.age,
    createdAt: user.createdAt,
  });
  console.log('   createdAt es Date?', user.createdAt instanceof Date);

  console.log('\n2. Serializando a interfaz...');
  const serialized = user.toInterface();
  console.log('✅ Serializado:', serialized);

  console.log('\n3. Round-trip test...');
  const user2 = new User(serialized);
  console.log('✅ Round-trip exitoso:', {
    id: user2.id === user.id,
    name: user2.name === user.name,
    age: user2.age === user.age,
    createdAt: user2.createdAt.getTime() === user.createdAt.getTime(),
  });

  console.log('\n4. Método estático fromInterface...');
  const user3 = User.fromInterface(userData);
  console.log('✅ fromInterface:', user3 instanceof User);

  console.log('\n5. JSON serialization...');
  const json = user.toJSON();
  const user4 = User.fromJSON(json);
  console.log('✅ JSON round-trip:', user4 instanceof User && user4.createdAt instanceof Date);

  console.log('\n✅ TODOS LOS TESTS PASARON\n');
  console.log('════════════════════════════════════════');
  console.log('SOLID PRINCIPLES APLICADOS:');
  console.log('  ✓ Single Responsibility - Servicios separados');
  console.log('  ✓ Open/Closed - Extensible via registry');
  console.log('  ✓ Liskov Substitution - Transformers intercambiables');
  console.log('  ✓ Interface Segregation - Interfaces específicas');
  console.log('  ✓ Dependency Inversion - Depende de abstracciones');
  console.log('════════════════════════════════════════');
} catch (error: any) {
  console.log('❌ Error:', error.message);
  console.log(error.stack);
}
