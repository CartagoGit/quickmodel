/**
 * @QType() Decorator - Ejemplo 3: Modelos Anidados
 * 
 * Demuestra cómo usar @QType(ModelClass) para manejar
 * modelos anidados y arrays de modelos con control explícito.
 */

import { QModel, QType, QInterface } from '../../../quick.model';

// ============================================
// 1. MODELO ANIDADO SIMPLE
// ============================================

interface IAddress {
  street: string;
  city: string;
  country: string;
  postalCode: string;
}

class Address extends QModel<IAddress> implements QInterface<IAddress> {
  @QType()
  declare street: string;

  @QType()
  declare city: string;

  @QType()
  declare country: string;

  @QType()
  declare postalCode: string;
}

interface IPerson {
  id: string;
  name: string;
  age: number;
  address: IAddress;  // Modelo anidado
}

class Person extends QModel<IPerson> implements QInterface<IPerson> {
  @QType()
  declare id: string;

  @QType()
  declare name: string;

  @QType()
  declare age: number;

  // ⚠️ Para modelos anidados, especifica la clase
  @QType(Address)
  declare address: Address;
}

const person = new Person({
  id: 'person-001',
  name: 'Alice Johnson',
  age: 28,
  address: {
    street: '123 Main St',
    city: 'Madrid',
    country: 'Spain',
    postalCode: '28001'
  }
});

console.log('\n=== EJEMPLO 1: Modelo Anidado ===\n');
console.log('Person:', person);
console.log('Nombre:', person.name);
console.log('Dirección:', person.address);
console.log('address es Address?:', person.address instanceof Address ? '✅' : '❌');
console.log('Ciudad:', person.address.city);

// Serializar y deserializar
const personData = person.toInterface();
console.log('\nInterface:', personData);
console.log('address es object?:', typeof personData.address === 'object' ? '✅' : '❌');

const restoredPerson = new Person(personData);
console.log('\nPerson restaurada:', restoredPerson);
console.log('address es Address?:', restoredPerson.address instanceof Address ? '✅' : '❌');

// ============================================
// 2. ARRAY DE MODELOS
// ============================================

interface IOrder {
  id: string;
  customerId: string;
  orderDate: Date;
  items: IOrderItem[];  // Array de modelos
  total: number;
}

interface IOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

class OrderItem extends QModel<IOrderItem> implements QInterface<IOrderItem> {
  @QType()
  declare id: string;

  @QType()
  declare productId: string;

  @QType()
  declare productName: string;

  @QType()
  declare quantity: number;

  @QType()
  declare price: number;

  getSubtotal(): number {
    return this.quantity * this.price;
  }
}

class Order extends QModel<IOrder> implements QInterface<IOrder> {
  @QType()
  declare id: string;

  @QType()
  declare customerId: string;

  @QType()
  declare orderDate: Date;

  // ⚠️ Arrays de modelos SIEMPRE requieren @QType(ModelClass)
  @QType(OrderItem)
  declare items: OrderItem[];

  @QType()
  declare total: number;

  calculateTotal(): number {
    return this.items.reduce((sum, item) => sum + item.getSubtotal(), 0);
  }
}

const order = new Order({
  id: 'order-001',
  customerId: 'customer-123',
  orderDate: new Date('2024-01-15'),
  items: [
    {
      id: 'item-001',
      productId: 'prod-111',
      productName: 'Laptop',
      quantity: 1,
      price: 1299.99
    },
    {
      id: 'item-002',
      productId: 'prod-222',
      productName: 'Mouse',
      quantity: 2,
      price: 29.99
    },
    {
      id: 'item-003',
      productId: 'prod-333',
      productName: 'Keyboard',
      quantity: 1,
      price: 89.99
    }
  ],
  total: 1449.96
});

console.log('\n=== EJEMPLO 2: Array de Modelos ===\n');
console.log('Order:', order);
console.log('Fecha:', order.orderDate.toLocaleDateString());
console.log('Número de items:', order.items.length);

