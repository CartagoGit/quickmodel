# Decoradores TC39

## ¿Qué es TC39?

**TC39** (Technical Committee 39) es el organismo de estándares responsable de evolucionar el lenguaje JavaScript.  
Es un comité de [Ecma International](https://www.ecma-international.org/) compuesto por representantes de fabricantes de navegadores, empresas de tooling y la comunidad JavaScript en general.

TC39 define el progreso de la especificación ECMAScript oficial a través de un proceso de 5 etapas (Stage 0 → Stage 4):

| Stage | Nombre      | Significado                                                           |
| ----- | ----------- | --------------------------------------------------------------------- |
| 0     | Strawperson | Idea informal — sin especificación todavía                            |
| 1     | Proposal    | Aceptado para consideración; champion asignado                        |
| 2     | Draft       | Se están especificando semánticas precisas                            |
| 3     | Candidate   | Completo en funcionalidades; se solicita feedback de implementaciones |
| 4     | Finished    | Incluido en la próxima edición anual de ECMAScript                    |

La **Propuesta de Decoradores TC39** alcanzó el **Stage 3** y fue incluida oficialmente en la edición anual de ECMAScript.  
Puedes seguir su estado y especificación directamente en el repositorio de la propuesta:

🔗 **[tc39/proposal-decorators](https://github.com/tc39/proposal-decorators)**

## Decoradores TC39 en TypeScript

TypeScript **5.0** (publicado en marzo de 2023) añadió soporte nativo para los decoradores estándar TC39.  
Son fundamentalmente distintos de los decoradores del flag antiguo `experimentalDecorators` y **no requieren ningún flag de compilación**.

::: info Disponible desde TypeScript 5.0+
El modo TC39 está soportado a partir de **TypeScript ≥ 5.0**.  
Si tu proyecto usa TypeScript < 5.0, debes utilizar el modo Legacy (`experimentalDecorators: true`).
:::

### Comparación rápida

| Modo       | `tsconfig.json`                | Versión TS requerida | Sintaxis de campo         |
| ---------- | ------------------------------ | -------------------- | ------------------------- |
| **TC39**   | _(sin flag)_                   | **≥ 5.0**            | `fieldName!: Type`        |
| **Legacy** | `experimentalDecorators: true` | ≥ 3.4                | `declare fieldName: Type` |

## Usar el modo TC39 con QuickModel

Para activar los decoradores estándar TC39, simplemente **omite** el flag `experimentalDecorators` (o ponlo a `false`) en tu `tsconfig.json`:

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"lib": ["ES2022"]
	}
}
```

Luego usa `!` (aserción de asignación definitiva) en lugar de `declare` para todos los campos decorados:

```typescript
// Modo TC39 — sin flag experimentalDecorators
@Quick({
	name: String,
	createdAt: Date,
})
class User extends QModel<IUser> {
	name!: string; // ✅ TC39: usa ! (no declare)
	createdAt!: Date; // ✅
}
```

### Por campo con `@QType`

```typescript
// Modo TC39 — @QType con !
@Quick()
class Post extends QModel<IPost> {
	@QType(Date)
	publishedAt!: Date; // ✅ modo TC39

	@QType(String)
	title!: string; // ✅
}
```

::: warning TC39 sin `@Quick`
En modo TC39, los inicializadores de campo se ejecutan automáticamente (controlado por `useDefineForClassFields`, que por defecto es `true` para targets ES2022+). Omitir `@Quick()` puede causar que los inicializadores de campo oculten los getters/setters de QuickModel. Combina siempre `@Quick()` con cualquier uso de `@QType()` en modo TC39.
:::

## El modo Legacy sigue soportado

QuickModel soporta completamente ambos modos de decoradores. El modo Legacy (`experimentalDecorators: true`) sigue disponible para proyectos que no puedan actualizar a TypeScript 5.0 o que dependan de herramientas que requieran la semántica de decoradores antigua.

Consulta [Instalación](./installation) para ver ejemplos completos de `tsconfig.json` para ambos modos.

## Lectura adicional

- 🔗 [Propuesta TC39 — Decorators](https://github.com/tc39/proposal-decorators) — repositorio oficial de la propuesta
- 🔗 [TC39 Proposals tracker](https://tc39.es/process-document/) — documento del proceso de etapas
- 🔗 [Notas de la versión TypeScript 5.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html) — sección de decoradores
