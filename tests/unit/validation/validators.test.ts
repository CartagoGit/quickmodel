/**
 * TDD: Built-in validator decorators (@IsEmail, @Min, @Max, …)
 *
 * Tests intentionally fail until `src/core/decorators/validators.ts` is in place.
 */

import { describe, test, expect } from 'bun:test';
import { Quick } from '@/core/decorators/quick.decorator';
import { QModel } from '@/core/models/quick.model';
import { qCheckRules } from '@/core/helpers/q-check-rules';

// Lazy imports — module doesn't exist yet
import {
	IsEmail,
	IsUrl,
	Min,
	Max,
	MinLength,
	MaxLength,
	IsNotEmpty,
	Matches,
	IsInt,
	IsPositive,
	IsNegative,
	IsIn,
	IsUuid,
	IsDateString,
} from '@/core/decorators/validators';

// ────────────────────────────────────────────────────────────────────────────
// @IsEmail
// ────────────────────────────────────────────────────────────────────────────

describe('@IsEmail', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class Form extends QModel<{ email: string }> {
		@IsEmail()
		declare email: string;
	}

	test('valid email passes', () => {
		const frm = new Form({ email: 'user@example.com' });
		expect(frm.$qm.checkRules().valid).toBe(true);
	});

	test('missing @ fails', () => {
		const frm = new Form({ email: 'notanemail' });
		const result = frm.$qm.checkRules();
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.field).toBe('email');
	});

	test('custom message is used', () => {
		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class EmailFrm extends QModel<{ email: string }> {
			@IsEmail('Custom message')
			declare email: string;
		}
		const frm = new EmailFrm({ email: 'bad' });
		expect(frm.$qm.checkRules().errors[0]?.message).toBe('Custom message');
	});
});

// ────────────────────────────────────────────────────────────────────────────
// @IsUrl
// ────────────────────────────────────────────────────────────────────────────

