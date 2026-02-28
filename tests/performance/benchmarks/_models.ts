/**
 * Modelos, interfaces y datasets compartidos por múltiples benches.
 */

import { QModel, Quick } from '@/index';
import { QRule, QAlias, QField } from '@/decorators';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────

export interface ISimpleUser {
	id: string;
	name: string;
	email: string;
	age: number;
	active: boolean;
}

export interface IComplexUser {
	id: string;
	name: string;
	createdAt: Date;
	balance: bigint;
	tags: Set<string>;
	metadata: Map<string, string>;
}

export interface ISignupForm {
	name: string;
	email: string;
	password: string;
}

export interface IProfileCamel {
	firstName: string;
	lastName: string;
	emailAddress: string;
	isActive: boolean;
}

export interface IOrderItem {
	sku: string;
	qty: number;
}

export interface IOrder {
	id: string;
	total: bigint;
	placedAt: Date;
	customer: { name: string; email: string };
	items: IOrderItem[];
}

export interface ISignupReport {
	name: string;
	email: string;
	password: string;
	age: number;
}

export interface IProductSchema {
	id: number;
	name: string;
	price: number;
	createdAt: Date;
}

// ─────────────────────────────────────────────────────────────
// MODELOS QUICKMODEL
// ─────────────────────────────────────────────────────────────

@Quick()
export class SimpleUser extends QModel<ISimpleUser> {
	declare id: string;
	declare name: string;
	declare email: string;
	declare age: number;
	declare active: boolean;
}

@Quick({ createdAt: Date, balance: 'bigint', tags: Set, metadata: Map })
export class ComplexUser extends QModel<IComplexUser> {
	declare id: string;
	declare name: string;
	declare createdAt: Date;
	declare balance: bigint;
	declare tags: Set<string>;
	declare metadata: Map<string, string>;
}

export class SignupForm {
	@QRule((val: string) => val.length >= 2, 'Name too short')
	declare name: string;

	@QRule((val: string) => /^[^@]+@[^@]+\.[^@]+$/.test(val), 'Invalid email')
	declare email: string;

	@QRule((val: string) => val.length >= 8, 'Password too short')
	@QRule((val: string) => /[A-Z]/.test(val), 'Must contain uppercase')
	declare password: string;
}

@Quick()
export class ApiProfile extends QModel<IProfileCamel> {
	@QAlias('first_name')
	declare firstName: string;

	@QAlias('last_name')
	declare lastName: string;

	@QAlias('email_address')
	declare emailAddress: string;

	@QAlias('is_active')
	declare isActive: boolean;
}

@Quick({ total: 'bigint', placedAt: Date })
export class Order extends QModel<IOrder> {
	declare id: string;
	declare total: bigint;
	declare placedAt: Date;
	declare customer: { name: string; email: string };
	declare items: IOrderItem[];
}

export class AsyncSignupForm {
	@QRule(
		async (val: string) => Promise.resolve(val.length >= 2),
		'Name too short'
	)
	declare name: string;

	@QRule(
		async (val: string) =>
			Promise.resolve(/^[^@]+@[^@]+\.[^@]+$/.test(val)),
		'Invalid email'
	)
	declare email: string;

	@QRule(
		async (val: string) => Promise.resolve(val.length >= 8),
		'Password too short'
	)
	@QRule(
		async (val: string) => Promise.resolve(/[A-Z]/.test(val)),
		'Must contain uppercase'
	)
	declare password: string;
}

@Quick()
export class SignupReportModel extends QModel<ISignupReport> {
	@QRule((val: string) => val.length >= 2, 'Name too short')
	declare name: string;

	@QRule((val: string) => /^[^@]+@[^@]+\.[^@]+$/.test(val), 'Invalid email')
	declare email: string;

	@QRule((val: string) => val.length >= 8, 'Password too short')
	@QRule((val: string) => /[A-Z]/.test(val), 'Needs uppercase')
	declare password: string;

	@QRule((val: number) => val >= 18, 'Must be 18+')
	declare age: number;
}

@Quick({ createdAt: Date })
export class ProductModel extends QModel<IProductSchema> {
	@QField({ label: 'ID', widget: 'number', required: true })
	declare id: number;

	@QField({ label: 'Name', widget: 'text', required: true })
	declare name: string;

	@QField({ label: 'Price', widget: 'number', required: true })
	declare price: number;

	@QField({ label: 'Created At', widget: 'date', required: true })
	declare createdAt: Date;
}

// ─────────────────────────────────────────────────────────────
// CLASES EQUIVALENTES (class-transformer / plain)
// ─────────────────────────────────────────────────────────────

export class CTSimpleUser {
	id!: string;
	name!: string;
	email!: string;
	age!: number;
	active!: boolean;
}

export class CTComplexUser {
	id!: string;
	name!: string;
	createdAt!: Date;
	balance!: string;
	tags!: string[];
	metadata!: [string, string][];
}

export class CTApiProfile {
	first_name!: string;
	last_name!: string;
	email_address!: string;
	is_active!: boolean;
}

export class CTOrder {
	id!: string;
	total!: string;
	placedAt!: string;
	customer!: { name: string; email: string };
	items!: IOrderItem[];
}

// ─────────────────────────────────────────────────────────────
// ZOD SCHEMAS
// ─────────────────────────────────────────────────────────────

export const zodSimpleUser = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	age: z.number(),
	active: z.boolean(),
});

export const zodComplexUser = z.object({
	id: z.string(),
	name: z.string(),
	createdAt: z.coerce.date(),
	balance: z.union([z.bigint(), z.string().transform((val) => BigInt(val))]),
	tags: z.array(z.string()).transform((arr) => new Set(arr)),
	metadata: z
		.array(z.tuple([z.string(), z.string()]))
		.transform((entries) => new Map(entries)),
});

export const zodSignupReportSchema = z.object({
	name: z.string().min(2, 'Name too short'),
	email: z.string().email('Invalid email'),
	password: z
		.string()
		.min(8, 'Password too short')
		.regex(/[A-Z]/, 'Needs uppercase'),
	age: z.number().min(18, 'Must be 18+'),
});

// ─────────────────────────────────────────────────────────────
// DATASETS DE PRUEBA
// ─────────────────────────────────────────────────────────────

export const simpleUserData: ISimpleUser = {
	id: 'usr-001',
	name: 'Alice Wonderland',
	email: 'alice@example.com',
	age: 30,
	active: true,
};

export const complexUserRaw = {
	id: 'usr-002',
	name: 'Bob Builder',
	createdAt: '2024-03-15T10:00:00.000Z',
	balance: '9999999999999999',
	tags: ['typescript', 'nodejs', 'quickmodel'],
	metadata: [
		['role', 'admin'],
		['theme', 'dark'],
		['locale', 'es'],
	] as [string, string][],
};

export const validSignupData: ISignupForm = {
	name: 'Alice Wonderland',
	email: 'alice@example.com',
	password: 'SecurePass123',
};

export const apiProfileSnakeRaw = {
	first_name: 'Alice',
	last_name: 'Wonderland',
	email_address: 'alice@example.com',
	is_active: true,
};

export const orderRaw = {
	id: 'ord-001',
	total: '99999',
	placedAt: '2024-03-15T10:00:00.000Z',
	customer: { name: 'Alice', email: 'alice@example.com' },
	items: [
		{ sku: 'SKU-001', qty: 2 },
		{ sku: 'SKU-002', qty: 1 },
	],
};

export const signupReportRaw = {
	name: 'A',
	email: 'not-an-email',
	password: 'weak',
	age: 16,
};
