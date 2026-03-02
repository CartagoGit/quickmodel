# XState

XState is a state machine / statechart library for TypeScript and JavaScript. QuickModel DTOs serve as the **typed context** of your machines, ensuring coercion, validation, and computed properties at every state transition.

## Quick Reference

| Feature           | XState alone      | With QuickModel                |
| ----------------- | ----------------- | ------------------------------ |
| Typed context     | Manual interfaces | ✅ `QModel` DTO as context     |
| Coercion on entry | Manual            | ✅ `coercionStrategy`          |
| Guard validation  | Manual predicates | ✅ `qCheckRules()` as guard    |
| Immutable update  | Spread / Immer    | ✅ `$qCopy()`                  |
| Computed fields   | External selector | ✅ `@QComputed` on context DTO |
| Async validation  | `invoke` service  | ✅ `qCheckRulesAsync()`        |

## Installation

```bash
npm install xstate @xstate/react quickmodel
```

## Typed Context — DTO as Machine Context

Define the machine with a `QModel` DTO as its context type so all transitions remain type-safe:

```typescript
import { createMachine, assign } from 'xstate';
import { QModel, Quick, QRule, QComputed } from 'quickmodel';
import { qCheckRules } from 'quickmodel/forms';

interface IOrder {
	id: string;
	product: string;
	quantity: number;
	total: number;
	notes: string;
}

@Quick(
	{
		id: 'string',
		product: 'string',
		quantity: 'number',
		total: 'number',
		notes: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class OrderDto extends QModel<IOrder> {
	@QRule((val: number) => val > 0, 'Quantity must be positive')
	declare quantity: number;

	@QRule((val: number) => val >= 0, 'Total cannot be negative')
	declare total: number;

	declare id: string;
	declare product: string;
	declare notes: string;

	@QComputed()
	get summary(): string {
		return `${this.product} × ${this.quantity} = $${this.total}`;
	}
}

// Machine context: store the DTO instance directly
interface IOrderContext {
	order: OrderDto;
	errors: string[];
}

type IOrderEvent =
	| { type: 'UPDATE'; patch: Partial<IOrder> }
	| { type: 'SUBMIT' }
	| { type: 'CONFIRM' }
	| { type: 'CANCEL' };

const orderMachine = createMachine<IOrderContext, IOrderEvent>({
	id: 'order',
	initial: 'editing',
	context: {
		order: new OrderDto({
			id: '',
			product: '',
			quantity: 1,
			total: 0,
			notes: '',
		}),
		errors: [],
	},
	states: {
		editing: {
			on: {
				UPDATE: {
					actions: assign({
						order: ({ context, event }) =>
							context.order.$qCopy(event.patch),
						errors: () => [],
					}),
				},
				SUBMIT: [
					{
						// Guard: only proceed if valid
						guard: ({ context }) =>
							qCheckRules(context.order).valid,
						target: 'review',
						actions: assign({ errors: () => [] }),
					},
					{
						// Else: stay in editing with errors
						actions: assign({
							errors: ({ context }) =>
								qCheckRules(context.order).errors.map(
									(e) => e.message
								),
						}),
					},
				],
			},
		},
		review: {
			on: {
				CONFIRM: { target: 'submitted' },
				CANCEL: { target: 'editing' },
			},
		},
		submitted: {
			type: 'final',
		},
	},
});
```

## React Integration — `useMachine`

```tsx
import { useMachine } from '@xstate/react';

function OrderForm() {
	const [state, send] = useMachine(orderMachine);
	const { order, errors } = state.context;

	return (
		<form>
			<input
				value={order.product}
				onChange={(e) =>
					send({ type: 'UPDATE', patch: { product: e.target.value } })
				}
				placeholder="Product"
			/>
			<input
				type="number"
				value={order.quantity}
				onChange={(e) =>
					send({
						type: 'UPDATE',
						patch: { quantity: +e.target.value },
					})
				}
			/>

			{/* @QComputed — always up to date after $qCopy() */}
			<p>Summary: {order.summary}</p>

			{errors.length > 0 && (
				<ul>
					{errors.map((err, i) => (
						<li key={i}>{err}</li>
					))}
				</ul>
			)}

			{state.matches('editing') && (
				<button
					type="button"
					onClick={() => send({ type: 'SUBMIT' })}>
					Review Order
				</button>
			)}

			{state.matches('review') && (
				<>
					<button
						type="button"
						onClick={() => send({ type: 'CONFIRM' })}>
						Confirm
					</button>
					<button
						type="button"
						onClick={() => send({ type: 'CANCEL' })}>
						Back
					</button>
				</>
			)}

			{state.matches('submitted') && <p>Order submitted!</p>}
		</form>
	);
}
```

