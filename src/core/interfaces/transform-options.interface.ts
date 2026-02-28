/**
 * Common option types for transformation, serialization and mocking.
 *
 * These types are shared between the `@Quick()` class decorator (via `IQAdvancedOptions`) and
 * the `@QType()` property decorator (via `IQTypeOptions`). They allow consumers to override
 * the default deserialization, serialization, and mock-generation logic per property.
 *
 * @see {@link IQPropertyOptions} for the aggregate options shape
 * @see {@link IQAdvancedOptions} for the `@Quick()` second-parameter options
 */

/**
 * Custom transformer function (raw input → runtime model value).
 *
 * Called during construction/deserialization as `fn(rawValue)`. The return
 * value is assigned directly to the property with no further processing.
 *
 * @param value - The raw input value (type is `unknown` to handle any API shape)
 * @returns The transformed runtime value for the property
 *
 * @see {@link IQPropertyOptions.transformer}
 * @see {@link IQAdvancedOptions.transformers}
 */
export type IQTransformerFn = (value: unknown) => unknown;

/**
 * Custom serializer function (runtime model value → serialized output).
 *
 * Called during `serialize()` / `toJSON()` as `fn(modelValue)`. The return
 * value is placed in the output object in place of the default serialization.
 *
 * @param value - The runtime value of the property on the model instance
 * @returns The serialized representation suitable for JSON / API output
 *
 * @see {@link IQPropertyOptions.serializer}
 * @see {@link IQAdvancedOptions.serializers}
 */
export type IQSerializerFn = (value: unknown) => unknown;

/**
 * Custom mock generator function for a property.
 *
 * Called during `Model.mock().random()` / `Model.mock().array()` to generate
 * test/faker data for this specific field. Return any value that matches the
 * property's expected type.
 *
 * @returns A freshly generated mock value for the property
 *
 * @see {@link IQPropertyOptions.mocker}
 * @see {@link IQAdvancedOptions.mockers}
 */
export type IQMockerFn = () => unknown;

/**
 * Per-property transformation, serialization and mock options.
 *
 * Used by `@QType()` to override the default behaviour for a single field.
 * When any field is set, QuickModel calls the provided function instead of
 * its built-in logic for the corresponding operation.
 *
 * @see {@link IQTypeOptions} which extends this interface
 * @see {@link IQTransformerFn}, {@link IQSerializerFn}, {@link IQMockerFn}
 */
export interface IQPropertyOptions {
	/**
	 * Custom transformer function (Input → Model).
	 *
	 * When provided, replaces the default deserialization logic for this property.
	 * Called as `transformer(rawValue)` during construction.
	 */
	transformer?: IQTransformerFn;

	/**
	 * Custom serializer function (Model → Output/Interface).
	 *
	 * When provided, replaces the default `serialize()` / `toJSON()` logic for this property.
	 * Called as `serializer(modelValue)` during serialization.
	 */
	serializer?: IQSerializerFn;

	/**
	 * Custom mock generator function.
	 *
	 * When provided, replaces the default faker-based mock generation for this property.
	 * Called as `mocker()` (no arguments) during `mock().random()` / `mock().array()`.
	 */
	mocker?: IQMockerFn;
}
