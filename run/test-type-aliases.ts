/**
 * Test para verificar autocompletado de type aliases
 * y el uso de funciones Math directamente
 */

import { Quick, QModel, QInterface } from '../src';

interface IProduct {
	name: string;
	price: number;
	discount: number;
	total: number;
	quantity: number;
	encoded: string;
	slug: string;
	formatted: string;
	uppercased: string;
}

// ✅ Probando string literals con parámetros + Math functions
@Quick({
	price: 'round.2', // ← IDE debería autocompletar
	discount: Math.abs, // ← Función Math directamente
	total: (v: number) => Math.round(v * 100) / 100, // ← Custom
	quantity: Math.ceil, // ← Función Math directamente
	encoded: 'base64.encode', // ← IDE debería autocompletar
	slug: 'slugify', // ← IDE debería autocompletar
	formatted: 'tofixed.2', // ← IDE debería autocompletar
	uppercased: 'uppercase', // ← IDE debería autocompletar
})
class Product extends QModel<IProduct> implements QInterface<IProduct> {
	declare name: string;
	declare price: number;
	declare discount: number;
	declare total: number;
	declare quantity: number;
	declare encoded: string;
	declare slug: string;
	declare formatted: string;
	declare uppercased: string;
}

// Test basic
console.log('=== Test Type Aliases ===\n');

const product = new Product({
	name: 'Test Product',
	price: 19.9999,
	discount: -5.5,
	total: 14.4999,
	quantity: 3.7,
	encoded: 'Hello World',
	slug: 'Hello World Test!',
	formatted: '99.123456',
	uppercased: 'hello world',
});

console.log('name:', product.name);
console.log('price (round.2):', product.price);
console.log('discount (Math.abs):', product.discount);
console.log('total (custom):', product.total);
console.log('quantity (Math.ceil):', product.quantity);
console.log('encoded (base64):', product.encoded);
console.log('slug:', product.slug);
console.log('formatted (tofixed.2):', product.formatted);
console.log('uppercased:', product.uppercased);

console.log('\n✅ Si ves valores transformados, el sistema funciona!');
console.log('✅ Prueba escribir @Quick({ test: " }) y mira el autocompletado');
