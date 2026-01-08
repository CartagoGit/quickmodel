/**
 * @Quick() class decorator for automatic property registration.
 * 
 * This decorator automatically applies @QType() to all properties of a class,
 * eliminating the need for manual decoration of each property. It uses TypeScript's
 * design:type metadata to detect property types and applies the appropriate 
 * transformations.
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles automatic property registration
 * - Open/Closed: Extends QType functionality without modifying it
 * - Don't Repeat Yourself: Eliminates repetitive @QType() decorators
 * 
 * @example
 * **Without @Quick()** (verbose):
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QType() id!: string;
 *   @QType() name!: string;
 *   @QType() email!: string;
 *   @QType() age!: number;
 *   @QType() createdAt!: Date;
 * }
 * ```
 * 
 * @example
 * **With @Quick()** (concise):
 * ```typescript
 * @Quick()
 * class User extends QModel<IUser> {
 *   id!: string;
 *   name!: string;
 *   email!: string;
 *   age!: number;
 *   createdAt!: Date;
 * }
 * ```
 * 
 * @example
 * **Special types still work**:
 * ```typescript
 * @Quick()
 * class Account extends QModel<IAccount> {
 *   id!: string;
 *   balance!: bigint;      // Auto-detected
 *   pattern!: RegExp;      // Auto-detected
 *   createdAt!: Date;      // Auto-detected
 *   metadata!: Map<string, any>;  // Auto-detected
 * }
 * ```
 * 
 * @example
 * **Mix with @QType() for specific control**:
 * ```typescript
 * @Quick()
 * class Product extends QModel<IProduct> {
 *   id!: string;           // Auto from @Quick()
 *   name!: string;         // Auto from @Quick()
 *   
 *   @QType(Category)       // Explicit for nested model
 *   category!: Category;
 *   
 *   @QType(Tag)           // Explicit for array of models
 *   tags!: Tag[];
 * }
 * ```
 */

import 'reflect-metadata';
import { QType } from './qtype.decorator';
import { ModelDeserializer } from '../services/model-deserializer.service';
import { qTransformerRegistry } from '../registry';

const QUICK_DECORATOR_KEY = '__quickModel__';
const QUICK_TYPE_MAP_KEY = '__quickTypeMap__';

/**
 * Options for @Quick() decorator to specify property types explicitly
 */
export interface QuickOptions {
  [propertyName: string]: any;
}

/**
 * Class decorator that automatically applies @QType() to all properties.
 * 
 * Properties are registered from the data passed to the constructor.
 * 
 * **Auto-detection (ONLY for unambiguous types):**
 * - **Date**: Automatically detected from ISO 8601 strings
 * - **BigInt**: Automatically detected from numeric strings with 15+ digits
 * - **Set/Map**: MUST be specified in type mapping (cannot be distinguished from arrays)
 * 
 * @param typeMap REQUIRED mapping for Set, Map, and custom class properties
 * @returns A class decorator function
 * 
 * @example
 * **✅ Correct usage with type mapping:**
 * ```typescript
 * @Quick({ tags: Set, metadata: Map })
 * class User extends QModel<IUser> {
 *   declare id: number;
 *   declare date: Date;              // Auto-detected from ISO string
 *   declare tags: Set<string>;        // NEEDS type mapping
 *   declare metadata: Map<string, any>; // NEEDS type mapping
 * }
 * ```
 * 
 * @example
 * **✅ Works with both declare and ! syntax:**
 * ```typescript
 * @Quick({ tags: Set })
 * class User extends QModel<IUser> {
 *   id!: number;         // ✅ Works
 *   tags!: Set<string>;  // ✅ Works with type mapping
 * }
 * ```
 * 
 * @remarks
 * **Why Set/Map need type mapping:**
 * 
 * The backend sends both as arrays:
 * - `tags: ["a", "b"]` → Array or Set? Cannot determine
 * - `metadata: [["k", "v"]]` → Array or Map? Cannot determine
 * 
 * Without explicit type mapping, the decorator cannot know the developer's intent.
 * This is a design decision for robustness over "magic" heuristics.
 * 
 * @see {@link QType} for per-property decoration (supports TypeScript metadata for `!` syntax)
 */
