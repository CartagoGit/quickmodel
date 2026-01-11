/**
 * Common option types for transformation, serialization and mocking.
 * Shared between @Quick() (class-level) and @QType() (property-level) decorators.
 */

/**
 * Custom transformer function type (Input -> Model).
 * @param value The raw input value
 * @returns The transformed value
 */
export type IQTransformerFn = (value: unknown) => unknown;

/**
 * Custom serializer function type (Model -> Output/Interface).
 * @param value The model value
 * @returns The IQSerialized value
 */
export type IQSerializerFn = (value: unknown) => unknown;

/**
 * Custom mocker function type (Test -> Model).
 * @returns The generated mock value
 */
export type IQMockerFn = () => unknown;

/**
 * Common options for a single property type transformation.
 */
export interface IQPropertyOptions {
	/**
	 * Custom transformer function (Input -> Model).
	 * Overrides default deserialization logic for this property.
	 */
	transformer?: IQTransformerFn;

	/**
	 * Custom serializer function (Model -> Output/Interface).
	 * Overrides default toInterface preservation logic.
	 */
	serializer?: IQSerializerFn;

	/**
	 * Custom mocker function (Test -> Model).
	 * Overrides default mock generation logic.
	 */
	mocker?: IQMockerFn;
}
