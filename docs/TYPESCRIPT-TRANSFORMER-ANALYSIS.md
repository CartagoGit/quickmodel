# TypeScript Transformer Plugin - Configuración Requerida

## ¿Qué es un TypeScript Transformer?

Un transformer plugin es código que se ejecuta **durante la compilación** de TypeScript, permitiendo modificar el AST (Abstract Syntax Tree) antes de generar JavaScript.

## Configuración Necesaria

### 1. Crear el Transformer Plugin

**File: `transformer/metadata-transformer.ts`**

```typescript
import * as ts from 'typescript';

/**
 * TypeScript transformer que agrega metadata de tipos de arrays
 * 
 * Detecta:
 *   tags: Tag[]
 * 
 * Y agrega:
 *   Reflect.defineMetadata('arrayElementType', Tag, Target.prototype, 'tags')
 */
export default function metadataTransformer(program: ts.Program) {
  return (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      
      function visit(node: ts.Node): ts.Node {
        // Detectar propiedades con decorators
        if (ts.isPropertyDeclaration(node) && node.decorators) {
          const hasQType = node.decorators.some(d => 
            ts.isCallExpression(d.expression) &&
            ts.isIdentifier(d.expression.expression) &&
            d.expression.expression.text === 'QType'
          );
          
          if (hasQType && node.type && ts.isArrayTypeNode(node.type)) {
            // Es @QType() prop: Type[]
            const elementType = node.type.elementType;
            
            if (ts.isTypeReferenceNode(elementType) && ts.isIdentifier(elementType.typeName)) {
              const typeName = elementType.typeName.text;
              
              // Generar código para agregar metadata
              // Nota: Esto es pseudocódigo, el AST real es más complejo
              console.log(`Detectado array de ${typeName} en propiedad ${node.name.getText()}`);
              
              // Aquí agregaríamos nodos al AST para inyectar:
              // Reflect.defineMetadata('arrayElementType', TypeName, ...)
            }
          }
        }
        
        return ts.visitEachChild(node, visit, context);
      }
      
      return ts.visitNode(sourceFile, visit);
    };
  };
}
```

### 2. Integrar con el Build Tool

#### **Opción A: Con `ttypescript`**

**Instalación:**
```bash
npm install --save-dev ttypescript
npm install --save-dev @types/node
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "plugins": [
      {
        "transform": "./transformer/metadata-transformer.ts",
        "type": "program"
      }
    ]
  }
}
```

**package.json:**
```json
{
  "scripts": {
    "build": "ttsc",  // En lugar de tsc
    "dev": "ttsc --watch"
  }
}
```

#### **Opción B: Con `ts-patch`**

**Instalación:**
```bash
npm install --save-dev ts-patch
npx ts-patch install
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "plugins": [
      {
        "transform": "./transformer/metadata-transformer.ts"
      }
    ]
  }
}
```

#### **Opción C: Con Webpack + `ts-loader`**

**webpack.config.js:**
```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          getCustomTransformers: (program) => ({
            before: [
              require('./transformer/metadata-transformer').default(program)
            ]
          })
        }
      }
    ]
  }
};
```

#### **Opción D: Con `tsup` (actual)**

**tsup.config.ts:**
```typescript
import { defineConfig } from 'tsup';
import metadataTransformer from './transformer/metadata-transformer';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  esbuildPlugins: [
    {
      name: 'typescript-transformer',
      setup(build) {
        // tsup usa esbuild, que no soporta transformers de TS directamente
        // Necesitaríamos una configuración más compleja
      }
    }
  ]
});
```

⚠️ **PROBLEMA:** `tsup` usa `esbuild` internamente, que **NO soporta TypeScript transformers**.

**Solución para tsup:**
- Usar `tsc` para compilación + transformers
- Luego `tsup` solo para bundling
- O cambiar a `rollup` + `@rollup/plugin-typescript`

### 3. Complejidad del Transformer

Un transformer robusto debe manejar:

```typescript
// Casos simples
@QType() tags: Tag[];

// Arrays anidados
@QType() matrix: Tag[][];

// Generics
@QType() items: Array<Tag>;

// Union types
@QType() mixed: (Tag | Category)[];

// Condicionales
@QType() optional?: Tag[];

// Tipos importados
import { Tag } from './models';
@QType() tags: Tag[];
```

**Código adicional necesario:**
- Resolver imports para obtener el nombre correcto del tipo
- Manejar aliases de tipos
- Manejar generics complejos
- Generar AST nodes correctos para Reflect.defineMetadata

### 4. Complejidad Estimada

**Transformer básico (solo arrays simples):** ~200-300 líneas
**Transformer completo (todos los casos):** ~800-1000 líneas
**Tests del transformer:** ~500 líneas
**Documentación de setup:** Este archivo

**Total:** ~1500-2000 líneas de código adicional

## Pros y Contras

### ✅ Pros:
1. **100% preciso** - Detecta tipos exactos en compile-time
2. **Zero runtime overhead** - Todo se resuelve al compilar
3. **Transparente** - El usuario solo escribe `@QType() tags: Tag[]`
4. **Robusto** - No depende de heurísticas en runtime

### ❌ Contras:
1. **Configuración compleja** - Requiere setup adicional de build
2. **Incompatible con esbuild/tsup** - Necesita cambiar tooling
3. **Mantenimiento** - El transformer debe actualizarse si TypeScript cambia
4. **Testing** - Difícil de testear (requiere compilación real)
5. **Debugging** - Errores en transformer son crípticos
6. **Onboarding** - Los desarrolladores nuevos necesitan entender el setup
7. **IDE support** - Puede causar problemas con auto-complete/error checking

## Alternativa Intermedia: Decorador con Type

Podríamos mantener el enfoque actual pero hacerlo opcional:

```typescript
// Opción 1: Auto-inferencia por propiedades (menos preciso)
@QType() tags!: Tag[];  // Intenta inferir por keys del objeto

// Opción 2: Explícito (100% preciso)
@QType(Tag) tags!: Tag[];  // Especifica el tipo exacto
```

La librería intentaría auto-inferir, pero permitiría especificar explícitamente cuando sea necesario.

## Recomendación

Para **QuickModel**:

1. **Corto plazo:** Implementar Solución 1 (registro en @QType)
   - Más simple, funciona para 80-90% de casos
   - Permite especificar tipo manualmente cuando falla

2. **Largo plazo:** Evaluar transformer plugin
   - Solo si hay demanda de usuarios
   - Solo si vale la pena la complejidad adicional
   - Considerar como feature "opt-in" (opcional)

## Conclusión

El transformer ES más robusto, pero **triplica la complejidad** del proyecto:
- Setup de build más complicado
- Incompatible con herramientas modernas (esbuild, tsup, swc)
- Dificulta onboarding de nuevos desarrolladores
- Añade ~1500 LOC de código adicional

Para una librería que busca ser **simple y rápida**, probablemente no vale la pena.

La Solución 1 (registro + inferencia) da **80-90% del beneficio** con **10% de la complejidad**.
