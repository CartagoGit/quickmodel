/**
 * 🎨 VISUAL SHOWCASE: Todos los tipos disponibles con autocompletado
 * 
 * Abre este archivo en VSCode y escribe @Quick({ test: ' })
 * Deberías ver TODO este listado en el autocompletado del IDE
 */

import type { IQTypeAlias } from '../src/core/interfaces';

// ======================================
// 📋 REFERENCIA COMPLETA DE TIPOS
// ======================================

/**
 * PRIMITIVOS BÁSICOS:
 * 'bigint', 'symbol', 'number', 'string', 'boolean', 'null', 'undefined'
 */

/**
 * OBJETOS NATIVOS:
 * 'date', 'regexp', 'error', 'map', 'set', 'weakmap', 'weakset', 
 * 'promise', 'function', 'array', 'object'
 */

/**
 * ERROR TYPES:
 * 'typeerror', 'rangeerror', 'referenceerror', 'syntaxerror', 
 * 'urierror', 'evalerror', 'aggregateerror'
 */

/**
 * TYPED ARRAYS:
 * 'int8array', 'uint8array', 'uint8clampedarray', 'int16array', 'uint16array',
 * 'int32array', 'uint32array', 'float32array', 'float64array',
 * 'bigint64array', 'biguint64array'
 */

/**
 * BUFFERS:
 * 'arraybuffer', 'sharedarraybuffer', 'dataview'
 */

/**
 * WEB APIs:
 * 'url', 'urlsearchparams', 'blob', 'file', 'formdata', 
 * 'headers', 'request', 'response'
 */

/**
 * INTERNACIONALIZACIÓN:
 * 'intl.collator', 'intl.datetimeformat', 'intl.displaynames',
 * 'intl.listformat', 'intl.locale', 'intl.numberformat',
 * 'intl.pluralrules', 'intl.relativetimeformat', 'intl.segmenter'
 */

/**
 * REDONDEO (con decimales 0-5):
 * 'round', 'round.0', 'round.1', 'round.2', 'round.3', 'round.4', 'round.5'
 * 'floor', 'floor.0', 'floor.1', 'floor.2', 'floor.3', 'floor.4', 'floor.5'
 * 'ceil', 'ceil.0', 'ceil.1', 'ceil.2', 'ceil.3', 'ceil.4', 'ceil.5'
 * 'trunc', 'trunc.0', 'trunc.1', 'trunc.2', 'trunc.3', 'trunc.4', 'trunc.5'
 */

/**
 * FORMATO DE NÚMEROS:
 * 'tofixed.0', 'tofixed.1', 'tofixed.2', 'tofixed.3', 'tofixed.4', 'tofixed.5'
 * 'toprecision.1', 'toprecision.2', 'toprecision.3', 'toprecision.4', 'toprecision.5'
 * 'toexponential.0', 'toexponential.1', 'toexponential.2', 'toexponential.3'
 */

/**
 * MATEMÁTICAS:
 * 'abs', 'sign', 'sqrt', 'cbrt', 'exp', 
 * 'log', 'log10', 'log2', 'pow2', 'pow3'
 */

/**
 * CODIFICACIÓN:
 * 'base64', 'base64.encode', 'base64.decode',
 * 'base64url.encode', 'base64url.decode',
 * 'hex', 'hex.encode', 'hex.decode',
 * 'uri.encode', 'uri.decode', 'urifull.encode', 'urifull.decode'
 */

/**
 * STRING TRANSFORMATIONS:
 * 'lowercase', 'uppercase', 'trim', 'trimstart', 'trimend',
 * 'reverse', 'capitalize', 'camelcase', 'pascalcase',
 * 'snakecase', 'kebabcase', 'slugify'
 */

/**
 * JSON:
 * 'json', 'json.parse', 'json.stringify', 'json.pretty'
 */

/**
 * HASH:
 * 'sha1', 'sha256', 'sha384', 'sha512', 'md5'
 */

/**
 * OTROS:
 * 'generator', 'asyncgenerator', 'iterator', 'asynciterator',
 * 'proxy', 'reflect', 'atomics', 'textencoder', 'textdecoder',
 * 'cryptokey', 'subtlecrypto', 'readablestream', 'writablestream', 'transformstream'
 */

/**
 * TEMPORAL (TC39 Stage 3):
 * 'temporal.instant', 'temporal.zoneddatetime', 'temporal.plaindate',
 * 'temporal.plaintime', 'temporal.plaindatetime', 'temporal.duration',
 * 'temporal.timezone', 'temporal.calendar'
 */

// ======================================
// 🧪 EJEMPLOS DE USO
// ======================================

export const examples = {
  // Redondeo
  price_rounded_2_decimals: 'round.2' as IQTypeAlias,
  price_floor: 'floor.2' as IQTypeAlias,
  price_ceil: 'ceil.2' as IQTypeAlias,
  
  // Codificación
  base64_encoded: 'base64.encode' as IQTypeAlias,
  hex_hash: 'hex.encode' as IQTypeAlias,
  url_encoded: 'uri.encode' as IQTypeAlias,
  
  // String
  slug: 'slugify' as IQTypeAlias,
  uppercase: 'uppercase' as IQTypeAlias,
  camelCase: 'camelcase' as IQTypeAlias,
  
  // Matemáticas
  absolute: 'abs' as IQTypeAlias,
  square_root: 'sqrt' as IQTypeAlias,
  logarithm: 'log10' as IQTypeAlias,
  
  // Hash
  password_hash: 'sha256' as IQTypeAlias,
  checksum: 'md5' as IQTypeAlias,
  
  // JSON
  json_parsed: 'json.parse' as IQTypeAlias,
  json_pretty: 'json.pretty' as IQTypeAlias,
};

console.log(`
✅ Total de tipos string literals disponibles: ~170+

🎯 Cómo usar:
   @Quick({ 
     price: 'round.2',        // ← autocomplete!
     slug: 'slugify',         // ← autocomplete!
     hash: 'sha256'           // ← autocomplete!
   })

🔥 También puedes usar:
   - Funciones Math directamente: Math.round, Math.abs, Math.ceil
   - Arrow functions: (v) => Math.round(v * 100) / 100
   - Constructores: Date, RegExp, Map, Set, BigInt
   - Q-Symbols: QBigInt, QRegExp, QDate
`);
