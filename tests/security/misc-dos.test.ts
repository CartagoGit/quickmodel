import { describe, test, expect } from 'bun:test';
import { SymbolTransformer } from '../../src/transformers/symbol.transformer';
import { ErrorTransformer } from '../../src/transformers/error.transformer';

describe('Misc Transformers Security (DoS Prevention)', () => {
    test('SymbolTransformer should reject massive strings (Registry DoS)', () => {
        const transformer = new SymbolTransformer();
        const massiveKey = 'a'.repeat(5000);

        expect(() => {
            transformer.deserialize(massiveKey, 'id', 'Entity');
        }).toThrow('Symbol description too long');
    });

    test('ErrorTransformer should reject massive strings (Memory/CPU DoS)', () => {
        const transformer = new ErrorTransformer();
        const massiveMessage = 'Error: ' + 'a'.repeat(5000);

        expect(() => {
            transformer.deserialize(massiveMessage, 'lastError', 'Request');
        }).toThrow('Error message too long');
    });
});