## Async Guard — `qCheckRulesAsync()` as `invoke` Service

For async validation (e.g., server-side uniqueness checks), use XState's `invoke`:

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

const orderMachineAsync = createMachine<IOrderContext, IOrderEvent>({
	id: 'order-async',
	initial: 'editing',
	context: {
		order: new OrderDto({
			id: '',
			product: '',
			quantity: 1,
			total: 0,
			notes: '',
		}),
		errors: [],
	},
	states: {
		editing: {
			on: {
				UPDATE: {
					actions: assign({
						order: ({ context, event }) =>
							context.order.$qCopy(event.patch),
					}),
				},
				SUBMIT: { target: 'validating' },
			},
		},
		validating: {
			invoke: {
				src: async ({ context }) => {
					const result = await qCheckRulesAsync(context.order);
					if (!result.valid) throw result.errors;
					return result;
				},
				onDone: { target: 'review' },
				onError: {
					target: 'editing',
					actions: assign({
						errors: ({ event }) =>
							(event.error as Array<{ message: string }>).map(
								(e) => e.message
							),
					}),
				},
			},
		},
		review: {
			on: {
				CONFIRM: { target: 'submitted' },
				CANCEL: { target: 'editing' },
			},
		},
		submitted: { type: 'final' },
	},
});
```

## `createMany()` — Loading Many Items

Initialize the machine with a collection hydrated from API data:

```typescript
interface IListContext {
	orders: OrderDto[];
}

const { instances } = OrderDto.createMany(apiResponse);

const listMachine = createMachine<IListContext>({
	id: 'order-list',
	initial: 'idle',
	context: { orders: instances },
	states: {
		idle: {},
	},
});
```

## `$qIsDirty()` — Pending Changes Guard

Track whether the current DTO context differs from the version at entry:

```typescript
const editMachine = createMachine<{
	original: OrderDto;
	draft: OrderDto;
}>({
	id: 'edit',
	initial: 'editing',
	context: {
		original: new OrderDto({
			id: 'o1',
			product: 'Widget',
			quantity: 2,
			total: 50,
			notes: '',
		}),
		draft: new OrderDto({
			id: 'o1',
			product: 'Widget',
			quantity: 2,
			total: 50,
			notes: '',
		}),
	},
	states: {
		editing: {
			on: {
				UPDATE: {
					actions: assign({
						draft: ({ context, event }) =>
							context.draft.$qCopy(event.patch),
					}),
				},
				DISCARD: {
					// Reset draft to original
					actions: assign({
						draft: ({ context }) =>
							new OrderDto(
								context.original.$qSerialize() as IOrder
							),
					}),
				},
				SAVE: {
					guard: ({ context }) => {
						// Only save if something actually changed
						const merged = context.original.$qCopy(
							context.draft.$qSerialize() as Partial<IOrder>
						);
						return merged.$qIsDirty();
					},
					target: 'saving',
				},
			},
		},
		saving: { type: 'final' },
	},
});
```

## XState DevTools

XState's visualizer shows machine states and context. The `$qSerialize()` output is a plain JSON-serializable object — safe to inspect in XState Inspector:

```typescript
import { inspect } from '@xstate/inspect';

inspect({ iframe: false });

// context.order.$qSerialize() will appear as plain JSON in the inspector
```

## See Also

- [React Integration](./react-integration) — `useState` and `useReducer` patterns
- [Zustand Integration](./zustand-integration) — simpler state without state machines
- [Backend Integration](./backend-integration) — validation on server-side state transitions
