import { describe, it, expect, beforeEach } from 'bun:test';
import { ObjectSizeValidator } from '../../../../src/core/services/object-size-validator.service';
import { QModelError } from '../../../../src/core/errors/quickmodel.error';

describe('ObjectSizeValidator', () => {
    let validator: ObjectSizeValidator;
    const CLASS_NAME = 'TestClass';

    beforeEach(() => {
        validator = new ObjectSizeValidator();
    });

    describe('validateArraySize', () => {
        it('should pass validation for array within limit', () => {
            const arr = [1, 2, 3];
            expect(() => validator.validateArraySize('testProp', arr, 5, CLASS_NAME)).not.toThrow();
        });

        it('should throw QModelError when array exceeds limit', () => {
            const arr = [1, 2, 3, 4, 5, 6];
            expect(() => validator.validateArraySize('testProp', arr, 5, CLASS_NAME)).toThrow(QModelError);
            expect(() => validator.validateArraySize('testProp', arr, 5, CLASS_NAME)).toThrow('exceeds maximum allowed limit');
        });

        it('should not throw if value is not an array', () => {
             // Although signature says unknown[], JS might pass something else
             expect(() => validator.validateArraySize('testProp', 'not-array' as any, 5, CLASS_NAME)).not.toThrow();
        });
    });

    describe('validateObjectSize', () => {
        it('should pass validation for keys within limit', () => {
            const keys = ['a', 'b', 'c'];
            expect(() => validator.validateObjectSize(keys, 5, CLASS_NAME)).not.toThrow();
        });

        it('should throw QModelError when keys exceed limit', () => {
            const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
            expect(() => validator.validateObjectSize(keys, 5, CLASS_NAME)).toThrow(QModelError);
             expect(() => validator.validateObjectSize(keys, 5, CLASS_NAME)).toThrow('too many properties');
        });
    });

    describe('validateNestedObjectSize', () => {
        // PROPS_LIMIT is hardcoded to 50000 in source. 
        // We can't easily mock it without refactoring or using magic, so we'll test the logic boundaries if possible
        // or just test it works for small objects and maybe verify it ignores special types.
        
        it('should pass for normal object', () => {
            const obj = { a: 1 };
            expect(() => validator.validateNestedObjectSize('prop', obj, CLASS_NAME)).not.toThrow();
        });

        it('should ignore primitives', () => {
            expect(() => validator.validateNestedObjectSize('prop', 123, CLASS_NAME)).not.toThrow();
            expect(() => validator.validateNestedObjectSize('prop', 'string', CLASS_NAME)).not.toThrow();
            expect(() => validator.validateNestedObjectSize('prop', null, CLASS_NAME)).not.toThrow();
            expect(() => validator.validateNestedObjectSize('prop', undefined, CLASS_NAME)).not.toThrow();
        });

        it('should ignore special types (Date, RegExp, Map, Set)', () => {
            expect(() => validator.validateNestedObjectSize('prop', new Date(), CLASS_NAME)).not.toThrow();
            expect(() => validator.validateNestedObjectSize('prop', /abc/, CLASS_NAME)).not.toThrow();
            expect(() => validator.validateNestedObjectSize('prop', new Map(), CLASS_NAME)).not.toThrow();
            expect(() => validator.validateNestedObjectSize('prop', new Set(), CLASS_NAME)).not.toThrow();
        });

        it('should ignore Arrays (handled by validateArraySize)', () => {
             const massiveArray = new Array(60000).fill(1);
             expect(() => validator.validateNestedObjectSize('prop', massiveArray, CLASS_NAME)).not.toThrow();
        });
    });
});
