import type { IQRulesResult } from '@/core/decorators/qrule.decorator';
import type { IQSerializationOptions } from '@/core/interfaces/serializer.interface';

/**
 * Minimal contract every element stored in a `QModelCollection` must fulfill.
 *
 * Any `QModel` subclass satisfies this interface automatically.
 * @internal
 */
export interface IQCollectionItem {
	$qSerialize(opts?: IQSerializationOptions): object;
	$qCheckRules(): IQRulesResult;
}

/**
 * Result returned by `QModelCollection.$qCheckAllRules()`.
 * @see {@link QModelCollection.$qCheckAllRules}
 */
export interface IQCollectionRulesResult {
	/** Whether all instances passed all rules. */
	valid: boolean;
	/** Errors per index in the collection. */
	errors: Array<{ index: number; field: string; message: string }>;
}

/**
 * Options for `QModelCollection.$qToCSV()`.
 *
 * @see {@link QModelCollection.$qToCSV}
 */
export interface IQCSVOptions {
	/** Column delimiter. Default: `','`. */
	delimiter?: string;
	/** Whether to include the header row. Default: `true`. */
	includeHeaders?: boolean;
	/**
	 * Subset of serialized fields to include, in the specified order.
	 * When omitted, all fields from the serialized output are used.
	 */
	fields?: string[];
	/** String used for `null` or `undefined` values. Default: `''`. */
	nullValue?: string;
}

/**
 * Options for `QModelCollection.$qSortBy()`.
 */
interface ISortByOptions {
	/** Sort order. Default: `'asc'` (ascending). */
	order?: 'asc' | 'desc';
}

/**
 * A typed constructor that can instantiate a `QModel`-like class.
 * @internal
 */
