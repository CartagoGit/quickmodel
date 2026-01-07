/**
 * @Quick() Decorator - Ejemplo 4: Arrays y Serialización
 * 
 * Demuestra cómo @Quick() maneja arrays y el proceso completo
 * de serialización/deserialización.
 */

import { QModel, Quick, QInterface } from '../../../quick.model';

// ============================================
// 4. ARRAYS Y SERIALIZACIÓN
// ============================================

interface IProduct {
  id: string;
  name: string;
  price: number;
  tags: string[];
  reviews: number[];
  createdAt: Date;
}

@Quick()
class Product extends QModel<IProduct> implements QInterface<IProduct> {
  declare id: string;
  declare name: string;
  declare price: number;
  declare tags: string[];
  declare reviews: number[];
  declare createdAt: Date;
}

// Crear producto
const product = new Product({
  id: 'prod-001',
  name: 'Laptop Gaming',
  price: 1299.99,
  tags: ['electronics', 'gaming', 'computers'],
  reviews: [5, 4, 5, 5, 4],
  createdAt: new Date('2024-01-01')
});

console.log('\n=== EJEMPLO 4: Arrays y Serialización ===\n');
console.log('Producto:', product);
console.log('Tags:', product.tags);
console.log('Reviews:', product.reviews);
console.log('Promedio reviews:', product.reviews.reduce((a, b) => a + b, 0) / product.reviews.length);

// Serialización a JSON
const json = product.toJSON();
console.log('\nJSON:', JSON.stringify(json, null, 2));

// Serialización a interface
const interfaceData = product.toInterface();
console.log('\nInterface:', interfaceData);
console.log('createdAt es string?:', typeof interfaceData.createdAt === 'string' ? '✅' : '❌');

// Deserialización desde interface
const restored = new Product(interfaceData);
console.log('\nRestaurado desde interface:', restored);
console.log('createdAt es Date?:', restored.createdAt instanceof Date ? '✅' : '❌');
console.log('Tags preservados?:', Array.isArray(restored.tags) ? '✅' : '❌');

// ============================================
// 5. MÚLTIPLES PRODUCTOS CON MÉTODOS ÚTILES
// ============================================

interface IInventory {
  id: string;
  warehouse: string;
  products: string[];  // IDs de productos
  lastUpdated: Date;
}

@Quick()
class Inventory extends QModel<IInventory> implements QInterface<IInventory> {
  declare id: string;
  declare warehouse: string;
  declare products: string[];
  declare lastUpdated: Date;

  // ✅ Puedes agregar métodos personalizados
  getProductCount(): number {
    return this.products.length;
  }

  addProduct(productId: string): void {
    if (!this.products.includes(productId)) {
      this.products.push(productId);
      this.lastUpdated = new Date();
    }
  }

  removeProduct(productId: string): void {
    const index = this.products.indexOf(productId);
    if (index !== -1) {
      this.products.splice(index, 1);
      this.lastUpdated = new Date();
    }
  }
}

const inventory = new Inventory({
  id: 'inv-001',
  warehouse: 'Main Warehouse',
  products: ['prod-001', 'prod-002', 'prod-003'],
  lastUpdated: new Date()
});

console.log('\n=== EJEMPLO 5: Métodos Personalizados ===\n');
console.log('Inventario:', inventory);
console.log('Cantidad de productos:', inventory.getProductCount());

inventory.addProduct('prod-004');
console.log('Después de agregar prod-004:', inventory.products);
console.log('Nueva cantidad:', inventory.getProductCount());

inventory.removeProduct('prod-002');
console.log('Después de eliminar prod-002:', inventory.products);

// Los métodos se preservan después de clonar
const cloned = inventory.clone();
console.log('\nInventario clonado:', cloned);
console.log('Cantidad en clon:', cloned.getProductCount());
console.log('¿Tiene el método?:', typeof cloned.getProductCount === 'function' ? '✅' : '❌');

export { Product, Inventory };
