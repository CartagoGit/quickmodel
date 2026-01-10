# Modelos de API

Aprende cómo integrar QuickModel con APIs REST para transformación de datos sin problemas.

## Obtener Datos de APIs

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IUser {
	id: number;
	username: string;
	email: string;
	created_at: string;
	updated_at: string;
}

@Quick({
	created_at: Date,
	updated_at: Date,
})
class User extends QModel<IUser> {
	declare id: number;
	declare username: string;
	declare email: string;
	declare created_at: Date;
	declare updated_at: Date;
}

async function getUser(id: number): Promise<User> {
	const response = await fetch(`https://api.example.com/users/${id}`);
	const data = await response.json();
	return new User(data);
}
```

## Enviar Datos a APIs

```typescript
async function createUser(userData: Partial<IUser>): Promise<User> {
	const user = new User(userData);

	const response = await fetch('https://api.example.com/users', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(user.toJSON()),
	});

	const data = await response.json();
	return new User(data);
}
```

## Paginación

```typescript
async function getUsers(page: number = 1): Promise<User[]> {
	const response = await fetch(`https://api.example.com/users?page=${page}`);
	const json = await response.json();
	return json.data.map((userData: IUser) => new User(userData));
}
```

## Respuestas de API Anidadas

```typescript
@Quick({ birth_date: Date })
class Profile extends QModel<IProfile> {
	declare bio: string;
	declare birth_date: Date;
}

@Quick({
	profile: Profile,
	created_at: Date,
})
class UserWithProfile extends QModel<IUserWithProfile> {
	declare id: number;
	declare profile: Profile;
	declare created_at: Date;
}
```

## Manejo de Errores

```typescript
class APIError extends Error {
	constructor(
		message: string,
		public status: number,
		public response: any
	) {
		super(message);
	}
}

async function fetchUser(id: number): Promise<User> {
	const response = await fetch(`https://api.example.com/users/${id}`);

	if (!response.ok) {
		const error = await response.json();
		throw new APIError(
			error.message || 'Falló la petición a la API',
			response.status,
			error
		);
	}

	const data = await response.json();
	return new User(data);
}
```

## Ejemplo Completo de Servicio API

```typescript
class UserService {
	private baseURL = 'https://api.example.com';

	async getAll(page: number = 1): Promise<User[]> {
		const response = await fetch(`${this.baseURL}/users?page=${page}`);
		const json = await response.json();
		return json.data.map((data: IUser) => new User(data));
	}

	async getById(id: number): Promise<User> {
		const response = await fetch(`${this.baseURL}/users/${id}`);
		const data = await response.json();
		return new User(data);
	}

	async create(userData: Partial<IUser>): Promise<User> {
		const user = new User(userData);
		const response = await fetch(`${this.baseURL}/users`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(user.toJSON()),
		});
		const data = await response.json();
		return new User(data);
	}

	async update(user: User): Promise<User> {
		const response = await fetch(`${this.baseURL}/users/${user.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(user.toJSON()),
		});
		const data = await response.json();
		return new User(data);
	}
}
```

## Próximos Pasos

- [Tipos Complejos](/es/examples/complex-types) - Transformaciones avanzadas
- [Serialización](/es/guide/serialization) - Profundiza en toJSON()
