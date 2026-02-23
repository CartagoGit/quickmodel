/**
 * TDD tests for Logger helper covering uncovered branches:
 *  - debug() when logging is enabled (global config + local model config)
 *  - warn() (always-on)
 *  - getName() with string / function / object / fallback
 */

import { describe, test, expect, afterEach, beforeEach, spyOn } from 'bun:test';
import { Logger } from '@/core/helpers/logger.helper';
import { QConfig } from '@/core/config/quick.config';
import { QUICK_OPTIONS_KEY } from '@/core/constants/metadata-keys';
import 'reflect-metadata';

afterEach(() => {
	QConfig.configure({});
});

// ===========================================================================
// warn() — always enabled
// ===========================================================================

describe('Logger.warn()', () => {
	test('should call console.warn when invoked', () => {
		const spy = spyOn(console, 'warn').mockImplementation(() => {});
		Logger.warn('test warning');
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy.mock.calls[0][0]).toContain('[QuickModel]');
		expect(spy.mock.calls[0][0]).toContain('test warning');
		spy.mockRestore();
	});

	test('should prefix with class name when context is a function (constructor)', () => {
		const spy = spyOn(console, 'warn').mockImplementation(() => {});
		class SomeModel {}
		Logger.warn('things went wrong', SomeModel);
		expect(spy.mock.calls[0][0]).toContain('[QuickModel:SomeModel]');
		spy.mockRestore();
	});

	test('should prefix with constructor name when context is an object instance', () => {
		const spy = spyOn(console, 'warn').mockImplementation(() => {});
		class MyService {}
		Logger.warn('watch out', new MyService());
		expect(spy.mock.calls[0][0]).toContain('[QuickModel:MyService]');
		spy.mockRestore();
	});

	test('should prefix with string when context is a plain string', () => {
		const spy = spyOn(console, 'warn').mockImplementation(() => {});
		Logger.warn('something broke', 'UserModule');
		expect(spy.mock.calls[0][0]).toContain('[QuickModel:UserModule]');
		spy.mockRestore();
	});

	test('should pass through additional data arguments', () => {
		const spy = spyOn(console, 'warn').mockImplementation(() => {});
		const extra = { code: 42 };
		Logger.warn('with data', undefined, extra);
		expect(spy).toHaveBeenCalledWith(
			expect.stringContaining('[QuickModel]'),
			extra
		);
		spy.mockRestore();
	});
});

// ===========================================================================
// debug() — only when enabled
// ===========================================================================

