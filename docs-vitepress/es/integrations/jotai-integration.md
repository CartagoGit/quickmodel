# Integración con Jotai

Jotai es una librería de gestión de estado atómico para React. Su modelo de actualización
inmutable encaja perfectamente con `$qCopy()` de QuickModel — cada mutación produce una
nueva instancia sin modificar el estado anterior.

## Patrones clave

| Patrón                            | API QuickModel                                                      |
| --------------------------------- | ------------------------------------------------------------------- |
| Átomo base con DTO                | `atom<ProfileDto \| null>(null)` — almacena instancias tipadas      |
| Actualización inmutable           | `$qCopy(partial)` — crea instancia nueva para `set()`               |
| Átomo derivado desde `@QComputed` | `atom((get) => get(baseAtom)?.computedField)`                       |
| Reglas en átomo derivado          | `atom((get) => qCheckRules(get(baseAtom)))` — validación reactiva   |
| Write-atom para operaciones       | `atom(null, (get, set, patch) => set(base, prev.$qCopy(patch)))`    |
| Familia de átomos (lista)         | `atomFamily<string, ProfileDto>()` — mapa normalizado de instancias |
| Persistencia                      | `atomWithStorage` + `$qSerialize()` / `new Dto(stored)`             |

## Instalación

```bash
npm install quickmodel jotai
```

## Configuración del modelo

```typescript
// src/models/profile.dto.ts
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

interface IProfile {
	id: string;
	username: string;
	followers: number;
	following: number;
	bio: string;
	verified: boolean;
}

@Quick(
	{
		id: 'string',
		username: 'string',
		followers: 'number',
		following: 'number',
		bio: 'string',
		verified: 'boolean',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
export class ProfileDto extends QModel<IProfile> {
	@QField({ label: 'Usuario', required: true })
	@QRule(
		(v: string) => /^[a-z0-9_]{3,20}$/.test(v),
		'Nombre de usuario inválido'
	)
	declare username: string;

	@QField({ label: 'Biografía' })
	@QRule(
		(v: string) => v.length <= 160,
		'La bio no puede superar los 160 caracteres'
	)
	declare bio: string;

	declare id: string;
	declare followers: number;
	declare following: number;
	declare verified: boolean;

	@QComputed()
	get ratio(): number {
		return this.following > 0
			? parseFloat((this.followers / this.following).toFixed(2))
			: 0;
	}

	@QComputed()
	get isMegaInfluencer(): boolean {
		return this.followers >= 1_000_000;
	}
}
```

## Átomo base

```typescript
// src/store/profile.atoms.ts
import { atom } from 'jotai';
import { ProfileDto } from '@/models/profile.dto';

// Átomo base — nulo hasta que el usuario inicia sesión
export const profileAtom = atom<ProfileDto | null>(null);
```

## Actualización inmutable con `$qCopy()`

```typescript
// Correcto — $qCopy() devuelve una nueva instancia
import { useAtom } from 'jotai';
import { profileAtom } from '@/store/profile.atoms';

export function useProfile() {
	const [profile, setProfile] = useAtom(profileAtom);

	function updateBio(bio: string) {
		if (!profile) return;
		// $qCopy() NO muta el átomo anterior — Jotai sólo detecta el cambio si el objeto es nuevo
		setProfile(profile.$qCopy({ bio }));
	}

	function updateUsername(username: string) {
		if (!profile) return;
		setProfile(profile.$qCopy({ username }));
	}

	return { profile, updateBio, updateUsername };
}
```

::: tip `$qCopy()` es inmutable
`$qCopy()` siempre devuelve una **nueva instancia**. Jotai detecta el cambio de referencia
y re-renderiza los componentes suscritos correctamente.
:::

## Átomos derivados desde `@QComputed`

