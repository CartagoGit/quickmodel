/**
 * Helpers de medición y módulos opcionales compartidos por todos los benches.
 * Este archivo usa top-level await — solo importable desde el contexto Bun.
 */

import 'reflect-metadata';

import type { IBenchResult } from './bench.types';

// ─────────────────────────────────────────────────────────────
// IMPORTACIONES DINÁMICAS — librerías opcionales
// ─────────────────────────────────────────────────────────────

export let valibotMod: any = null;
export let typeboxMod: any = null;
export let typeboxValueMod: any = null;
export let ctMod: any = null;
export let yupMod: any = null;
export let arktypeMod: any = null;
export let superjsonMod: any = null;
export let cvMod: any = null;
export let vestMod: any = null;
export let joiMod: any = null;
export let fakerMod: any = null;
export let immerMod: any = null;

await Promise.allSettled([
	import('valibot')
		.then((mod) => {
			valibotMod = mod;
		})
		.catch(() => {}),
	import('@sinclair/typebox')
		.then((mod) => {
			typeboxMod = mod;
		})
		.catch(() => {}),
	import('@sinclair/typebox/value')
		.then((mod) => {
			typeboxValueMod = mod;
		})
		.catch(() => {}),
	import('class-transformer')
		.then((mod) => {
			ctMod = mod;
		})
		.catch(() => {}),
	import('yup')
		.then((mod) => {
			yupMod = mod;
		})
		.catch(() => {}),
	import('arktype')
		.then((mod) => {
			arktypeMod = mod;
		})
		.catch(() => {}),
	import('superjson')
		.then((mod) => {
			superjsonMod = mod;
		})
		.catch(() => {}),
	import('class-validator')
		.then((mod) => {
			cvMod = mod;
		})
		.catch(() => {}),
	import('vest')
		.then((mod) => {
			vestMod = mod;
		})
		.catch(() => {}),
	import('joi')
		.then((mod) => {
			joiMod = mod;
		})
		.catch(() => {}),
	import('@faker-js/faker')
		.then((mod) => {
			fakerMod = mod;
		})
		.catch(() => {}),
	import('immer')
		.then((mod) => {
			immerMod = mod;
		})
		.catch(() => {}),
]);

// ─────────────────────────────────────────────────────────────
// HELPERS DE MEDICIÓN
// ─────────────────────────────────────────────────────────────

export function runBench(
	name: string,
	iterations: number,
	func: () => void
): IBenchResult {
	for (let idx = 0; idx < 100; idx++) func();
	const start = performance.now();
	for (let idx = 0; idx < iterations; idx++) func();
	const totalMs = performance.now() - start;
	const opsPerSec = Math.round((iterations / totalMs) * 1000);
	const avgMicros = (totalMs / iterations) * 1000;
	return { name, iterations, totalMs, opsPerSec, avgMicros };
}

export async function runBenchAsync(
	name: string,
	iterations: number,
	func: () => Promise<void>
): Promise<IBenchResult> {
	for (let idx = 0; idx < 10; idx++) await func();
	const start = performance.now();
	for (let idx = 0; idx < iterations; idx++) await func();
	const totalMs = performance.now() - start;
	const opsPerSec = Math.round((iterations / totalMs) * 1000);
	const avgMicros = (totalMs / iterations) * 1000;
	return { name, iterations, totalMs, opsPerSec, avgMicros };
}

export function notInstalled(_lib: string): void {}

export function printComparison(
	_title: string,
	_results: IBenchResult[]
): void {
	// Output suprimido — los asserts de rendimiento están en cada test individual
}

// ─────────────────────────────────────────────────────────────
// SCHEMA BUILDERS — lazy para evitar errores si no están instaladas
// ─────────────────────────────────────────────────────────────

export function buildTypeboxSchemas() {
	if (!typeboxMod) return null;
	const tbox = typeboxMod;
	const simpleSchema = tbox.Type.Object({
		id: tbox.Type.String(),
		name: tbox.Type.String(),
		email: tbox.Type.String(),
		age: tbox.Type.Number(),
		active: tbox.Type.Boolean(),
	});
	return { simpleSchema };
}

export function buildValibotSchemas() {
	if (!valibotMod) return null;
	const vlb = valibotMod;
	const simpleSchema = vlb.object({
		id: vlb.string(),
		name: vlb.string(),
		email: vlb.string(),
		age: vlb.number(),
		active: vlb.boolean(),
	});
	const complexSchema = vlb.object({
		id: vlb.string(),
		name: vlb.string(),
		createdAt: vlb.pipe(
			vlb.string(),
			vlb.transform((val: string) => new Date(val))
		),
		balance: vlb.pipe(
			vlb.string(),
			vlb.transform((val: string) => BigInt(val))
		),
		tags: vlb.pipe(
			vlb.array(vlb.string()),
			vlb.transform((arr: string[]) => new Set(arr))
		),
		metadata: vlb.pipe(
			vlb.array(vlb.tuple([vlb.string(), vlb.string()])),
			vlb.transform((entries: [string, string][]) => new Map(entries))
		),
	});
	return { simpleSchema, complexSchema };
}

export function buildYupSchemas() {
	if (!yupMod) return null;
	const yup = yupMod;
	const simpleSchema = yup.object({
		id: yup.string().required(),
		name: yup.string().required(),
		email: yup.string().required(),
		age: yup.number().required(),
		active: yup.boolean().required(),
	});
	return { simpleSchema };
}

export function buildArktypeSchemas() {
	if (!arktypeMod) return null;
	const arkt = arktypeMod;
	const simpleSchema = arkt.type({
		id: 'string',
		name: 'string',
		email: 'string',
		age: 'number',
		active: 'boolean',
	});
	return { simpleSchema };
}

export function buildJoiSchemas() {
	if (!joiMod) return null;
	const joi = joiMod.default ?? joiMod;
	const simpleSchema = joi.object({
		id: joi.string().required(),
		name: joi.string().required(),
		email: joi.string().required(),
		age: joi.number().required(),
		active: joi.boolean().required(),
	});
	const rulesSchema = joi.object({
		name: joi.string().min(2).required(),
		email: joi
			.string()
			.email({ tlds: { allow: false } })
			.required(),
		password: joi.string().min(8).pattern(/[A-Z]/).required(),
	});
	return { simpleSchema, rulesSchema };
}

export function buildVestSuite() {
	if (!vestMod) return null;
	const vest = vestMod;
	const create = vest.create ?? vest.default?.create;
	if (!create) return null;
	type IVestForm = { name: string; email: string; password: string };
	const suite = create((form: IVestForm) => {
		vest.test('name', 'Name too short', () => {
			vest.enforce(form.name).longerThanOrEquals(2);
		});
		vest.test('email', 'Invalid email', () => {
			vest.enforce(form.email).isEmail();
		});
		vest.test('password', 'Password too short', () => {
			vest.enforce(form.password).longerThanOrEquals(8);
		});
		vest.test('password', 'Must contain uppercase', () => {
			vest.enforce(form.password).matches(/[A-Z]/);
		});
	});
	return { suite };
}
