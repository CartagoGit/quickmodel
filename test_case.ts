import { CaseHelper } from './src/core/helpers/case.helper';
console.log(CaseHelper.toCase('snake_case', 'userId'));
console.log(CaseHelper.toCase('snake_case', 'user_id'));
console.log(CaseHelper.toCase('camelCase', 'user_id'));
