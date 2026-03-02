/**
 * Tests: $qSubscribe / $qUnsubscribe / $qSignal
 * QuickModel Observer / Reactive-Signal System
 *
 * These tests follow TDD — they are written BEFORE the implementation.
 * All tests should fail (red) when run against the current codebase,
 * and pass (green) after the implementation is complete.
 */
import { describe, test, expect, mock } from 'bun:test';
import { QModel, Quick } from '@/index';
import type { IQChange, IQObserverFn } from '@/core/types/observer.type';

// ─── Shared test models ────────────────────────────────────────────────────────

interface IUser {
	name: string;
	age: number;
	createdAt: Date;
}

@Quick({ createdAt: Date })
class UserModel extends QModel<IUser> {
	declare name: string;
	declare age: number;
	declare createdAt: Date;
}

interface IScore {
	value: number;
	label: string;
}

@Quick({ value: Number, label: String })
class ScoreModel extends QModel<IScore> {
	declare value: number;
	declare label: string;
}

// ─── $qSubscribe ─────────────────────────────────────────────────────────────

describe('$qSubscribe — basic notifications', () => {
	test('callback is called when a field changes', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		const callback = mock(() => {});

		user.$qSubscribe(callback as unknown as IQObserverFn);
		user.name = 'Bob';

		expect(callback).toHaveBeenCalledTimes(1);
	});

	test('callback receives correct field name', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		let capturedField: string | undefined;

		user.$qSubscribe(({ field }) => {
			capturedField = field;
		});
		user.name = 'Bob';

		expect(capturedField).toBe('name');
	});

	test('callback receives correct prev value', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		let capturedPrev: unknown;

		user.$qSubscribe(({ prev }) => {
			capturedPrev = prev;
		});
		user.name = 'Bob';

		expect(capturedPrev).toBe('Alice');
	});

	test('callback receives correct next value', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		let capturedNext: unknown;

		user.$qSubscribe(({ next }) => {
			capturedNext = next;
		});
		user.name = 'Bob';

		expect(capturedNext).toBe('Bob');
	});

	test('next value is already type-transformed when observer fires', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		let capturedNext: unknown;

		user.$qSubscribe(({ next }) => {
			capturedNext = next;
		});
		// Assign a string — smart setter transforms it to Date
		(user as unknown as Record<string, unknown>).createdAt = '2024-01-15';

		expect(capturedNext).toBeInstanceOf(Date);
	});

	test('multiple changes each trigger the callback once', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		const calls: string[] = [];

		user.$qSubscribe(({ field }) => {
			calls.push(field);
		});
		user.name = 'Bob';
		user.age = 31;
		user.name = 'Charlie';

		expect(calls).toEqual(['name', 'age', 'name']);
	});
});

// ─── $qUnsubscribe / returned unsubscribe ────────────────────────────────────

describe('$qSubscribe — unsubscribe', () => {
	test('returned unsubscribe function stops notifications', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		const callback = mock(() => {});

		const unsub = user.$qSubscribe(callback as unknown as IQObserverFn);
		user.name = 'Bob'; // triggers
		unsub();
		user.name = 'Charlie'; // should NOT trigger

		expect(callback).toHaveBeenCalledTimes(1);
	});

	test('$qUnsubscribe(fn) stops notifications', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		const callback = mock(() => {});

		user.$qSubscribe(callback as unknown as IQObserverFn);
		user.name = 'Bob';
		user.$qUnsubscribe(callback as unknown as IQObserverFn);
		user.name = 'Charlie';

		expect(callback).toHaveBeenCalledTimes(1);
	});

	test('$qUnsubscribe with unknown fn is a no-op', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		// Should not throw
		expect(() => user.$qUnsubscribe(() => {})).not.toThrow();
	});
});

// ─── Multiple observers ───────────────────────────────────────────────────────

describe('$qSubscribe — multiple observers', () => {
	test('all registered observers receive the change', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		const calls: string[] = [];

		user.$qSubscribe(() => calls.push('A'));
		user.$qSubscribe(() => calls.push('B'));
		user.$qSubscribe(() => calls.push('C'));
		user.name = 'Bob';

		expect(calls).toContain('A');
		expect(calls).toContain('B');
		expect(calls).toContain('C');
	});

	test('unsubscribing one observer does not affect others', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		const callsA: number[] = [];
		const callsB: number[] = [];

		const unsubA = user.$qSubscribe(() => callsA.push(1));
		user.$qSubscribe(() => callsB.push(1));

		user.name = 'Bob';
		unsubA();
		user.name = 'Charlie';

		expect(callsA).toHaveLength(1); // only before unsub
		expect(callsB).toHaveLength(2); // both changes
	});
});

// ─── Error isolation ──────────────────────────────────────────────────────────

