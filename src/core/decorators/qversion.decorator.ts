/**
 * `@QVersion` — class decorator that enables schema migration for versioned data.
 *
 * Attach to any `QModel` subclass to declare the current data schema version.
 * When the constructor receives input data with a `_v` field lower than the
 * declared version, missing migration steps are applied sequentially before
 * the model is populated.
 *
 * @example
 * ```typescript
 * @Quick()
 * @QVersion(2, {
 *   migrations: {
 *     1: (data) => ({ ...data, fullName: `${data.firstName} ${data.lastName}` }),
 *   },
 * })
 * class User extends QModel<IUser> {
 *   declare fullName: string; // v2: unified field
 * }
 *
 * // Reading localStorage data from schema v1:
 * const user = new User({ firstName: 'Alice', lastName: 'M.', _v: 1 });
 * // → auto-migrated: { fullName: 'Alice M.', _v: 2 }
 * ```
 *
 * @see {@link QModel} — base class
 * @see {@link QVERSION_METADATA_KEY} — metadata key where the config is stored
 */

/**
 * Metadata key applied by `@QVersion()` to class prototypes.
 * Stores version number and migration map.
 * @see {@link QVersion} — decorator that writes this key
 * @see {@link applyMigrations} — function that reads this key at construction time
 */
export const QVERSION_METADATA_KEY = '__qversion__';

/**
 * Shape of the configuration stored under {@link QVERSION_METADATA_KEY}.
 * @see {@link QVersion} — decorator that creates this record
 */
export interface IQVersionConfig {
	/** The current (target) schema version. */
	version: number;
	/**
	 * Map from source version number to migration function.
	 * Each function transforms data FROM that version TO the next one.
	 * Key `1` means: "transform v1 data to v2 data".
	 */
	migrations: Record<
		number,
		(data: Record<string, unknown>) => Record<string, unknown>
	>;
}

/**
 * Declares the current schema version for a `QModel` subclass and registers
 * the migration functions needed to upgrade older data payloads.
 *
 * @param version    Current schema version (positive integer ≥ 1).
 * @param config     Migration configuration.
 * @param config.migrations  Map from `fromVersion` → migration function.
 *                           Each function receives the raw data object and
 *                           returns the transformed object for the next version.
 *
 * @see {@link applyMigrations} — runtime function that executes the migrations
 *
 * @example
 * ```typescript
 * @QVersion(3, {
 *   migrations: {
 *     1: (data) => ({ ...data, body: data.content }),       // v1 → v2
 *     2: (data) => ({ ...data, tags: [data.label] }),       // v2 → v3
 *   },
 * })
 * ```
 */
export function QVersion(
	version: number,
	config: Pick<IQVersionConfig, 'migrations'>
): ClassDecorator {
	return (target: object): void => {
		Reflect.defineMetadata(
			QVERSION_METADATA_KEY,
			{
				version,
				migrations: config.migrations,
			} satisfies IQVersionConfig,
			target
		);
	};
}

/**
 * Applies pending migrations to a raw data object before it is deserialized
 * by `QModel.initialize()`.
 *
 * If the class has no `@QVersion` metadata, or if the incoming data has no
 * `_v` field (treated as current), or if `_v >= version`, returns the data
 * unchanged. Otherwise runs each missing migration step in order.
 *
 * @param ctor  The model constructor (class itself, not an instance).
 * @param data  The raw input data object.
 * @returns The data object after all applicable migrations have been run.
 *
 * @internal Used by `QModel.initialize()`.
 * @see {@link QVersion} — decorator that registers migrations
 */
export function applyMigrations(
	ctor: Function,
	data: Record<string, unknown>
): Record<string, unknown> {
	const cfg: IQVersionConfig | undefined = Reflect.getMetadata(
		QVERSION_METADATA_KEY,
		ctor
	);
	if (!cfg) return data;

	const incoming = data['_v'];
	// No _v → treat as current version (no migration needed)
	if (incoming === undefined || incoming === null) return data;

	const fromVersion = Number(incoming);
	if (isNaN(fromVersion) || fromVersion >= cfg.version) return data;

	let current: Record<string, unknown> = { ...data };
	for (let step = fromVersion; step < cfg.version; step++) {
		const migrateFn = cfg.migrations[step];
		if (migrateFn) {
			current = migrateFn(current);
		}
	}
	// Update _v to the target version
	current['_v'] = cfg.version;

	return current;
}
