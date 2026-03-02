# XState

XState es una biblioteca de máquinas de estado / statecharts para TypeScript y JavaScript. Los DTOs de QuickModel sirven como el **contexto tipado** de tus máquinas, garantizando coerción, validación y propiedades computadas en cada transición de estado.

## Referencia rápida

| Característica          | XState solo         | Con QuickModel                        |
| ----------------------- | ------------------- | ------------------------------------- |
| Contexto tipado         | Interfaces manuales | ✅ DTO `QModel` como contexto         |
| Coerción al entrar      | Manual              | ✅ `coercionStrategy`                 |
| Guard de validación     | Predicados manuales | ✅ `qCheckRules()` como guard         |
| Actualización inmutable | Spread / Immer      | ✅ `$qCopy()`                         |
| Campos computados       | Selector externo    | ✅ `@QComputed` en el DTO de contexto |
| Validación asíncrona    | Servicio `invoke`   | ✅ `qCheckRulesAsync()`               |

## Instalación

```bash
npm install xstate @xstate/react quickmodel
```

## Contexto tipado — DTO como contexto de máquina

Define la máquina con un DTO `QModel` como tipo de contexto para que todas las transiciones sean type-safe:

```typescript
import { createMachine, assign } from 'xstate';
import { QModel, Quick, QRule, QComputed } from 'quickmodel';
import { qCheckRules } from 'quickmodel/forms';

interface IPedido {
	id: string;
	producto: string;
	cantidad: number;
	total: number;
	notas: string;
}

@Quick(
	{
		id: 'string',
		producto: 'string',
		cantidad: 'number',
		total: 'number',
		notas: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class PedidoDto extends QModel<IPedido> {
	@QRule((val: number) => val > 0, 'La cantidad debe ser positiva')
	declare cantidad: number;

	@QRule((val: number) => val >= 0, 'El total no puede ser negativo')
	declare total: number;

	declare id: string;
	declare producto: string;
	declare notas: string;

	@QComputed()
	get resumen(): string {
		return `${this.producto} × ${this.cantidad} = $${this.total}`;
	}
}

interface IContextoPedido {
	pedido: PedidoDto;
	errores: string[];
}

type IEventoPedido =
	| { type: 'ACTUALIZAR'; patch: Partial<IPedido> }
	| { type: 'ENVIAR' }
	| { type: 'CONFIRMAR' }
	| { type: 'CANCELAR' };

const pedidoMachine = createMachine<IContextoPedido, IEventoPedido>({
	id: 'pedido',
	initial: 'editando',
	context: {
		pedido: new PedidoDto({
			id: '',
			producto: '',
			cantidad: 1,
			total: 0,
			notas: '',
		}),
		errores: [],
	},
	states: {
		editando: {
			on: {
				ACTUALIZAR: {
					actions: assign({
						pedido: ({ context, event }) =>
							context.pedido.$qCopy(event.patch),
						errores: () => [],
					}),
				},
				ENVIAR: [
					{
						// Guard: solo avanzar si es válido
						guard: ({ context }) =>
							qCheckRules(context.pedido).valid,
						target: 'revision',
						actions: assign({ errores: () => [] }),
					},
					{
						// Si no: quedarse en edición con errores
						actions: assign({
							errores: ({ context }) =>
								qCheckRules(context.pedido).errors.map(
									(e) => e.message
								),
						}),
					},
				],
			},
		},
		revision: {
			on: {
				CONFIRMAR: { target: 'enviado' },
				CANCELAR: { target: 'editando' },
			},
		},
		enviado: {
			type: 'final',
		},
	},
});
```

## Integración con React — `useMachine`

```tsx
import { useMachine } from '@xstate/react';

function FormularioPedido() {
	const [estado, enviar] = useMachine(pedidoMachine);
	const { pedido, errores } = estado.context;

	return (
		<form>
			<input
				value={pedido.producto}
				onChange={(e) =>
					enviar({
						type: 'ACTUALIZAR',
						patch: { producto: e.target.value },
					})
				}
				placeholder="Producto"
			/>
			<input
				type="number"
				value={pedido.cantidad}
				onChange={(e) =>
					enviar({
						type: 'ACTUALIZAR',
						patch: { cantidad: +e.target.value },
					})
				}
			/>

			{/* @QComputed — siempre actualizado tras $qCopy() */}
			<p>Resumen: {pedido.resumen}</p>

			{errores.length > 0 && (
				<ul>
					{errores.map((err, i) => (
						<li key={i}>{err}</li>
					))}
				</ul>
			)}

			{estado.matches('editando') && (
				<button
					type="button"
					onClick={() => enviar({ type: 'ENVIAR' })}>
					Revisar pedido
				</button>
			)}

			{estado.matches('revision') && (
				<>
					<button
						type="button"
						onClick={() => enviar({ type: 'CONFIRMAR' })}>
						Confirmar
					</button>
					<button
						type="button"
						onClick={() => enviar({ type: 'CANCELAR' })}>
						Volver
					</button>
				</>
			)}

			{estado.matches('enviado') && <p>¡Pedido enviado!</p>}
		</form>
	);
}
```

