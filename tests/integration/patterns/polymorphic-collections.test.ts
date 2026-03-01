// tests/integration/patterns/polymorphic-collections.test.ts
import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import { BaseTransformer } from '@/core/bases/base-transformer';

/**
 * Demonstrates how to handle polymorphic collections (arrays of different objects)
 * using a Custom Transformer. This is a common pattern in CMS, Event Sourcing, etc.
 *
 * Scenario: A "Page" has a list of "Blocks".
 * Blocks can be: TextBlock, ImageBlock, VideoBlock.
 */

// 1. Define the Abstract/Base types
interface IBlock {
	type: 'text' | 'image' | 'video';
	id: string;
}

// 2. Define Concrete Models
@Quick({}, { unknownPropertyPolicy: 'keep' })
class TextBlock extends QModel<IBlock & { content: string }> {
	declare type: 'text';
	declare id: string;
	declare content: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class ImageBlock extends QModel<IBlock & { src: string; alt?: string }> {
	declare type: 'image';
	declare id: string;
	declare src: string;
	declare alt?: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class VideoBlock extends QModel<IBlock & { url: string; duration: number }> {
	declare type: 'video';
	declare id: string;
	declare url: string;
	declare duration: number;
}

// 3. Create a Polymorphic Transformer
// QuickModel allows registering custom transformers or using them inline.
// For arrays of mixed types, we need a transformer that inspects the data explicitly.
class BlockTransformer extends BaseTransformer<
	any[],
	(TextBlock | ImageBlock | VideoBlock)[]
> {
	deserialize(value: any[]): (TextBlock | ImageBlock | VideoBlock)[] {
		if (!Array.isArray(value)) return [];

		return value.map((item) => {
			switch (item.type) {
				case 'text':
					return TextBlock.create(item);
				case 'image':
					return ImageBlock.create(item);
				case 'video':
					return VideoBlock.create(item);
				default:
					// Fallback for unknown blocks (robustness)
					// We could throw, or return a generic block, or filter it out.
					// Here we wrap it in a generic QModel or just return raw object if we wanted,
					// but for type safety let's assume strictness and return null (filtered out later)
					// or just return basic TextBlock as fallback for this example.
					return TextBlock.create({
						...item,
						type: 'text',
						content: 'Unknown block',
					});
			}
		});
	}

	serialize(value: (TextBlock | ImageBlock | VideoBlock)[]): any[] {
		return value.map((item) => item.$qToInterface());
	}
}

// 4. Use the Transformer in the Parent Model
@Quick(
	{
		// We bind the 'blocks' property to our custom polymorphic transformer
		blocks: new BlockTransformer(),
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'keep' }
)
class Page extends QModel<any> {
	declare id: string;
	declare title: string;
	declare createdAt: Date;
	// The explicit type definition helps TypeScript, the transformer handles the runtime logic
	declare blocks: (TextBlock | ImageBlock | VideoBlock)[];
}

describe('Integration: Polymorphic Collections (The "Union" Problem)', () => {
	it('should correctly transform a mixed array of subclasses based on a discriminator', () => {
		const rawData = {
			id: 'page_1',
			title: 'My Homepage',
			createdAt: '2024-01-01T00:00:00Z',
			blocks: [
				{ type: 'text', id: 'b1', content: 'Hello World' },
				{ type: 'image', id: 'b2', src: '/img/logo.png', alt: 'Logo' },
				{
					type: 'video',
					id: 'b3',
					url: '/vid/intro.mp4',
					duration: 120,
				},
				{ type: 'unknown', id: 'b4' }, // Should trigger fallback
			],
		};

		const page = Page.create(rawData);

		// 1. Verify Parent transformation
		expect(page.createdAt).toBeInstanceOf(Date);
		expect(page.title).toBe('My Homepage');

		// 2. Verify Polymorphic Array
		expect(page.blocks).toBeInstanceOf(Array);
		expect(page.blocks.length).toBe(4);

		// check instances
		expect(page.blocks[0]).toBeInstanceOf(TextBlock);
		expect((page.blocks[0] as TextBlock).content).toBe('Hello World');

		expect(page.blocks[1]).toBeInstanceOf(ImageBlock);
		expect((page.blocks[1] as ImageBlock).src).toBe('/img/logo.png');

		expect(page.blocks[2]).toBeInstanceOf(VideoBlock);
		expect((page.blocks[2] as VideoBlock).duration).toBe(120);

		// check fallback
		expect(page.blocks[3]).toBeInstanceOf(TextBlock);
		expect((page.blocks[3] as TextBlock).content).toBe('Unknown block');
	});

	it('should maintain polymorphism during serialization (Roundtrip)', () => {
		const page = Page.create({
			id: 'p1',
			title: 'Roundtrip Test',
			createdAt: new Date(),
			blocks: [
				{ type: 'text', id: 't1', content: 'A' },
				{ type: 'image', id: 'i1', src: 'B.png' },
			],
		});

		const serialized = page.$qToInterface();

		expect(serialized.blocks).toHaveLength(2);
		expect(serialized.blocks[0].type).toBe('text');
		expect(serialized.blocks[1].type).toBe('image');
		expect(serialized.blocks[1].src).toBe('B.png');
	});
});
