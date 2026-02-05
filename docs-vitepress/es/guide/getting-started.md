# Comenzando

## ¿Qué es QuickModel?

QuickModel es una librería de TypeScript que proporciona serialización y deserialización automática para tus modelos. Maneja tipos complejos como `Date`, `BigInt`, `Map`, `Set`, e incluso modelos anidados, convirtiéndolos sin problemas entre objetos JavaScript y JSON.

## Características Clave

- **Cero Configuración**: Funciona desde el primer momento con decoradores de TypeScript.
- **Seguridad de Tipos**: Soporte completo de TypeScript con verificación estricta de tipos.
- **Transformaciones Automáticas**: Maneja Date, BigInt, Map, Set, RegExp, Buffer, TypedArrays, y más.
- **Arquitectura SOLID**: Diseño limpio y extensible siguiendo las mejores prácticas.
- **Generación de Mocks**: Integración incorporada para generar datos de prueba (`User.mock().random()`).
- **API Limpia**: Métodos intuitivos para serialización y deserialización.

## ¿Por Qué QuickModel?

Cuando trabajas con TypeScript y APIs, a menudo enfrentas desafíos como:

```typescript
// ❌ Problema: Las fechas vienen como strings desde las APIs
const user = await fetch('/api/user').then((r) => r.json());
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
