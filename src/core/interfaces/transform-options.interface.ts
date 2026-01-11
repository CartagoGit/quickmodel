/**
 * Common option types for transformation, serialization and mocking.
 * Shared between @Quick() (class-level) and @QType() (property-level) decorators.
 */

/**
 * Custom transformer function type (Input -> Model).
 * @param value The raw input value
 * @returns The transformed value
 */
export type QTransformerFn = (value: unknown) => unknown;

/**
 * Custom serializer function type (Model -> Output/Interface).
 * @param value The model value
 * @returns The serialized value
 */
export type QSerializerFn = (value: unknown) => unknown;

/**
 * Custom mocker function type (Test -> Model).
 * @returns The generated mock value
 */
export type QMockerFn = () => unknown;

/**
 * Common options for a single property type transformation.
 */
export interface QPropertyOptions {
	/**
	 * Custom transformer function (Input -> Model).
	 * Overrides default deserialization logic for this property.
	 */
	transformer?: QTransformerFn;

	/**
	 * Custom serializer function (Model -> Output/Interface).
	 * Overrides default toInterface preservation logic.
	 */
	serializer?: QSerializerFn;

	/**
	 * Custom mocker function (Test -> Model).
	 * Overrides default mock generation logic.
	 */
	mocker?: QMockerFn;
}
