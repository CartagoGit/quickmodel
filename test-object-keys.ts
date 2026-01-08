const obj = Object.create(null);
obj.id = 1;
obj.name = 'John';
obj.createdAt = new Date();

console.log('Object.keys:', Object.keys(obj));
console.log('Object.getOwnPropertyNames:', Object.getOwnPropertyNames(obj));
