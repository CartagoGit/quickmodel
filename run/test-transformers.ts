/**
 * Ejemplos completos de transformers con funciones directas
 * Muestra todas las posibilidades: Math.*, btoa/atob, JSON, arrow functions, etc.
 */

import { Quick, QModel } from '../src/index';

// =============== EJEMPLO 1: Math Functions ===============
@Quick({
  price: (v: number) => Math.round(v * 100) / 100,  // Redondea a 2 decimales
  count: Math.floor,                                  // Redondeo hacia abajo
  percentage: (v: number) => Math.min(100, Math.max(0, v)), // Clamp 0-100
  absolute: Math.abs,                                 // Valor absoluto
  squareRoot: Math.sqrt,                              // Raíz cuadrada
})
class Product extends QModel {
  declare price: number;
  declare count: number;
  declare percentage: number;
  declare absolute: number;
  declare squareRoot: number;
}

console.log('\n============ MATH FUNCTIONS ============');
const product = new Product({
  price: 19.9876,
  count: 5.7,
  percentage: 150,  // Se clampeará a 100
  absolute: -42,
  squareRoot: 16,
});

console.log('price (rounded to 2 decimals):', product.price);  // 19.99
console.log('count (floored):', product.count);                 // 5
console.log('percentage (clamped 0-100):', product.percentage); // 100
console.log('absolute:', product.absolute);                     // 42
console.log('squareRoot:', product.squareRoot);                 // 4

// =============== EJEMPLO 2: String Transformations ===============
@Quick({
  name: (s: string) => s.trim().toUpperCase(),
  slug: (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
  firstWord: (s: string) => s.split(' ')[0],
  reversed: (s: string) => s.split('').reverse().join(''),
})
class TextProcessor extends QModel {
  declare name: string;
  declare slug: string;
  declare firstWord: string;
  declare reversed: string;
}

console.log('\n============ STRING TRANSFORMATIONS ============');
const text = new TextProcessor({
  name: '  john doe  ',
  slug: 'Hello World! 2024',
  firstWord: 'TypeScript is awesome',
  reversed: 'hello',
});

console.log('name (trimmed + uppercase):', text.name);      // "JOHN DOE"
console.log('slug (slugified):', text.slug);                // "hello-world-2024"
console.log('firstWord:', text.firstWord);                  // "TypeScript"
console.log('reversed:', text.reversed);                    // "olleh"

// =============== EJEMPLO 3: Encoding/Decoding ===============
declare const btoa: (str: string) => string;
declare const atob: (str: string) => string;

@Quick({
  encoded: (s: string) => Buffer.from(s).toString('base64'),  // Base64 encode (Node.js)
  decoded: (s: string) => Buffer.from(s, 'base64').toString('utf-8'),  // Base64 decode
})
class Encoder extends QModel {
  declare encoded: string;
  declare decoded: string;
}

console.log('\n============ ENCODING/DECODING ============');
const encoder = new Encoder({
  encoded: 'Hello World',
  decoded: 'SGVsbG8gV29ybGQ=',  // "Hello World" en base64
});

console.log('encoded:', encoder.encoded);  // "SGVsbG8gV29ybGQ="
console.log('decoded:', encoder.decoded);  // "Hello World"

// =============== EJEMPLO 4: JSON Parsing ===============
@Quick({
  metadata: JSON.parse,
  config: (str: string) => JSON.parse(str),
})
class JsonModel extends QModel {
  declare metadata: any;
  declare config: any;
}

console.log('\n============ JSON PARSING ============');
const jsonModel = new JsonModel({
  metadata: '{"name":"John","age":30}',
  config: '{"theme":"dark","lang":"es"}',
});

console.log('metadata:', jsonModel.metadata);  // { name: 'John', age: 30 }
console.log('config:', jsonModel.config);      // { theme: 'dark', lang: 'es' }

// =============== EJEMPLO 5: Business Logic ===============
@Quick({
  tax: (price: number) => price * 0.21,                          // IVA 21%
  discount: (price: number) => price * 0.9,                      // 10% descuento
  total: (price: number) => (price * 1.21) * 0.9,               // Precio + IVA - descuento
  formatted: (price: number) => `$${price.toFixed(2)}`,         // Formato moneda
})
class Invoice extends QModel {
  declare tax: number;
  declare discount: number;
  declare total: number;
  declare formatted: string;
}

console.log('\n============ BUSINESS LOGIC ============');
const invoice = new Invoice({
  tax: 100,
  discount: 100,
  total: 100,
  formatted: 99.99,
});

console.log('tax (21%):', invoice.tax);            // 21
console.log('discount (10%):', invoice.discount);  // 90
console.log('total:', invoice.total);              // 108.9
console.log('formatted:', invoice.formatted);      // "$99.99"

// =============== EJEMPLO 6: Combinado con tipos básicos ===============
@Quick({
  // String literals para tipos básicos
  id: 'bigint',
  createdAt: 'date',
  pattern: 'regexp',
  tags: 'set',
  
  // Funciones custom
  normalizedPrice: (v: number) => Math.round(v * 100) / 100,
  slug: (s: string) => s.toLowerCase().replace(/\s+/g, '-'),
  isValid: (v: any) => v !== null && v !== undefined,
})
class CompleteExample extends QModel {
  declare id: bigint;
  declare createdAt: Date;
  declare pattern: RegExp;
  declare tags: Set<string>;
  declare normalizedPrice: number;
  declare slug: string;
  declare isValid: boolean;
}

console.log('\n============ COMPLETE EXAMPLE ============');
const complete = new CompleteExample({
  id: '999999999999999',
  createdAt: '2024-01-08T10:00:00.000Z',
  pattern: '/test/i',
  tags: ['js', 'ts', 'node'],
  normalizedPrice: 19.9876,
  slug: 'My Product Name',
  isValid: null,
});

console.log('id (bigint):', complete.id, typeof complete.id);
console.log('createdAt (Date):', complete.createdAt instanceof Date);
console.log('pattern (RegExp):', complete.pattern instanceof RegExp);
console.log('tags (Set):', complete.tags instanceof Set, complete.tags.size);
console.log('normalizedPrice:', complete.normalizedPrice);  // 19.99
console.log('slug:', complete.slug);                        // "my-product-name"
console.log('isValid:', complete.isValid);                  // false

console.log('\n✅ All transformer examples completed!\n');
