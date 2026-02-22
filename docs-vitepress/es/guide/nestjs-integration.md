# Integración con NestJS

QuickModel funciona perfectamente con **NestJS** como reemplazo directo de las clases DTO. Dado que tanto QuickModel como NestJS dependen de `reflect-metadata` y los decoradores de TypeScript, la integración no requiere configuración adicional.

## Requisitos Previos

Todos los proyectos NestJS ya importan `reflect-metadata` en `main.ts`. QuickModel usa el mismo mecanismo, por lo que no es necesario ningún paso adicional.

::: tip Sin configuración extra
Si tu `main.ts` ya contiene `import 'reflect-metadata'` (estándar en cualquier app NestJS), QuickModel lo detecta automáticamente.
:::

## Instalación

```bash
npm install @cartago-git/quickmodel
```

Asegúrate de que `experimentalDecorators` y `emitDecoratorMetadata` estén activados en tu `tsconfig.json` — ya lo están en cualquier proyecto NestJS estándar:

```json
// tsconfig.json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## Usando QModel como DTO

Define tus DTOs extendiendo `QModel` en lugar de usar clases planas. Obtienes coerción de tipos automática, validación y serialización de forma gratuita:

```typescript
// create-user.dto.ts
import { QModel, Quick } from '@cartago-git/quickmodel';

interface ICreateUserBody {
	name: string;
	email: string;
	birthDate: string;
	age: number;
}

@Quick({ birthDate: Date })
export class CreateUserDto extends QModel<ICreateUserBody> {
	declare name: string;
	declare email: string;
	declare birthDate: Date; // convertido automáticamente desde string ISO
	declare age: number;
}
```

En tu controlador:

```typescript
// users.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { CreateUserDto } from './create-user.dto';

@Controller('users')
export class UsersController {
	@Post()
	create(@Body() body: CreateUserDto) {
		// body.birthDate ya es un objeto Date — sin parseo manual
		const user = new CreateUserDto(body);
		return user.serialize();
	}
}
```

## Validación con @QRule

Reemplaza `class-validator` con `@QRule` para la validación de reglas de negocio. Los predicados de `@QRule` se ejecutan de forma síncrona o asíncrona:

```typescript
// create-user.dto.ts
import { QModel, Quick, QRule } from '@cartago-git/quickmodel';

@Quick({ birthDate: Date })
export class CreateUserDto extends QModel<ICreateUserBody> {
	@QRule(
		(v) => typeof v === 'string' && v.length > 0,
		'El nombre es requerido'
	)
	@QRule((v) => (v as string).length <= 100, 'Nombre demasiado largo')
	declare name: string;

	@QRule(
		(v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v as string),
		'Formato de email inválido'
	)
	declare email: string;

	declare birthDate: Date;
	declare age: number;
}
```

Valida en un pipe de NestJS o en un servicio:

```typescript
// users.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './create-user.dto';

@Injectable()
export class UsersService {
	async create(data: object): Promise<object> {
		const dto = new CreateUserDto(data);

		const result = dto.checkRules();
		if (!result.valid) {
			throw new BadRequestException(result.errors);
		}

		// continúa con el modelo limpio y coercionado
		return dto.serialize();
	}
}
```

## Pipe de Validación Personalizado

Puedes encapsular la validación de QuickModel en un `PipeTransform` estándar de NestJS para inyección automática:

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

		return instance;
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

## Integración con @nestjs/swagger

El método `getSchema('openapi')` de QuickModel genera un esquema OpenAPI compatible con el decorador Swagger:

```typescript
// create-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { QModel, Quick, QRule } from '@cartago-git/quickmodel';

@Quick({ birthDate: Date })
export class CreateUserDto extends QModel<ICreateUserBody> {
	@ApiProperty({ example: 'Alice Smith' })
	declare name: string;

	@ApiProperty({ example: 'alice@example.com' })
	declare email: string;

	@ApiProperty({ example: '1990-06-15T00:00:00.000Z' })
	declare birthDate: Date;
}
```

O genera el esquema completo de forma programática:

```typescript
import { CreateUserDto } from './create-user.dto';

// Genera un esquema compatible con OpenAPI 3.x
const schema = CreateUserDto.getSchema('openapi');
console.log(JSON.stringify(schema, null, 2));
// {
//   "type": "object",
//   "properties": {
//     "name": { "type": "string" },
//     "email": { "type": "string" },
//     "birthDate": { "type": "string", "format": "date-time" }
//   }
// }
```

## Usando QModel en la Capa de Servicio

QuickModel brilla en la capa de servicio para la validación y transformación de modelos de dominio:

```typescript
// users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
	controllers: [UsersController],
	providers: [UsersService],
})
export class UsersModule {}

// users.service.ts
import { Injectable } from '@nestjs/common';
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IUser {
	id: string;
	name: string;
	email: string;
	createdAt: string;
}

@Quick({ createdAt: Date })
class UserModel extends QModel<IUser> {
	declare id: string;
	declare name: string;
	declare email: string;
	declare createdAt: Date;
}

@Injectable()
export class UsersService {
	private users: UserModel[] = [];

	create(data: object): object {
		const user = new UserModel(data);
		this.users.push(user);
		return user.serialize(); // retorna un objeto plano seguro para JSON
	}

	findAll(): object[] {
		return this.users.map((u) => u.serialize());
	}
}
```

## Campos Calculados en Respuestas API

Usa `@QComputed()` para incluir datos derivados en la respuesta serializada sin modificar el modelo almacenado:

```typescript
import { QModel, Quick, QComputed } from '@cartago-git/quickmodel';

@Quick({ firstName: String, lastName: String, birthYear: Number })
export class UserResponseDto extends QModel<IUserResponse> {
	declare firstName: string;
	declare lastName: string;
	declare birthYear: number;

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	@QComputed()
	get age(): number {
		return new Date().getFullYear() - this.birthYear;
	}
}

// En el controlador:
// user.serialize() → { firstName, lastName, birthYear, fullName, age }
```

## Resumen de Patrones

| Aspecto             | NestJS (class-validator)      | QuickModel                        |
| ------------------- | ----------------------------- | --------------------------------- |
| Coerción de tipos   | Manual / class-transformer    | Automático vía `@Quick`           |
| Validación de campo | `@IsEmail()`, `@IsNotEmpty()` | `@QRule(predicado, mensaje)`      |
| Modelos anidados    | `@Type(() => NestedDto)`      | `@Quick({ campo: ModelAnidado })` |
| Serialización       | `plainToInstance()`           | `.serialize()` / `.toJSON()`      |
| Exportar esquema    | Decoradores swagger manuales  | `.getSchema('openapi')`           |
| Campos calculados   | No integrado                  | `@QComputed()`                    |

## Próximos Pasos

- [Validación (@QRule)](./validation) — API completa de predicados
- [Campos Calculados (@QComputed)](./serialization#campos-calculados-qcomputed) — datos derivados en respuestas
- [Serialización](./serialization) — opciones serialize / toJSON / toPlain
- [Generación de Esquemas](./qmodel#getschema) — exportación de esquemas en múltiples formatos
