import { describe, test, expect } from 'bun:test';
import { DateTransformer } from '@/transformers/date.transformer';

describe('Transformer Coverage: DateTransformer', () => {
    const transformer = new DateTransformer();
    const className = 'TestClass';
    const propertyKey = 'testProp';

    describe('deserialize', () => {
        test('should return Date instance as-is', () => {
            const date = new Date('2023-01-01');
            const result = transformer.deserialize(date, propertyKey, className);
            expect(result).toBe(date);
        });

        test('should deserialize ISO string', () => {
            const iso = '2023-01-01T12:00:00.000Z';
            const result = transformer.deserialize(iso, propertyKey, className);
            expect(result).toBeInstanceOf(Date);
            expect(result.toISOString()).toBe(iso);
        });

        test('should deserialize numeric timestamp', () => {
            const timestamp = 1672574400000; // 2023-01-01T12:00:00.000Z roughly
            const result = transformer.deserialize(timestamp, propertyKey, className);
            expect(result).toBeInstanceOf(Date);
            expect(result.getTime()).toBe(timestamp);
        });

        test('should throw error for invalid types (boolean)', () => {
            expect(() => {
                // @ts-expect-error - Testing invalid input type
                transformer.deserialize(true, propertyKey, className);
            }).toThrow(/Date transformer ONLY accepts/);
        });

        test('should throw error for invalid types (object)', () => {
            expect(() => {
                // @ts-expect-error - Testing invalid input type
                transformer.deserialize({}, propertyKey, className);
            }).toThrow(/Date transformer ONLY accepts/);
        });

        test('should throw error for invalid date string', () => {
            expect(() => {
                transformer.deserialize('not-a-date', propertyKey, className);
            }).toThrow(/Invalid date value/);
        });

        test('should throw error for invalid date number (NaN)', () => {
            expect(() => {
                transformer.deserialize(Number.NaN, propertyKey, className);
            }).toThrow(/Invalid date value/);
        });
    });

    describe('serialize', () => {
        test('should serialize Date to ISO string', () => {
            const date = new Date('2023-01-01T12:00:00.000Z');
            const result = transformer.serialize(date);
            expect(result).toBe('2023-01-01T12:00:00.000Z');
        });
    });

    describe('validate', () => {
        test('should validate Date instance', () => {
            const result = transformer.validate(new Date(), { propertyKey, target: {} });
            expect(result.isValid).toBe(true);
        });

        test('should validate valid ISO string', () => {
            const result = transformer.validate('2023-01-01T00:00:00.000Z', { propertyKey, target: {} });
            expect(result.isValid).toBe(true);
        });

        test('should validate valid timestamp', () => {
            const result = transformer.validate(1672574400000, { propertyKey, target: {} });
            expect(result.isValid).toBe(true);
        });

        test('should fail validation for invalid string', () => {
            const result = transformer.validate('invalid-date', { propertyKey, target: {} });
            expect(result.isValid).toBe(false);
        });

        test('should fail validation for invalid type', () => {
            const result = transformer.validate({} as any, { propertyKey, target: {} });
            expect(result.isValid).toBe(false);
        });
         
        test('should fail validation for NaN', () => {
             const result = transformer.validate(NaN, { propertyKey, target: {} });
             expect(result.isValid).toBe(false);
        });
    });
});
