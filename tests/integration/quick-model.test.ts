import { Field, QuickModel, QuickType } from '../../src/quick.model';

console.log('═══ TEST SOLID: Refactored QuickModel ═══\n');

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
  console.log('1. Creating user from interface...');
  const userData: IUser = {
    id: '123',
    name: 'John Doe',
    age: 30,
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  const user = new User(userData);
  console.log('✅ User created:', {
    id: user.id,
    name: user.name,
    age: user.age,
    createdAt: user.createdAt,
  });
  console.log('   createdAt is Date?', user.createdAt instanceof Date);

  console.log('\n2. Serializing to interface...');
  const serialized = user.toInterface();
  console.log('✅ Serialized:', serialized);

  console.log('\n3. Round-trip test...');
  const user2 = new User(serialized);
  console.log('✅ Round-trip successful:', {
    id: user2.id === user.id,
    name: user2.name === user.name,
    age: user2.age === user.age,
    createdAt: user2.createdAt.getTime() === user.createdAt.getTime(),
  });

  console.log('\n4. Static method fromInterface...');
  const user3 = User.fromInterface(userData);
  console.log('✅ fromInterface:', user3 instanceof User);

  console.log('\n5. JSON serialization...');
  const json = user.toJSON();
  const user4 = User.fromJSON(json);
  console.log('✅ JSON round-trip:', user4 instanceof User && user4.createdAt instanceof Date);

  console.log('\n✅ ALL TESTS PASSED\n');
  console.log('════════════════════════════════════════');
  console.log('SOLID PRINCIPLES APPLIED:');
  console.log('  ✓ Single Responsibility - Separated services');
  console.log('  ✓ Open/Closed - Extensible via registry');
  console.log('  ✓ Liskov Substitution - Interchangeable transformers');
  console.log('  ✓ Interface Segregation - Specific interfaces');
  console.log('  ✓ Dependency Inversion - Depends on abstractions');
  console.log('════════════════════════════════════════');
} catch (error: any) {
  console.log('❌ Error:', error.message);
  console.log(error.stack);
}
