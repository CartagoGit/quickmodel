// tests/integration/external/websocket-simulation.test.ts
import { describe, it, expect } from 'bun:test';
import { Quick, QModel, QRule, QField, QComputed } from '@/index';
import { qCheckRules } from '@/forms';

/**
 * Integration Test: QuickModel + WebSocket / Socket environments (Simulated)
 *
 * Cubre los siguientes entornos de sockets sin dependencias externas:
 *
 *  1. Native WebSocket (browser / Node.js `ws`)
 *     - serialize() → JSON string → wire → parse → new Dto()
 *     - Tipos complejos: Date, Set, Map, BigInt, RegExp
 *     - unknownPropertyPolicy: 'strip' (seguridad)
 *
 *  2. Socket.IO (event-based, namespace/room)
 *     - emit/on pattern con QuickModel como payload
 *     - Acknowledgements (callbacks)
 *     - Broadcast simulation
 *
 *  3. Server-Sent Events (SSE)
 *     - Formato `data: <json>\n\n`
 *     - Stream de eventos tipados con QModel
 *
 *  4. uWebSockets.js (high-performance, ArrayBuffer binary)
 *     - TextEncoder/TextDecoder + serialize()
 *     - Backpressure simulation
 *
 *  5. STOMP over WebSocket (e.g. SockJS + @stomp/stompjs)
 *     - Frame headers + body JSON con QModel
 *
 *  6. Security
 *     - Campos desconocidos eliminados al reconstruir desde WS
 *     - Prototype pollution vía WS payload
 *     - Mass assignment attack via socket message
 *
 *  7. Batch / bulk events
 *     - createMany() para mensajes en ráfaga
 */

// ─── Minimal WebSocket simulation ─────────────────────────────────────────────

type IWsMessageHandler = (data: string) => void;

interface ISimulatedSocket {
	send: (data: string) => void;
	onmessage: IWsMessageHandler | null;
	/** Simula recibir un mensaje desde el otro extremo */
	simulateReceive: (data: string) => void;
	readyState: 0 | 1 | 2 | 3; // CONNECTING | OPEN | CLOSING | CLOSED
}

function _createSimulatedSocket(): ISimulatedSocket {
	let _handler: IWsMessageHandler | null = null;
	const _sent: string[] = [];

	const socket: ISimulatedSocket = {
		readyState: 1,
		get onmessage() {
			return _handler;
		},
		set onmessage(val: IWsMessageHandler | null) {
			_handler = val;
		},
		send(data: string) {
			_sent.push(data);
		},
		simulateReceive(data: string) {
			_handler?.({ data } as unknown as string);
		},
	};

	return socket;
}

// Simulated WebSocket "pipe": client ↔ server
interface IWsPipe {
	clientSocket: ISimulatedSocket;
	serverSocket: ISimulatedSocket;
	/** Drain mensajes pendientes del cliente al servidor */
	flushClientToServer: () => void;
	/** Drain mensajes pendientes del servidor al cliente */
	flushServerToClient: () => void;
}

function createWsPipe(): IWsPipe {
	const clientSent: string[] = [];
	const serverSent: string[] = [];

	const clientSocket: ISimulatedSocket = {
		readyState: 1,
		onmessage: null,
		send(data: string) {
			clientSent.push(data);
		},
		simulateReceive(data: string) {
			this.onmessage?.({ data } as unknown as string);
		},
	};

	const serverSocket: ISimulatedSocket = {
		readyState: 1,
		onmessage: null,
		send(data: string) {
			serverSent.push(data);
		},
		simulateReceive(data: string) {
			this.onmessage?.({ data } as unknown as string);
		},
	};

	return {
		clientSocket,
		serverSocket,
		flushClientToServer() {
			const messages = clientSent.splice(0);
			for (const msg of messages) {
				serverSocket.simulateReceive(msg);
			}
		},
		flushServerToClient() {
			const messages = serverSent.splice(0);
			for (const msg of messages) {
				clientSocket.simulateReceive(msg);
			}
		},
	};
}

// ─── Minimal Socket.IO-like simulation ────────────────────────────────────────

type ISocketIoHandler = (...args: unknown[]) => void;

interface ISimulatedSocketIo {
	emit: (event: string, data: unknown, ack?: (res: unknown) => void) => void;
	on: (event: string, handler: ISocketIoHandler) => void;
	off: (event: string) => void;
	/** Simula que el otro extremo emitió un evento */
	simulateEmit: (event: string, ...args: unknown[]) => void;
}