type IQModelCtor<TInstance extends IQCollectionItem> = new (
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
 *   .$qWhere(u => u.active)
 *   .$qSortBy('name')
 *   .$qPaginate(1, 10)
 *   .$qToArray(); // → UserModel[]
 *
 * users.$qGroupBy('role');  // → Record<string, UserModel[]>
 * users.$qSerialize();      // → plain object array
 * ```
 *
 * @see {@link QModel.collection} — static alias on each model class
 * @see {@link QModel.createMany} — creates instances but returns a plain array
 */
export class QModelCollection<TInstance extends IQCollectionItem> {
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
	static from<TInstance extends IQCollectionItem>(
		ctor: IQModelCtor<TInstance>,
		data: ReadonlyArray<object>
	): QModelCollection<TInstance> {
		const items = data.map(
			(row) => new ctor(row as Record<string, unknown>)
		);
		return new QModelCollection(ctor, items);
	}

	/**
	 * Creates a `QModelCollection` from a raw data array.
	 * Alias for {@link QModelCollection.from}.
	 *
	 * @param ctor - The `QModel` subclass constructor.
	 * @param data - Array of raw plain-object rows.
	 *
	 * @example
	 * ```typescript
	 * const col = QModelCollection.fromArray(UserModel, rows);
	 * ```
	 */
	static fromArray<TInstance extends IQCollectionItem>(
		ctor: IQModelCtor<TInstance>,
		data: ReadonlyArray<object>
	): QModelCollection<TInstance> {
		return QModelCollection.from(ctor, data);
	}

	// ─── Size ───────────────────────────────────────────────────────────────

	/**
	 * Number of instances in the collection.
	 */
	get $qSize(): number {
		return this.#items.length;
	}

	// ─── Access ─────────────────────────────────────────────────────────────

	/**
	 * Returns a plain array of model instances.
	 *
	 * The returned array is a shallow copy — mutation does not affect the collection.
	 */
	$qToArray(): TInstance[] {
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
	 * const admins = col.$qWhere(u => u.role === 'admin');
	 * ```
	 */
	$qWhere(
		predicate: (item: TInstance) => boolean
	): QModelCollection<TInstance> {
		return new QModelCollection(this.#ctor, this.#items.filter(predicate));
	}

	/**
	 * Returns the first instance satisfying `predicate`, or `undefined`.
	 *
	 * @param predicate - A function receiving a model instance and returning `true` to match.
	 */
	$qFind(predicate: (item: TInstance) => boolean): TInstance | undefined {
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
	 * @param options - `{ order: 'desc' }` for descending order (default: `'asc'`).
	 *
	 * @example
	 * ```typescript
	 * const sorted = col.$qSortBy('age', { order: 'desc' });
	 * ```
	 */
	$qSortBy(
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
			return options?.order === 'desc' ? -cmp : cmp;
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
	 * const page1 = col.$qPaginate(1, 10); // items 0–9
	 * const page2 = col.$qPaginate(2, 10); // items 10–19
	 * ```
	 */
	$qPaginate(page: number, pageSize: number): QModelCollection<TInstance> {
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
	 * const byRole = col.$qGroupBy('role');
	 * byRole['admin']; // → UserModel[]
	 * ```
	 */
	$qGroupBy(field: keyof TInstance): Record<string, TInstance[]> {
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
	$qSerialize(
		options?: IQSerializationOptions
	): ReturnType<TInstance['$qSerialize']>[] {
		return this.#items.map(
			(item) =>
				item.$qSerialize(options) as ReturnType<
					TInstance['$qSerialize']
				>
		);
	}

	/**
	 * Implements the JS `toJSON` protocol — returns a plain array of serialized items
	 * so that `JSON.stringify(collection)` and `JSON.stringify({ col })` work correctly.
	 *
	 * @see {@link QModelCollection.$qToJSON} — returns a JSON string (convenience shortcut)
	 */
	toJSON(): ReturnType<TInstance['$qSerialize']>[] {
		return this.$qSerialize();
	}

	/**
	 * Returns a JSON string representing the serialized array.
	 *
	 * @example
	 * ```typescript
	 * const json = col.$qToJSON();
	 * // '[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]'
	 * ```
	 */
	$qToJSON(): string {
		return JSON.stringify(this.$qSerialize());
	}

	/**
	 * Creates a `QModelCollection` from a JSON string.
	 *
	 * Parses `json` with `JSON.parse` and delegates to `from()`.
	 * Each element is instantiated via `new ctor(row)` so all transformers run.
	 *
	 * @param ctor - The `QModel` subclass constructor.
	 * @param json - A JSON string produced by `$qToJSON()` or `JSON.stringify(col)`.
	 * @returns A new `QModelCollection<TInstance>`.
	 * @throws {SyntaxError} If `json` is not valid JSON.
	 * @throws {TypeError} If the parsed value is not an array.
	 *
	 * @example
	 * ```typescript
	 * const json = col.$qToJSON();
	 * const restored = QModelCollection.fromJSON(UserModel, json);
	 * restored.$qFirst(); // → UserModel instance
	 * ```
	 */
	static fromJSON<TInstance extends IQCollectionItem>(
		ctor: IQModelCtor<TInstance>,
		json: string
	): QModelCollection<TInstance> {
		const parsed = JSON.parse(json) as unknown;
		if (!Array.isArray(parsed)) {
			throw new TypeError('[QuickModel] fromJSON: expected a JSON array');
		}
		return QModelCollection.from(ctor, parsed as ReadonlyArray<object>);
	}

	/**
	 * Exports the collection to a CSV-formatted string (RFC 4180).
	 *
	 * Values are serialized via each instance's `serialize()` method. Cells that
	 * contain the delimiter, a newline, or a double-quote are automatically
	 * wrapped in double-quotes; embedded double-quotes are escaped by doubling.
	 *
	 * @param options - Optional CSV generation options.
	 * @returns A CSV string. Returns `''` when the collection is empty.
	 *
	 * @example Basic export
	 * ```typescript
	 * const csv = UserCollection.from(UserModel, rows).$qToCSV();
	 * // id,name,email
	 * // 1,Alice,alice@example.com
	 * // 2,Bob,bob@example.com
	 * ```
	 *
	 * @example Semicolon-delimited, subset of fields
	 * ```typescript
	 * col.$qToCSV({ delimiter: ';', fields: ['name', 'email'] });
	 * ```
	 *
	 * @see {@link IQCSVOptions}
	 */
	$qToCSV(options?: IQCSVOptions): string {
		if (this.#items.length === 0) return '';

		const delimiter = options?.delimiter ?? ',';
		const includeHeaders = options?.includeHeaders ?? true;
		const nullValue = options?.nullValue ?? '';

		const serialized = this.#items.map(
			(item) => item.$qSerialize() as Record<string, unknown>
		);

		const firstRow = serialized[0];
		if (firstRow === undefined) return '';

		const fields = options?.fields ?? Object.keys(firstRow);

		const escapeCell = (value: unknown): string => {
			const str =
				value === null || value === undefined
					? nullValue
					: String(value);
			if (
				str.includes(delimiter) ||
				str.includes('\n') ||
				str.includes('"')
			) {
				return `"${str.replace(/"/g, '""')}"`;
			}
			return str;
		};

		const rows: string[] = [];

		if (includeHeaders) {
			rows.push(fields.map((fld) => escapeCell(fld)).join(delimiter));
		}

		for (const row of serialized) {
			rows.push(
				fields.map((fld) => escapeCell(row[fld])).join(delimiter)
			);
		}

		return rows.join('\n');
	}
	// ─── Functional utilities ────────────────────────────────────────────────

	/**
	 * Returns `true` when the collection contains no elements.
	 *
	 * @example
	 * ```typescript
	 * QModelCollection.from(UserModel, []).$qIsEmpty; // → true
	 * ```
	 */
	get $qIsEmpty(): boolean {
		return this.#items.length === 0;
	}

	/**
	 * Returns the first instance in the collection, or `undefined` when empty.
	 *
	 * @example
	 * ```typescript
	 * col.$qFirst()?.name; // → 'Alice'
	 * ```
	 */
	$qFirst(): TInstance | undefined {
		return this.#items[0];
	}

	/**
	 * Returns the last instance in the collection, or `undefined` when empty.
	 *
	 * @example
	 * ```typescript
	 * col.$qLast()?.name; // → 'Eve'
	 * ```
	 */
	$qLast(): TInstance | undefined {
		return this.#items[this.#items.length - 1];
	}

	/**
	 * Counts the number of instances that satisfy `predicate`.
	 * When called without arguments, returns the total collection size.
	 *
	 * @param predicate - Optional filter function.
	 *
	 * @example
	 * ```typescript
	 * col.$qCount();                       // → 5
	 * col.$qCount(u => u.active === true); // → 3
	 * ```
	 */
	$qCount(predicate?: (item: TInstance) => boolean): number {
		if (predicate === undefined) return this.#items.length;
		let cnt = 0;
		for (const item of this.#items) {
			if (predicate(item)) cnt++;
		}
		return cnt;
	}

	/**
	 * Returns `true` when **every** instance satisfies `predicate`.
	 * Returns `true` for an empty collection (vacuous truth).
	 *
	 * @param predicate - A function receiving a model instance and returning a boolean.
	 *
	 * @example
	 * ```typescript
	 * col.$qEvery(u => u.age >= 18); // → true
	 * ```
	 */
	$qEvery(predicate: (item: TInstance) => boolean): boolean {
		return this.#items.every(predicate);
	}

	/**
	 * Returns `true` when **at least one** instance satisfies `predicate`.
	 * Returns `false` for an empty collection.
	 *
	 * @param predicate - A function receiving a model instance and returning a boolean.
	 *
	 * @example
	 * ```typescript
	 * col.$qSome(u => u.role === 'admin'); // → true
	 * ```
	 */
	$qSome(predicate: (item: TInstance) => boolean): boolean {
		return this.#items.some(predicate);
	}

	/**
	 * Applies `transform` to each instance and returns a plain array of the results.
	 *
	 * Unlike `toArray()`, this returns transformed values rather than model instances.
	 *
	 * @param transform - A function receiving a model instance and returning any value.
	 *
	 * @example
	 * ```typescript
	 * col.$qMap(u => u.name);        // → ['Alice', 'Bob', ...]
	 * col.$qMap(u => u.$qSerialize()); // → plain-object array
	 * ```
	 */
	$qMap<TResult>(transform: (item: TInstance) => TResult): TResult[] {
		return this.#items.map(transform);
	}

	/**
	 * Applies `transform` to each instance and flattens the result one level.
	 *
	 * @param transform - A function receiving a model instance and returning an array.
	 *
	 * @example
	 * ```typescript
	 * col.$qFlatMap(u => [u.name, u.email]); // → ['Alice', 'a@b.com', 'Bob', ...]
	 * ```
	 */
	$qFlatMap<TResult>(transform: (item: TInstance) => TResult[]): TResult[] {
		return this.#items.flatMap(transform);
	}

	/**
	 * Reduces the collection to a single accumulated value.
	 *
	 * @param reducer - A function receiving the current accumulator and the current instance.
	 * @param initial - The initial accumulator value.
	 *
	 * @example
	 * ```typescript
	 * col.$qReduce((total, p) => total + p.price, 0); // → sum of prices
	 * ```
	 */
	$qReduce<TAcc>(
		reducer: (acc: TAcc, item: TInstance) => TAcc,
		initial: TAcc
	): TAcc {
		return this.#items.reduce(reducer, initial);
	}

	/**
	 * Returns the sum of a numeric field across all instances.
	 * Returns `0` for an empty collection.
	 *
	 * @param field - Name of a numeric property on the model.
	 *
	 * @example
	 * ```typescript
	 * col.$qSum('price'); // → 7.0
	 * col.$qSum('stock'); // → 390
	 * ```
	 */
	$qSum(field: keyof TInstance): number {
		let total = 0;
		for (const item of this.#items) {
			const val = item[field];
			if (typeof val === 'number') total += val;
		}
		return total;
	}

	/**
	 * Returns the **arithmetic average** of a numeric field across all instances.
	 * Returns `0` for an empty collection.
	 *
	 * @param field - Name of a numeric property on the model.
	 *
	 * @example
	 * ```typescript
	 * col.$qAvg('price'); // → 2.3
	 * col.$qAvg('score'); // → 87.5
	 * ```
	 */
	$qAvg(field: keyof TInstance): number {
		if (this.#items.length === 0) return 0;
		return this.$qSum(field) / this.#items.length;
	}

	/**
	 * Returns the instance with the **minimum** value of `field`, or `undefined` when empty.
	 *
	 * @param field - Name of a numeric property (or string-comparable property) on the model.
	 *
	 * @example
	 * ```typescript
	 * col.$qMin('price')?.name; // → 'Banana'
	 * ```
	 */
	$qMin(field: keyof TInstance): TInstance | undefined {
		if (this.#items.length === 0) return undefined;
		let minItem = this.#items[0] as TInstance;
		for (let idx = 1; idx < this.#items.length; idx++) {
			const item = this.#items[idx] as TInstance;
			const cur = item[field];
			const best = minItem[field];
			if (typeof cur === 'number' && typeof best === 'number') {
				if (cur < best) minItem = item;
			} else if (String(cur) < String(best)) {
				minItem = item;
			}
		}
		return minItem;
	}

	/**
	 * Returns the instance with the **maximum** value of `field`, or `undefined` when empty.
	 *
	 * @param field - Name of a numeric property (or string-comparable property) on the model.
	 *
	 * @example
	 * ```typescript
	 * col.$qMax('price')?.name; // → 'Elderberry'
	 * ```
	 */
	$qMax(field: keyof TInstance): TInstance | undefined {
		if (this.#items.length === 0) return undefined;
		let maxItem = this.#items[0] as TInstance;
		for (let idx = 1; idx < this.#items.length; idx++) {
			const item = this.#items[idx] as TInstance;
			const cur = item[field];
			const best = maxItem[field];
			if (typeof cur === 'number' && typeof best === 'number') {
				if (cur > best) maxItem = item;
			} else if (String(cur) > String(best)) {
				maxItem = item;
			}
		}
		return maxItem;
	}

	/**
	 * Returns a new collection keeping only the **first** occurrence of each unique
	 * value of `field`. Subsequent items sharing the same field value are discarded.
	 *
	 * @param field - Name of the property whose value determines uniqueness.
	 *
	 * @example
	 * ```typescript
	 * col.$qUnique('category'); // one item per category
	 * ```
	 */
	$qUnique(field: keyof TInstance): QModelCollection<TInstance> {
		const seen = new Set<unknown>();
		const result: TInstance[] = [];
		for (const item of this.#items) {
			const val = item[field];
			if (!seen.has(val)) {
				seen.add(val);
				result.push(item);
			}
		}
		return new QModelCollection(this.#ctor, result);
	}

	/**
	 * Returns a `Map` indexing each instance by the string or number value of `field`.
	 * When duplicate values exist, the **last** occurrence wins.
	 *
	 * @param field - Name of the property to use as the map key.
	 *
	 * @example
	 * ```typescript
	 * const byId = col.$qToMap('id');
	 * byId.get(1)?.name; // → 'Alice'
	 * ```
	 */
	$qToMap(field: keyof TInstance): Map<unknown, TInstance> {
		const map = new Map<unknown, TInstance>();
		for (const item of this.#items) {
			map.set(item[field], item);
		}
		return map;
	}

	// ─── Validation ─────────────────────────────────────────────────────────

	/**
	 * Runs `$qCheckRules()` on every instance in the collection.
	 *
	 * @returns `{ valid, errors }` where `errors` includes the index, field, and message
	 *   for each rule failure across all instances.
	 */
	$qCheckAllRules(): IQCollectionRulesResult {
		const errors: IQCollectionRulesResult['errors'] = [];
		for (let idx = 0; idx < this.#items.length; idx++) {
			const item = this.#items[idx];
			if (item === undefined) continue;
			const result = item.$qCheckRules();
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
