# Valtio

Valtio usa `Proxy` de JavaScript para hacer reactivos los objetos planos. Los DTOs de QuickModel son instancias de clase, no objetos planos — esta guía muestra cómo envolverlos de forma segura y mantener reactivas las propiedades `@QComputed`.

## Referencia rápida

| Característica          | Valtio solo | Con QuickModel                            |
| ----------------------- | ----------- | ----------------------------------------- |
| Coerción                | ❌          | ✅ `coercionStrategy`                     |
| Eliminación de campos   | ❌          | ✅ `unknownPropertyPolicy: 'strip'`       |
| Propiedades computadas  | ❌          | ✅ `@QComputed`                           |
| Validación              | Manual      | ✅ `qCheckRules()` / `qCheckRulesAsync()` |
| Actualización inmutable | Manual      | ✅ `$qCopy()`                             |
| Detección de cambios    | Manual      | ✅ `$qIsDirty()`                          |

## Instalación

```bash
npm install valtio quickmodel
```

## Store básica con un DTO QModel

Valtio proxifica objetos planos. El patrón recomendado es almacenar la **forma serializada** (objeto plano) y rehidratar a instancia `QModel` cuando necesites validación o propiedades computadas:

```typescript
import { proxy, useSnapshot } from 'valtio';
import { QModel, Quick, QRule, QComputed } from 'quickmodel';
import { qCheckRules } from 'quickmodel/forms';

interface IUsuario {
	id: string;
	nombre: string;
	email: string;
	rol: string;
	edad: number;
}

@Quick(
	{
		id: 'string',
		nombre: 'string',
		email: 'string',
		rol: 'string',
		edad: 'number',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UsuarioDto extends QModel<IUsuario> {
	@QRule((val: string) => val.includes('@'), 'Email inválido')
	declare email: string;

	declare id: string;
	declare nombre: string;
	declare rol: string;
	declare edad: number;

	@QComputed()
	get etiqueta(): string {
		return `${this.nombre} (${this.rol})`;
	}
}

// Store: guarda el objeto plano serializado — Valtio lo proxifica nativamente
const usuarioStore = proxy<{ actual: Record<string, unknown> | null }>({
	actual: null,
});

// Acciones
function cargarUsuario(raw: object) {
	const dto = new UsuarioDto(raw);
	usuarioStore.actual = dto.$qSerialize() as Record<string, unknown>;
}

function actualizarUsuario(patch: Partial<IUsuario>) {
	if (!usuarioStore.actual) return;
	const actualizado = new UsuarioDto(usuarioStore.actual).$qCopy(patch);
	usuarioStore.actual = actualizado.$qSerialize() as Record<string, unknown>;
}
```

## Componente React — `useSnapshot`

```tsx
import { useSnapshot } from 'valtio';

function PerfilUsuario() {
	const snap = useSnapshot(usuarioStore);

	if (!snap.actual) return <p>Sin usuario cargado</p>;

	// Rehidratar para acceder a @QComputed y campos tipados
	const dto = new UsuarioDto(snap.actual);

	return (
		<div>
			<p>{dto.etiqueta}</p>
			<p>{dto.email}</p>
			<button onClick={() => actualizarUsuario({ nombre: 'Bob' })}>
				Renombrar
			</button>
		</div>
	);
}
```

## Validación antes de mutar

Ejecuta `qCheckRules()` antes de escribir en la store de Valtio para evitar estado inválido:

```typescript
import { qCheckRules } from 'quickmodel/forms';

function guardarUsuario(formData: object) {
	const dto = new UsuarioDto(formData);
	const { valid, errors } = qCheckRules(dto);

	if (!valid) {
		console.error(errors.map((e) => e.message));
		return;
	}

	usuarioStore.actual = dto.$qSerialize() as Record<string, unknown>;
}
```

## Validación asíncrona

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

async function guardarUsuarioAsync(formData: object) {
	const dto = new UsuarioDto(formData);
	const { valid, errors } = await qCheckRulesAsync(dto);

	if (!valid) return { errors };
	usuarioStore.actual = dto.$qSerialize() as Record<string, unknown>;
	return { ok: true };
}
```

## `$qIsDirty()` — Guard de cambios sin guardar

Detecta si el borrador en edición difiere del último estado guardado:

```typescript
import { proxy } from 'valtio';

const editorStore = proxy<{
	guardado: Record<string, unknown> | null;
	borrador: Record<string, unknown> | null;
}>({
	guardado: null,
	borrador: null,
});

function iniciarEdicion(raw: object) {
	const dto = new UsuarioDto(raw);
	const serializado = dto.$qSerialize() as Record<string, unknown>;
	editorStore.guardado = serializado;
	editorStore.borrador = { ...serializado };
}

function aplicarPatch(patch: Partial<IUsuario>) {
	if (!editorStore.borrador) return;
	const actualizado = new UsuarioDto(editorStore.borrador).$qCopy(patch);
	editorStore.borrador = actualizado.$qSerialize() as Record<string, unknown>;
}

function hayCambiosSinGuardar(): boolean {
	if (!editorStore.guardado || !editorStore.borrador) return false;
	const guardado = new UsuarioDto(editorStore.guardado);
	const borradorConBaseline = guardado.$qCopy(
		editorStore.borrador as Partial<IUsuario>
	);
	return borradorConBaseline.$qIsDirty();
}
```

## `subscribe` — Efectos sin React

```typescript
import { subscribe } from 'valtio';

subscribe(usuarioStore, () => {
	if (usuarioStore.actual) {
		localStorage.setItem('usuario', JSON.stringify(usuarioStore.actual));
	}
});
```

## `proxyWithComputed` — Estado derivado reactivo

Usa `proxyWithComputed` de Valtio para exponer campos `@QComputed` directamente sin rehidratar en cada componente:

```typescript
import { proxyWithComputed } from 'valtio/utils';

const computedUsuarioStore = proxyWithComputed(
	{
		actual: null as Record<string, unknown> | null,
	},
	{
		etiqueta: (snap) => {
			if (!snap.actual) return '';
			return new UsuarioDto(snap.actual).etiqueta;
		},
	}
);
```

## Valtio vs Zustand vs Jotai

| Característica     | Valtio                | Zustand               | Jotai                |
| ------------------ | --------------------- | --------------------- | -------------------- |
| Estilo de API      | Proxy mutable         | Store funcional       | Estado atómico       |
| Integración QModel | Serializar+rehidratar | Serializar+rehidratar | Átomo envuelve DTO   |
| Props. computadas  | `proxyWithComputed`   | Selector              | `atom((get) => ...)` |
| Acciones async     | Función async manual  | Middleware / acción   | `atomWithQuery`      |
| DevTools           | Extensión Valtio      | Redux DevTools        | Extensión Jotai      |

## Ver también

- [Integración con Zustand](./zustand-integration) — alternativa funcional
- [Integración con Jotai](./jotai-integration) — estado atómico
- [Integración con React](./react-integration) — patrones con `useState` y `useReducer`
