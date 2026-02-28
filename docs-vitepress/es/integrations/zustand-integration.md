# Integración con Zustand

El método `copy()` de QuickModel encaja de manera natural con las stores de Zustand — devuelve
una **nueva instancia inmutable**, manteniendo las actualizaciones de estado predecibles y
eliminando la necesidad de Immer.

## Patrones Clave

| Patrón                    | API de QuickModel                        |
| ------------------------- | ---------------------------------------- |
| Actualización inmutable   | `item.copy(patch)` → nueva instancia     |
| Store normalizado con Map | `createMany()` → `Map<id, instancia>`    |
| Middleware persist        | `serialize()` / `new Dto(stored)`        |
| Valores computados        | `@QComputed` — recalcula en cada lectura |
| Carga masiva desde API    | `Dto.createMany(apiData)`                |

## Instalación

```bash
npm install quickmodel zustand
```

## Configuración del Modelo

```typescript
import { QModel, Quick, QField, QComputed } from 'quickmodel';

interface IUsuario {
	id: string;
	nombre: string;
	email: string;
	edad: number;
	plan: 'free' | 'pro';
}

@Quick(
	{
		id: 'string',
		nombre: 'string',
		email: 'string',
		edad: 'number',
		plan: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UsuarioModel extends QModel<IUsuario> {
	declare id: string;
	declare nombre: string;
	declare email: string;
	declare edad: number;
	declare plan: string;

	@QComputed()
	get etiqueta(): string {
		return `${this.nombre} <${this.email}> [${this.plan}]`;
	}
}
```

## Store Básica — copy() como Actualizador Inmutable

`merge(patch)` devuelve una **nueva instancia** con los campos parcheados. El original nunca
se muta y los valores `@QComputed` se recalculan automáticamente.

```typescript
import { create } from 'zustand';

interface IUsuarioStore {
	usuario: UsuarioModel | null;
	setUsuario: (u: UsuarioModel) => void;
	actualizarUsuario: (patch: Partial<IUsuario>) => void;
}

const useUsuarioStore = create<IUsuarioStore>((set, get) => ({
	usuario: null,

	setUsuario: (usuario) => set({ usuario }),

	actualizarUsuario: (patch) => {
		const actual = get().usuario;
		if (!actual) return;
		set({ usuario: actual.copy(patch) }); // actualización inmutable — sin Immer
	},
}));

// Uso
const { usuario, actualizarUsuario } = useUsuarioStore();
actualizarUsuario({ plan: 'pro' });
console.log(usuario?.etiqueta); // @QComputed recalculado
```

## Store Normalizada con Map

Usa `createMany()` para cargar desde la API y `Map` para acceso O(1) por ID:

```typescript
const useListaUsuariosStore = create<IListaStore>((set) => ({
	usuarios: new Map(),

	cargarUsuarios: async () => {
		const res = await fetch('/api/usuarios');
		const raw: unknown[] = await res.json();
		const { instances } = UsuarioModel.createMany(raw);
		const mapa = new Map(instances.map((u) => [u.id, u]));
		set({ usuarios: mapa });
	},

	actualizarUsuario: (id, patch) =>
		set((state) => {
			const existente = state.usuarios.get(id);
			if (!existente) return state;
			const siguiente = new Map(state.usuarios);
			siguiente.set(id, existente.copy(patch)); // merge inmutable
			return { usuarios: siguiente };
		}),
}));
```

## Middleware Persist

Serializa al escribir, rehidrata al leer:

```typescript
import { persist } from 'zustand/middleware';

const useStoreConPersistencia = create<IUsuarioStore>()(
	persist(
		(set, get) => ({
			usuario: null,
			setUsuario: (usuario) => set({ usuario }),
			actualizarUsuario: (patch) => {
				const actual = get().usuario;
				if (!actual) return;
				set({ usuario: actual.copy(patch) });
			},
		}),
		{
			name: 'usuario-store',
			storage: {
				getItem: (name) => {
					const raw = localStorage.getItem(name);
					if (!raw) return null;
					const parsed = JSON.parse(raw);
					if (parsed.state?.usuario) {
						parsed.state.usuario = new UsuarioModel(
							parsed.state.usuario
						);
					}
					return parsed;
				},
				setItem: (name, value) => {
					const serializable = {
						...value,
						state: {
							...value.state,
							usuario: value.state.usuario
								? (value.state.usuario.serialize() as object)
								: null,
						},
					};
					localStorage.setItem(name, JSON.stringify(serializable));
				},
				removeItem: (name) => localStorage.removeItem(name),
			},
		}
	)
);
```

## copy() vs Immer

Immer requiere un wrapper `produce()` para la compartición estructural. Con QuickModel,
`copy()` ya es inmutable y devuelve una instancia tipada con `@QComputed` recalculados:

```typescript
// ❌ Con Immer
set(
	produce((state) => {
		state.usuario.plan = 'pro';
	})
);

// ✅ Con QuickModel copy()
const actual = get().usuario;
set({ usuario: actual.copy({ plan: 'pro' }) });
// @QComputed se recalculan automáticamente — sin referencias obsoletas
```

## Ver También

- [Referencia de la API QModel](./qmodel.md)
- [Integración con React](./react-integration.md)
- [Serialización](./serialization.md)
