/**
 * QModelSignal — the built-in reactive signal attached to every QModel instance.
 *
 * Provides the minimal contract that allows any framework's reactive system
 * to subscribe to model changes without QuickModel having any dependency on
 * those frameworks.
 *
 * ## Framework bridge examples
 *
 * ### React (useSyncExternalStore)
 * ```typescript
 * const snapshot = useSyncExternalStore(
 *   (notify) => model.$qSignal.subscribe(notify as any),
 *   () => model.$qSerialize(),
 * );
 * ```
 *
 * ### Vue 3 (triggerRef)
 * ```typescript
 * const ref = shallowRef(model);
 * model.$qSignal.subscribe(() => triggerRef(ref));
 * ```
 *
 * ### Angular 17+ (WritableSignal)
 * ```typescript
 * const sig = signal(model);
 * model.$qSignal.subscribe(() => sig.set(model));
 * return sig.asReadonly();
 * ```
 *
 * ### Solid.js
 * ```typescript
 * const [ver, setVer] = createSignal(0);
 * model.$qSignal.subscribe(() => setVer(v => v + 1));
 * ```
 *
 * @module core/models/q-model-signal
 */
import type { IQObserverFn } from '@/core/types/observer.type';

/**
 * Minimal contract required from a model to be observed via `QModelSignal`.
 * Using a structural interface instead of the concrete `QModel` class breaks
 * the circular import: `quick.model.ts` → `q-model-signal.ts` → `quick.model.ts`.
 *
 * @internal
 */
interface IQModelSubscribable {
	$qSubscribe(fn: IQObserverFn): () => void;
}

/**
 * Public interface for the built-in signal exposed by `QModel.$qSignal`.
 *
 * @template T - The concrete QModel subclass type.
 */
export interface IQModelSignal<T extends IQModelSubscribable> {
	/**
	 * Returns the model instance without registering any reactive dependency.
	 * Safe to call from any context, including inside framework effects.
	 */
	peek(): T;

	/**
	 * Monotonically increasing counter. Starts at `0` and increments once for
	 * every property change, regardless of whether any observers are registered.
	 *
	 * Frameworks that track dependency by "version number" (e.g. custom Vue refs,
	 * Preact signals) can read this property to invalidate derived computations.
	 */
	readonly version: number;

	/**
	 * Registers a callback that fires after each property change.
	 *
	 * @param fn - The observer callback. Receives an `IQChange` payload.
	 * @returns An unsubscribe function — call it to stop receiving notifications.
	 *
	 * @example
	 * ```typescript
	 * const unsub = model.$qSignal.subscribe(({ field, next }) => {
	 *   console.log(`${field} →`, next);
	 * });
	 * // Later:
	 * unsub();
	 * ```
	 */
	subscribe(callback: IQObserverFn): () => void;
}

/**
 * Concrete implementation of `IQModelSignal`.
 *
 * One instance is created lazily per model instance and cached in
 * `__quickSignal__` — accessing `model.$qSignal` repeatedly always returns
 * the same object.
 *
 * @internal — consumers type against `IQModelSignal`, not this class.
 */
export class QModelSignal<
	T extends IQModelSubscribable,
> implements IQModelSignal<T> {
	constructor(private readonly _model: T) {}

	/** @inheritdoc */
	peek(): T {
		return this._model;
	}

	/** @inheritdoc */
	get version(): number {
		// __quickSignalVersion__ is set lazily by _notifyObservers.
		// If it does not exist yet, no mutations have occurred → 0.
		return (
			((this._model as unknown as Record<string, unknown>)[
				'__quickSignalVersion__'
			] as number | undefined) ?? 0
		);
	}

	/** @inheritdoc */
	subscribe(callback: IQObserverFn): () => void {
		return this._model.$qSubscribe(callback);
	}
}