describe('Logger.debug()', () => {
	test('should NOT call console.debug when debug is disabled (default)', () => {
		const spy = spyOn(console, 'debug').mockImplementation(() => {});
		Logger.debug('silent message');
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	test('should call console.debug when global enableDebugLogs is true', () => {
		const spy = spyOn(console, 'debug').mockImplementation(() => {});
		QConfig.configure({ defaults: { enableDebugLogs: true } });

		Logger.debug('enabled message');

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy.mock.calls[0][0]).toContain('[QuickModel]');
		expect(spy.mock.calls[0][0]).toContain('enabled message');
		spy.mockRestore();
	});

	test('should include class name in prefix when context is provided and debug is enabled', () => {
		const spy = spyOn(console, 'debug').mockImplementation(() => {});
		QConfig.configure({ defaults: { enableDebugLogs: true } });
		class DebugContext {}

		Logger.debug('class context', DebugContext);

		expect(spy.mock.calls[0][0]).toContain('[QuickModel:DebugContext]');
		spy.mockRestore();
	});

	test('should call console.debug when local model has enableDebugLogs enabled', () => {
		const spy = spyOn(console, 'debug').mockImplementation(() => {});

		// Simulate a class with @Quick({ }, { enableDebugLogs: true }) via reflect-metadata
		class LocalDebugModel {}
		Reflect.defineMetadata(
			QUICK_OPTIONS_KEY,
			{ enableDebugLogs: true },
			LocalDebugModel
		);

		Logger.debug('local context debug', LocalDebugModel);

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy.mock.calls[0][0]).toContain('[QuickModel:LocalDebugModel]');
		spy.mockRestore();
	});

	test('should call console.debug when local model instance has enableDebugLogs enabled', () => {
		const spy = spyOn(console, 'debug').mockImplementation(() => {});

		class LocalModel {}
		Reflect.defineMetadata(
			QUICK_OPTIONS_KEY,
			{ enableDebugLogs: true },
			LocalModel
		);
		const instance = new LocalModel();

		Logger.debug('instance debug', instance);

		expect(spy).toHaveBeenCalledTimes(1);
		spy.mockRestore();
	});

	test('should NOT log when context has no enableDebugLogs metadata', () => {
		// Ensure global debug is explicitly off for this test
		QConfig.configure({ defaults: { enableDebugLogs: false } });
		const spy = spyOn(console, 'debug').mockImplementation(() => {});
		// This class has no QUICK_OPTIONS_KEY metadata
		class NoMetaModel {}
		Logger.debug('should be silent', NoMetaModel);
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	test('should pass additional data when debug is enabled', () => {
		const spy = spyOn(console, 'debug').mockImplementation(() => {});
		QConfig.configure({ defaults: { enableDebugLogs: true } });

		const meta = { key: 'val' };
		Logger.debug('with extra', undefined, meta);

		expect(spy).toHaveBeenCalledWith(
			expect.stringContaining('with extra'),
			meta
		);
		spy.mockRestore();
	});
});

// ===========================================================================
// getName() — exercised via warn/debug with context
// ===========================================================================

describe('Logger getName() branches', () => {
	test('getName via warn: string context returns the string itself', () => {
		const spy = spyOn(console, 'warn').mockImplementation(() => {});
		Logger.warn('msg', 'SomeContextString');
		expect(spy.mock.calls[0][0]).toBe(
			'[QuickModel:SomeContextString] WARN: msg'
		);
		spy.mockRestore();
	});

	test('getName via warn: function context returns function.name', () => {
		const spy = spyOn(console, 'warn').mockImplementation(() => {});
		function MyNamedFunction() {}
		Logger.warn('msg', MyNamedFunction);
		expect(spy.mock.calls[0][0]).toContain('MyNamedFunction');
		spy.mockRestore();
	});

	test('getName via warn: object context returns constructor.name', () => {
		const spy = spyOn(console, 'warn').mockImplementation(() => {});
		class SomeClass {}
		Logger.warn('msg', new SomeClass());
		expect(spy.mock.calls[0][0]).toContain('SomeClass');
		spy.mockRestore();
	});

	test('getName via warn: prototype-less object returns "Unknown"', () => {
		const spy = spyOn(console, 'warn').mockImplementation(() => {});
		// Object.create(null) has no prototype, so context.constructor is undefined
		const noPrototype = Object.create(null) as object;
		Logger.warn('msg', noPrototype);
		expect(spy.mock.calls[0][0]).toContain('Unknown');
		spy.mockRestore();
	});
});

// ===========================================================================
// Logger.globalDebugEnabled — cached config reference
// ===========================================================================

describe('Logger.globalDebugEnabled', () => {
	beforeEach(() => {
		// configure() merges — use reset() to fully clear enableDebugLogs between tests
		QConfig.reset();
	});

	test('returns false by default (debug not configured)', () => {
		expect(Logger.globalDebugEnabled).toBe(false);
	});

	test('returns true when enableDebugLogs is set globally', () => {
		QConfig.configure({ defaults: { enableDebugLogs: true } });
		expect(Logger.globalDebugEnabled).toBe(true);
	});

	test('updates when QConfig is reconfigured (cache invalidation)', () => {
		QConfig.configure({ defaults: { enableDebugLogs: true } });
		expect(Logger.globalDebugEnabled).toBe(true);

		QConfig.reset();
		expect(Logger.globalDebugEnabled).toBe(false);
	});

	test('returns false after toggling back to no debug config', () => {
		QConfig.configure({ defaults: { enableDebugLogs: true } });
		expect(Logger.globalDebugEnabled).toBe(true);

		QConfig.configure({ defaults: { enableDebugLogs: false } });
		expect(Logger.globalDebugEnabled).toBe(false);
	});

	test('is consistent with Logger.debug() not calling console.debug when false', () => {
		const spy = spyOn(console, 'debug').mockImplementation(() => {});
		expect(Logger.globalDebugEnabled).toBe(false);
		Logger.debug('should be silent');
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	test('is consistent with Logger.debug() calling console.debug when true', () => {
		QConfig.configure({ defaults: { enableDebugLogs: true } });
		const spy = spyOn(console, 'debug').mockImplementation(() => {});
		expect(Logger.globalDebugEnabled).toBe(true);
		Logger.debug('should appear');
		expect(spy).toHaveBeenCalledTimes(1);
		spy.mockRestore();
	});
});
