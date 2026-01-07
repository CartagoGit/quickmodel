import type { QuickModel } from '../../quick.model';

/**
 * Helper types para extraer tipos de una clase QuickModel
 */
export type QuickModelInstance<T> = T extends abstract new (
	...args: any[]
) => infer R
	? R
	: never;

export type QuickModelInterface<T> = QuickModelInstance<T> extends QuickModel<
	infer I,
	any
>
	? I
	: never;
