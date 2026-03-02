/**
 * Integration tests for examples/computed.md
 * Validates that @QComputed fields appear in $qSerialize() but not-decorated getters are excluded.
 */
import { describe, it, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QComputed } from '@/decorators';

// ─── Models from computed.md ──────────────────────────────────────────────────

interface IUserComputed {
	firstName: string;
	lastName: string;
	salary: number;
	currency: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class UserComputed extends QModel<IUserComputed> {
	declare firstName: string;
	declare lastName: string;
	declare salary: number;
	declare currency: string;

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	@QComputed()
	get formattedSalary(): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: this.currency,
		}).format(this.salary);
	}

	// NOT decorated — should not appear in serialize
	get initials(): string {
		return `${this.firstName[0] ?? ''}.${this.lastName[0] ?? ''}.`;
	}
}

interface IProduct {
	name: string;
	priceNet: number;
	vatRate: number;
	discountRate: number;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class Product extends QModel<IProduct> {
	declare name: string;
	declare priceNet: number;
	declare vatRate: number;
	declare discountRate: number;

	@QComputed()
	get vatAmount(): number {
		return Number((this.priceNet * (this.vatRate / 100)).toFixed(2));
	}

	@QComputed()
	get priceGross(): number {
		return Number((this.priceNet + this.vatAmount).toFixed(2));
	}

	@QComputed()
	get discount(): number {
		return Number((this.priceGross * (this.discountRate / 100)).toFixed(2));
	}

	@QComputed()
	get finalPrice(): number {
		return Number((this.priceGross - this.discount).toFixed(2));
	}

	@QComputed()
	get priceLabel(): string {
		return this.discountRate > 0
			? `$${this.finalPrice} (was $${this.priceGross})`
			: `$${this.priceGross}`;
	}
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: computed fields example (examples/computed.md)', () => {
	describe('UserComputed — @QComputed appears in serialize', () => {
		const user = UserComputed.create({
			firstName: 'Alice',
			lastName: 'Smith',
			salary: 75000,
			currency: 'USD',
		});

		it('fullName is accessible on instance', () => {
			expect(user.fullName).toBe('Alice Smith');
		});

		it('initials (not decorated) is accessible on instance', () => {
			expect(user.initials).toBe('A.S.');
		});

		it('formattedSalary is accessible on instance', () => {
			expect(user.formattedSalary).toContain('75,000');
		});

		it('$qSerialize() includes fullName', () => {
			const plain = user.$qSerialize();
			expect(plain['fullName']).toBe('Alice Smith');
		});

		it('$qSerialize() includes formattedSalary', () => {
			const plain = user.$qSerialize();
			expect(plain['formattedSalary']).toContain('75,000');
		});

		it('$qSerialize() does NOT include initials (not decorated)', () => {
			const plain = user.$qSerialize();
			expect(plain['initials']).toBeUndefined();
		});
	});

	describe('Product — computed chain: vatAmount → priceGross → finalPrice', () => {
		const product = Product.create({
			name: 'Pro Laptop',
			priceNet: 1000,
			vatRate: 20,
			discountRate: 10,
		});

		it('vatAmount = priceNet * vatRate / 100', () => {
			expect(product.vatAmount).toBe(200);
		});

		it('priceGross = priceNet + vatAmount', () => {
			expect(product.priceGross).toBe(1200);
		});

		it('discount = priceGross * discountRate / 100', () => {
			expect(product.discount).toBe(120);
		});

		it('finalPrice = priceGross - discount', () => {
			expect(product.finalPrice).toBe(1080);
		});

		it('$qSerialize() includes all computed fields', () => {
			const plain = product.$qSerialize();
			expect(plain['vatAmount']).toBe(200);
			expect(plain['priceGross']).toBe(1200);
			expect(plain['finalPrice']).toBe(1080);
		});

		it('priceLabel includes "was" when discount > 0', () => {
			expect(product.priceLabel).toContain('was');
		});

		it('priceLabel has no "was" when discountRate = 0', () => {
			const noDiscount = Product.create({
				name: 'Basic',
				priceNet: 100,
				vatRate: 10,
				discountRate: 0,
			});
			expect(noDiscount.priceLabel).not.toContain('was');
		});
	});
});
