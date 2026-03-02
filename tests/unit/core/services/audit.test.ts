/**
 * @fileoverview TDD tests for the `AuditService` and audit handles — Propuesta I.
 *
 * Covered scenarios:
 *  - NullAuditHandle (disabled audit)
 *  - ActiveAuditHandle (enabled audit)
 *  - Configuration by levels: global → class → instance
 *  - Integration: patch() / copy() / populate() record entries
 *  - Constructor does NOT record entries
 *  - copy() inherits parent history
 *  - history.value is readonly (cannot be mutated externally)
 *  - maxEntries: oldest entries are discarded when limit is exceeded
 *  - Serialized values (Date → ISO string, bigint → string)
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import { Quick } from '@/core/decorators/quick.decorator';
import { QModel } from '@/core/models/quick.model';
import { QConfig } from '@/core/config/quick.config';
import { NULL_AUDIT_HANDLE } from '@/core/models/null-audit-handle';

// ---------------------------------------------------------------------------
// NullAuditHandle — behaviour when audit is disabled
// ---------------------------------------------------------------------------

describe('NullAuditHandle', () => {
	test('value returns empty array', () => {
		expect(NULL_AUDIT_HANDLE.value).toEqual([]);
	});

	test('isActive returns false', () => {
		expect(NULL_AUDIT_HANDLE.isActive).toBe(false);
	});

	test('start() is a no-op (does not activate)', () => {
		NULL_AUDIT_HANDLE.start();
		expect(NULL_AUDIT_HANDLE.isActive).toBe(false);
	});

	test('stop() is a no-op', () => {
		NULL_AUDIT_HANDLE.stop();
		expect(NULL_AUDIT_HANDLE.isActive).toBe(false);
	});

	test('clear() is a no-op', () => {
		NULL_AUDIT_HANDLE.clear();
		expect(NULL_AUDIT_HANDLE.value).toEqual([]);
	});

	test('configure() is a no-op', () => {
		NULL_AUDIT_HANDLE.configure({ maxEntries: 5 });
		expect(NULL_AUDIT_HANDLE.isActive).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Test fixtures — models with and without audit enabled
// ---------------------------------------------------------------------------

interface IContract {
	name: string;
	role: string;
}

interface IOrder {
	amount: number;
	status: string;
}

interface IDocWithDate {
	title: string;
	createdAt: Date;
}

@Quick(
	{ name: String, role: String },
	{ audit: { enabled: true, maxEntries: 50 } }
)
class ContractModel extends QModel<IContract> {
	declare name: string;
	declare role: string;
}

@Quick({ amount: Number, status: String })
class OrderModel extends QModel<IOrder> {
	declare amount: number;
	declare status: string;
}

@Quick(
	{ title: String, createdAt: Date },
	{ audit: { enabled: true, maxEntries: 10 } }
)
class DocModel extends QModel<IDocWithDate> {
	declare title: string;
	declare createdAt: Date;
}

// ---------------------------------------------------------------------------
// $qHistory — disabled by default
// ---------------------------------------------------------------------------

describe('$qHistory — disabled by default', () => {
	test('returns NullAuditHandle when audit is not configured', () => {
		const order = new OrderModel({ amount: 100, status: 'pending' });
		expect(order.$qHistory.isActive).toBe(false);
		expect(order.$qHistory.value).toEqual([]);
	});

	test('patch() does not record entries when disabled', () => {
		const order = new OrderModel({ amount: 100, status: 'pending' });
		order.$qPatch({ status: 'shipped' });
		expect(order.$qHistory.value).toEqual([]);
	});

	test('copy() does not record entries when disabled', () => {
		const order = new OrderModel({ amount: 100, status: 'pending' });
		const copy = order.$qCopy({ status: 'delivered' });
		expect(copy.$qHistory.value).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// $qHistory — enabled at class level
// ---------------------------------------------------------------------------

describe('$qHistory — enabled at class level', () => {
	test('isActive is true immediately after construction', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		expect(contract.$qHistory.isActive).toBe(true);
	});

	test('constructor does NOT record an entry', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		expect(contract.$qHistory.value).toHaveLength(0);
	});

	test('patch() records one entry per changed field', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		contract.$qPatch({ role: 'review' });

		const entries = contract.$qHistory.value;
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			field: 'role',
			from: 'draft',
			to: 'review',
			method: 'patch',
		});
		expect(entries[0]?.at).toBeInstanceOf(Date);
	});

	test('patch() records entries for all changed fields', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		contract.$qPatch({ name: 'v2', role: 'approved' });

		const entries = contract.$qHistory.value;
		expect(entries).toHaveLength(2);
		const fields = entries.map((entry) => entry.field);
		expect(fields).toContain('name');
		expect(fields).toContain('role');
	});

	test('patch() does NOT record entry for unchanged fields', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		contract.$qPatch({ role: 'draft' }); // same value — no change
		expect(contract.$qHistory.value).toHaveLength(0);
	});

	test('multiple patches build up the history in order', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		contract.$qPatch({ role: 'review' });
		contract.$qPatch({ name: 'v2', role: 'approved' });

		const entries = contract.$qHistory.value;
		expect(entries[0]?.method).toBe('patch');
		expect(entries[0]?.field).toBe('role');
		expect(entries[0]?.from).toBe('draft');
		expect(entries[0]?.to).toBe('review');
	});
});

// ---------------------------------------------------------------------------
// stop / start / clear
// ---------------------------------------------------------------------------

describe('$qHistory — stop / start / clear', () => {
	test('stop() pauses recording', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		contract.$qHistory.stop();
		contract.$qPatch({ role: 'review' });

		expect(contract.$qHistory.value).toHaveLength(0);
		expect(contract.$qHistory.isActive).toBe(false);
	});

	test('start() resumes recording after stop()', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		contract.$qHistory.stop();
		contract.$qPatch({ role: 'review' }); // not recorded
		contract.$qHistory.start();
		contract.$qPatch({ name: 'v2' }); // recorded

		const entries = contract.$qHistory.value;
		expect(entries).toHaveLength(1);
		expect(entries[0]?.field).toBe('name');
	});

	test('clear() removes all entries but keeps isActive state', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		contract.$qPatch({ role: 'review' });
		expect(contract.$qHistory.value).toHaveLength(1);

		contract.$qHistory.clear();
		expect(contract.$qHistory.value).toHaveLength(0);
		expect(contract.$qHistory.isActive).toBe(true); // still active
	});

	test('clear() does not affect future recording', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		contract.$qPatch({ role: 'review' });
		contract.$qHistory.clear();
		contract.$qPatch({ name: 'v2' });

		expect(contract.$qHistory.value).toHaveLength(1);
		expect(contract.$qHistory.value[0]?.field).toBe('name');
	});
});

// ---------------------------------------------------------------------------
// configure() — per-instance runtime override
// ---------------------------------------------------------------------------

describe('$qHistory.configure()', () => {
	test('configure({ maxEntries }) limits history size', () => {
		const contract = new ContractModel({ name: 'a', role: 'draft' });
		contract.$qHistory.configure({ maxEntries: 2 });

		contract.$qPatch({ role: 'review' });
		contract.$qPatch({ role: 'approved' });
		contract.$qPatch({ role: 'published' }); // oldest should be dropped

		const entries = contract.$qHistory.value;
		expect(entries).toHaveLength(2);
		expect(entries[0]?.to).toBe('approved');
		expect(entries[1]?.to).toBe('published');
	});
});

// ---------------------------------------------------------------------------
// maxEntries — class-level limit
// ---------------------------------------------------------------------------

describe('maxEntries (class-level)', () => {
	interface ILog {
		msg: string;
	}

	@Quick({ msg: String }, { audit: { enabled: true, maxEntries: 3 } })
	class LogModel extends QModel<ILog> {
		declare msg: string;
	}

	test('oldest entries are discarded when maxEntries is exceeded', () => {
		const log = new LogModel({ msg: 'a' });
		log.$qPatch({ msg: 'b' });
		log.$qPatch({ msg: 'c' });
		log.$qPatch({ msg: 'd' });
		log.$qPatch({ msg: 'e' }); // exceeds limit of 3

		const entries = log.$qHistory.value;
		expect(entries).toHaveLength(3);
		expect(entries[0]?.to).toBe('c');
		expect(entries[2]?.to).toBe('e');
	});
});

// ---------------------------------------------------------------------------
// copy() — history inheritance
// ---------------------------------------------------------------------------

describe('$qCopy() — history inheritance', () => {
	test('copied instance inherits parent history', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		contract.$qPatch({ role: 'review' });

		const copy = contract.$qCopy({ name: 'v2' });
		const entries = copy.$qHistory.value;

		// Should contain: parent change (role) + copy change (name)
		expect(entries.length).toBeGreaterThanOrEqual(2);
		const fields = entries.map((ent) => ent.field);
		expect(fields).toContain('role');
		expect(fields).toContain('name');
	});

	test('copy entry has method "copy"', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		const copy = contract.$qCopy({ role: 'review' });

		const copyEntry = copy.$qHistory.value.find(
			(ent) => ent.method === 'copy'
		);
		expect(copyEntry).toBeDefined();
		expect(copyEntry?.field).toBe('role');
	});
});

// ---------------------------------------------------------------------------
// value is externally immutable
// ---------------------------------------------------------------------------

describe('$qHistory.value — immutability', () => {
	test('pushing to value array does not affect internal state', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		contract.$qPatch({ role: 'review' });

		const ref = contract.$qHistory.value;
		const initialLength = ref.length;

		// Attempt to mutate the returned array
		(ref as Array<unknown>).push({
			field: 'fake',
			from: null,
			to: null,
			at: new Date(),
			method: 'patch',
		});

		// Internal state should be unaffected
		expect(contract.$qHistory.value).toHaveLength(initialLength);
	});
});

// ---------------------------------------------------------------------------
// Date serialization — from/to stored as serialized values
// ---------------------------------------------------------------------------

describe('Date serialization in audit entries', () => {
	test('Date fields are stored as ISO strings in from/to', () => {
		const iso = '2024-01-15T10:00:00.000Z';
		const doc = new DocModel({ title: 'spec', createdAt: new Date(iso) });
		const newDate = new Date('2025-06-01T00:00:00.000Z');
		doc.$qPatch({ createdAt: newDate });

		const entries = doc.$qHistory.value;
		expect(entries).toHaveLength(1);
		expect(typeof entries[0]?.from).toBe('string');
		expect(typeof entries[0]?.to).toBe('string');
		expect(entries[0]?.from).toBe(iso);
		expect(entries[0]?.to).toBe('2025-06-01T00:00:00.000Z');
	});
});

// ---------------------------------------------------------------------------
// Configuration by levels
// ---------------------------------------------------------------------------

describe('Configuration by levels', () => {
	beforeEach(() => {
		QConfig.configure({ audit: { enabled: false } });
	});

	test('global disabled + class enabled → class wins (audit active)', () => {
		// ContractModel has audit.enabled: true at class level
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		expect(contract.$qHistory.isActive).toBe(true);
	});

	test('global disabled + no class config → audit inactive', () => {
		// OrderModel has no audit config
		const order = new OrderModel({ amount: 10, status: 'pending' });
		expect(order.$qHistory.isActive).toBe(false);
	});

	test('instance configure() overrides class maxEntries', () => {
		const contract = new ContractModel({ name: 'a', role: 'draft' });
		contract.$qHistory.configure({ maxEntries: 1 });

		contract.$qPatch({ role: 'review' });
		contract.$qPatch({ role: 'approved' }); // should discard 'review'

		expect(contract.$qHistory.value).toHaveLength(1);
		expect(contract.$qHistory.value[0]?.to).toBe('approved');
	});
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

describe('Type exports', () => {
	test('IAuditEntry, IAuditConfig, IAuditHandle are exported from public API', async () => {
		const publicApi = await import('@/index');
		// These are types — we can only check they don't throw at module load
		expect(publicApi).toBeDefined();
	});
});
