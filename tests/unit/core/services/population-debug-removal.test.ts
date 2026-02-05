/**
 * TDD Test: PopulationService debug code removal
 *
 * Este test verifica que NO hay console.log en código de producción.
 * DEBE FALLAR primero (porque console.log existe actualmente en líneas 194, 199)
 */

import { describe, test, expect } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { Logger } from '@/core/helpers/logger.helper';

describe('PopulationService: Debug Code Removal', () => {
	test('should NOT contain console.log in production code', () => {
		const filePath = path.join(
			process.cwd(),
			'src/core/services/population.service.ts'
		);
		const fileContent = fs.readFileSync(filePath, 'utf-8');

		// Este test DEBE fallar primero (TDD Red phase)
		const consoleLogMatches = fileContent.match(/console\.log\(/g);

		if (consoleLogMatches) {
			throw new Error(
				`Found ${consoleLogMatches.length} console.log statement(s) in production code:\n` +
					`File: ${filePath}\n` +
					`Use Logger.debug() instead for debug output.`
			);
		}

		expect(consoleLogMatches).toBeNull();
	});

	test('should use Logger.debug() for debug output instead', () => {
		const filePath = path.join(
			process.cwd(),
			'src/core/services/population.service.ts'
		);
		const fileContent = fs.readFileSync(filePath, 'utf-8');

		// Verificar que Logger está importado
		expect(fileContent).toMatch(/import.*Logger.*from/);

		// Verificar que se usa Logger.debug() para debug output
		const hasLoggerDebug = fileContent.includes('Logger.debug(');

		// Si no hay Logger.debug, es aceptable si no hay console.log tampoco
		// Pero si había console.log (que sabemos que existe), DEBE haber Logger.debug
		const hasConsoleLogs = fileContent.includes('console.log(');

		if (hasConsoleLogs) {
			expect(hasLoggerDebug).toBe(true);
		}
	});

	test('should import Logger helper correctly', () => {
		const filePath = path.join(
			process.cwd(),
			'src/core/services/population.service.ts'
		);
		const fileContent = fs.readFileSync(filePath, 'utf-8');

		// Verificar import correcto
		const hasLoggerImport =
			fileContent.includes("from '@/core/helpers/logger.helper") ||
			fileContent.includes("from '../helpers/logger.helper");

		// Solo requerido si se usa Logger.debug
		if (fileContent.includes('Logger.debug(')) {
			expect(hasLoggerImport).toBe(true);
		}
	});
});

describe('Logger.debug() functionality', () => {
	test('should not throw when called (basic smoke test)', () => {
		// Solo verificar que Logger.debug no lanza errores
		expect(() => {
			Logger.debug('Test message');
			Logger.debug('Test with context', {
				constructor: { name: 'Test' },
			});
		}).not.toThrow();
	});
});
