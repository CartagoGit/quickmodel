/**
 * Unit Test: Error Transformer
 * 
 * Tests serialization and deserialization of Error objects
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, QInterface } from '../../../src';

describe('Unit: Error Transformer', () => {
	interface IErrorLog {
		error: string; // Error serializado como string del backend
	}

	interface IErrorLogTransform {
		error: Error; // Transformado a Error en la clase
	}

	@Quick({ error: Error })
	class ErrorLog extends QModel<IErrorLog> implements QInterface<IErrorLog, IErrorLogTransform> {
		error!: Error;
	}

	test('Should serialize simple error', () => {
		const error = new Error('Test error');
		const model = new ErrorLog({ error: error.toString() });
		
		const json = model.toJSON();
		const parsed = JSON.parse(json);
		
		expect(typeof parsed.error).toBe('string');
	});

	test('Should deserialize simple error', () => {
		const model = ErrorLog.deserialize({ error: 'Error: Test error' });
		
		expect(model.error).toBeInstanceOf(Error);
		expect(model.error.message).toBe('Test error');
	});

	test('Should handle error with message', () => {
		const error = new Error('Something went wrong');
		const model = new ErrorLog({ error: error.toString() });
		const deserialized = ErrorLog.fromJSON(model.toJSON());
		
		expect(deserialized.error.message).toBe('Something went wrong');
	});

	test('Should handle TypeError', () => {
		const error = new TypeError('Invalid type');
		const model = new ErrorLog({ error: error.toString() });
		const deserialized = ErrorLog.fromJSON(model.toJSON());
		
		expect(deserialized.error).toBeInstanceOf(Error);
		expect(deserialized.error.message).toContain('Invalid type');
	});

	test('Should handle RangeError', () => {
		const error = new RangeError('Out of range');
		const model = new ErrorLog({ error: error.toString() });
		const deserialized = ErrorLog.fromJSON(model.toJSON());
		
		expect(deserialized.error).toBeInstanceOf(Error);
		expect(deserialized.error.message).toContain('Out of range');
	});

	test('Should handle error with multiline message', () => {
		const error = new Error('Line 1\nLine 2\nLine 3');
		const model = new ErrorLog({ error: error.toString() });
		const deserialized = ErrorLog.fromJSON(model.toJSON());
		
		expect(deserialized.error.message).toContain('Line 1');
		expect(deserialized.error.message).toContain('Line 2');
	});

	test('Should handle empty error message', () => {
		const error = new Error();
		const model = new ErrorLog({ error: error.toString() });
		const deserialized = ErrorLog.fromJSON(model.toJSON());
		
		expect(deserialized.error).toBeInstanceOf(Error);
	});

	test('Should preserve error name in message', () => {
		class CustomError extends Error {
			constructor(message: string) {
				super(message);
				this.name = 'CustomError';
			}
		}
		
		const error = new CustomError('Custom error occurred');
		const model = new ErrorLog({ error: error.toString() });
		const deserialized = ErrorLog.fromJSON(model.toJSON());
		
		expect(deserialized.error.message).toContain('Custom error occurred');
	});
});
