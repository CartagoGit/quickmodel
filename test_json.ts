class A {
  toJSON() { return '{"a":1}'; }
}
const a = new A();
console.log(JSON.stringify(a));

class B {
  toJSON() { return {a: 1}; }
}
const b = new B();
console.log(JSON.stringify(b));
