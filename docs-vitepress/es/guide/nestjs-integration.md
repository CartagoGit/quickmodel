# Integración con NestJS

QuickModel funciona perfectamente con **NestJS** como reemplazo directo de las clases DTO respaldadas por `class-validator` + `class-transformer`. Dado que ambos dependen de `reflect-metadata` y los decoradores de TypeScript, la integración no requiere configuración adicional.

## Requisitos previos

Todos los proyectos NestJS ya importan `reflect-metadata` en `main.ts`. QuickModel usa el mismo mecanismo, por lo que no es necesario ningún paso adicional.

::: tip Sin configuración extra
Si tu `main.ts` ya contiene `import 'reflect-metadata'` (estándar en cualquier app NestJS), QuickModel lo detecta automáticamente.
:::

Asegúrate de que `experimentalDecorators` y `emitDecoratorMetadata` estén activados — ya lo están en cualquier proyecto NestJS estándar:

```json
// tsconfig.json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## Instalación

```bash
npm install @cartago-git/quickmodel
```

## Usando QModel como DTO

Define tus DTOs extendiendo `QModel` en lugar de clases planas. Obtienes **coerción de tipos automática**, validación y serialización de forma gratuita — sin `class-transformer`:

```typescript
// create-user.dto.ts
import { QModel, Quick } from '@cartago-git/quickmodel';

interface ICreateUserBody {
	name: string;
	email: string;
	birthDate: string | Date;
	age: number;
	active: boolean;
}

@Quick(
	{ birthDate: Date, active: 'boolean' },
	{ unknownPropertyPolicy: 'strip' }
)
export class CreateUserDto extends QModel<ICreateUserBody> {
	declare name: string;
	declare email: string;
	declare birthDate: Date; // convertido automáticamente desde string ISO
	declare age: number;
	declare active: boolean;
}
```

::: tip Coerción de tipos
`@Quick({ birthDate: Date })` indica a QuickModel que llame a `new Date(value)` al poblar el campo. El string del body JSON `"1994-06-15T00:00:00.000Z"` se convierte en un `Date` real — sin `new Date(dto.birthDate)` manual.
:::

::: warning Campos booleanos
Usa `'boolean'` (literal de string) en `@Quick` para declarar un campo booleano — **no** el constructor `Boolean`. El literal activa el `PrimitiveTransformer` que valida que el valor sea un booleano real. En un body JSON estándar de NestJS, `true`/`false` ya llegan como booleanos reales desde el parser JSON.
:::

En tu controlador:

```typescript
// users.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Post()
	create(@Body() body: object) {
		return this.usersService.create(body);
	}
}
```

## Validación con @QRule

Reemplaza `class-validator` con `@QRule` para la validación de reglas de negocio. Los predicados son completamente tipados usando genéricos — sin más casts `(value as string)`:

```typescript
// create-user.dto.ts
import { QModel, Quick, QRule } from '@cartago-git/quickmodel';

@Quick(
	{ birthDate: Date, active: 'boolean' },
	{ unknownPropertyPolicy: 'strip' }
)
export class CreateUserDto extends QModel<ICreateUserBody> {
	@QRule((value: string) => value.trim().length > 0, 'El nombre es requerido')
	@QRule(
		(value: string) => value.trim().length <= 100,
		'Nombre demasiado largo'
	)
	declare name: string;

