# Jotai Integration

Jotai is a primitive, flexible atomic state management library for React. QuickModel DTOs
work naturally as atom values — `$qCopy()` keeps updates immutable, `@QComputed` fields
recalculate automatically, and `$qSerialize()` / `$qIsDirty()` make persistence and change
tracking straightforward.

## Key Patterns

| Pattern                   | QuickModel API                                  |
| ------------------------- | ----------------------------------------------- |
| Atom holding a DTO        | `atom(new UserDto(initial))`                    |
| Immutable field update    | `set(prev => prev.$qCopy({ field: value }))`    |
| Derived computed atom     | `atom(get => get(modelAtom).someComputed)`      |
| Atom family for lists     | `atomFamily(id => atom(new ItemDto(data[id])))` |
| Dirty check               | `atom(get => get(modelAtom).$qIsDirty())`       |
| Serialise for persistence | `atom(get => get(modelAtom).$qSerialize())`     |
| Validation atom           | `atom(get => get(modelAtom).$qCheckRules())`    |

## Installation

```bash
npm install quickmodel jotai
```

Enable decorators in `tsconfig.json`:

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## Model Setup

```typescript
// models/profile.dto.ts
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

interface IProfile {
	id: string;
	name: string;
	bio: string;
	followers: number;
	following: number;
	createdAt: Date;
}

@Quick(
	{
		id: 'string',
		name: 'string',
		bio: 'string',
		followers: 'number',
		following: 'number',
		createdAt: Date,
	},
	{ coercionStrategy: 'loose', unknownPropertyPolicy: 'strip' }
)
export class ProfileDto extends QModel<IProfile> {
	@QField({ label: 'Name', required: true })
	@QRule((v: string) => v.trim().length >= 2, 'Name is too short')
	declare name: string;

	@QField({ label: 'Bio' })
	@QRule((v: string) => v.length <= 300, 'Bio must be at most 300 chars')
	declare bio: string;

	declare id: string;
	declare followers: number;
	declare following: number;
	declare createdAt: Date;

	@QComputed()
	get ratio(): number {
		return this.following > 0
			? Math.round((this.followers / this.following) * 100) / 100
			: 0;
	}

	@QComputed()
	get isMegaInfluencer(): boolean {
		return this.followers >= 1_000_000;
	}
}
```

## Basic Atom

```typescript
// atoms/profile.atom.ts
import { atom } from 'jotai';
import { ProfileDto } from '../models/profile.dto';

// Seed data — typically loaded from an API response
const initialProfile = new ProfileDto({
	id: 'user-1',
	name: 'Alice',
	bio: 'Software engineer',
	followers: 1200,
	following: 340,
	createdAt: '2023-06-15',
});

export const profileAtom = atom<ProfileDto>(initialProfile);
```

```tsx
// components/ProfileCard.tsx
import { useAtom } from 'jotai';
import { profileAtom } from '../atoms/profile.atom';

export function ProfileCard() {
	const [profile] = useAtom(profileAtom);

	return (
		<div>
			<h2>{profile.name}</h2>
			<p>{profile.bio}</p>
			<span>Followers: {profile.followers}</span>
			<span>Ratio: {profile.ratio}</span> {/* @QComputed */}
			{profile.isMegaInfluencer && <span>⭐ Mega Influencer</span>}
		</div>
	);
}
```

## Immutable Updates with `$qCopy()`

```tsx
// components/ProfileEditor.tsx
import { useAtom } from 'jotai';

export function ProfileEditor() {
	const [profile, setProfile] = useAtom(profileAtom);

	function updateBio(bio: string) {
		// $qCopy() produces a new instance — Jotai re-renders on reference change
		setProfile((prev) => prev.$qCopy({ bio }));
	}

	function incrementFollowers() {
		setProfile((prev) => prev.$qCopy({ followers: prev.followers + 1 }));
	}

	return (
		<div>
			<textarea
				value={profile.bio}
				onChange={(e) => updateBio(e.target.value)}
				maxLength={300}
			/>
			<button onClick={incrementFollowers}>Follow</button>
		</div>
	);
}
```

::: tip Always use `$qCopy()` — never mutate atoms directly
Jotai tracks state by reference. If you mutate `profile.followers = x` in-place, the atom
does not know the state changed and the component never re-renders. `$qCopy()` always creates
a new instance, guaranteeing a new reference.
:::

## Derived Atoms

Build derived atoms from `@QComputed` values or from other atoms. Jotai's `atom(get => ...)` syntax reads cleanly with QuickModel getters.