describe('$qSubscribe — error isolation', () => {
	test('a throwing observer does not break other observers or the setter', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		const callsB: number[] = [];

		user.$qSubscribe(() => {
			throw new Error('observer error');
		});
		user.$qSubscribe(() => callsB.push(1));

		// Setter must complete successfully despite the throwing observer
		expect(() => {
			user.name = 'Bob';
		}).not.toThrow();
		// The value must have been assigned
		expect(user.name).toBe('Bob');
		// Other observers must still be called
		expect(callsB).toHaveLength(1);
	});
});

// ─── Zero-cost guarantee for instances without observers ─────────────────────

describe('$qSubscribe — lazy initialization', () => {
	test('instance without subscribers does not have __quickObservers__ set', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });

		// The internal set must not exist before any subscription
		const internal = user as unknown as Record<string, unknown>;
		expect(internal['__quickObservers__']).toBeUndefined();
	});

	test('instance with subscribers has __quickObservers__ set', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		user.$qSubscribe(() => {});

		const internal = user as unknown as Record<string, unknown>;
		expect(internal['__quickObservers__']).toBeDefined();
	});

	test('after all observers unsubscribe, set is emptied (no memory leak)', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		const unsub = user.$qSubscribe(() => {});
		unsub();

		const internal = user as unknown as Record<string, unknown>;
		const obs = internal['__quickObservers__'] as Set<unknown> | undefined;
		// Set exists but is empty after unsub
		expect(obs?.size ?? 0).toBe(0);
	});
});

// ─── Lifetime and model methods ───────────────────────────────────────────────

describe('$qSubscribe — interaction with model methods', () => {
	test('$qCopy() does NOT carry over observers to the new instance', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		const calls: number[] = [];
		user.$qSubscribe(() => calls.push(1));

		const copy = user.$qCopy({ name: 'Bob' });
		copy.name = 'Carol'; // should NOT notify the original observer

		expect(calls).toHaveLength(0); // observer was on originaluser, not copy
	});

	test('$qReset() triggers a notification for each restored field', () => {
		// Initial state is locked at construction — no $qCommit needed
		const user = new UserModel({ name: 'Alice', age: 30 });
		user.name = 'Bob';
		user.age = 99;

		const fields: string[] = [];
		user.$qSubscribe(({ field }) => fields.push(field));

		user.$qReset();

		// Both name and age were reset — both notifications should fire
		expect(fields).toContain('name');
		expect(fields).toContain('age');
	});
});

// ─── $qSignal ─────────────────────────────────────────────────────────────────

describe('$qSignal', () => {
	test('$qSignal.peek() returns the model instance', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		expect(user.$qSignal.peek()).toBe(user);
	});

	test('$qSignal.version starts at 0', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		expect(user.$qSignal.version).toBe(0);
	});

	test('$qSignal.version increments on each field change', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		user.name = 'Bob';
		expect(user.$qSignal.version).toBe(1);
		user.age = 31;
		expect(user.$qSignal.version).toBe(2);
	});

	test('$qSignal.subscribe(fn) notifies on change', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		const calls: string[] = [];

		user.$qSignal.subscribe(({ field }) => calls.push(field));
		user.name = 'Bob';
		user.age = 99;

		expect(calls).toEqual(['name', 'age']);
	});

	test('$qSignal.subscribe returns a working unsubscribe', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		const calls: number[] = [];

		const unsub = user.$qSignal.subscribe(() => calls.push(1));
		user.name = 'Bob';
		unsub();
		user.name = 'Charlie';

		expect(calls).toHaveLength(1);
	});

	test('$qSignal is the same object instance on repeated access (cached)', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		const sig1 = user.$qSignal;
		const sig2 = user.$qSignal;
		expect(sig1).toBe(sig2);
	});

	test('$qSignal.version still increments even without explicit subscribe', () => {
		// version should track ALL changes, not just those with a subscriber
		const score = new ScoreModel({ value: 10, label: 'low' });
		score.value = 20;
		score.label = 'high';
		expect(score.$qSignal.version).toBe(2);
	});
});

// ─── IQChange type contract ───────────────────────────────────────────────────

describe('IQChange shape', () => {
	test('change object has field, prev, next properties', () => {
		const user = new UserModel({ name: 'Alice', age: 30 });
		let change: IQChange | undefined;

		user.$qSubscribe((evt) => {
			change = evt;
		});
		user.name = 'Bob';

		expect(change).toBeDefined();
		expect(change!).toHaveProperty('field');
		expect(change!).toHaveProperty('prev');
		expect(change!).toHaveProperty('next');
	});

	test('prev is undefined when field was not previously set', () => {
		const score = new ScoreModel({});
		let capturedPrev: unknown = 'NOT_SET';

		score.$qSubscribe(({ prev }) => {
			capturedPrev = prev;
		});
		score.label = 'high';

		expect(capturedPrev).toBeUndefined();
	});
});