	@QRule(
		(value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
		'Formato de email inválido'
	)
	declare email: string;

	@QRule((value: number) => value >= 0, 'La edad no puede ser negativa')
	@QRule((value: number) => value <= 130, 'La edad debe ser realista')
	declare age: number;

	declare birthDate: Date;
	declare active: boolean;
}
```

Valida en la capa de servicio:

```typescript
// users.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './create-user.dto';

@Injectable()
export class UsersService {
	create(data: object): object {
		const dto = new CreateUserDto(data);

		const result = dto.checkRules();
		if (!result.valid) {
			throw new BadRequestException({
				message: 'Validación fallida',
				errors: result.errors, // [{ field, message, value }, ...]
			});
		}

		return dto.serialize();
	}
}
```

`result.errors` tiene la misma forma que los errores de `class-validator`, compatible con cualquier filtro de excepciones NestJS.

## ValidationPipe personalizado

Envuelve la validación de QuickModel en un `PipeTransform` estándar de NestJS para inyección automática a nivel de controlador:

```typescript
// quickmodel-validation.pipe.ts
import {
	PipeTransform,
	Injectable,
	ArgumentMetadata,
	BadRequestException,
} from '@nestjs/common';
import { QModel } from '@cartago-git/quickmodel';

@Injectable()
export class QuickModelValidationPipe implements PipeTransform {
	transform(value: unknown, metadata: ArgumentMetadata) {
		const { metatype } = metadata;

		// Solo procesar clases que extiendan QModel
		if (!metatype || !(metatype.prototype instanceof QModel)) {
			return value;
		}

		const instance = new (metatype as new (data: object) => QModel<object>)(
			value as object
		);

		const result = instance.checkRules();
		if (!result.valid) {
			throw new BadRequestException({
				message: 'Validación fallida',
				errors: result.errors,
			});
		}

		return instance; // el controlador recibe una instancia QModel coercionada y validada
	}
}
```

Regístralo globalmente en `main.ts`:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { QuickModelValidationPipe } from './quickmodel-validation.pipe';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(new QuickModelValidationPipe());
	await app.listen(3000);
}
bootstrap();
```

## DTOs anidados

Usa una clase `QModel` anidada en `@Quick` para instanciar y validar automáticamente objetos anidados:

```typescript
// address.dto.ts
@Quick({}, { unknownPropertyPolicy: 'strip' })
export class AddressDto extends QModel<IAddress> {
	@QRule((value: string) => value.trim().length > 0, 'La calle es requerida')
	declare street: string;

	@QRule((value: string) => value.trim().length > 0, 'La ciudad es requerida')
	declare city: string;

	@QRule(
		(value: string) => /^\d{5}$/.test(value),
		'El ZIP debe tener 5 dígitos'
	)
	declare zip: string;
}

// create-order.dto.ts
@Quick({ shippingAddress: AddressDto }, { unknownPropertyPolicy: 'strip' })
export class CreateOrderDto extends QModel<ICreateOrderBody> {
	@QRule(
		(value: string) => value.trim().length > 0,
		'El ID de producto es requerido'
	)
	declare productId: string;

	@QRule((value: number) => value >= 1, 'La cantidad debe ser al menos 1')
	declare quantity: number;

	declare shippingAddress: AddressDto; // instanciado automáticamente como AddressDto
}
```

```typescript
// En tu servicio:
const order = new CreateOrderDto(body);
// order.shippingAddress ya es una instancia de AddressDto
const addrResult = order.shippingAddress.checkRules();
if (!addrResult.valid) {
	throw new BadRequestException({ errors: addrResult.errors });
}
```

## @QRule asíncrono (unicidad en BD)

Usa `checkRulesAsync()` cuando algún predicado `@QRule` es asíncrono — típico en comprobaciones de unicidad en base de datos:

```typescript
// register.dto.ts
@Quick({}, { unknownPropertyPolicy: 'strip' })
export class RegisterDto extends QModel<IRegisterBody> {
	@QRule((value: string) => value.length >= 3, 'Username mínimo 3 caracteres')
	@QRule(
		(value: string) => /^[a-zA-Z0-9_]+$/.test(value),
		'Solo letras, números y guiones bajos'
	)
	declare username: string;

	// Predicado async — consulta la BD
	@QRule(async (value: string) => {
		const exists = await db.users.findOne({ email: value });
		return !exists;
	}, 'Email ya registrado')
	declare email: string;

	@QRule(
		(value: string) => value.length >= 8,
		'Contraseña mínimo 8 caracteres'
	)
	@QRule(
		(value: string) => /[A-Z]/.test(value),
		'Contraseña necesita una mayúscula'
	)
	@QRule(
		(value: string) => /[0-9]/.test(value),
		'Contraseña necesita un dígito'
	)
	declare password: string;
}
```

```typescript
// auth.service.ts
@Injectable()
export class AuthService {
	async register(data: object): Promise<object> {
		const dto = new RegisterDto(data);

		// evalúa predicados síncronos y asíncronos — todos en paralelo por defecto
		const result = await dto.checkRulesAsync();
		if (!result.valid) {
			throw new BadRequestException({
				message: 'Registro fallido',
				errors: result.errors,
			});
		}

		return this.saveUser(dto.serialize());
	}
}
```

### Timeout y modo de ejecución

`checkRulesAsync()` acepta un objeto `IQRulesAsyncOptions` opcional:

```typescript
// Dar a cada predicado BD un presupuesto de 300 ms — evita requests colgados
const result = await dto.checkRulesAsync({
	timeoutMs: 300,
	timeoutMessage: 'Servicio temporalmente no disponible',
});

// Distinguir qué campos fallaron por timeout vs. por lógica
result.errors.forEach((err) => {
	if (err.timedOut) {
		// el predicado superó los 300 ms
		this.logger.warn(`${err.field}: comprobación async expiró`);
	}
});
```

Por defecto todos los predicados se ejecutan **en paralelo**. Usa `mode: 'serial'` cuando deban ejecutarse en orden (p. ej. validar formato localmente antes de hacer la consulta a BD):

```typescript
// Serie: comprobación de formato primero, la BD solo si el formato es correcto
const result = await dto.checkRulesAsync({ mode: 'serial', timeoutMs: 300 });
```

| Opción           | Tipo                     | Por defecto         | Descripción                                                |
| ---------------- | ------------------------ | ------------------- | ---------------------------------------------------------- |
| `mode`           | `'parallel' \| 'serial'` | `'parallel'`        | Orden de ejecución de los predicados                       |
| `timeoutMs`      | `number`                 | —                   | Tiempo máx. por predicado; si se supera → `timedOut: true` |
| `timeoutMessage` | `string \| () => string` | mensaje de la regla | Mensaje usado al expirar                                   |

````

## Endpoints bulk con createMany

Usa `createMany()` para endpoints POST en bulk. Devuelve `{ instances, errors }`, separando limpiamente los elementos válidos de los inválidos:

```typescript
// users.service.ts
@Injectable()
export class UsersService {
	createMany(data: object[]): object {
		const { instances, errors } = CreateUserDto.createMany(data);

		// instances → DTOs coercionados + validados listos para persistir
		// errors    → [{ index, instance, errors: [...] }]

		if (errors.length > 0) {
			throw new BadRequestException({
				message: `${errors.length} elementos fallaron la validación`,
				errors: errors.map((entry) => ({
					index: entry.index,
					errors: entry.errors,
				})),
			});
		}

		return {
			created: instances.length,
			items: instances.map((dto) => dto.serialize()),
		};
	}
}
````

::: tip Éxito parcial
Pasa `{ includeErrorInstances: true }` a `createMany()` para incluir las instancias fallidas en `instances[]` junto con las válidas — útil para endpoints de inserción bulk con fallo parcial.
:::

## Integración con @nestjs/swagger

`getSchema('openapi')` genera un schema compatible con OpenAPI 3.x a partir del mapa de tipos de `@Quick()`. Úsalo programáticamente o junto con `@ApiProperty`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { QModel, Quick } from '@cartago-git/quickmodel';

@Quick(
	{ title: 'string', price: 'number', available: 'boolean', createdAt: Date },
	{ unknownPropertyPolicy: 'strip' }
)
export class ProductDto extends QModel<IProduct> {
	@ApiProperty({ example: 'Laptop Pro' })
	declare title: string;

	@ApiProperty({ example: 999.99 })
	declare price: number;

	@ApiProperty({ example: true })
	declare available: boolean;

	@ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
	declare createdAt: Date;
}
```

O genera el schema completo automáticamente:

```typescript
const schema = ProductDto.getSchema('openapi');
// {
//   "type": "object",
//   "properties": {
//     "title":     { "type": "string" },
//     "price":     { "type": "number" },
//     "available": { "type": "boolean" },
//     "createdAt": { "type": "string", "format": "date-time" }
//   }
// }
```

::: info Alcance de la generación de schemas
`getSchema()` genera entradas solo para campos tipados explícitamente en `@Quick()` o `@QType()`. Los campos declarados con `declare name: string` sin una entrada `@Quick({ name: 'string' })` correspondiente no se incluyen. Agrega mapas de tipos explícitos para cobertura completa del schéma.

Formatos disponibles: `'openapi'`, `'json'` (JSON Schema Draft-07), `'ajv'`, `'zod'`, `'mongo'`, `'graphql'`, `'typescript'`.
:::

## Capa de servicio con patrón repositorio

```typescript
// users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { QModel, Quick, QComputed } from '@cartago-git/quickmodel';

@Quick({ createdAt: Date }, { unknownPropertyPolicy: 'strip' })
class UserModel extends QModel<IUser> {
	declare id: string;
	declare firstName: string;
	declare lastName: string;
	declare email: string;
	declare role: 'admin' | 'user';
	declare createdAt: Date;

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	@QComputed()
	get isAdmin(): boolean {
		return this.role === 'admin';
	}
}

@Injectable()
export class UsersService {
	private readonly store = new Map<string, UserModel>();

	create(data: object): object {
		const user = new UserModel(data);
		this.store.set((user as any).id, user);
		return user.serialize(); // { id, firstName, lastName, ..., fullName, isAdmin }
	}

	findById(id: string): object {
		const user = this.store.get(id);
		if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
		return user.serialize();
	}

	findAll(): object[] {
		return [...this.store.values()].map((usr) => usr.serialize());
	}
}
```

## Campos calculados en respuestas API (@QComputed)

Usa `@QComputed()` para incluir campos derivados en la respuesta API **sin guardarlos en base de datos**:

```typescript
import { QModel, Quick, QComputed } from '@cartago-git/quickmodel';

@Quick(
	{
		firstName: 'string',
		lastName: 'string',
		birthYear: 'number',
		score: 'number',
	},
	{ unknownPropertyPolicy: 'strip' }
)
export class UserResponseDto extends QModel<IUserResponse> {
	declare firstName: string;
	declare lastName: string;
	declare birthYear: number;
	declare score: number;

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	@QComputed()
	get age(): number {
		return new Date().getFullYear() - this.birthYear;
	}

	@QComputed()
	get scoreLabel(): 'excellent' | 'good' | 'average' | 'poor' {
		if (this.score >= 90) return 'excellent';
		if (this.score >= 70) return 'good';
		if (this.score >= 50) return 'average';
		return 'poor';
	}
}

// user.serialize() → { firstName, lastName, birthYear, score, fullName, age, scoreLabel }
```

::: tip @QComputed vs getter simple
Un `get fullName()` **sin** `@QComputed()` existe en el prototipo pero es invisible para `serialize()` y `toJSON()`. El decorador es el opt-in que le indica al serializador que incluya el getter en el output.
:::

## Testing de servicios NestJS

Prueba la lógica de tu servicio sin arrancar una aplicación NestJS — los DTOs de QuickModel funcionan en cualquier test runner:

```typescript
// create-user.dto.test.ts
import { describe, test, expect } from 'bun:test'; // o jest/vitest

describe('CreateUserDto', () => {
	test('convierte birthDate desde string ISO', () => {
		const dto = new CreateUserDto({
			name: 'Alice',
			email: 'alice@example.com',
			age: 30,
			birthDate: '1994-06-15T00:00:00.000Z',
			active: true,
		});
		expect(dto.birthDate).toBeInstanceOf(Date);
	});

	test('checkRules() valida todos los campos', () => {
		const invalid = new CreateUserDto({
			name: '',
			email: 'bad',
			age: -1,
			birthDate: '1994-06-15',
			active: true,
		});
		const { valid, errors } = invalid.checkRules();
		expect(valid).toBe(false);
		expect(errors.length).toBeGreaterThan(0);
	});

	test('serialize() produce un objeto plano seguro para JSON', () => {
		const dto = new CreateUserDto({
			name: 'Alice',
			email: 'alice@example.com',
			age: 30,
			birthDate: '1994-06-15T00:00:00.000Z',
			active: true,
		});
		expect(() => JSON.stringify(dto.serialize())).not.toThrow();
	});
});
```

## Tabla resumen de patrones

| Concern               | NestJS (class-validator)                  | QuickModel                                       |
| --------------------- | ----------------------------------------- | ------------------------------------------------ |
| Coerción de tipos     | `class-transformer` + `@Type()`           | Automática con `@Quick({ field: Date })`         |
| Validación de campos  | `@IsEmail()`, `@IsNotEmpty()`, …          | `@QRule(predicado, mensaje)`                     |
| Validación async      | `@ValidatorConstraint({ async: true })`   | Predicado `async` + `checkRulesAsync(options?)`  |
| Modelos anidados      | `@Type(() => NestedDto)`                  | `@Quick({ field: NestedModel })`                 |
| Serialización         | `instanceToPlain()` / `plainToInstance()` | `.serialize()` / `.toJSON()`                     |
| Exportar schema       | `@ApiProperty()` manual por campo         | `.getSchema('openapi')`                          |
| Campos API calculados | No integrado                              | `@QComputed()` getters                           |
| Creación bulk         | Bucle manual                              | `createMany(array)` → `{ instances, errors }`    |
| Strip unknown props   | `@Exclude()` + `excludeExtraneousValues`  | `@Quick({}, { unknownPropertyPolicy: 'strip' })` |

## Próximos pasos

- [Validación (@QRule)](./validation) — API completa de predicados, reglas async, mensajes i18n
- [Campos Calculados (@QComputed)](./serialization#campos-calculados-qcomputed) — datos derivados en respuestas
- [Serialización](./serialization) — opciones serialize / toJSON / toPlain
- [Generación de Esquemas](./qmodel#getschema) — exportación en múltiples formatos (`openapi`, `json`, `ajv`, `zod`, …)
- [Generación de Mocks](./mocks) — generación automática de fixtures de test