```typescript
// atoms/profile.atom.ts
import { atom } from 'jotai';
import { profileAtom } from './profile.atom';

// Sync re-computation whenever profileAtom changes
export const profileRatioAtom = atom((get) => get(profileAtom).ratio);

export const isMegaAtom = atom((get) => get(profileAtom).isMegaInfluencer);

// Full validation result — recalculates on every profile change
export const profileValidationAtom = atom((get) =>
	get(profileAtom).$qCheckRules()
);

// Dirty tracking
export const isProfileDirtyAtom = atom((get) => get(profileAtom).$qIsDirty());

// Serialized form — for API calls or devtools inspection
export const profilePayloadAtom = atom((get) => get(profileAtom).$qSerialize());
```

```tsx
function ProfileStats() {
	const ratio = useAtomValue(profileRatioAtom);
	const isMega = useAtomValue(isMegaAtom);
	const validation = useAtomValue(profileValidationAtom);
	const isDirty = useAtomValue(isProfileDirtyAtom);

	return (
		<div>
			<p>Ratio: {ratio}</p>
			{isMega && <strong>Mega Influencer!</strong>}
			{!validation.valid && (
				<ul>
					{validation.errors.map((e) => (
						<li key={e.field}>{e.message}</li>
					))}
				</ul>
			)}
			{isDirty && <span>Unsaved changes</span>}
		</div>
	);
}
```

## Write Atom — Encapsulating Mutations

Encapsulate mutation logic in a write atom to keep components thin:

```typescript
// atoms/profile.actions.atom.ts
import { atom } from 'jotai';
import { profileAtom } from './profile.atom';

// Write atom: update profile from API response
export const loadProfileAtom = atom(
	null,
	(_get, set, raw: Record<string, unknown>) => {
		set(profileAtom, new ProfileDto(raw));
	}
);

// Write atom: patch a single field
export const patchProfileAtom = atom(
	null,
	(_get, set, patch: Partial<IProfile>) => {
		set(profileAtom, (prev) => prev.$qCopy(patch));
	}
);

// Write atom: reset to last saved state
export const resetProfileAtom = atom(null, (_get, set) => {
	set(profileAtom, (prev) => {
		prev.$qReset();
		return prev.$qCopy({}); // force new reference for Jotai
	});
});
```

```tsx
function ProfileActions() {
	const loadProfile = useSetAtom(loadProfileAtom);
	const patchProfile = useSetAtom(patchProfileAtom);
	const resetProfile = useSetAtom(resetProfileAtom);
	const isDirty = useAtomValue(isProfileDirtyAtom);

	async function fetchAndLoad() {
		const res = await fetch('/api/profile');
		loadProfile((await res.json()) as Record<string, unknown>);
	}

	return (
		<div>
			<button onClick={fetchAndLoad}>Reload</button>
			<button
				onClick={resetProfile}
				disabled={!isDirty}>
				Discard changes
			</button>
			<button onClick={() => patchProfile({ bio: '' })}>Clear bio</button>
		</div>
	);
}
```

## Atom Family — Per-Item DTO Atoms

Use `atomFamily` to hold a `QModel` instance per entity ID. This is ideal for normalised lists.

```typescript
// atoms/items.atom.ts
import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

interface IItem {
	id: string;
	name: string;
	price: number;
	stock: number;
}

@Quick({ id: 'string', name: 'string', price: 'number', stock: 'number' })
class ItemDto extends QModel<IItem> {
	declare id: string;
	declare name: string;
	declare price: number;
	declare stock: number;

	@QComputed()
	get isLowStock(): boolean {
		return this.stock < 5;
	}
}

// One atom per item ID
export const itemAtomFamily = atomFamily((id: string) =>
	atom<ItemDto | null>(null)
);

// Write atom: hydrate item from API data
export const loadItemAtom = atom(
	null,
	(_get, set, raw: Record<string, unknown>) => {
		const dto = new ItemDto(raw);
		set(itemAtomFamily(dto.id), dto);
	}
);
```

## Persistence with `$qSerialize()` (jotai/utils atomWithStorage)

```typescript
import { atomWithStorage } from 'jotai/utils';
import { ProfileDto } from '../models/profile.dto';

// Store serialised plain object in localStorage
const storedProfileAtom = atomWithStorage<Record<string, unknown> | null>(
	'profile',
	null
);

// Rehydrate into a ProfileDto on read
export const hydratedProfileAtom = atom((get) => {
	const stored = get(storedProfileAtom);
	return stored ? new ProfileDto(stored) : null;
});

// Persist on write
export const saveProfileAtom = atom(
	(get) => get(hydratedProfileAtom),
	(_get, set, profile: ProfileDto) => {
		set(storedProfileAtom, profile.$qSerialize());
	}
);
```

## See Also

- [Zustand Integration](./zustand-integration) — single-store immutable updates
- [React Integration](./react-integration) — `useState`, `useReducer` and context
- [Validation](/en/guide/validation) — `@QRule`, `$qCheckRules()`
