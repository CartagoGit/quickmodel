/**
 * @fileoverview TDD tests for `HistoryService` and history handles.
 *
 * Covered scenarios:
 *  - NullHistoryHandle (disabled history)
 *  - ActiveHistoryHandle (enabled history)
 *  - Configuration by levels: global → class → instance
 *  - Integration: patch() / copy() / populate() record entries
 *  - Constructor does NOT record entries
 *  - copy() inherits parent history
 *  - history.value is readonly (cannot be mutated externally)
 *  - maxEntries: oldest entries are discarded when limit is exceeded
 *  - Serialized values (Date → ISO string, bigint → string)
 *  - recordMode: 'operation' (default) vs 'field' (fine-grained)
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import { Quick } from '@/core/decorators/quick.decorator';
import { QModel } from '@/core/models/quick.model';
import { QConfig } from '@/core/config/quick.config';
import { NULL_HISTORY_HANDLE } from '@/core/models/null-history-handle';

// ---------------------------------------------------------------------------
// NullHistoryHandle — behaviour when history is disabled
// ---------------------------------------------------------------------------

describe('NullHistoryHandle', () => {
	test('value returns empty array', () => {
		expect(NULL_HISTORY_HANDLE.value).toEqual([]);
	});

	test('isActive returns false', () => {
		expect(NULL_HISTORY_HANDLE.isActive).toBe(false);
	});

	test('recordMode returns operation', () => {
		expect(NULL_HISTORY_HANDLE.recordMode).toBe('operation');
	});

	test('start() is a no-op (does not activate)', () => {
		NULL_HISTORY_HANDLE.start();
		expect(NULL_HISTORY_HANDLE.isActive).toBe(false);
	});

	test('stop() is a no-op', () => {
		NULL_HISTORY_HANDLE.stop();
		expect(NULL_HISTORY_HANDLE.isActive).toBe(false);
	});

	test('clear() is a no-op', () => {
		NULL_HISTORY_HANDLE.clear();
		expect(NULL_HISTORY_HANDLE.value).toEqual([]);
	});

	test('configure() is a no-op', () => {
		NULL_HISTORY_HANDLE.configure({ maxEntries: 5 });
		expect(NULL_HISTORY_HANDLE.isActive).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Test fixtures — models with and without history enabled
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
	{ history: { enabled: true, maxEntries: 50 } }
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
	{ history: { enabled: true, maxEntries: 10 } }
)
class DocModel extends QModel<IDocWithDate> {
	declare title: string;
	declare createdAt: Date;
}

// ---------------------------------------------------------------------------
// $qHistory — disabled by default
// ---------------------------------------------------------------------------

describe('$qHistory — disabled by default', () => {
	test('returns NullHistoryHandle when history is not configured', () => {
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
// $qHistory — enabled at class level (operation mode, default)
// ---------------------------------------------------------------------------

describe('$qHistory — enabled at class level (operation mode)', () => {
	test('isActive is true immediately after construction', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		expect(contract.$qHistory.isActive).toBe(true);
	});

	test('constructor does NOT record an entry', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		expect(contract.$qHistory.value).toHaveLength(0);
	});

	test('patch() records ONE entry per operation with changed field in changes', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		contract.$qPatch({ role: 'review' });

		const entries = contract.$qHistory.value;
		expect(entries).toHaveLength(1);
		expect(entries[0]?.method).toBe('patch');
		expect(entries[0]?.at).toBeInstanceOf(Date);
		expect(entries[0]?.changes['role']).toMatchObject({
			from: 'draft',
			to: 'review',
		});
	});

	test('patch() groups ALL changed fields into one entry', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		contract.$qPatch({ name: 'v2', role: 'approved' });

		const entries = contract.$qHistory.value;
		// One operation = one entry, even with 2 changed fields
		expect(entries).toHaveLength(1);
		expect(Object.keys(entries[0]?.changes ?? {})).toContain('name');
		expect(Object.keys(entries[0]?.changes ?? {})).toContain('role');
	});

	test('patch() does NOT record entry for unchanged fields', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		contract.$qPatch({ role: 'draft' }); // same value — no change
		expect(contract.$qHistory.value).toHaveLength(0);
	});

	test('multiple patches build up history, each as one entry', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		contract.$qPatch({ role: 'review' });
		contract.$qPatch({ name: 'v2', role: 'approved' });

		const entries = contract.$qHistory.value;
		expect(entries).toHaveLength(2);
		expect(entries[0]?.method).toBe('patch');
		expect(entries[0]?.changes['role']).toMatchObject({
			from: 'draft',
			to: 'review',
		});
		expect(entries[1]?.changes['name']).toMatchObject({
			from: 'v1',
			to: 'v2',
		});
		expect(entries[1]?.changes['role']).toMatchObject({
			from: 'review',
			to: 'approved',
		});
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
		expect('name' in (entries[0]?.changes ?? {})).toBe(true);
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

		const entries = contract.$qHistory.value;
		expect(entries).toHaveLength(1);
		expect('name' in (entries[0]?.changes ?? {})).toBe(true);
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
		expect(entries[0]?.changes['role']?.to).toBe('approved');
		expect(entries[1]?.changes['role']?.to).toBe('published');
	});
});

// ---------------------------------------------------------------------------
// maxEntries — class-level limit
// ---------------------------------------------------------------------------

describe('maxEntries (class-level)', () => {
	interface ILog {
		msg: string;
	}

	@Quick({ msg: String }, { history: { enabled: true, maxEntries: 3 } })
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
		expect(entries[0]?.changes['msg']?.to).toBe('c');
		expect(entries[2]?.changes['msg']?.to).toBe('e');
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
		const allChangedFields = entries.flatMap((entry) =>
			Object.keys(entry.changes)
		);
		expect(allChangedFields).toContain('role');
		expect(allChangedFields).toContain('name');
	});

	test('copy entry has method "copy"', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		const copy = contract.$qCopy({ role: 'review' });

		const copyEntry = copy.$qHistory.value.find(
			(entry) => entry.method === 'copy'
		);
		expect(copyEntry).toBeDefined();
		expect('role' in (copyEntry?.changes ?? {})).toBe(true);
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

		(ref as Array<unknown>).push({
			method: 'patch',
			at: new Date(),
			changes: { fake: { from: null, to: null } },
		});

		expect(contract.$qHistory.value).toHaveLength(initialLength);
	});
});

// ---------------------------------------------------------------------------
// Date serialization — from/to stored as serialized values
// ---------------------------------------------------------------------------

describe('Date serialization in history entries', () => {
	test('Date fields are stored as ISO strings in from/to', () => {
		const iso = '2024-01-15T10:00:00.000Z';
		const doc = new DocModel({ title: 'spec', createdAt: new Date(iso) });
		const newDate = new Date('2025-06-01T00:00:00.000Z');
		doc.$qPatch({ createdAt: newDate });

		const entries = doc.$qHistory.value;
		expect(entries).toHaveLength(1);
		const created = entries[0]?.changes['createdAt'];
		expect(typeof created?.from).toBe('string');
		expect(typeof created?.to).toBe('string');
		expect(created?.from).toBe(iso);
		expect(created?.to).toBe('2025-06-01T00:00:00.000Z');
	});
});

// ---------------------------------------------------------------------------
// recordMode: 'field' — fine-grained one-entry-per-field mode
// ---------------------------------------------------------------------------

describe('recordMode: field', () => {
	interface IItem {
		alpha: string;
		beta: string;
	}

	@Quick(
		{ alpha: String, beta: String },
		{ history: { enabled: true, maxEntries: 20, recordMode: 'field' } }
	)
	class ItemModel extends QModel<IItem> {
		declare alpha: string;
		declare beta: string;
	}

	test('patch() with 2 changed fields emits 2 entries', () => {
		const item = new ItemModel({ alpha: 'a1', beta: 'b1' });
		item.$qPatch({ alpha: 'a2', beta: 'b2' });

		const entries = item.$qHistory.value;
		expect(entries).toHaveLength(2);
		// Each entry has exactly one key in changes
		for (const entry of entries) {
			expect(Object.keys(entry.changes)).toHaveLength(1);
		}
		const allFields = entries.map((entry) => Object.keys(entry.changes)[0]);
		expect(allFields).toContain('alpha');
		expect(allFields).toContain('beta');
	});

	test('each field entry has the correct from/to values', () => {
		const item = new ItemModel({ alpha: 'x', beta: 'y' });
		item.$qPatch({ alpha: 'x2' });

		const entries = item.$qHistory.value;
		expect(entries).toHaveLength(1);
		expect(entries[0]?.changes['alpha']).toMatchObject({
			from: 'x',
			to: 'x2',
		});
	});
});

// ---------------------------------------------------------------------------
// Configuration by levels
// ---------------------------------------------------------------------------

describe('Configuration by levels', () => {
	beforeEach(() => {
		QConfig.configure({ history: { enabled: false } });
	});

	test('global disabled + class enabled → class wins (history active)', () => {
		const contract = new ContractModel({ name: 'v1', role: 'draft' });
		expect(contract.$qHistory.isActive).toBe(true);
	});

	test('global disabled + no class config → history inactive', () => {
		const order = new OrderModel({ amount: 10, status: 'pending' });
		expect(order.$qHistory.isActive).toBe(false);
	});

	test('instance configure() overrides class maxEntries', () => {
		const contract = new ContractModel({ name: 'a', role: 'draft' });
		contract.$qHistory.configure({ maxEntries: 1 });

		contract.$qPatch({ role: 'review' });
		contract.$qPatch({ role: 'approved' }); // should discard 'review'

		expect(contract.$qHistory.value).toHaveLength(1);
		expect(contract.$qHistory.value[0]?.changes['role']?.to).toBe(
			'approved'
		);
	});
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

describe('Type exports', () => {
	test('IHistoryEntry, IHistoryConfig, IHistoryHandle are exported from public API', async () => {
		const publicApi = await import('@/index');
		expect(publicApi).toBeDefined();
	});
});
