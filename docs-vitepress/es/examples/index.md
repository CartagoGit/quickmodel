# Ejemplos

Bienvenido a los ejemplos de QuickModel. Estos ejemplos prácticos demuestran patrones de uso del mundo real y mejores prácticas para todas las funcionalidades del framework.

## Fundamentos

### [Uso Básico](/es/examples/basic)

Aprende los fundamentos con ejemplos simples y directos:

- Crear tu primer modelo con `@Quick`
- Transformaciones de propiedades (Date, BigInt, Set, Map)
- Serialización con `toJSON()`
- Trabajar con arrays de tipos transformados

### [Modelos de API](/es/examples/api-models)

Integra QuickModel con APIs REST:

- Obtener y transformar respuestas de API
- Enviar datos con `toJSON()`
- Manejar paginación y anidamiento
- Patrones de servicio (CRUD completo)

### [Tipos Complejos](/es/examples/complex-types)

Transformaciones de tipos avanzadas:

- Modelos anidados y anidamiento profundo
- Colecciones (Set, Map)
- BigInt para números grandes
- Modelos polimórficos

## Decoradores y Funcionalidades

### [Validación con @QRule](/es/examples/validation)

Define reglas de negocio y valida datos:

- `@QRule` para reglas sobre propiedades
- `checkRules()`, `isValid()`, `validationReport()`
- Validación asincrónica con `checkRulesAsync()`
- `createMany()` con separación de válidos e inválidos
- Mensajes dinámicos para i18n

### [Formularios con @QField y @QGroup](/es/examples/forms)

Genera schemas de formulario dinámicamente:

- `@QField` para metadatos de widget (input, select, datepicker...)
- `@QGroup` para agrupar campos en secciones
- `getFormSchema()` y `getFormSchemaGrouped()`
- Integración con React (formulario dinámico)
- Metadatos personalizados para tu framework

### [Alias y Mapeo con @QAlias](/es/examples/alias-mapping)

Mapea entre snake_case y camelCase:

- `@QAlias` para renombrar propiedades
- Roundtrip completo (entrada y salida)
- Modelos anidados con aliases
- Combinar con `@QField` y `@QRule`

### [Campos Computados con @QComputed](/es/examples/computed)

Propiedades derivadas incluidas en la serialización:

- `@QComputed` para getters serializables
- Cálculos de precio, IVA, descuentos
- Edad, estado, etiquetas formateadas
- Diferencia entre getters con y sin `@QComputed`

## Creación y Testing

### [Mocks y Testing](/es/examples/mocks)

Genera datos de prueba con la API `mock()`:

- `mock().random()`, `mock().empty()`, `mock().sample()`
- `mock().array(n)` con overrides por índice
- `mock().interfaceRandom()` para fixtures de API
- Tests unitarios con Vitest / Jest
- Storybook: generar props de ejemplo

### [Creación en Lote e Inmutabilidad](/es/examples/batch-readonly)

Procesa arrays y crea instancias inmutables:

- `createMany()` para importaciones masivas
- Separación de válidos e inválidos con `errors[]`
- `createReadonly()` para configuración y constantes
- Fixtures inmutables para tests

## Referencias Rápidas

| Quiero...                       | Uso...                                           |
| ------------------------------- | ------------------------------------------------ |
| Transformar fechas/BigInt       | `@Quick({ field: Date })`                        |
| Validar datos de negocio        | `@QRule({ predicate, message })`                 |
| Mapear snake_case → camelCase   | `@QAlias('field_name')`                          |
| Generar schema de formulario    | `@QField({ widget, label })` + `getFormSchema()` |
| Agrupar campos del formulario   | `@QGroup('Sección')` + `getFormSchemaGrouped()`  |
| Incluir getter en serialización | `@QComputed()`                                   |
| Generar datos de prueba         | `Model.mock().random()`                          |
| Proceso masivo con validación   | `Model.createMany(array)`                        |
| Instancia inmutable             | `Model.createReadonly(data)`                     |

## Ejecutar los Ejemplos

Todos los ejemplos son TypeScript y pueden ejecutarse con:

```bash
# Usando Bun
bun run example.ts

# Usando ts-node
npx ts-node example.ts
```
