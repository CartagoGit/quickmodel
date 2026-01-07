/**
 * Test: Probar tipos "complejos" SIN symbols
 * 
 * Verificar qué pasa con RegExp, Error, TypedArrays, ArrayBuffer, etc.
 * cuando NO usamos symbols explícitos
 */

import { describe, test, expect } from 'bun:test';
import { QModel, QType, QInterface } from '../../src/quick.model';

// ============================================================================
// Nested Model
// ============================================================================

interface ITag {
  id: string;
  name: string;
}

class Tag extends QModel<ITag> {
  @QType() id!: string;
  @QType() name!: string;
}

// ============================================================================
// Test Model
// ============================================================================

interface IComplexTypes {
  // Tipos que queremos probar
  pattern: { source: string; flags: string };
  error: { message: string; stack?: string; name?: string };
  buffer: number[];
  view: number[];
  uint8: number[];
  tags: ITag[];
}

type ComplexTypesTransforms = {
  pattern: RegExp;
  error: Error;
  buffer: ArrayBuffer;
  view: DataView;
  uint8: Uint8Array;
  tags: Tag[];
};

// SIN especificar symbols - solo @QType()
class ComplexTypesModel 
  extends QModel<IComplexTypes> 
  implements QInterface<IComplexTypes, ComplexTypesTransforms> {
  
  @QType() pattern!: RegExp;        // Sin QRegExp
  @QType() error!: Error;           // Sin QError
  @QType() buffer!: ArrayBuffer;    // Sin symbol
  @QType() view!: DataView;         // Sin symbol
  @QType() uint8!: Uint8Array;      // Sin QUint8Array
  @QType() tags!: Tag[];            // Sin Tag en @QType
}

// ============================================================================
// Tests
// ============================================================================

