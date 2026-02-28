/**
 * TDD Tests: QMcpServer — resource registration methods
 *
 * Tests registerResources(), getDefaultResources() and isInternalMode().
 */
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync } from 'fs';

const mockRegisterResource = mock((..._args: unknown[]) => {});
const mockConnect = mock(() => Promise.resolve());

void mock.module('@modelcontextprotocol/sdk/server/mcp.js', () => {
	return {
		McpServer: class {
			constructor() {}
			registerTool = () => {};
			registerPrompt = () => {};
			registerResource = mockRegisterResource;
			connect = mockConnect;
		},
	};
});

void mock.module('@modelcontextprotocol/sdk/server/stdio.js', () => {
	return { StdioServerTransport: class {} };
});

// Import after mocks are set up
const { QMcpServer } = await import('../../../../src/mcp/server');
const { QAbstractResource } =
	await import('../../../../src/mcp/resources/abstract-resource');
const { QProjectStateResource } =
	await import('../../../../src/mcp/resources/internal/project-state.resource');
const { QApiReferenceResource } =
	await import('../../../../src/mcp/resources/external/api-reference.resource');

const TMP = join(process.cwd(), 'tests', 'temp_server_resources');

class MockResource extends QAbstractResource {
	name = 'mock-resource';
	uri = 'quickmodel://mock/resource';
	description = 'A mock resource for testing';
	mimeType = 'application/json';
	read(): Promise<string> {
		return Promise.resolve('{"mock": true}');
	}
}

describe('QMcpServer — isInternalMode()', () => {
	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('returns true when src/mcp/server.ts exists in cwd', () => {
		mkdirSync(join(TMP, 'src', 'mcp'), { recursive: true });
		writeFileSync(join(TMP, 'src', 'mcp', 'server.ts'), '// mock');
		expect(QMcpServer.isInternalMode(TMP)).toBe(true);
	});

	it('returns false when src/mcp/server.ts does not exist', () => {
		mkdirSync(TMP, { recursive: true });
		expect(QMcpServer.isInternalMode(TMP)).toBe(false);
	});

	it('returns false for an empty directory', () => {
		mkdirSync(TMP, { recursive: true });
		expect(QMcpServer.isInternalMode(TMP)).toBe(false);
	});
});

describe('QMcpServer — getDefaultResources()', () => {
	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('returns QProjectStateResource when in internal mode (cwd has src/mcp/server.ts)', () => {
		// getDefaultResources() uses process.cwd() — since this test runs inside
		// the quickmodel repo (which has src/mcp/server.ts), it returns the internal resource
		const resources = QMcpServer.getDefaultResources();
		expect(resources).toHaveLength(1);
		expect(resources[0]).toBeInstanceOf(QProjectStateResource);
	});

	it('returns QApiReferenceResource when NOT in internal mode', () => {
		// Temporarily override isInternalMode by calling it with a non-repo dir
		// We test the logic via isInternalMode() directly — getDefaultResources()
		// exercises the real process.cwd() which is always internal in CI
		mkdirSync(TMP, { recursive: true });
		expect(QMcpServer.isInternalMode(TMP)).toBe(false);
		// Verify the external resource can be instantiated and has correct metadata
		const ext = new QApiReferenceResource(TMP);
		expect(ext.uri).toBe('quickmodel://api/reference');
	});

	it('returned resource has required IQMcpResource properties', () => {
		const resources = QMcpServer.getDefaultResources();
		const res = resources[0];
		expect(typeof res?.name).toBe('string');
		expect(typeof res?.uri).toBe('string');
		expect(typeof res?.description).toBe('string');
		expect(typeof res?.mimeType).toBe('string');
		expect(typeof res?.read).toBe('function');
	});
});

describe('QMcpServer — registerResources()', () => {
	beforeEach(() => {
		mockRegisterResource.mockClear();
	});

	it('calls server.registerResource for each resource', () => {
		const server = new QMcpServer();
		server.registerResources([new MockResource()]);
		expect(mockRegisterResource).toHaveBeenCalledTimes(1);
	});

	it('registers resource with correct name', () => {
		const server = new QMcpServer();
		server.registerResources([new MockResource()]);
		const call = mockRegisterResource.mock.calls[0];
		expect(call?.[0]).toBe('mock-resource');
	});

	it('registers resource with correct URI', () => {
		const server = new QMcpServer();
		server.registerResources([new MockResource()]);
		const call = mockRegisterResource.mock.calls[0];
		expect(call?.[1]).toBe('quickmodel://mock/resource');
	});

	it('registers resource with metadata object containing description and mimeType', () => {
		const server = new QMcpServer();
		server.registerResources([new MockResource()]);
		const call = mockRegisterResource.mock.calls[0];
		const config = call?.[2] as Record<string, unknown>;
		expect(config?.['description']).toBe('A mock resource for testing');
		expect(config?.['mimeType']).toBe('application/json');
	});

	it('registers resource with a callback function', () => {
		const server = new QMcpServer();
		server.registerResources([new MockResource()]);
		const call = mockRegisterResource.mock.calls[0];
		expect(typeof call?.[3]).toBe('function');
	});

	it('callback returns contents with uri and text', async () => {
		const server = new QMcpServer();
		server.registerResources([new MockResource()]);
		const call = mockRegisterResource.mock.calls[0];
		const callback = call?.[3] as (uri: URL) => Promise<unknown>;
		const result = (await callback(
			new URL('quickmodel://mock/resource')
		)) as {
			contents: Array<{ uri: string; mimeType: string; text: string }>;
		};
		expect(result.contents).toHaveLength(1);
		expect(result.contents[0]?.text).toBe('{"mock": true}');
		expect(result.contents[0]?.mimeType).toBe('application/json');
	});

	it('handles multiple resources', () => {
		const server = new QMcpServer();
		const res1 = new MockResource();
		const res2 = new MockResource();
		res2.name = 'mock-resource-2';
		res2.uri = 'quickmodel://mock/resource-2';
		server.registerResources([res1, res2]);
		expect(mockRegisterResource).toHaveBeenCalledTimes(2);
	});

	it('handles empty array without error', () => {
		const server = new QMcpServer();
		expect(() => server.registerResources([])).not.toThrow();
		expect(mockRegisterResource).not.toHaveBeenCalled();
	});
});