console.log('\nItems:');
order.items.forEach((item, i) => {
  console.log(`  ${i + 1}. ${item.productName}`);
  console.log(`     Cantidad: ${item.quantity} x $${item.price} = $${item.getSubtotal()}`);
  console.log(`     Es OrderItem?: ${item instanceof OrderItem ? '✅' : '❌'}`);
});

console.log('\nTotal calculado:', order.calculateTotal());
console.log('Total guardado:', order.total);
console.log('¿Coinciden?:', Math.abs(order.calculateTotal() - order.total) < 0.01 ? '✅' : '❌');

// Serializar y deserializar
const orderData = order.toInterface();
const restoredOrder = new Order(orderData);
console.log('\nOrder restaurada:');
console.log('items[0] es OrderItem?:', restoredOrder.items?.[0] instanceof OrderItem ? '✅' : '❌');
console.log('items[0].getSubtotal():', restoredOrder.items?.[0]?.getSubtotal());

// ============================================
// 3. ANIDACIÓN MÚLTIPLE NIVELES
// ============================================

interface ICompany {
  id: string;
  name: string;
  employees: IEmployee[];
}

interface IEmployee {
  id: string;
  name: string;
  position: string;
  address: IAddress;
  hireDate: Date;
}

class Employee extends QModel<IEmployee> implements QInterface<IEmployee> {
  @QType()
  declare id: string;

  @QType()
  declare name: string;

  @QType()
  declare position: string;

  @QType(Address)
  declare address: Address;

  @QType()
  declare hireDate: Date;
}

class Company extends QModel<ICompany> implements QInterface<ICompany> {
  @QType()
  declare id: string;

  @QType()
  declare name: string;

  @QType(Employee)
  declare employees: Employee[];
}

const company = new Company({
  id: 'company-001',
  name: 'TechCorp Solutions',
  employees: [
    {
      id: 'emp-001',
      name: 'Carlos García',
      position: 'Software Engineer',
      address: {
        street: 'Calle Mayor 15',
        city: 'Barcelona',
        country: 'Spain',
        postalCode: '08001'
      },
      hireDate: new Date('2020-03-15')
    },
    {
      id: 'emp-002',
      name: 'María López',
      position: 'Product Manager',
      address: {
        street: 'Avenida Diagonal 100',
        city: 'Barcelona',
        country: 'Spain',
        postalCode: '08002'
      },
      hireDate: new Date('2019-06-01')
    }
  ]
});

console.log('\n=== EJEMPLO 3: Anidación Múltiple Niveles ===\n');
console.log('Company:', company.name);
console.log('Empleados:', company.employees.length);

console.log('\nDetalles de empleados:');
company.employees.forEach((emp, i) => {
  console.log(`\n  Empleado ${i + 1}:`);
  console.log(`    Nombre: ${emp.name}`);
  console.log(`    Posición: ${emp.position}`);
  console.log(`    Ciudad: ${emp.address.city}`);
  console.log(`    Contratado: ${emp.hireDate.toLocaleDateString()}`);
  console.log(`    Es Employee?: ${emp instanceof Employee ? '✅' : '❌'}`);
  console.log(`    address es Address?: ${emp.address instanceof Address ? '✅' : '❌'}`);
  console.log(`    hireDate es Date?: ${emp.hireDate instanceof Date ? '✅' : '❌'}`);
});

// Serializar y deserializar
const companyData = company.toInterface();
const restoredCompany = new Company(companyData);

console.log('\n\nCompany restaurada:');
console.log('employees[0] es Employee?:', restoredCompany.employees?.[0] instanceof Employee ? '✅' : '❌');
console.log('employees[0].address es Address?:', restoredCompany.employees?.[0]?.address instanceof Address ? '✅' : '❌');
console.log('employees[0].hireDate es Date?:', restoredCompany.employees?.[0]?.hireDate instanceof Date ? '✅' : '❌');

// Clonar preserva toda la estructura
const clonedCompany = company.clone();
console.log('\nCompany clonada:');
console.log('employees[1] es Employee?:', clonedCompany.employees?.[1] instanceof Employee ? '✅' : '❌');
console.log('employees[1].address es Address?:', clonedCompany.employees?.[1]?.address instanceof Address ? '✅' : '❌');

export { Address, Person, OrderItem, Order, Employee, Company };
