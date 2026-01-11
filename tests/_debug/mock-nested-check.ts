
import { QModel, Quick } from '../../src/index';

class Address extends QModel<{ city: string }> {
    declare city: string;
}

interface IUser {
    name: string;
    address: Address;
}

@Quick({ address: Address })
class User extends QModel<IUser> {
    declare name: string;
    declare address: Address;
}

console.log('Mocking User (Random):');
const mock = User.mock().random();
console.log('Result:', JSON.stringify(mock, null, 2));

if (mock.address) {
    console.log('Class Name:', mock.address.constructor.name);
    console.log('Address Value:', mock.address);
} else {
    console.log('Address is missing/null');
}

