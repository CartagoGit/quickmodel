const { QModel, Quick } = require('./dist/index.js');

class User extends QModel {
  constructor(data) {
    super(data);
  }
}

Quick()(User);

const user = new User({ id: '1', name: 'Alice' });
console.log('user.id:', user.id);
console.log('user.name:', user.name);