describe('@IsUrl', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class Form extends QModel<{ url: string }> {
		@IsUrl()
		declare url: string;
	}

	test('valid URL passes', () => {
		const frm = new Form({ url: 'https://example.com' });
		expect(frm.$qm.checkRules().valid).toBe(true);
	});

	test('plain string fails', () => {
		const frm = new Form({ url: 'not-a-url' });
		expect(frm.$qm.checkRules().valid).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// @Min / @Max
// ────────────────────────────────────────────────────────────────────────────

describe('@Min', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class Form extends QModel<{ age: number }> {
		@Min(18)
		declare age: number;
	}

	test('value at boundary (18) passes', () => {
		expect(new Form({ age: 18 }).checkRules().valid).toBe(true);
	});

	test('value above (30) passes', () => {
		expect(new Form({ age: 30 }).checkRules().valid).toBe(true);
	});

	test('value below (17) fails', () => {
		const result = new Form({ age: 17 }).checkRules();
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.field).toBe('age');
	});

	test('default error message mentions minimum', () => {
		const result = new Form({ age: 0 }).checkRules();
		expect(result.errors[0]?.message).toContain('18');
	});
});

describe('@Max', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class Form extends QModel<{ score: number }> {
		@Max(100)
		declare score: number;
	}

	test('value at boundary (100) passes', () => {
		expect(new Form({ score: 100 }).checkRules().valid).toBe(true);
	});

	test('value above (101) fails', () => {
		expect(new Form({ score: 101 }).checkRules().valid).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// @MinLength / @MaxLength
// ────────────────────────────────────────────────────────────────────────────

describe('@MinLength', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class Form extends QModel<{ name: string }> {
		@MinLength(3)
		declare name: string;
	}

	test('string with 3 chars passes', () => {
		expect(new Form({ name: 'abc' }).checkRules().valid).toBe(true);
	});

	test('string with 2 chars fails', () => {
		expect(new Form({ name: 'ab' }).checkRules().valid).toBe(false);
	});
});

describe('@MaxLength', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class Form extends QModel<{ tag: string }> {
		@MaxLength(5)
		declare tag: string;
	}

	test('string with 5 chars passes', () => {
		expect(new Form({ tag: 'hello' }).checkRules().valid).toBe(true);
	});

	test('string with 6 chars fails', () => {
		expect(new Form({ tag: 'toolong' }).checkRules().valid).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// @IsNotEmpty
// ────────────────────────────────────────────────────────────────────────────

describe('@IsNotEmpty', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class Form extends QModel<{ slug: string }> {
		@IsNotEmpty()
		declare slug: string;
	}

	test('non-empty string passes', () => {
		expect(new Form({ slug: 'hello' }).checkRules().valid).toBe(true);
	});

	test('empty string fails', () => {
		expect(new Form({ slug: '' }).checkRules().valid).toBe(false);
	});

	test('whitespace-only string fails', () => {
		expect(new Form({ slug: '   ' }).checkRules().valid).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// @Matches
// ────────────────────────────────────────────────────────────────────────────

describe('@Matches', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class Form extends QModel<{ code: string }> {
		@Matches(/^[A-Z]{3}$/)
		declare code: string;
	}

	test('matching string passes', () => {
		expect(new Form({ code: 'ABC' }).checkRules().valid).toBe(true);
	});

	test('non-matching string fails', () => {
		expect(new Form({ code: 'abc' }).checkRules().valid).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// @IsInt
// ────────────────────────────────────────────────────────────────────────────

describe('@IsInt', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class Form extends QModel<{ count: number }> {
		@IsInt()
		declare count: number;
	}

	test('integer passes', () => {
		expect(new Form({ count: 5 }).checkRules().valid).toBe(true);
	});

	test('float fails', () => {
		expect(new Form({ count: 5.5 }).checkRules().valid).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// @IsPositive / @IsNegative
// ────────────────────────────────────────────────────────────────────────────

describe('@IsPositive', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class Form extends QModel<{ qty: number }> {
		@IsPositive()
		declare qty: number;
	}

	test('positive number passes', () => {
		expect(new Form({ qty: 1 }).checkRules().valid).toBe(true);
	});

	test('zero fails', () => {
		expect(new Form({ qty: 0 }).checkRules().valid).toBe(false);
	});

	test('negative fails', () => {
		expect(new Form({ qty: -1 }).checkRules().valid).toBe(false);
	});
});

describe('@IsNegative', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class Form extends QModel<{ delta: number }> {
		@IsNegative()
		declare delta: number;
	}

	test('negative number passes', () => {
		expect(new Form({ delta: -5 }).checkRules().valid).toBe(true);
	});

	test('zero fails', () => {
		expect(new Form({ delta: 0 }).checkRules().valid).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// @IsIn
// ────────────────────────────────────────────────────────────────────────────

describe('@IsIn', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class Form extends QModel<{ role: string }> {
		@IsIn(['admin', 'user', 'guest'])
		declare role: string;
	}

	test('valid value passes', () => {
		expect(new Form({ role: 'admin' }).checkRules().valid).toBe(true);
	});

	test('invalid value fails', () => {
		expect(new Form({ role: 'superuser' }).checkRules().valid).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// @IsUuid
// ────────────────────────────────────────────────────────────────────────────

describe('@IsUuid', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class Form extends QModel<{ uid: string }> {
		@IsUuid()
		declare uid: string;
	}

	test('valid UUID v4 passes', () => {
		expect(
			new Form({
				uid: '550e8400-e29b-41d4-a716-446655440000',
			}).checkRules().valid
		).toBe(true);
	});

	test('plain string fails', () => {
		expect(new Form({ uid: 'not-a-uuid' }).checkRules().valid).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// @IsDateString
// Note: uses a plain class (no QModel) so its string field is NOT auto-converted
// to a Date instance by QuickModel's detectTransformerFromValue ISO heuristic.
// ────────────────────────────────────────────────────────────────────────────

describe('@IsDateString', () => {
	// Plain class: no QModel auto-conversion of ISO strings to Date objects
	class PlainForm {
		@IsDateString()
		dob = '';
		checkRules() {
			return qCheckRules(this);
		}
	}

	test('valid ISO string passes', () => {
		const frm = new PlainForm();
		frm.dob = '2024-01-15T12:00:00Z';
		expect(frm.checkRules().valid).toBe(true);
	});

	test('date-only string passes', () => {
		const frm = new PlainForm();
		frm.dob = '2024-01-15';
		expect(frm.checkRules().valid).toBe(true);
	});

	test('invalid date string fails', () => {
		const frm = new PlainForm();
		frm.dob = 'not-a-date';
		expect(frm.checkRules().valid).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// Composability: multiple validators on same field
// ────────────────────────────────────────────────────────────────────────────

describe('Multiple validators stacked', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class Form extends QModel<{ age: number }> {
		@Min(0)
		@Max(150)
		@IsInt()
		declare age: number;
	}

	test('valid age passes all three validators', () => {
		expect(new Form({ age: 25 }).checkRules().valid).toBe(true);
	});

	test('negative age fails Min', () => {
		const result = new Form({ age: -1 }).checkRules();
		expect(result.valid).toBe(false);
	});

	test('float age fails IsInt', () => {
		const result = new Form({ age: 25.5 }).checkRules();
		expect(result.valid).toBe(false);
	});
});
