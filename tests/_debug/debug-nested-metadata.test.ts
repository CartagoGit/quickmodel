import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import 'reflect-metadata';

describe('Debug Nested Model with Arrays', () => {
	interface IMetadata {
		tags: string[];
		dates: string[];
	}

	interface IContent {
		text: string;
		metadata: IMetadata;
	}

	@Quick({
		tags: Set,
		dates: [Date],
	})
	class Metadata extends QModel<IMetadata> {
		declare tags: Set<string>;
		declare dates: Date[];
	}

	@Quick({ metadata: Metadata })
	class Content extends QModel<IContent> {
		declare text: string;
		declare metadata: Metadata;
	}

	test('Single Content → Metadata → (Set, Date[])', () => {
		console.log('\n===== Creating single Content =====');
		const content = new Content({
			text: 'Test',
			metadata: {
				tags: ['tag1', 'tag2'],
				dates: ['2026-01-01T00:00:00.000Z'],
			},
		});

		console.log('\ncontent.metadata:', content.metadata);
		console.log(
			'content.metadata instanceof Metadata:',
			content.metadata instanceof Metadata
		);
		console.log('content.metadata.tags:', content.metadata.tags);
		console.log(
			'content.metadata.tags instanceof Set:',
			content.metadata.tags instanceof Set
		);
		console.log('content.metadata.dates:', content.metadata.dates);
		console.log('content.metadata.dates[0]:', content.metadata.dates[0]);
		console.log(
			'content.metadata.dates[0] instanceof Date:',
			content.metadata.dates[0] instanceof Date
		);

		expect(content.metadata).toBeInstanceOf(Metadata);
		expect(content.metadata.tags).toBeInstanceOf(Set);
		expect(content.metadata.dates[0]).toBeInstanceOf(Date);
	});

	@Quick({ items: [Content] })
	class Container extends QModel<{ items: IContent[] }> {
		declare items: Content[];
	}

	test('Container → Content[] → Metadata → (Set, Date[])', () => {
		console.log('\n===== Creating Container with Content[] =====');
		const container = new Container({
			items: [
				{
					text: 'Content 1',
					metadata: {
						tags: ['tag1', 'tag2'],
						dates: ['2026-01-01T00:00:00.000Z'],
					},
				},
			],
		});

		console.log('\ncontainer.items:', container.items);
		console.log('container.items[0]:', container.items[0]);
		console.log(
			'container.items[0] instanceof Content:',
			container.items[0] instanceof Content
		);
		console.log(
			'container.items[0].metadata:',
			container.items[0]!.metadata
		);
		console.log(
			'container.items[0].metadata instanceof Metadata:',
			container.items[0]!.metadata instanceof Metadata
		);
		console.log(
			'container.items[0].metadata.dates:',
			container.items[0]!.metadata.dates
		);
		console.log(
			'container.items[0].metadata.dates[0]:',
			container.items[0]!.metadata.dates[0]
		);
		console.log(
			'Is Date?:',
			container.items[0]!.metadata.dates[0] instanceof Date
		);

		expect(container.items[0]).toBeInstanceOf(Content);
		expect(container.items[0]!.metadata).toBeInstanceOf(Metadata);
		expect(container.items[0]!.metadata.dates[0]).toBeInstanceOf(Date);
	});
});
