import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';
import { QConfig } from '@/core/config/quick.config';

describe('Transformation: Normalization', () => {
    beforeEach(() => {
        QConfig.configure({
            defaults: {
                normalization: {
                    trimStrings: undefined,
                    emptyStringAsNull: undefined
                }
            }
        });
    });

    it('should NOT normalize by default', () => {
        @Quick({ name: String })
        class User extends QModel<any> {
            declare name: string;
        }

        const user = User.create({ name: '  john  ' });
        expect(user.name).toBe('  john  ');
    });

    it('should trim strings when enabled globally', () => {
        QConfig.configure({ defaults: { normalization: { trimStrings: true } } });

        @Quick({ name: String })
        class User extends QModel<any> {
            declare name: string;
        }

        const user = User.create({ name: '  john  ' });
        expect(user.name).toBe('john');
    });

    it('should convert empty strings to null when enabled globally', () => {
        QConfig.configure({ defaults: { normalization: { emptyStringAsNull: true } } });

        @Quick({ name: String, optional: String }) // String transformer handles null? Usually primitive transformer allows null?
        // Primitive transformer typically returns the value if it handles design type.
        // We need to check if default handling allows null.
        class User extends QModel<any> {
            declare name: string | null;
            declare optional: string | null;
        }

        const user = User.create({ name: '', optional: '  ' });
        expect(user.name).toBeNull();
        expect(user.optional).toBe('  '); // Not trimmed
    });

    it('should combine trim and emptyStringAsNull', () => {
        QConfig.configure({
            defaults: { 
                normalization: { 
                    trimStrings: true, 
                    emptyStringAsNull: true 
                } 
            }
        });

        @Quick({ name: String })
        class User extends QModel<any> {
            declare name: string | null;
        }

        const user = User.create({ name: '   ' }); // Trim -> "" -> null
        expect(user.name).toBeNull();
    });

    it('should override global settings via decorator', () => {
        QConfig.configure({ defaults: { normalization: { trimStrings: true } } });

        @Quick({}, { normalization: { trimStrings: false } })
        class User extends QModel<any> {
            declare name: string;
        }

        const user = User.create({ name: '  john  ' });
        expect(user.name).toBe('  john  ');
    });
});