export function Quick(typeMap?: QuickOptions): ClassDecorator {
  return function <T extends Function>(target: T): any {
    // Mark class as using @Quick() for auto-registration
    Reflect.defineMetadata(QUICK_DECORATOR_KEY, true, target);
    
    // Store type map if provided
    if (typeMap) {
      Reflect.defineMetadata(QUICK_TYPE_MAP_KEY, typeMap, target);
    }
    
    // Add static method for creating instances (used by deserializer)
    // This allows us to bypass the field initialization problem with `!`
    (target as any).__createQuickInstance = function(data: any) {
      // Create instance without calling constructor
      const instance = Object.create(target.prototype);
      
      // Note: This doesn't work with `!` syntax due to TypeScript field initialization
      // TypeScript generates code that redefines properties AFTER constructor completes
      // This method is useful for declare syntax or programmatic instance creation
      
      // Register properties if not already done
      const typeMap = Reflect.getMetadata(QUICK_TYPE_MAP_KEY, target) || {};
      const properties = Object.keys(data);
      
      for (const propertyKey of properties) {
        const existingFieldType = Reflect.getMetadata('fieldType', target.prototype, propertyKey);
        const existingArrayClass = Reflect.getMetadata('arrayElementClass', target.prototype, propertyKey);
        
        if (existingFieldType !== undefined || existingArrayClass !== undefined) {
          continue;
        }
        
        const mappedType = typeMap[propertyKey];
        if (mappedType) {
          Reflect.defineMetadata('design:type', mappedType, target.prototype, propertyKey);
        } else {
          // Only auto-detect unambiguous types: Date and BigInt
          const value = data[propertyKey];
          if (value !== null && value !== undefined) {
            let inferredType = value.constructor;
            
            // Date detection: ISO 8601 string pattern
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
              inferredType = Date;
            }
            // BigInt detection: 15+ digit numeric string
            else if (typeof value === 'string' && /^\d{15,}$/.test(value)) {
              inferredType = BigInt;
            }
            
            Reflect.defineMetadata('design:type', inferredType, target.prototype, propertyKey);
          }
        }
        
        const decorator = QType();
        decorator(target.prototype, propertyKey);
      }
      
      return instance;
    };
    
    // Wrap constructor to register properties on first instantiation
    const originalConstructor = target;
    let propertiesRegistered = false;
    
    const wrappedConstructor: any = function(this: any, ...args: any[]) {
      // Don't call original constructor at all - create and populate instance directly
      // This bypasses TypeScript's field initialization completely
      const data = args[0];
      
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        // Invalid data, call original constructor
        return Reflect.construct(originalConstructor, args, wrappedConstructor);
      }
      
      // Create instance without calling constructor
      // Use wrappedConstructor prototype so this.constructor === wrappedConstructor
      const instance = Object.create(wrappedConstructor.prototype);
      
      // Register properties if not already done
      if (!propertiesRegistered) {
        const typeMap = Reflect.getMetadata(QUICK_TYPE_MAP_KEY, originalConstructor) || {};
        const properties = Object.keys(data);
        
        for (const propertyKey of properties) {
          const existingFieldType = Reflect.getMetadata('fieldType', originalConstructor.prototype, propertyKey);
          const existingArrayClass = Reflect.getMetadata('arrayElementClass', originalConstructor.prototype, propertyKey);
          
          if (existingFieldType !== undefined || existingArrayClass !== undefined) {
            continue;
          }
          
          const mappedType = typeMap[propertyKey];
          if (mappedType) {
            Reflect.defineMetadata('design:type', mappedType, originalConstructor.prototype, propertyKey);
          } else {
            // Only auto-detect unambiguous types: Date and BigInt
            const value = data[propertyKey];
            if (value !== null && value !== undefined) {
              let inferredType = value.constructor;
              
              // Date detection: ISO 8601 string pattern
              if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                inferredType = Date;
              }
              // BigInt detection: 15+ digit numeric string
              else if (typeof value === 'string' && /^\d{15,}$/.test(value)) {
                inferredType = BigInt;
              }
              
              Reflect.defineMetadata('design:type', inferredType, originalConstructor.prototype, propertyKey);
            }
          }
          
          const decorator = QType();
          decorator(originalConstructor.prototype, propertyKey);
        }
        
        propertiesRegistered = true;
      }
      
      // Populate instance directly using deserializer
      const createQuickInstance = (originalConstructor as any).__createQuickInstance;
      if (createQuickInstance) {
        type DataAsInterface = Record<string, unknown>;
        type ThisConstructor = new (data: DataAsInterface) => any;
        
        // Create deserializer with proper registry
        const deserializer = new ModelDeserializer(qTransformerRegistry);
        
        // Deserialize directly - this will create a new instance and populate it
        const tempInstance = deserializer.deserialize(data as DataAsInterface, originalConstructor as ThisConstructor);
        
        // Copy all properties from tempInstance to our instance
        for (const key of Object.keys(tempInstance)) {
          (instance as any)[key] = (tempInstance as any)[key];
        }
        
        // Add QModel methods manually (non-enumerable to avoid serialization issues)
        Object.defineProperty(instance, 'initialize', {
          value: function() {},
          writable: true,
          enumerable: false,
          configurable: true
        });
        
        Object.defineProperty(instance, 'toInterface', {
          value: function() {
            const { ModelSerializer } = require('../services/model-serializer.service');
            const serializer = new ModelSerializer(qTransformerRegistry);
            return serializer.serialize(this, this.constructor);
          },
          writable: true,
          enumerable: false,
          configurable: true
        });
        
        Object.defineProperty(instance, 'toJSON', {
          value: function() {
            return JSON.stringify(this.toInterface());
          },
          writable: true,
          enumerable: false,
          configurable: true
        });
        
        Object.defineProperty(instance, 'clone', {
          value: function() {
            const iface = this.toInterface();
            // Use wrappedConstructor directly to ensure proper decoration
            return new wrappedConstructor(iface);
          },
          writable: true,
          enumerable: false,
          configurable: true
        });
        
        return instance;
      }
      
      // Fallback: call original constructor
      return Reflect.construct(originalConstructor, args, wrappedConstructor);
    };
    
    // Copy prototype and static members
    wrappedConstructor.prototype = originalConstructor.prototype;
    Object.setPrototypeOf(wrappedConstructor, originalConstructor);
    
    for (const key of Object.getOwnPropertyNames(originalConstructor)) {
      if (key !== 'prototype' && key !== 'length' && key !== 'name') {
        const descriptor = Object.getOwnPropertyDescriptor(originalConstructor, key);
        if (descriptor) {
          Object.defineProperty(wrappedConstructor, key, descriptor);
        }
      }
    }
    
    Object.defineProperty(wrappedConstructor, 'name', {
      value: originalConstructor.name,
      writable: false,
      configurable: true
    });
    
    return wrappedConstructor as any;
  };
}

/**
 * Checks if a class is decorated with @Quick()
 * @internal
 */
export function isQuickDecorated(constructor: Function): boolean {
  return Reflect.getMetadata(QUICK_DECORATOR_KEY, constructor) === true;
}

