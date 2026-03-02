/**
 * Types for the QuickModel observer / reactive-signal system.
 *
 * These types define the contract for subscribing to property changes on any
 * QModel instance via `$qSubscribe` / `$qUnsubscribe` / `$qSignal`.
 *
 * No framework dependencies — the observer pattern here is vanilla JS.
 * Framework-specific adapters (Angular signal, Vue ref, React useSyncExternalStore)
 * are written by the consumer using these primitives.
 *
 * @module core/types/observer
 */

/**
 * Payload delivered to each observer callback whenever a model property changes.
 *
 * @template T - Type of the property value that changed (defaults to `unknown`).
 *
 * @example
 * ```typescript
 * const user = new UserModel({ name: 'Alice', age: 30 });
 * user.$qSubscribe((change: IQChange) => {
 *   console.log(change.field);  // 'name'
 *   console.log(change.prev);   // 'Alice'
 *   console.log(change.next);   // 'Bob'
 * });
 * user.name = 'Bob';
 * ```
 */
export interface IQChange<T = unknown> {
	/**
	 * Name of the field that changed.
	 * Matches the TypeScript property name declared in the model class.
	 */
	field: string;

	/**
	 * Value of the field **before** the change, after type transformation.
	 * For example, if the field is typed as `Date`, `prev` is already a `Date`
	 * instance (not the raw string that was assigned).
	 */
	prev: T;

	/**
	 * Value of the field **after** the change, after type transformation.
	 * This is the value that is now stored in the model.
	 */
	next: T;
}

/**
 * Observer callback function registered via `$qSubscribe`.
 *
 * @template T - Type of the property value (defaults to `unknown`).
 *
 * @example
 * ```typescript
 * const onChange: IQObserverFn = ({ field, prev, next }) => {
 *   console.log(`${field} changed from`, prev, 'to', next);
 * };
 * const unsub = model.$qSubscribe(onChange);
 * // Later:
 * unsub(); // or model.$qUnsubscribe(onChange)
 * ```
 */
export type IQObserverFn<T = unknown> = (change: IQChange<T>) => void;
