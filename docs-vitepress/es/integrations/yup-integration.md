# Integración con Yup

QuickModel y Yup son herramientas complementarias. Yup se centra en la **declaración de schemas y validación de objetos** con una API encadenable, mientras que QuickModel gestiona la **coerción de tipos, transformación y serialización** mediante decoradores. Úsalos juntos en el mismo pipeline o exporta schemas de QuickModel en formato Yup para interoperabilidad.

## Concepto clave: salida de Yup → instancia de QModel

Tras que Yup valida un objeto plano, pasa el resultado directamente al constructor de QModel:

```typescript
import * as yup from 'yup';
import { QModel, Quick } from 'quickmodel';

// 1. Schema Yup para validación en runtime
const UserYupSchema = yup.object({
	name: yup.string().required(),
	birth: yup.string().required(), // string ISO de la red
	score: yup.string().required(), // puede llegar como string de un formulario
});

// 2. Clase QModel para coerción + serialización
interface IUser {
	name: string;
	birth: Date;
	score: number;
}

@Quick({ birth: Date, score: Number })
class User extends QModel<IUser> {
	declare name: string;
	declare birth: Date;
	declare score: number;
}

// 3. Validar con Yup, luego coercionar con QModel
const rawData = { name: 'Ana', birth: '1990-05-20T00:00:00Z', score: '42' };

const validated = await UserYupSchema.$qValidate(rawData); // lanza si es inválido
const user = new User(validated); // coerciona los tipos

console.log(user.birth instanceof Date); // true
console.log(user.score); // 42 (number)
```

`rawData` es cualquier objeto JavaScript plano — puede venir de `req.body`, `JSON.parse()`, un registro de base de datos, un envío de formulario, o el resultado de cualquier llamada a `.validate()`.

## Exportar un schema QModel en formato Yup

Usa `getSchema('yup')` para obtener el código del schema Yup de una clase QModel. Útil para compartir definiciones de dominio con servicios que usan Yup de forma nativa:

```typescript
import 'quickmodel/schema'; // registrar los generadores de schema primero

const yupCode = User.getSchema('yup');
// → string con código fuente Yup:
// import * as yup from 'yup';
// export const UserSchema = yup.object({ name: yup.string().required(), ... });

// Guardar en disco e importar donde se use Yup nativamente:
// fs.writeFileSync('src/schemas/user.schema.ts', yupCode);
```

El código generado es un **string de código fuente**, no un objeto schema de Yup activo. Está pensado para scaffolding e interoperabilidad.

## Patrón: capa de API

```typescript
try {
	const validated = await UserYupSchema.$qValidate(req.body, {
		abortEarly: false,
	});
	const user = new User(validated);
	return res.json(user.$qSerialize());
} catch (err) {
	if (err instanceof yup.ValidationError) {
		return res.status(400).json({ errors: err.errors });
	}
	throw err;
}
```

## Patrón: React Hook Form + Yup resolver

Al migrar de `yupResolver` a QuickModel como capa de validación:

```typescript
// Antes (solo Yup)
const { register } = useForm({ resolver: yupResolver(UserYupSchema) });

// Después (validación con QuickModel, coerción QModel en submit)
const { register, handleSubmit } = useForm();
const onSubmit = (data: unknown) => {
	const user = new User(data as Record<string, unknown>);
	// user.birth ya es Date, user.score ya es number
};
```

## Cuándo usar cada enfoque

| Escenario                                     | Herramienta                           |
| --------------------------------------------- | ------------------------------------- |
| Validar la forma de un input no confiable     | Yup `.validate()` / `.validateSync()` |
| Coercionar strings→Date, strings→number, etc. | `new User(data)` con `@Quick({...})`  |
| Serializar un modelo a objeto plano / JSON    | `user.$qSerialize()`                  |
| Exportar un schema Yup desde una clase QModel | `User.getSchema('yup')`               |

## Comparativa

| Feature                                       | Yup     | QuickModel         |
| --------------------------------------------- | ------- | ------------------ |
| Validación en runtime                         | ✅      | ✅ vía `@QRule`    |
| Coerción de tipos (string→Date, etc.)         | Parcial | ✅ nativo          |
| Validación asíncrona                          | ✅      | ✅ vía `@QRule`    |
| Serialización / round-trip                    | ❌      | ✅ `$qSerialize()` |
| Exportación de schema (OpenAPI, JSON Schema…) | ❌      | ✅ `getSchema()`   |
| Modelos basados en clases con decoradores     | ❌      | ✅                 |

## Ver también

- [Transformadores](/es/guide/transformers) — tipos de coerción soportados
- [Validación](/es/guide/validation) — `@QRule` para reglas de negocio
- [Integración con Zod](/es/integrations/zod-integration) — mismo patrón con Zod
- [Integración con Formik](/es/integrations/formik-integration) — usar QModel como validador Formik