function createSocketIoPair(): {
	client: ISimulatedSocketIo;
	server: ISimulatedSocketIo;
} {
	const clientHandlers = new Map<string, ISocketIoHandler>();
	const serverHandlers = new Map<string, ISocketIoHandler>();
	const clientAcks = new Map<string, (res: unknown) => void>();

	const client: ISimulatedSocketIo = {
		emit(event, data, ack) {
			if (ack) clientAcks.set(event, ack);
			// Simula envío → el servidor lo recibe
			const raw = JSON.stringify(data);
			const parsed: unknown = JSON.parse(raw);
			const handler = serverHandlers.get(event);
			if (handler) {
				if (ack) {
					handler(parsed, (res: unknown) => ack(res));
				} else {
					handler(parsed);
				}
			}
		},
		on(event, handler) {
			clientHandlers.set(event, handler);
		},
		off(event) {
			clientHandlers.delete(event);
		},
		simulateEmit(event, ...args) {
			clientHandlers.get(event)?.(...args);
		},
	};

	const server: ISimulatedSocketIo = {
		emit(event, data) {
			const raw = JSON.stringify(data);
			const parsed: unknown = JSON.parse(raw);
			clientHandlers.get(event)?.(parsed);
		},
		on(event, handler) {
			serverHandlers.set(event, handler);
		},
		off(event) {
			serverHandlers.delete(event);
		},
		simulateEmit(event, ...args) {
			serverHandlers.get(event)?.(...args);
		},
	};

	return { client, server };
}

// ─── Minimal SSE simulation ───────────────────────────────────────────────────

interface ISseEvent {
	type: string;
	data: string;
	id?: string;
}

function formatSseEvent(event: ISseEvent): string {
	const lines: string[] = [];
	if (event.id) lines.push(`id: ${event.id}`);
	lines.push(`event: ${event.type}`);
	lines.push(`data: ${event.data}`);
	lines.push('');
	lines.push('');
	return lines.join('\n');
}

function parseSseEvent(raw: string): ISseEvent | null {
	const lines = raw.trim().split('\n');
	let eventType = 'message';
	let data = '';
	let eventId: string | undefined;

	for (const line of lines) {
		if (line.startsWith('event: ')) eventType = line.slice(7);
		else if (line.startsWith('data: ')) data = line.slice(6);
		else if (line.startsWith('id: ')) eventId = line.slice(4);
	}

	if (!data) return null;
	return { type: eventType, data, id: eventId };
}

// ─── STOMP frame simulation ───────────────────────────────────────────────────

interface IStompFrame {
	command: string;
	headers: Record<string, string>;
	body: string;
}

function buildStompFrame(frame: IStompFrame): string {
	const headerLines = Object.entries(frame.headers)
		.map(([key, val]) => `${key}:${val}`)
		.join('\n');
	return `${frame.command}\n${headerLines}\n\n${frame.body}\0`;
}

function parseStompFrame(raw: string): IStompFrame {
	const nullIdx = raw.indexOf('\0');
	const content = nullIdx >= 0 ? raw.slice(0, nullIdx) : raw;
	const parts = content.split('\n\n');
	const headerSection = parts[0] ?? '';
	const body = parts[1] ?? '';
	const headerLines = headerSection.split('\n');
	const command = headerLines[0] ?? '';
	const headers: Record<string, string> = {};

	for (const line of headerLines.slice(1)) {
		const colonIdx = line.indexOf(':');
		if (colonIdx >= 0) {
			headers[line.slice(0, colonIdx)] = line.slice(colonIdx + 1);
		}
	}

	return { command, headers, body };
}

// ─── Models for tests ─────────────────────────────────────────────────────────

interface IChatMessage {
	id: string;
	roomId: string;
	author: string;
	text: string;
	sentAt: Date;
	mentions: Set<string>;
	metadata: Map<string, string>;
}

