/**
 * @fileoverview TypeScript built-in polyfills for backward compatibility.
 *
 * These type aliases and interfaces replace TypeScript built-ins that were
 * introduced in newer versions, allowing the public `.d.ts` API of QuickModel
 * to remain compatible with TypeScript 4.1+.
 *
 * ## Why is this needed?
 *
 * QuickModel's public API exposes two TS-version-gated types:
 *
 * | Built-in                     | Introduced in | Use in QuickModel                          |
 * |------------------------------|---------------|--------------------------------------------|
 * | `NoInfer<T>`                 | TS 5.4        | `QModel.create()` / `QModel.createMany()`  |
 * | `ClassFieldDecoratorContext` | TS 5.0        | `@QType` / `@QRule` TC39 overload          |
 *
 * By replacing them with this equivalent polyfills we lower the minimum
 * supported TypeScript version from 5.4 → 4.1 for the main package entry
 * point (`quickmodel`).
 *
 * ### `INoInfer<T>` — polyfill for `NoInfer<T>` (TS 5.4+)
 *
 * The idiomatic pre-5.4 emulation uses a single-element indexed tuple. It
 * prevents the type-checker from using the annotated position as an inference
 * site, which is exactly what `NoInfer<T>` does:
 *
 * ```typescript
 * // TS 5.4 built-in equivalent:  NoInfer<string> → string
 * type X = INoInfer<string>; // string — type is preserved, not widened
 * ```
 *
 * ### `IClassFieldDecoratorCtx<This, Value>` — polyfill for `ClassFieldDecoratorContext<This, Value>` (TS 5.0+)
 *
 * A structurally-compatible minimal interface. On TS 5+, the real
 * `ClassFieldDecoratorContext` is a strict superset of this interface, so it
 * is directly assignable to it. This means:
 *
 * - **TS 4.1 consumers**: read our interface in the `.d.ts` — no unknown type error.
 * - **TS 5+ legacy-mode consumers**: same `.d.ts`, works fine.
 * - **TS 5+ TC39-mode consumers**: TypeScript passes a real
 *   `ClassFieldDecoratorContext` to decorators. Since it is a superset of our
 *   interface, the assignment is valid and type inference of the field type
 *   (`Value`) works correctly via `access.get`.
 *
 * @see {@link QType} — decorator that uses `IClassFieldDecoratorCtx` for TC39 mode
 * @see {@link QRule} — decorator that also relies on this polyfill for TS 4.1 compat
 * @see {@link createTC39Guard} — guard used inside TC39-path initializers
 * @module
 */

/**
 * Polyfill for TypeScript's built-in `NoInfer<T>` (available since TS 5.4).
 *
 * Prevents the type-checker from using this position as an inference site,
 * forcing callers to pass data that exactly matches the already-inferred `T`.
 * This ensures that `QModel.create<User>(data)` rejects data that doesn't
 * match `IUser` without widening.
 *
 * Works identically on TypeScript 4.1+.
 *
 * @typeParam T - The type to prevent inference from.
 * @group Type utilities
 * @internal
 */
export type INoInfer<T> = [T][T extends unknown ? 0 : never];

/**
 * Minimal polyfill for `ClassFieldDecoratorContext<This, Value>` (TS 5.0 built-in).
 *
 * Structurally compatible with the real `ClassFieldDecoratorContext` so that:
 * - TypeScript 4.1+ consumers can read the public `.d.ts` without errors.
 * - TypeScript 5+ TC39 mode passes a real `ClassFieldDecoratorContext` which
 *   is assignable here (superset), preserving field-type inference.
 *
 * @typeParam This  - The class instance type.
 * @typeParam Value - The type of the decorated field.
 * @group Type utilities
 * @internal
 * @see {@link INoInfer} — companion polyfill for controlled type inference
 * @see {@link ITC39FieldContext} — TC39 decorator context used in `qtype.decorator.ts`
 */
export interface IClassFieldDecoratorCtx<This, Value> {
	readonly kind: 'field';
	readonly name: string | symbol;
	readonly static: boolean;
	readonly private: boolean;
	/** Provides typed access to the field — used by TS 5+ to infer `Value`. */
	readonly access: {
		get(object: This): Value;
		set(object: This, value: Value): void;
	};
	addInitializer(initializer: (this: This) => void): void;
}
