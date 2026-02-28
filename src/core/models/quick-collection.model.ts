import type { IQSerializationOptions } from '@/core/interfaces/serializer.interface';

/**
 * Result returned by `QModelCollection.checkAllRules()`.
 * @see {@link QModelCollection.checkAllRules}
 */
export interface IQCollectionRulesResult {
	/** Whether all instances passed all rules. */
	valid: boolean;
	/** Errors per index in the collection. */
	errors: Array<{ index: number; field: string; message: string }>;
}

/**
 * Options for `QModelCollection.sortBy()`.
 */
interface ISortByOptions {
	/** Sort descending when `true`. Default: `false` (ascending). */
	desc?: boolean;
}

/**
 * A typed constructor that can instantiate a `QModel`-like class.
 * @internal
 */
type IQModelCtor<TInstance extends object> = new (
	data: Record<string, unknown>
) => TInstance;

/**
 * Typed, immutable wrapper around an array of QModel instances.
 *
 * Provides fluent filtering, sorting, pagination, grouping, serialization,
 * and rule-checking over a homogeneous collection of QModel instances.
 *
 * Create via the static `from()` factory or the `Model.collection()` static alias.
 *
 * @template TInstance - The QModel class instance type.
 *
 * @example
 * ```typescript
 * const users = QModelCollection.from(UserModel, rawRows);
 *
 * users
 *   .where(u => u.active)
 *   .sortBy('name')
 *   .paginate(1, 10)
 *   .toArray(); // → UserModel[]
 *
 * users.groupBy('role');  // → Record<string, UserModel[]>
 * users.serialize();      // → plain object array
 * ```
 *
 * @see {@link QModel.collection} — static alias on each model class
 * @see {@link QModel.createMany} — creates instances but returns a plain array
 */
export class QModelCollection<TInstance extends object> {
	readonly #items: TInstance[];
	readonly #ctor: IQModelCtor<TInstance>;

	private constructor(ctor: IQModelCtor<TInstance>, items: TInstance[]) {
		this.#ctor = ctor;
		this.#items = items;
	}

	// ─── Factory ────────────────────────────────────────────────────────────

	/**
	 * Creates a `QModelCollection` from a raw data array.
	 *
	 * Each element is instantiated via `new Model(row)`.
	 *
	 * @param ctor - The `QModel` subclass constructor.
	 * @param data - Array of raw plain-object rows.
	 *
	 * @example
	 * ```typescript
	 * const col = QModelCollection.from(UserModel, await db.select().from(users));
	 * ```
	 */
	static from<TInstance extends object>(
		ctor: IQModelCtor<TInstance>,
		data: Array<Record<string, unknown>>
	): QModelCollection<TInstance> {
		const items = data.map((row) => new ctor(row));
		return new QModelCollection(ctor, items);
	}

	// ─── Size ───────────────────────────────────────────────────────────────

	/**
	 * Number of instances in the collection.
	 */
	get size(): number {
		return this.#items.length;
	}

	// ─── Access ─────────────────────────────────────────────────────────────