```typescript
// src/store/profile.atoms.ts
import { atom } from 'jotai';
import { qCheckRules } from 'quickmodel/forms';
import { profileAtom } from './profile.atoms';

// Ratio — derivado del campo @QComputed del DTO
export const ratioAtom = atom((get) => get(profileAtom)?.ratio ?? 0);

// Validez del perfil — reactiva
export const profileValidAtom = atom((get) => {
	const profile = get(profileAtom);
	if (!profile) return false;
	const { valid } = qCheckRules(profile);
	return valid;
});

// Errores de validación
export const profileErrorsAtom = atom((get) => {
	const profile = get(profileAtom);
	if (!profile) return [];
	const { errors } = qCheckRules(profile);
	return errors;
});

// ¿Hay cambios sin guardar?
export const profileIsDirtyAtom = atom((get) => {
	const profile = get(profileAtom);
	return profile ? profile.$qIsDirty() : false;
});
```

## Write-atoms que encapsulan mutaciones

```typescript
// src/store/profile.actions.ts
import { atom } from 'jotai';
import { ProfileDto } from '@/models/profile.dto';
import { profileAtom } from './profile.atoms';

// Cargar perfil desde API
export const loadProfileAtom = atom(null, async (_get, set, userId: string) => {
	const res = await fetch(`/api/users/${userId}`);
	const raw = await res.json();
	set(profileAtom, new ProfileDto(raw));
});

// Aplicar parche inmutable
export const patchProfileAtom = atom(
	null,
	(get, set, patch: Partial<IProfile>) => {
		const profile = get(profileAtom);
		if (!profile) return;
		set(profileAtom, profile.$qCopy(patch));
	}
);

// Persistir cambios en la API + resetear dirty flag
export const saveProfileAtom = atom(null, async (get, set) => {
	const profile = get(profileAtom);
	if (!profile || !profile.$qIsDirty()) return;

	const res = await fetch(`/api/users/${profile.id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(profile.$qSerialize()),
	});

	if (res.ok) {
		// La respuesta del servidor resetea el estado base
		const updated = new ProfileDto(await res.json());
		set(profileAtom, updated);
	}
});

// Descartar cambios
export const resetProfileAtom = atom(null, (get, set) => {
	const profile = get(profileAtom);
	if (profile) set(profileAtom, profile.$qCopy({}));
});
```

## Familia de átomos para listas normalizadas

```typescript
// src/store/posts.atoms.ts
import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { PostDto } from '@/models/post.dto';

// Un átomo por ID de post
export const postFamily = atomFamily(
	(postId: string) => atom<PostDto | null>(null),
	(a, b) => a === b
);

// Átomo con la lista de IDs cargados
export const postIdsAtom = atom<string[]>([]);

// Write-atom para cargar todos los posts
export const loadPostsAtom = atom(null, async (_get, set) => {
	const res = await fetch('/api/posts');
	const rows: unknown[] = await res.json();
	const { instances } = PostDto.createMany(rows);

	set(
		postIdsAtom,
		instances.map((p) => p.id)
	);
	for (const post of instances) {
		set(postFamily(post.id), post);
	}
});
```

## Persistencia con `atomWithStorage`

```typescript
// src/store/profile.persisted.ts
import { atomWithStorage } from 'jotai/utils';
import { ProfileDto } from '@/models/profile.dto';

// Almacenar como objeto plano serializado, rehidratar como DTO
export const persistedProfileAtom = atomWithStorage<ReturnType<
	ProfileDto['$qSerialize']
> | null>('profile', null, {
	getItem(key) {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	},
	setItem(key, value) {
		localStorage.setItem(key, JSON.stringify(value));
	},
	removeItem(key) {
		localStorage.removeItem(key);
	},
});

// Hook que devuelve un ProfileDto rehidratado
export function usePersistedProfile() {
	const [serialized, setSerialized] = useAtom(persistedProfileAtom);

	const profile = serialized ? new ProfileDto(serialized) : null;

	function save(dto: ProfileDto) {
		setSerialized(dto.$qSerialize());
	}

	return { profile, save };
}
```

## Ver también

- [Integración con React](./react-integration) — hooks básicos
- [Integración con Zustand](./zustand-integration) — alternativa de store global
- [Integración con Redux Toolkit](./redux-toolkit-integration) — store más estructurado
- [Validación](/es/guide/validation) — `@QRule`, `qCheckRules()`
