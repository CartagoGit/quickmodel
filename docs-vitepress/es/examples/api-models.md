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
	last_login: string | null;
}

@Quick({
	created_at: Date,
	updated_at: Date,
	last_login: Date,
})
class User extends QModel<IUser> {
	declare id: number;
	declare username: string;
	declare email: string;
	declare created_at: Date;
	declare updated_at: Date;
	declare last_login: Date | null;
}

// Obtener y transformar
async function getUser(id: number): Promise<User> {
	const response = await fetch(`https://api.example.com/users/${id}`);
	const data = await response.json();
	return new User(data);
}

// Uso
const user = await getUser(1);
console.log(user.created_at instanceof Date); // true
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

async function updateUser(user: User): Promise<User> {
	const response = await fetch(`https://api.example.com/users/${user.id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(user.toJSON()),
	});

	const data = await response.json();
	return new User(data);
}
```

## Paginación

```typescript
interface IPaginatedResponse<T> {
	data: T[];
	page: number;
	per_page: number;
	total: number;
}

async function getUsers(page: number = 1): Promise<User[]> {
	const response = await fetch(`https://api.example.com/users?page=${page}`);
	const json: IPaginatedResponse<IUser> = await response.json();

	return json.data.map((userData) => new User(userData));
}

const users = await getUsers(1);
console.log(users[0] instanceof User); // true
```

## Respuestas de API Anidadas

```typescript
interface IProfile {
	bio: string;
	avatar_url: string;
	birth_date: string;
}

interface IUserWithProfile {
	id: number;
	username: string;
	email: string;
	profile: IProfile;
	created_at: string;
}

@Quick({ birth_date: Date })
class Profile extends QModel<IProfile> {
	declare bio: string;
	declare avatar_url: string;
	declare birth_date: Date;
}

@Quick({
	profile: Profile,
	created_at: Date,
})
class UserWithProfile extends QModel<IUserWithProfile> {
	declare id: number;
	declare username: string;
	declare email: string;
	declare profile: Profile;
	declare created_at: Date;
}

async function getUserWithProfile(id: number): Promise<UserWithProfile> {
	const response = await fetch(`https://api.example.com/users/${id}/profile`);
	const data = await response.json();
	return new UserWithProfile(data);
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

// Uso con manejo de errores
try {
	const user = await fetchUser(999);
	console.log(user.username);
} catch (error) {
	if (error instanceof APIError) {
		console.error(`Error de API (${error.status}):`, error.message);
	} else {
		console.error('Error inesperado:', error);
	}
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

	async delete(id: number): Promise<void> {
		await fetch(`${this.baseURL}/users/${id}`, {
			method: 'DELETE',
		});
	}
}

// Uso
const userService = new UserService();

const users = await userService.getAll();
const user = await userService.getById(1);
user.username = 'nuevonombre';
await userService.update(user);
```

## Próximos Pasos

- [Tipos Complejos](/es/examples/complex-types) - Transformaciones avanzadas
- [Serialización](/es/guide/serialization) - Profundiza en toJSON()
