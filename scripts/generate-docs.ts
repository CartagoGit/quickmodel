import { QSyncDocsTool } from '../src/mcp/tools/internal/sync-docs.tool';

async function main() {
	console.log('Generating documentation...');
	const tool = new QSyncDocsTool();
	const result = await tool.execute();
	console.log(result.summary);
	console.log('Updated files:', result.updatedFiles.join(', '));
}

main().catch(console.error);