## Guard asíncrono — `qCheckRulesAsync()` como servicio `invoke`

Para validación asíncrona (p.ej. checks de unicidad en servidor), usa el `invoke` de XState:

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

const pedidoMachineAsync = createMachine<IContextoPedido, IEventoPedido>({
	id: 'pedido-async',
	initial: 'editando',
	context: {
		pedido: new PedidoDto({
			id: '',
			producto: '',
			cantidad: 1,
			total: 0,
			notas: '',
		}),
		errores: [],
	},
	states: {
		editando: {
			on: {
				ACTUALIZAR: {
					actions: assign({
						pedido: ({ context, event }) =>
							context.pedido.$qCopy(event.patch),
					}),
				},
				ENVIAR: { target: 'validando' },
			},
		},
		validando: {
			invoke: {
				src: async ({ context }) => {
					const resultado = await qCheckRulesAsync(context.pedido);
					if (!resultado.valid) throw resultado.errors;
					return resultado;
				},
				onDone: { target: 'revision' },
				onError: {
					target: 'editando',
					actions: assign({
						errores: ({ event }) =>
							(event.error as Array<{ message: string }>).map(
								(e) => e.message
							),
					}),
				},
			},
		},
		revision: {
			on: {
				CONFIRMAR: { target: 'enviado' },
				CANCELAR: { target: 'editando' },
			},
		},
		enviado: { type: 'final' },
	},
});
```

## `createMany()` — Carga masiva

Inicializa la máquina con una colección hidratada desde la API:

```typescript
interface IContextoLista {
	pedidos: PedidoDto[];
}

const { instances } = PedidoDto.createMany(apiResponse);

const listaMachine = createMachine<IContextoLista>({
	id: 'lista-pedidos',
	initial: 'idle',
	context: { pedidos: instances },
	states: {
		idle: {},
	},
});
```

## `$qIsDirty()` — Guard de cambios pendientes

Detecta si el contexto actual difiere de la versión al entrar al estado:

```typescript
const editarMachine = createMachine<{
	original: PedidoDto;
	borrador: PedidoDto;
}>({
	id: 'editar',
	initial: 'editando',
	context: {
		original: new PedidoDto({
			id: 'p1',
			producto: 'Widget',
			cantidad: 2,
			total: 50,
			notas: '',
		}),
		borrador: new PedidoDto({
			id: 'p1',
			producto: 'Widget',
			cantidad: 2,
			total: 50,
			notas: '',
		}),
	},
	states: {
		editando: {
			on: {
				ACTUALIZAR: {
					actions: assign({
						borrador: ({ context, event }) =>
							context.borrador.$qCopy(event.patch),
					}),
				},
				DESCARTAR: {
					actions: assign({
						borrador: ({ context }) =>
							new PedidoDto(
								context.original.$qSerialize() as IPedido
							),
					}),
				},
				GUARDAR: {
					guard: ({ context }) => {
						const merged = context.original.$qCopy(
							context.borrador.$qSerialize() as Partial<IPedido>
						);
						return merged.$qIsDirty();
					},
					target: 'guardando',
				},
			},
		},
		guardando: { type: 'final' },
	},
});
```

## XState DevTools

El visualizador de XState muestra estados y contexto de la máquina. La salida de `$qSerialize()` es un objeto JSON plano — seguro para inspeccionar con XState Inspector:

```typescript
import { inspect } from '@xstate/inspect';

inspect({ iframe: false });

// context.pedido.$qSerialize() aparecerá como JSON plano en el inspector
```

## Ver también

- [Integración con React](./react-integration) — patrones con `useState` y `useReducer`
- [Integración con Zustand](./zustand-integration) — estado simple sin máquinas
- [Integración Backend](./backend-integration) — validación en transiciones de estado en servidor
