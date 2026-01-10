import { QModel, Quick } from './src/index';

@Quick({ tags: Set })
class Metadata extends QModel<any> {
	declare tags: Set<string>;
}

@Quick({ metadata: Metadata })
class Content extends QModel<any> {
	declare text: string;
	declare metadata: Metadata;
}

const QUICK_TYPE_MAP_KEY = Symbol.for('quick:typeMap');
console.log('Metadata typeMap:', Reflect.getMetadata(QUICK_TYPE_MAP_KEY, Metadata));
console.log('Content typeMap:', Reflect.getMetadata(QUICK_TYPE_MAP_KEY, Content));