	/**
	 * Returns a plain array of model instances.
	 *
	 * The returned array is a shallow copy — mutation does not affect the collection.
	 */
	toArray(): TInstance[] {
		return [...this.#items];
	}

	// ─── Filter & Search ────────────────────────────────────────────────────

	/**
	 * Returns a new collection containing only the instances that satisfy `predicate`.
	 *
	 * Does not mutate the original collection.
	 *
	 * @param predicate - A function receiving a model instance and returning `true` to keep it.
	 *
	 * @example
	 * ```typescript
	 * const admins = col.where(u => u.role === 'admin');
	 * ```
	 */
	where(
		predicate: (item: TInstance) => boolean
	): QModelCollection<TInstance> {
		return new QModelCollection(this.#ctor, this.#items.filter(predicate));
	}

	/**
	 * Returns the first instance satisfying `predicate`, or `undefined`.
	 *
	 * @param predicate - A function receiving a model instance and returning `true` to match.
	 */
	find(predicate: (item: TInstance) => boolean): TInstance | undefined {
		return this.#items.find(predicate);
	}

	// ─── Sort ───────────────────────────────────────────────────────────────

	/**
	 * Returns a new collection sorted by `field`.
	 *
	 * Numbers and strings are supported. Other types fall back to string comparison.
	 * Does not mutate the original collection.
	 *
	 * @param field - Name of the property to sort by.
	 * @param options - `{ desc: true }` for descending order.
	 *
	 * @example
	 * ```typescript
	 * const sorted = col.sortBy('age', { desc: true });
	 * ```
	 */
	sortBy(
		field: keyof TInstance,
		options?: ISortByOptions
	): QModelCollection<TInstance> {
		const copy = [...this.#items];
		copy.sort((lhs, rhs) => {
			const aVal = lhs[field];
			const bVal = rhs[field];
			let cmp = 0;
			if (typeof aVal === 'number' && typeof bVal === 'number') {
				cmp = aVal - bVal;
			} else {
				cmp = String(aVal).localeCompare(String(bVal));
			}
			return options?.desc ? -cmp : cmp;
		});
		return new QModelCollection(this.#ctor, copy);
	}

	// ─── Paginate ───────────────────────────────────────────────────────────

	/**
	 * Returns a new collection representing a single page of results.
	 *
	 * Pages start at `1`. If the requested page is beyond the available data,
	 * an empty collection is returned.
	 *
	 * @param page - 1-based page number.
	 * @param pageSize - Number of items per page.
	 *
	 * @example
	 * ```typescript
	 * const page1 = col.paginate(1, 10); // items 0–9
	 * const page2 = col.paginate(2, 10); // items 10–19
	 * ```
	 */
	paginate(page: number, pageSize: number): QModelCollection<TInstance> {
		const start = (page - 1) * pageSize;
		return new QModelCollection(
			this.#ctor,
			this.#items.slice(start, start + pageSize)
		);
	}

	// ─── Group ──────────────────────────────────────────────────────────────

	/**
	 * Groups the collection by the string value of `field`.
	 *
	 * @param field - Name of the property to group by.
	 * @returns A `Record` mapping group keys to arrays of model instances.
	 *
	 * @example
	 * ```typescript
	 * const byRole = col.groupBy('role');
	 * byRole['admin']; // → UserModel[]
	 * ```
	 */
	groupBy(field: keyof TInstance): Record<string, TInstance[]> {
		const groups: Record<string, TInstance[]> = {};
		for (const item of this.#items) {
			const key = String(item[field]);
			const grp = groups[key];
			if (grp) {
				grp.push(item);
			} else {
				groups[key] = [item];
			}
		}
		return groups;
	}

	// ─── Serialization ──────────────────────────────────────────────────────

	/**
	 * Serializes every instance in the collection using the model's `serialize()` method.
	 *
	 * @param options - Optional serialization options forwarded to each instance.
	 * @returns An array of plain serialized objects.
	 *
	 * @example
	 * ```typescript
	 * col.serialize({ pick: ['id', 'name'] }); // → [{ id, name }, ...]
	 * ```
	 */
	serialize(options?: IQSerializationOptions): Record<string, unknown>[] {
		return this.#items.map((item) => {
			const serializable = item as unknown as {
				serialize: (
					opts?: IQSerializationOptions
				) => Record<string, unknown>;
			};
			return serializable.serialize(options);
		});
	}

	/**
	 * Returns a JSON string representing the serialized array.
	 *
	 * @example
	 * ```typescript
	 * const json = col.toJSON();
	 * ```
	 */
	toJSON(): string {
		return JSON.stringify(this.serialize());
	}

	// ─── Validation ─────────────────────────────────────────────────────────

	/**
	 * Runs `checkRules()` on every instance in the collection.
	 *
	 * @returns `{ valid, errors }` where `errors` includes the index, field, and message
	 *   for each rule failure across all instances.
	 */
	checkAllRules(): IQCollectionRulesResult {
		const errors: IQCollectionRulesResult['errors'] = [];
		for (let idx = 0; idx < this.#items.length; idx++) {
			const item = this.#items[idx] as unknown as {
				checkRules: () => {
					valid: boolean;
					errors: Array<{ field: string; message: string }>;
				};
			};
			const result = item.checkRules();
			if (!result.valid) {
				for (const err of result.errors) {
					errors.push({
						index: idx,
						field: err.field,
						message: err.message,
					});
				}
			}
		}
		return { valid: errors.length === 0, errors };
	}
}