@Quick(
	{
		id: 'string',
		roomId: 'string',
		author: 'string',
		text: 'string',
		sentAt: Date,
		mentions: Set,
		metadata: Map,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class ChatMessageDto extends QModel<IChatMessage> {
	@QField({ label: 'ID', required: true })
	@QRule((val: string) => val.length > 0, 'ID is required')
	declare id: string;

	@QField({ label: 'Room' })
	declare roomId: string;

	@QField({ label: 'Author', required: true })
	@QRule((val: string) => val.length >= 2, 'Author name too short')
	declare author: string;

	@QField({ label: 'Text', required: true })
	@QRule(
		(val: string) => val.length > 0 && val.length <= 4000,
		'Invalid text length'
	)
	declare text: string;

	@QField({ label: 'Sent At' })
	declare sentAt: Date;

	@QField({ label: 'Mentions' })
	declare mentions: Set<string>;

	@QField({ label: 'Metadata' })
	declare metadata: Map<string, string>;

	@QComputed()
	get wordCount(): number {
		return this.text.split(/\s+/).filter(Boolean).length;
	}

	@QComputed()
	get hasMentions(): boolean {
		return this.mentions.size > 0;
	}
}

interface IStockTick {
	symbol: string;
	price: number;
	volume: bigint;
	timestamp: Date;
	change: number;
	high: number;
	low: number;
}

@Quick(
	{
		symbol: 'string',
		price: 'number',
		volume: BigInt,
		timestamp: Date,
		change: 'number',
		high: 'number',
		low: 'number',
	},
	{ unknownPropertyPolicy: 'strip' }
)
class StockTickDto extends QModel<IStockTick> {
	@QField({ label: 'Symbol' })
	@QRule((val: string) => /^[A-Z]{1,5}$/.test(val), 'Invalid symbol')
	declare symbol: string;

	@QField({ label: 'Price' })
	@QRule((val: number) => val > 0, 'Price must be positive')
	declare price: number;

	@QField({ label: 'Volume' })
	declare volume: bigint;

	@QField({ label: 'Timestamp' })
	declare timestamp: Date;

	@QField({ label: 'Change' })
	declare change: number;

	@QField({ label: 'High' })
	declare high: number;

	@QField({ label: 'Low' })
	declare low: number;

	@QComputed()
	get isPositive(): boolean {
		return this.change >= 0;
	}
}

interface IPresenceEvent {
	userId: string;
	status: string;
	lastSeen: Date;
	activeRooms: Set<string>;
}

@Quick(
	{ userId: 'string', status: 'string', lastSeen: Date, activeRooms: Set },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class PresenceEventDto extends QModel<IPresenceEvent> {
	@QField({ label: 'User ID' })
	@QRule((val: string) => val.length > 0, 'User ID required')
	declare userId: string;

	@QField({ label: 'Status' })
	@QRule(
		(val: string) => ['online', 'away', 'busy', 'offline'].includes(val),
		'Invalid status'
	)
	declare status: string;

	@QField({ label: 'Last Seen' })
	declare lastSeen: Date;

	@QField({ label: 'Active Rooms' })
	declare activeRooms: Set<string>;
}

// ─── 1. Native WebSocket ───────────────────────────────────────────────────────

describe('Native WebSocket simulation', () => {
	it('serialize + send + receive + reconstruct (básico)', () => {
		const pipe = createWsPipe();
		let received: ChatMessageDto | null = null;

		// Server: escucha mensajes y reconstruye el modelo
		pipe.serverSocket.onmessage = ((evt: unknown) => {
			const raw = (evt as { data: string }).data;
			const parsed: unknown = JSON.parse(raw);
			received = new ChatMessageDto(parsed as IChatMessage);
		}) as IWsMessageHandler;

		// Client: crea modelo y lo envía serializado
		const original = new ChatMessageDto({
			id: 'msg-001',
			roomId: 'room-42',
			author: 'Alice',
			text: 'Hello WebSocket world!',
			sentAt: new Date('2026-01-15T10:30:00.000Z'),
			mentions: new Set(['Bob', 'Charlie']),
			metadata: new Map([['source', 'web']]),
		});

		pipe.clientSocket.send(JSON.stringify(original.serialize()));
		pipe.flushClientToServer();

		expect(received).not.toBeNull();
		expect(received!.id).toBe('msg-001');
		expect(received!.author).toBe('Alice');
		expect(received!.text).toBe('Hello WebSocket world!');
		expect(received!.sentAt).toBeInstanceOf(Date);
		expect(received!.sentAt.toISOString()).toBe('2026-01-15T10:30:00.000Z');
		expect(received!.mentions).toBeInstanceOf(Set);
		expect(received!.mentions.has('Bob')).toBe(true);
		expect(received!.mentions.has('Charlie')).toBe(true);
		expect(received!.metadata).toBeInstanceOf(Map);
		expect(received!.metadata.get('source')).toBe('web');
	});

	it('computed properties disponibles tras reconstrucción', () => {
		const pipe = createWsPipe();
		let received: ChatMessageDto | null = null;

		pipe.serverSocket.onmessage = ((evt: unknown) => {
			const raw = (evt as { data: string }).data;
			received = new ChatMessageDto(JSON.parse(raw) as IChatMessage);
		}) as IWsMessageHandler;

		const original = new ChatMessageDto({
			id: 'msg-002',
			roomId: 'room-1',
			author: 'Bob',
			text: 'Three word message',
			sentAt: new Date(),
			mentions: new Set(['Alice']),
			metadata: new Map(),
		});

		pipe.clientSocket.send(JSON.stringify(original.serialize()));
		pipe.flushClientToServer();

		expect(received!.wordCount).toBe(3);
		expect(received!.hasMentions).toBe(true);
	});

	it('validación con qCheckRules tras reconstrucción desde WS', () => {
		const pipe = createWsPipe();
		let validationResult: { valid: boolean; errors: string[] } | null =
			null;

		pipe.serverSocket.onmessage = ((evt: unknown) => {
			const raw = (evt as { data: string }).data;
			const dto = new ChatMessageDto(JSON.parse(raw) as IChatMessage);
			validationResult = qCheckRules(dto);
		}) as IWsMessageHandler;

		// Mensaje válido
		const valid = new ChatMessageDto({
			id: 'v1',
			roomId: 'r1',
			author: 'Alice',
			text: 'Valid message',
			sentAt: new Date(),
			mentions: new Set(),
			metadata: new Map(),
		});

		pipe.clientSocket.send(JSON.stringify(valid.serialize()));
		pipe.flushClientToServer();
		expect(validationResult!.valid).toBe(true);
		expect(validationResult!.errors).toHaveLength(0);
	});

	it('respuesta servidor → cliente (bidireccional)', () => {
		const pipe = createWsPipe();
		let clientReceived: PresenceEventDto | null = null;

		// Cliente escucha respuesta
		pipe.clientSocket.onmessage = ((evt: unknown) => {
			const raw = (evt as { data: string }).data;
			clientReceived = new PresenceEventDto(
				JSON.parse(raw) as IPresenceEvent
			);
		}) as IWsMessageHandler;

		// Servidor envía evento de presencia
		const presence = new PresenceEventDto({
			userId: 'u-99',
			status: 'online',
			lastSeen: new Date('2026-01-15T10:00:00.000Z'),
			activeRooms: new Set(['room-1', 'room-3']),
		});

		pipe.serverSocket.send(JSON.stringify(presence.serialize()));
		pipe.flushServerToClient();

		expect(clientReceived!.userId).toBe('u-99');
		expect(clientReceived!.status).toBe('online');
		expect(clientReceived!.lastSeen).toBeInstanceOf(Date);
		expect(clientReceived!.activeRooms).toBeInstanceOf(Set);
		expect(clientReceived!.activeRooms.has('room-1')).toBe(true);
	});

	it('BigInt roundtrip sobre WebSocket (StockTick)', () => {
		const pipe = createWsPipe();
		let received: StockTickDto | null = null;

		pipe.serverSocket.onmessage = ((evt: unknown) => {
			const raw = (evt as { data: string }).data;
			received = new StockTickDto(JSON.parse(raw) as IStockTick);
		}) as IWsMessageHandler;

		const tick = new StockTickDto({
			symbol: 'AAPL',
			price: 189.42,
			volume: BigInt('987654321000'),
			timestamp: new Date('2026-01-15T15:30:00.000Z'),
			change: 2.5,
			high: 190.0,
			low: 186.5,
		});

		pipe.clientSocket.send(JSON.stringify(tick.serialize()));
		pipe.flushClientToServer();

		expect(received!.symbol).toBe('AAPL');
		expect(received!.volume).toBe(BigInt('987654321000'));
		expect(typeof received!.volume).toBe('bigint');
		expect(received!.isPositive).toBe(true);
	});

	it('batch de mensajes con createMany()', () => {
		const pipe = createWsPipe();
		const received: StockTickDto[] = [];

		pipe.serverSocket.onmessage = ((evt: unknown) => {
			const raw = (evt as { data: string }).data;
			const batch = JSON.parse(raw) as IStockTick[];
			const { instances } = StockTickDto.createMany(batch);
			received.push(...instances);
		}) as IWsMessageHandler;

		const rawTicks: IStockTick[] = [
			{
				symbol: 'AAPL',
				price: 189.42,
				volume: BigInt('100000'),
				timestamp: new Date(),
				change: 1.2,
				high: 190.0,
				low: 188.0,
			},
			{
				symbol: 'GOOGL',
				price: 155.0,
				volume: BigInt('50000'),
				timestamp: new Date(),
				change: -0.3,
				high: 156.0,
				low: 154.0,
			},
			{
				symbol: 'MSFT',
				price: 420.0,
				volume: BigInt('75000'),
				timestamp: new Date(),
				change: 0.8,
				high: 421.0,
				low: 418.0,
			},
		];

		const { instances: batch } = StockTickDto.createMany(rawTicks);
		const serialized = batch.map((dto) => dto.serialize());

		pipe.clientSocket.send(JSON.stringify(serialized));
		pipe.flushClientToServer();

		expect(received).toHaveLength(3);
		expect(received[0].symbol).toBe('AAPL');
		expect(received[1].symbol).toBe('GOOGL');
		expect(received[2].symbol).toBe('MSFT');
		expect(typeof received[0].volume).toBe('bigint');
	});
});

// ─── 2. Socket.IO simulation ───────────────────────────────────────────────────

describe('Socket.IO simulation', () => {
	it('emit "chat:message" y reconstrucción en servidor', () => {
		const { client, server } = createSocketIoPair();
		let serverReceived: ChatMessageDto | null = null;

		server.on('chat:message', (raw: unknown) => {
			serverReceived = new ChatMessageDto(raw as IChatMessage);
		});

		const msg = new ChatMessageDto({
			id: 'sio-001',
			roomId: 'room-general',
			author: 'Eve',
			text: 'Socket.IO message',
			sentAt: new Date('2026-02-01T09:00:00.000Z'),
			mentions: new Set(),
			metadata: new Map([['channel', 'general']]),
		});

		client.emit('chat:message', msg.serialize());

		expect(serverReceived!.id).toBe('sio-001');
		expect(serverReceived!.author).toBe('Eve');
		expect(serverReceived!.sentAt).toBeInstanceOf(Date);
		expect(serverReceived!.metadata.get('channel')).toBe('general');
	});

	it('acknowledgement (ack) retorna resultado de validación', () => {
		const { client, server } = createSocketIoPair();

		server.on('user:presence', (raw: unknown, ack: unknown) => {
			const dto = new PresenceEventDto(raw as IPresenceEvent);
			const result = qCheckRules(dto);
			(ack as (res: unknown) => void)(result);
		});

		let ackResult: { valid: boolean; errors: string[] } | null = null;

		const presence = new PresenceEventDto({
			userId: 'u-100',
			status: 'online',
			lastSeen: new Date(),
			activeRooms: new Set(['room-main']),
		});

		client.emit('user:presence', presence.serialize(), (res: unknown) => {
			ackResult = res as { valid: boolean; errors: string[] };
		});

		expect(ackResult).not.toBeNull();
		expect(ackResult!.valid).toBe(true);
	});

	it('broadcast pattern: servidor emite a todos los clientes', () => {
		// Simula broadcast enviando el mismo evento a múltiples clientes
		const pair1 = createSocketIoPair();
		const pair2 = createSocketIoPair();
		const pair3 = createSocketIoPair();

		const received: PresenceEventDto[] = [];

		for (const { client } of [pair1, pair2, pair3]) {
			client.on('presence:update', (raw: unknown) => {
				received.push(new PresenceEventDto(raw as IPresenceEvent));
			});
		}

		const presence = new PresenceEventDto({
			userId: 'broadcaster',
			status: 'away',
			lastSeen: new Date('2026-03-01T12:00:00.000Z'),
			activeRooms: new Set(['room-public']),
		});

		// Servidor emite a todos
		for (const { server } of [pair1, pair2, pair3]) {
			server.emit('presence:update', presence.serialize());
		}

		expect(received).toHaveLength(3);
		for (const dto of received) {
			expect(dto.userId).toBe('broadcaster');
			expect(dto.status).toBe('away');
			expect(dto.activeRooms.has('room-public')).toBe(true);
		}
	});

	it('stock:tick stream — múltiples eventos en rápida sucesión', () => {
		const { client, server } = createSocketIoPair();
		const ticks: StockTickDto[] = [];

		server.on('stock:tick', (raw: unknown) => {
			ticks.push(new StockTickDto(raw as IStockTick));
		});

		const symbols = ['AAPL', 'TSLA', 'NVDA', 'AMZN', 'META'];

		for (const [idx, symbol] of symbols.entries()) {
			const tick = new StockTickDto({
				symbol,
				price: 100 + idx * 10,
				volume: BigInt(1000 * (idx + 1)),
				timestamp: new Date(),
				change: idx % 2 === 0 ? 1.5 : -0.5,
				high: 110 + idx * 10,
				low: 90 + idx * 10,
			});
			client.emit('stock:tick', tick.serialize());
		}

		expect(ticks).toHaveLength(5);
		expect(ticks[0].symbol).toBe('AAPL');
		expect(ticks[4].symbol).toBe('META');
		expect(ticks[0].isPositive).toBe(true);
		expect(ticks[1].isPositive).toBe(false);
	});

	it('copy() para actualización incremental de modelo', () => {
		const { client, server } = createSocketIoPair();
		let latestPresence: PresenceEventDto | null = null;

		server.on('presence:update', (raw: unknown) => {
			if (latestPresence) {
				latestPresence = latestPresence.copy(
					raw as Partial<IPresenceEvent>
				);
			} else {
				latestPresence = new PresenceEventDto(raw as IPresenceEvent);
			}
		});

		// Estado inicial
		const initial = new PresenceEventDto({
			userId: 'u-200',
			status: 'online',
			lastSeen: new Date('2026-01-01T10:00:00.000Z'),
			activeRooms: new Set(['room-a']),
		});

		client.emit('presence:update', initial.serialize());
		expect(latestPresence!.status).toBe('online');

		// Patch: solo cambia status
		client.emit('presence:update', { status: 'away' });
		expect(latestPresence!.status).toBe('away');
		expect(latestPresence!.userId).toBe('u-200'); // preservado
	});
});

// ─── 3. Server-Sent Events (SSE) ──────────────────────────────────────────────

describe('Server-Sent Events (SSE) simulation', () => {
	it('formato SSE correcto: event/data/id lines', () => {
		const tick = new StockTickDto({
			symbol: 'NVDA',
			price: 875.5,
			volume: BigInt('2000000'),
			timestamp: new Date('2026-01-15T14:00:00.000Z'),
			change: 12.3,
			high: 880.0,
			low: 860.0,
		});

		const raw = formatSseEvent({
			type: 'stock:tick',
			data: JSON.stringify(tick.serialize()),
			id: 'sse-evt-001',
		});

		expect(raw).toContain('event: stock:tick');
		expect(raw).toContain('data: ');
		expect(raw).toContain('id: sse-evt-001');
		expect(raw.endsWith('\n\n')).toBe(true);
	});

	it('parseSseEvent → reconstrucción del modelo', () => {
		const original = new StockTickDto({
			symbol: 'NVDA',
			price: 875.5,
			volume: BigInt('2000000'),
			timestamp: new Date('2026-01-15T14:00:00.000Z'),
			change: 12.3,
			high: 880.0,
			low: 860.0,
		});

		const raw = formatSseEvent({
			type: 'stock:tick',
			data: JSON.stringify(original.serialize()),
			id: 'sse-001',
		});

		const evt = parseSseEvent(raw);
		expect(evt).not.toBeNull();
		expect(evt!.type).toBe('stock:tick');

		const reconstructed = new StockTickDto(
			JSON.parse(evt!.data) as IStockTick
		);
		expect(reconstructed.symbol).toBe('NVDA');
		expect(reconstructed.price).toBe(875.5);
		expect(reconstructed.volume).toBe(BigInt('2000000'));
		expect(reconstructed.timestamp).toBeInstanceOf(Date);
		expect(reconstructed.isPositive).toBe(true);
	});

	it('stream de múltiples eventos SSE tipados', () => {
		const events: StockTickDto[] = [];
		const rawTicks: IStockTick[] = [
			{
				symbol: 'AAPL',
				price: 180.0,
				volume: BigInt('500000'),
				timestamp: new Date(),
				change: -1.2,
				high: 182.0,
				low: 178.0,
			},
			{
				symbol: 'MSFT',
				price: 410.0,
				volume: BigInt('300000'),
				timestamp: new Date(),
				change: 2.1,
				high: 412.0,
				low: 408.0,
			},
		];

		// Simula stream SSE
		const sseStream: string[] = rawTicks.map((raw, idx) => {
			const dto = new StockTickDto(raw);
			return formatSseEvent({
				type: 'stock:tick',
				data: JSON.stringify(dto.serialize()),
				id: `sse-${idx}`,
			});
		});

		// Simula el cliente SSE parseando el stream
		for (const chunk of sseStream) {
			const evt = parseSseEvent(chunk);
			if (evt?.type === 'stock:tick') {
				events.push(
					new StockTickDto(JSON.parse(evt.data) as IStockTick)
				);
			}
		}

		expect(events).toHaveLength(2);
		expect(events[0].symbol).toBe('AAPL');
		expect(events[0].isPositive).toBe(false);
		expect(events[1].symbol).toBe('MSFT');
		expect(events[1].isPositive).toBe(true);
	});

	it('diferentes tipos de evento (multiplexed SSE)', () => {
		const chatEvents: ChatMessageDto[] = [];
		const presenceEvents: PresenceEventDto[] = [];

		const msg = new ChatMessageDto({
			id: 'sse-chat-1',
			roomId: 'room-live',
			author: 'Host',
			text: 'Welcome to the live stream!',
			sentAt: new Date(),
			mentions: new Set(),
			metadata: new Map(),
		});

		const pres = new PresenceEventDto({
			userId: 'viewer-42',
			status: 'online',
			lastSeen: new Date(),
			activeRooms: new Set(['room-live']),
		});

		const stream = [
			formatSseEvent({
				type: 'chat:message',
				data: JSON.stringify(msg.serialize()),
			}),
			formatSseEvent({
				type: 'user:presence',
				data: JSON.stringify(pres.serialize()),
			}),
		];

		for (const chunk of stream) {
			const evt = parseSseEvent(chunk);
			if (!evt) continue;
			if (evt.type === 'chat:message') {
				chatEvents.push(
					new ChatMessageDto(JSON.parse(evt.data) as IChatMessage)
				);
			} else if (evt.type === 'user:presence') {
				presenceEvents.push(
					new PresenceEventDto(JSON.parse(evt.data) as IPresenceEvent)
				);
			}
		}

		expect(chatEvents).toHaveLength(1);
		expect(chatEvents[0].author).toBe('Host');
		expect(presenceEvents).toHaveLength(1);
		expect(presenceEvents[0].userId).toBe('viewer-42');
	});
});

// ─── 4. uWebSockets.js (ArrayBuffer binary) ───────────────────────────────────

describe('uWebSockets.js ArrayBuffer binary simulation', () => {
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	it('TextEncoder → serialize() → ArrayBuffer → TextDecoder → reconstrucción', () => {
		const original = new ChatMessageDto({
			id: 'uws-001',
			roomId: 'uws-room',
			author: 'FastClient',
			text: 'High-performance message',
			sentAt: new Date('2026-05-01T08:00:00.000Z'),
			mentions: new Set(['ServerAdmin']),
			metadata: new Map([['priority', 'high']]),
		});

		// Simula uWebSockets send(buffer)
		const buffer: ArrayBuffer = encoder.encode(
			JSON.stringify(original.serialize())
		).buffer;

		// Simula uWebSockets message handler recibir ArrayBuffer
		const raw = decoder.decode(buffer);
		const reconstructed = new ChatMessageDto(
			JSON.parse(raw) as IChatMessage
		);

		expect(reconstructed.id).toBe('uws-001');
		expect(reconstructed.author).toBe('FastClient');
		expect(reconstructed.sentAt).toBeInstanceOf(Date);
		expect(reconstructed.mentions.has('ServerAdmin')).toBe(true);
	});

	it('ArrayBuffer roundtrip preserva BigInt (StockTick)', () => {
		const tick = new StockTickDto({
			symbol: 'TSLA',
			price: 250.75,
			volume: BigInt('9999999999'),
			timestamp: new Date('2026-06-01T12:00:00.000Z'),
			change: -3.4,
			high: 255.0,
			low: 248.0,
		});

		const buffer: ArrayBuffer = encoder.encode(
			JSON.stringify(tick.serialize())
		).buffer;
		const raw = decoder.decode(buffer);
		const reconstructed = new StockTickDto(JSON.parse(raw) as IStockTick);

		expect(reconstructed.symbol).toBe('TSLA');
		expect(reconstructed.volume).toBe(BigInt('9999999999'));
		expect(reconstructed.isPositive).toBe(false);
	});

	it('backpressure simulation: múltiples buffers en cola', () => {
		const queue: ArrayBuffer[] = [];
		const processed: StockTickDto[] = [];

		// Simula producción rápida (back-pressure: varios mensajes encolados)
		const symbols = ['AAPL', 'AMZN', 'NVDA', 'TSLA', 'GOOGL'];
		for (const [idx, symbol] of symbols.entries()) {
			const dto = new StockTickDto({
				symbol,
				price: 100 + idx * 50,
				volume: BigInt(10000 * (idx + 1)),
				timestamp: new Date(),
				change: idx % 2 === 0 ? 1.0 : -1.0,
				high: 110 + idx * 50,
				low: 90 + idx * 50,
			});
			queue.push(encoder.encode(JSON.stringify(dto.serialize())).buffer);
		}

		// Draining the queue
		for (const buf of queue) {
			processed.push(
				new StockTickDto(JSON.parse(decoder.decode(buf)) as IStockTick)
			);
		}

		expect(processed).toHaveLength(5);
		expect(processed[2].symbol).toBe('NVDA');
		expect(processed.every((dto) => dto.timestamp instanceof Date)).toBe(
			true
		);
	});
});

// ─── 5. STOMP over WebSocket ──────────────────────────────────────────────────

describe('STOMP over WebSocket simulation', () => {
	it('SEND frame con QuickModel payload', () => {
		const msg = new ChatMessageDto({
			id: 'stomp-001',
			roomId: '/topic/chat.general',
			author: 'StompUser',
			text: 'Hello from STOMP',
			sentAt: new Date('2026-01-20T10:00:00.000Z'),
			mentions: new Set(),
			metadata: new Map([['priority', 'normal']]),
		});

		const frame = buildStompFrame({
			command: 'SEND',
			headers: {
				destination: '/topic/chat.general',
				'content-type': 'application/json',
			},
			body: JSON.stringify(msg.serialize()),
		});

		expect(frame).toContain('SEND\n');
		expect(frame).toContain('destination:/topic/chat.general');
		expect(frame).toContain('content-type:application/json');
		expect(frame).toContain('"id":"stomp-001"');
		expect(frame.endsWith('\0')).toBe(true);
	});

	it('parseo de STOMP frame y reconstrucción del modelo', () => {
		const original = new ChatMessageDto({
			id: 'stomp-002',
			roomId: '/queue/user.stomp-002',
			author: 'StompBroker',
			text: 'Personal delivery via STOMP',
			sentAt: new Date('2026-01-20T11:00:00.000Z'),
			mentions: new Set(['StompUser']),
			metadata: new Map([['ack', 'client-individual']]),
		});

		const rawFrame = buildStompFrame({
			command: 'MESSAGE',
			headers: {
				destination: '/queue/user.stomp-002',
				'message-id': 'msg-abc-123',
				subscription: 'sub-0',
			},
			body: JSON.stringify(original.serialize()),
		});

		const parsed = parseStompFrame(rawFrame);
		expect(parsed.command).toBe('MESSAGE');
		expect(parsed.headers['destination']).toBe('/queue/user.stomp-002');
		expect(parsed.headers['message-id']).toBe('msg-abc-123');

		const reconstructed = new ChatMessageDto(
			JSON.parse(parsed.body) as IChatMessage
		);
		expect(reconstructed.id).toBe('stomp-002');
		expect(reconstructed.author).toBe('StompBroker');
		expect(reconstructed.sentAt).toBeInstanceOf(Date);
		expect(reconstructed.mentions.has('StompUser')).toBe(true);
	});

	it('SUBSCRIBE + MESSAGE para presencia en STOMP', () => {
		const presence = new PresenceEventDto({
			userId: 'stomp-user-77',
			status: 'busy',
			lastSeen: new Date('2026-04-01T08:30:00.000Z'),
			activeRooms: new Set(['/topic/presence']),
		});

		const messageFrame = buildStompFrame({
			command: 'MESSAGE',
			headers: {
				destination: '/topic/presence',
				'message-id': 'pres-001',
				subscription: 'sub-presence',
			},
			body: JSON.stringify(presence.serialize()),
		});

		const parsed = parseStompFrame(messageFrame);
		const dto = new PresenceEventDto(
			JSON.parse(parsed.body) as IPresenceEvent
		);
		const validation = qCheckRules(dto);

		expect(validation.valid).toBe(true);
		expect(dto.userId).toBe('stomp-user-77');
		expect(dto.status).toBe('busy');
		expect(dto.activeRooms.has('/topic/presence')).toBe(true);
	});
});

// ─── 6. Security ──────────────────────────────────────────────────────────────

describe('Security: socket message attack vectors', () => {
	it('unknownPropertyPolicy: strip elimina campos inyectados via WS', () => {
		const pipe = createWsPipe();
		let received: ChatMessageDto | null = null;

		pipe.serverSocket.onmessage = ((evt: unknown) => {
			received = new ChatMessageDto(
				JSON.parse((evt as { data: string }).data) as IChatMessage
			);
		}) as IWsMessageHandler;

		// Payload malicioso desde "cliente" — en formato JSON wire (Set → array)
		const maliciousPayload = {
			id: 'hack-001',
			roomId: 'room-x',
			author: 'Hacker',
			text: 'Innocent message',
			sentAt: new Date().toISOString(),
			mentions: [], // serialized Set
			metadata: {}, // serialized Map
			// Injected fields — deben ser eliminados
			isAdmin: true,
			_internalToken: 'supersecret',
			role: 'superadmin',
		} as unknown as IChatMessage;

		pipe.clientSocket.send(JSON.stringify(maliciousPayload));
		pipe.flushClientToServer();

		expect(received).not.toBeNull();
		// Campos legítimos OK
		expect(received!.id).toBe('hack-001');
		expect(received!.author).toBe('Hacker');
		// Campos inyectados NO presentes
		expect(
			(received as unknown as Record<string, unknown>)['isAdmin']
		).toBeUndefined();
		expect(
			(received as unknown as Record<string, unknown>)['_internalToken']
		).toBeUndefined();
		expect(
			(received as unknown as Record<string, unknown>)['role']
		).toBeUndefined();
	});

	it('prototype pollution via WS payload no afecta al modelo', () => {
		const raw =
			'{"id":"p-001","roomId":"r","author":"Polluter","text":"Hello","sentAt":"2026-01-01T00:00:00.000Z","mentions":[],"metadata":{},"__proto__":{"polluted":true},"constructor":{"prototype":{"exploited":true}}}';

		const dto = new ChatMessageDto(JSON.parse(raw) as IChatMessage);

		expect(dto.id).toBe('p-001');
		expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
		expect(({} as Record<string, unknown>)['exploited']).toBeUndefined();
	});

	it('mass assignment via Socket.IO — campos de sistema ignorados', () => {
		const { client, server } = createSocketIoPair();
		let received: PresenceEventDto | null = null;

		server.on('presence', (raw: unknown) => {
			received = new PresenceEventDto(raw as IPresenceEvent);
		});

		const attackPayload = {
			userId: 'attacker',
			status: 'online',
			lastSeen: new Date().toISOString(),
			activeRooms: [], // serialized Set
			// Campos extra que no deben asignarse
			isVerified: true,
			adminToken: 'abc123',
			permissions: ['read', 'write', 'admin'],
		};

		client.emit('presence', attackPayload);

		expect(received!.userId).toBe('attacker');
		expect(
			(received as unknown as Record<string, unknown>)['isVerified']
		).toBeUndefined();
		expect(
			(received as unknown as Record<string, unknown>)['adminToken']
		).toBeUndefined();
		expect(
			(received as unknown as Record<string, unknown>)['permissions']
		).toBeUndefined();
	});

	it('payload con texto excesivo (DoS vector) — regla falla', () => {
		const longText = 'A'.repeat(5000); // Supera el límite de 4000 chars

		const oversizedMsg = new ChatMessageDto({
			id: 'dos-001',
			roomId: 'room-x',
			author: 'Attacker',
			text: longText,
			sentAt: new Date(),
			mentions: new Set(),
			metadata: new Map(),
		});

		const validation = qCheckRules(oversizedMsg);
		expect(validation.valid).toBe(false);
		expect(
			validation.errors.some(
				(err) =>
					err.field === 'text' || err.message.includes('Invalid text')
			)
		).toBe(true);
	});

	it('payload con status inválido — qCheckRules rechaza', () => {
		const invalidPresence = new PresenceEventDto({
			userId: 'u-bad',
			status: 'invisible', // no permitido
			lastSeen: new Date(),
			activeRooms: new Set(),
		});

		const validation = qCheckRules(invalidPresence);
		expect(validation.valid).toBe(false);
		expect(
			validation.errors.some(
				(err) =>
					err.field === 'status' ||
					err.message.includes('Invalid status')
			)
		).toBe(true);
	});
});
