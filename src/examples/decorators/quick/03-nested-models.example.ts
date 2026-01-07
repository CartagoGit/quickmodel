/**
 * @Quick() Decorator - Ejemplo 3: Modelos Anidados
 * 
 * Demuestra cómo combinar @Quick() con @QType() explícito
 * para modelos anidados y arrays de modelos.
 */

import { QModel, Quick, QType, QInterface } from '../../../quick.model';

// ============================================
// MODELOS ANIDADOS CON @Quick()
// ============================================

interface IAddress {
  street: string;
  city: string;
  country: string;
  zipCode: string;
}

@Quick()
class Address extends QModel<IAddress> implements QInterface<IAddress> {
  declare street: string;
  declare city: string;
  declare country: string;
  declare zipCode: string;
}

interface ICompany {
  name: string;
  founded: Date;
  employees: number;
}

@Quick()
class Company extends QModel<ICompany> implements QInterface<ICompany> {
  declare name: string;
  declare founded: Date;
  declare employees: number;
}

// ============================================
// MODELO PRINCIPAL CON PROPIEDADES ANIDADAS
// ============================================

interface IPerson {
  id: string;
  name: string;
  age: number;
  address: IAddress;      // Modelo anidado
  company: ICompany;      // Otro modelo anidado
  birthDate: Date;
}

/**
 * ⚠️ IMPORTANTE: Para modelos anidados, necesitas @QType() explícito
 * 
 * @Quick() solo registra propiedades primitivas y tipos complejos básicos.
 * Para modelos anidados, usa @QType(ModelClass) explícitamente.
 */
@Quick()
class Person extends QModel<IPerson> implements QInterface<IPerson> {
  declare id: string;           // ✅ Auto-registrado por @Quick()
  declare name: string;         // ✅ Auto-registrado por @Quick()
  declare age: number;          // ✅ Auto-registrado por @Quick()
  declare birthDate: Date;      // ✅ Auto-registrado por @Quick()
  
  @QType(Address)               // ⚠️ Necesita @QType() explícito
  declare address: Address;
  
  @QType(Company)               // ⚠️ Necesita @QType() explícito
  declare company: Company;
}

// Crear instancia con datos anidados
const person = new Person({
  id: 'p1',
  name: 'Bob Smith',
  age: 35,
  birthDate: new Date('1988-05-15'),
  address: {
    street: '123 Main St',
    city: 'San Francisco',
    country: 'USA',
    zipCode: '94102'
  },
  company: {
    name: 'Tech Corp',
    founded: new Date('2010-01-01'),
    employees: 500
  }
});

console.log('\n=== EJEMPLO 3: Modelos Anidados con @Quick() ===\n');
console.log('Persona:', person);
console.log('Nombre:', person.name);
console.log('Dirección:', person.address);
console.log('¿Address es instancia de Address?:', person.address instanceof Address ? '✅' : '❌');
console.log('Ciudad:', person.address.city);
console.log('Empresa:', person.company);
console.log('¿Company es instancia de Company?:', person.company instanceof Company ? '✅' : '❌');

// Serialización mantiene estructura anidada
const serialized = person.toInterface();
console.log('\nSerializado:', JSON.stringify(serialized, null, 2));

// Deserialización reconstituye los modelos anidados
const deserialized = new Person(serialized);
console.log('\nDeserializado:', deserialized);
console.log('Address restaurado:', deserialized.address instanceof Address ? '✅' : '❌');
console.log('Company restaurado:', deserialized.company instanceof Company ? '✅' : '❌');

// ============================================
// ARRAYS DE MODELOS
// ============================================

interface ITag {
  id: string;
  name: string;
  color: string;
}

@Quick()
class Tag extends QModel<ITag> implements QInterface<ITag> {
  declare id: string;
  declare name: string;
  declare color: string;
}

interface IArticle {
  id: string;
  title: string;
  tags: ITag[];
  author: IPerson;
}

/**
 * ⚠️ Arrays de modelos también necesitan @QType() explícito
 * 
 * IMPORTANTE: Debes crear al menos una instancia del modelo anidado
 * ANTES de usar el modelo principal para que se registre correctamente.
 */
@Quick()
class Article extends QModel<IArticle> implements QInterface<IArticle> {
  declare id: string;
  declare title: string;
  
  @QType(Tag)                   // ⚠️ Array de modelos necesita @QType()
  declare tags: Tag[];
  
  @QType(Person)
  declare author: Person;
}

// ⚠️ IMPORTANTE: Registrar Tag creando una instancia dummy
new Tag({ id: 'dummy', name: 'dummy', color: 'dummy' });

const article = new Article({
  id: 'article-1',
  title: 'Guía de @Quick() Decorator',
  tags: [
    { id: 't1', name: 'typescript', color: 'blue' },
    { id: 't2', name: 'decorators', color: 'green' },
    { id: 't3', name: 'quickmodel', color: 'purple' }
  ],
  author: {
    id: 'p2',
    name: 'Alice Developer',
    age: 28,
    birthDate: new Date('1995-08-20'),
    address: {
      street: '456 Tech Ave',
      city: 'Seattle',
      country: 'USA',
      zipCode: '98101'
    },
    company: {
      name: 'DevCo',
      founded: new Date('2015-06-01'),
      employees: 150
    }
  }
});

console.log('\n=== ARRAYS DE MODELOS ===\n');
console.log('Artículo:', article);
console.log('Tags:', article.tags);
console.log('Primer tag es Tag?:', article.tags[0] instanceof Tag ? '✅' : '❌');
console.log('Autor es Person?:', article.author instanceof Person ? '✅' : '❌');
console.log('Tags:', article.tags.map(t => t.name));

export { Person, Address, Company, Article, Tag };
