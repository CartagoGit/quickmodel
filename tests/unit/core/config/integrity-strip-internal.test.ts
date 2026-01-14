import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';
import { QConfig } from '@/core/config/quick.config';

describe('Integrity: Strip Internal Identifiers', () => {
	beforeEach(() => {
		QConfig.configure({
			defaults: {
				stripInternalIdentifiers: undefined,
			},
		});
	});

	it('should allow internal identifiers by default (undefined)', () => {
		@Quick()
		class User extends QModel<any> {
			declare _internal: string;
			declare $meta: string;
			declare visible: string;
		}

		const user = User.create({
			_internal: 'secret',
			$meta: 'data',
			visible: 'ok',
		});

		expect((user as any)._internal).toBe('secret');
		expect((user as any).$meta).toBe('data');
		expect(user.visible).toBe('ok');
	});

	it('should strip internal identifiers when enabled globally (true)', () => {
		QConfig.configure({ defaults: { stripInternalIdentifiers: true } });

		@Quick()
		class User extends QModel<any> {
			declare _internal: string;
			declare $meta: string;
			declare visible: string;
		}

		const user = User.create({
			_internal: 'secret',
			$meta: 'data',
			visible: 'ok',
		});

		expect((user as any)._internal).toBeUndefined();
		expect((user as any).$meta).toBeUndefined();
		expect(user.visible).toBe('ok');
	});

	it('should strip custom prefixes when configured globally', () => {
		QConfig.configure({ defaults: { stripInternalIdentifiers: ['__', 'internal_'] } });

		@Quick()
		class User extends QModel<any> {
			declare __hidden: string;
			declare internal_code: string;
			declare _allowed: string; // should be kept because only __ and internal_ are stripped
		}

		const user = User.create({
			__hidden: 'hide me',
			internal_code: 'hide me too',
			_allowed: 'keep me',
		});

		expect((user as any).__hidden).toBeUndefined();
		expect((user as any).internal_code).toBeUndefined();
		expect((user as any)._allowed).toBe('keep me');
	});

	it('should override global config via decorator', () => {
		QConfig.configure({ defaults: { stripInternalIdentifiers: true } });

		// Disable stripping for this model
		@Quick({}, { stripInternalIdentifiers: false })
		class User extends QModel<any> {
			declare _internal: string;
		}

		const user = User.create({ _internal: 'kept' });
		expect((user as any)._internal).toBe('kept');
	});

    it('should allow custom stripping via decorator', () => {
        @Quick({}, { stripInternalIdentifiers: ['ugly_'] })
        class User extends QModel<any> {
            declare ugly_field: string;
            declare _normal: string;
        }

        const user = User.create({
            ugly_field: 'gone',
            _normal: 'kept'
        });

        expect((user as any).ugly_field).toBeUndefined();
        expect((user as any)._normal).toBe('kept');
    });
});