describe('Tipos complejos SIN symbols', () => {
  
  test('Verificar metadata emitida por TypeScript', () => {
    console.log('\n=== METADATA PARA TIPOS COMPLEJOS ===\n');
    
    const types = ['pattern', 'error', 'buffer', 'view', 'uint8', 'tags'];
    
    types.forEach(prop => {
      const metadata = Reflect.getMetadata('design:type', ComplexTypesModel.prototype, prop);
      console.log(`${prop}:`.padEnd(12), metadata?.name || 'undefined');
    });
    
    console.log('\n');
  });

  test('Probar RegExp sin QRegExp symbol', () => {
    const data: IComplexTypes = {
      pattern: { source: '^test$', flags: 'i' },
      error: { message: 'Test' },
      buffer: [1, 2, 3],
      view: [1, 2, 3],
      uint8: [1, 2, 3],
      tags: [{ id: '1', name: 'tag1' }],
    };

    try {
      const model = new ComplexTypesModel(data);
      
      console.log('\n=== RESULTADO RegExp ===');
      console.log('pattern:', model.pattern);
      console.log('tipo:', model.pattern?.constructor.name);
      console.log('¿Es RegExp?', model.pattern instanceof RegExp);
      
      if (model.pattern instanceof RegExp) {
        console.log('✅ RegExp funciona automáticamente!\n');
        expect(model.pattern).toBeInstanceOf(RegExp);
        expect(model.pattern.source).toBe('^test$');
        expect(model.pattern.flags).toBe('i');
      } else {
        console.log('❌ RegExp NO funciona sin symbol\n');
        console.log('Valor recibido:', model.pattern);
      }
    } catch (error: any) {
      console.log('❌ Error al crear modelo con RegExp:', error.message);
    }
  });

  test('Probar Error sin QError symbol', () => {
    const data: IComplexTypes = {
      pattern: { source: 'test', flags: '' },
      error: { message: 'Test error', stack: 'stack trace', name: 'TestError' },
      buffer: [1, 2, 3],
      view: [1, 2, 3],
      uint8: [1, 2, 3],
      tags: [{ id: '1', name: 'tag1' }],
    };

    try {
      const model = new ComplexTypesModel(data);
      
      console.log('\n=== RESULTADO Error ===');
      console.log('error:', model.error);
      console.log('tipo:', model.error?.constructor.name);
      console.log('¿Es Error?', model.error instanceof Error);
      
      if (model.error instanceof Error) {
        console.log('✅ Error funciona automáticamente!\n');
        expect(model.error).toBeInstanceOf(Error);
        expect(model.error.message).toBe('Test error');
      } else {
        console.log('❌ Error NO funciona sin symbol\n');
        console.log('Valor recibido:', model.error);
      }
    } catch (error: any) {
      console.log('❌ Error al crear modelo con Error:', error.message);
    }
  });

  test('Probar Uint8Array sin QUint8Array symbol', () => {
    const data: IComplexTypes = {
      pattern: { source: 'test', flags: '' },
      error: { message: 'Test' },
      buffer: [1, 2, 3],
      view: [1, 2, 3],
      uint8: [1, 2, 3],
      tags: [{ id: '1', name: 'tag1' }],
    };

    try {
      const model = new ComplexTypesModel(data);
      
      console.log('\n=== RESULTADO Uint8Array ===');
      console.log('uint8:', model.uint8);
      console.log('tipo:', model.uint8?.constructor.name);
      console.log('¿Es Uint8Array?', model.uint8 instanceof Uint8Array);
      
      if (model.uint8 instanceof Uint8Array) {
        console.log('✅ Uint8Array funciona automáticamente!\n');
        expect(model.uint8).toBeInstanceOf(Uint8Array);
        expect(Array.from(model.uint8)).toEqual([1, 2, 3]);
      } else {
        console.log('❌ Uint8Array NO funciona sin symbol\n');
        console.log('Valor recibido:', model.uint8);
      }
    } catch (error: any) {
      console.log('❌ Error al crear modelo con Uint8Array:', error.message);
    }
  });

  test('Probar ArrayBuffer sin symbol', () => {
    const data: IComplexTypes = {
      pattern: { source: 'test', flags: '' },
      error: { message: 'Test' },
      buffer: [1, 2, 3],
      view: [1, 2, 3],
      uint8: [1, 2, 3],
      tags: [{ id: '1', name: 'tag1' }],
    };

    try {
      const model = new ComplexTypesModel(data);
      
      console.log('\n=== RESULTADO ArrayBuffer ===');
      console.log('buffer:', model.buffer);
      console.log('tipo:', model.buffer?.constructor.name);
      console.log('¿Es ArrayBuffer?', model.buffer instanceof ArrayBuffer);
      
      if (model.buffer instanceof ArrayBuffer) {
        console.log('✅ ArrayBuffer funciona automáticamente!\n');
        expect(model.buffer).toBeInstanceOf(ArrayBuffer);
      } else {
        console.log('❌ ArrayBuffer NO funciona sin symbol\n');
        console.log('Valor recibido:', model.buffer);
      }
    } catch (error: any) {
      console.log('❌ Error al crear modelo con ArrayBuffer:', error.message);
    }
  });

  test('Probar DataView sin symbol', () => {
    const data: IComplexTypes = {
      pattern: { source: 'test', flags: '' },
      error: { message: 'Test' },
      buffer: [1, 2, 3],
      view: [1, 2, 3],
      uint8: [1, 2, 3],
      tags: [{ id: '1', name: 'tag1' }],
    };

    try {
      const model = new ComplexTypesModel(data);
      
      console.log('\n=== RESULTADO DataView ===');
      console.log('view:', model.view);
      console.log('tipo:', model.view?.constructor.name);
      console.log('¿Es DataView?', model.view instanceof DataView);
      
      if (model.view instanceof DataView) {
        console.log('✅ DataView funciona automáticamente!\n');
        expect(model.view).toBeInstanceOf(DataView);
      } else {
        console.log('❌ DataView NO funciona sin symbol\n');
        console.log('Valor recibido:', model.view);
      }
    } catch (error: any) {
      console.log('❌ Error al crear modelo con DataView:', error.message);
    }
  });

  test('Probar Array de modelos sin especificar Tag', () => {
    const data: IComplexTypes = {
      pattern: { source: 'test', flags: '' },
      error: { message: 'Test' },
      buffer: [1, 2, 3],
      view: [1, 2, 3],
      uint8: [1, 2, 3],
      tags: [
        { id: '1', name: 'tag1' },
        { id: '2', name: 'tag2' },
      ],
    };

    try {
      const model = new ComplexTypesModel(data);
      
      console.log('\n=== RESULTADO Array de modelos ===');
      console.log('tags:', model.tags);
      console.log('tags[0] tipo:', model.tags?.[0]?.constructor.name);
      console.log('¿tags[0] es Tag?', model.tags?.[0] instanceof Tag);
      
      if (model.tags?.[0] instanceof Tag) {
        console.log('✅ Array de modelos funciona automáticamente!\n');
        expect(model.tags[0]).toBeInstanceOf(Tag);
        expect(model.tags[0].id).toBe('1');
        expect(model.tags[0].name).toBe('tag1');
      } else {
        console.log('❌ Array de modelos NO funciona sin especificar clase\n');
        console.log('Valor recibido:', model.tags);
      }
    } catch (error: any) {
      console.log('❌ Error al crear modelo con array de modelos:', error.message);
    }
  });
});
