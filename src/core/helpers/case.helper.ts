import { CaseType } from '../types/case.type';

export class CaseHelper {
	/**
	 * Converts a string to the specified case format.
	 */
	static toCase(format: CaseType, str: string): string {
		if (!str) return str;

		// normalize to space separated first
		const words = str
			.replace(/([a-z])([A-Z])/g, '$1 $2') // split camelCase
			.replace(/[_-]+/g, ' ') // split snake_case/kebab-case
			.toLowerCase()
			.split(' ')
			.filter(Boolean);

		switch (format) {
			case 'snake_case':
				return words.join('_');
			case 'kebab-case':
				return words.join('-');
			case 'camelCase':
				return words
					.map((word, i) =>
						i === 0
							? word
							: word.charAt(0).toUpperCase() + word.slice(1)
					)
					.join('');
			case 'PascalCase':
				return words
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join('');
			default:
				return str;
		}
	}
}
