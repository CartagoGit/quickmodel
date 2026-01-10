# Comenzando

## ¿Qué es QuickModel?

QuickModel es una librería de TypeScript que proporciona serialización y deserialización automática para tus modelos. Maneja tipos complejos como `Date`, `BigInt`, `Map`, `Set`, y más, convirtiéndolos sin problemas entre objetos JavaScript y JSON.

## Características Clave

- **Cero Configuración**: Funciona desde el primer momento con decoradores de TypeScript
- **Seguridad de Tipos**: Soporte completo de TypeScript con verificación estricta de tipos
- **Transformaciones Automáticas**: Maneja Date, BigInt, Map, Set, RegExp, Buffer, TypedArrays, y más
- **Arquitectura SOLID**: Diseño limpio y extensible
- **Generación de Mocks**: Integración incorporada con faker.js para testing
- **Alias de Rutas**: Importaciones limpias con alias `@/*`

## ¿Por Qué QuickModel?

Trabajar con modelos de TypeScript y APIs JSON a menudo requiere conversión manual tediosa entre tipos de JavaScript y formatos compatibles con JSON. QuickModel automatiza este proceso mientras mantiene la seguridad de tipos y proporciona una arquitectura limpia y extensible.

Perfecto para:

- 🌐 **Clientes de API REST**
- 📦 **Serialización/deserialización de datos**
- 🧪 **Testing con datos mock realistas**
- 🏗️ **Aplicaciones con arquitectura limpia**

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

QuickModel resuelve esto:

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

const user = new User(apiData);
// ¡Todo es del tipo correcto automáticamente!
```

## Próximos Pasos

- [Instalación](/es/guide/installation) - Instala QuickModel en tu proyecto
- [Inicio Rápido](/es/guide/quick-start) - Construye tu primer modelo
- [Ejemplos](/es/examples/basic) - Ve ejemplos del mundo real
