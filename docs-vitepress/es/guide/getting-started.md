# Comenzando

## ¿Qué es QuickModel?

QuickModel es una librería de TypeScript que proporciona serialización y deserialización automática para tus modelos. Maneja tipos complejos como `Date`, `BigInt`, `Map`, `Set`, e incluso modelos anidados, convirtiéndolos sin problemas entre objetos JavaScript y JSON.

## Características Clave

- **Cero Configuración**: Funciona desde el primer momento con decoradores de TypeScript (`@Quick`, `@QType`).
- **Seguridad de Tipos**: Soporte completo de TypeScript con verificación estricta de tipos e inferencia.
- **Transformaciones Automáticas**: 33 transformers integrados para `Date`, `BigInt`, `Map`, `Set`, `RegExp`, `Buffer`, `URL`, `TypedArray`, `WeakMap`, y más.
- **Validación de Negocio**: Decorador `@QRule` con 14 validadores integrados, validaciones asíncronas y comprobación de reglas por grupos.
- **Gestión de Estado**: Seguimiento de cambios con `isDirty`, actualizaciones parciales mediante `copy(partial)` y `patch()`, y `reset()` para restaurar el snapshot original.
- **Propiedades Calculadas y Alias**: `@QComputed` para campos derivados y `@QAlias` para alias de propiedades.
- **Generación de Schemas**: Exportación a 7 formatos (`json`, `openapi`, `zod`, `mongo`, `typescript`, `graphql`, `ajv`) mediante `getSchema()`.
- **Integración con Formularios**: Genera schemas de formulario con los decoradores `@QField` y `@QGroup` y el método `getFormSchema()`.
- **Generación de Mocks**: Generación integrada de datos de prueba (`User.mock().random()`, `User.mock().fromSchema()`).
- **Servidor MCP**: 20 herramientas públicas para asistentes de IA y 19 plantillas de prompts para desarrollo asistido por IA.
- **Seguridad**: Protección integrada contra DoS, límites de tamaño de payload, guardas de recursión y prevención de XSS.
- **Arquitectura SOLID**: Diseño limpio y extensible — registra transformers personalizados sin modificar el código base.

## ¿Por Qué QuickModel?

Cuando trabajas con TypeScript y APIs, a menudo enfrentas desafíos como:

```typescript
// ❌ Problema: Las fechas vienen como strings desde las APIs
const user = await fetch('/api/user').then((res) => res.json());
console.log(user.createdAt instanceof Date); // false! Es un string

// ❌ Problema: Sets y Maps no sobreviven a JSON.stringify
JSON.stringify({ tags: new Set(['a', 'b']) }); // {"tags":{}}

// ❌ Problema: La conversión manual es tediosa y propensa a errores
const user = {
	...apiData,
	createdAt: new Date(apiData.createdAt),
	tags: new Set(apiData.tags),
	metadata: new Map(Object.entries(apiData.metadata)),
};
```

QuickModel resuelve esto elegantemente:

```typescript
// ✅ Solución: Conversión automática
@Quick({
	createdAt: Date,
	tags: Set,
	metadata: Map,
})
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
	declare tags: Set<string>;
	declare metadata: Map<string, any>;
}

// 1. Instanciación (Auto-transformación)
const user = new User(apiData);
console.log(user.createdAt instanceof Date); // ¡true!

// 2. Serialización (Auto-formato)
const json = user.toJSON();
// {"createdAt": "2024-01-01T...", "tags": ["a", "b"], ...}
```

## Métodos de Instanciación

QuickModel proporciona formas flexibles de crear instancias de modelos:

- **Constructor**: `const user = new User(data);` (Recomendado)
- **Factoría**: `const user = User.create(data);`
- **Desde JSON**: `const user = User.fromJSON(jsonString);`

## Próximos Pasos

- [Instalación](/es/guide/installation) - Instala QuickModel en tu proyecto
- [Inicio Rápido](/es/guide/quick-start) - Construye tu primer modelo
- [Ejemplos](/es/examples/basic) - Ve ejemplos del mundo real
