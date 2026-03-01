````markdown
# WebSocket & Real-Time Socket Integration

QuickModel is an ideal serialization and validation layer for **real-time socket communications**. It guarantees that every message crossing the wire is correctly typed, validated, and stripped of unknown fields — protecting both client and server from malformed or malicious payloads.

## Key Patterns

| Concern                     | QuickModel solution                           |
| --------------------------- | --------------------------------------------- |
| Serialize before sending    | `dto.$qSerialize()` → JSON-safe object        |
| Reconstruct on receive      | `new Dto(JSON.parse(raw))`                    |
| Complex types over the wire | `Date`, `Set`, `Map`, `BigInt` roundtrip      |
| Unknown field stripping     | `unknownPropertyPolicy: 'strip'`              |
| Validate after receive      | `qCheckRules(dto)` / `qCheckRulesAsync(dto)`  |
| Computed enrichment         | `@QComputed()` available after reconstruction |
| Incremental patch           | `existing.$qCopy(patch)` for delta updates    |
| Batch events                | `Dto.createMany(array).instances`             |

## Supported Environments

This guide covers five real-time socket environments, all verified by the integration test suite:

1. [Native WebSocket (browser + Node.js)](#native-websocket)
2. [Socket.IO](#socketio)
3. [Server-Sent Events (SSE)](#server-sent-events-sse)
4. [uWebSockets.js (binary ArrayBuffer)](#uwebsocketsjs)
5. [STOMP over WebSocket](#stomp-over-websocket)

---

## Model Setup

Define your models once. They work identically across all socket environments.

```typescript
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

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
```

---

## Native WebSocket

Works with the browser `WebSocket` API and Node.js [`ws`](https://github.com/websockets/ws) / [`bun`](https://bun.sh/docs/api/websockets).

### Client — Sending

```typescript
const ws = new WebSocket('wss://example.com/chat');

const msg = new ChatMessageDto({
	id: crypto.randomUUID(),
	roomId: 'room-42',
	author: 'Alice',
	text: 'Hello WebSocket world!',
	sentAt: new Date(),
	mentions: new Set(['Bob']),
	metadata: new Map([['source', 'web']]),
});

// serialize() converts Date → ISO string, Set → array, Map → object, BigInt → string
ws.send(JSON.stringify(msg.serialize()));
```

### Server — Receiving (Node.js `ws`)

```typescript
import { WebSocketServer } from 'ws';
import { qCheckRules } from 'quickmodel/forms';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (socket) => {
	socket.on('message', (raw) => {
		const dto = new ChatMessageDto(JSON.parse(raw.toString()));
		const { valid, errors } = qCheckRules(dto);

		if (!valid) {
			socket.send(JSON.stringify({ type: 'error', errors }));
			return;
		}

		// dto.sentAt is a real Date, dto.mentions is a real Set
		console.log(`[${dto.sentAt.toISOString()}] ${dto.author}: ${dto.text}`);
		console.log('Words:', dto.wordCount);

		// Broadcast to all clients
		wss.clients.forEach((client) => {
			if (client.readyState === 1) {
				client.send(JSON.stringify(dto.serialize()));
			}
		});
	});
});
```

### Bidirectional (server → client)

```typescript
// Server pushes presence events
const presenceDto = new PresenceEventDto({
	userId: 'u-99',
	status: 'online',
	lastSeen: new Date(),
	activeRooms: new Set(['room-42']),
});
socket.send(JSON.stringify(presenceDto.serialize()));

// Client receives and reconstructs
ws.onmessage = (evt) => {
	const data = JSON.parse(evt.data);
	const presence = new PresenceEventDto(data);
	// presence.lastSeen is a real Date ✓
	// presence.activeRooms is a real Set ✓
	updateUI(presence);
};
```

---

## Socket.IO

QuickModel integrates with [Socket.IO](https://socket.io) as the payload layer on both client and server, across namespaces and rooms.

### Server Setup

```typescript
import { Server } from 'socket.io';
import { qCheckRules } from 'quickmodel/forms';

const io = new Server(httpServer);

io.on('connection', (socket) => {
	// Reconstruct model from raw event payload
	socket.on('chat:message', (raw, ack) => {
		const dto = new ChatMessageDto(raw);
		const validation = qCheckRules(dto);

		if (!validation.valid) {
			ack?.({ ok: false, errors: validation.errors });
			return;
		}

		// Emit to room — serialize() ensures JSON-safe payload
		io.to(dto.roomId).emit('chat:message', dto.serialize());
		ack?.({ ok: true, id: dto.id });
	});

	socket.on('user:presence', (raw, ack) => {
		const dto = new PresenceEventDto(raw);
		const result = qCheckRules(dto);
		ack?.(result);
		if (result.valid) {
			io.emit('presence:update', dto.serialize());
		}
	});
});
```

### Client Setup

```typescript
import { io } from 'socket.io-client';

const socket = io('wss://example.com');

// Emit with acknowledgement
const msg = new ChatMessageDto({ ... });
socket.emit('chat:message', msg.serialize(), (response) => {
	if (!response.ok) {
		console.error('Validation errors:', response.errors);
	}
});

// Receive and reconstruct
socket.on('chat:message', (raw) => {
	const dto = new ChatMessageDto(raw);
	// dto.sentAt → Date, dto.mentions → Set ✓
	appendMessage(dto);
});

socket.on('presence:update', (raw) => {
	const dto = new PresenceEventDto(raw);
	updatePresence(dto);
});
```

### Incremental Updates with `copy()`

Use `copy()` to apply delta patches from socket events — creates a new immutable instance:

```typescript
let currentUser: PresenceEventDto | null = null;

socket.on('presence:patch', (patch) => {
	if (currentUser) {
		currentUser = currentUser.copy(patch);
	} else {
		currentUser = new PresenceEventDto(patch);
	}
	renderPresence(currentUser);
});
```

---

## Server-Sent Events (SSE)

For unidirectional server → client streams (live feeds, dashboards, notifications).

### Server — Express / Hono

```typescript
import express from 'express';

const app = express();

app.get('/events/stocks', (req, res) => {
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');

	const sendTick = (tick: StockTickDto) => {
		res.write(`event: stock:tick\n`);
		res.write(`data: ${JSON.stringify(tick.serialize())}\n\n`);
	};

	const interval = setInterval(() => {
		const tick = new StockTickDto({
			symbol: 'AAPL',
			price: Math.random() * 200 + 150,
			volume: BigInt(Math.floor(Math.random() * 1_000_000)),
			timestamp: new Date(),
			change: (Math.random() - 0.5) * 5,
			high: 200,
			low: 150,
		});
		sendTick(tick);
	}, 1000);

	req.on('close', () => clearInterval(interval));
});
```

### Client — EventSource

```typescript
const eventSource = new EventSource('/events/stocks');

eventSource.addEventListener('stock:tick', (evt) => {
	const dto = new StockTickDto(JSON.parse(evt.data));
	// dto.timestamp → Date, dto.volume → BigInt ✓
	updateChart(dto);
});

// Multiple event types (multiplexed SSE)
eventSource.addEventListener('chat:message', (evt) => {
	const dto = new ChatMessageDto(JSON.parse(evt.data));
	appendMessage(dto);
});

eventSource.addEventListener('user:presence', (evt) => {
	const dto = new PresenceEventDto(JSON.parse(evt.data));
	updatePresence(dto);
});
```

---

## uWebSockets.js

[uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) delivers the highest WebSocket throughput. Messages arrive as `ArrayBuffer`. QuickModel fits in via `TextEncoder`/`TextDecoder`.

```typescript
import { App } from 'uWebSockets.js';
import { qCheckRules } from 'quickmodel/forms';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

App()
	.ws('/chat', {
		message(ws, message) {
			const raw = decoder.decode(message);
			const dto = new ChatMessageDto(JSON.parse(raw));
			const { valid, errors } = qCheckRules(dto);

			if (!valid) {
				ws.send(
					encoder.encode(JSON.stringify({ type: 'error', errors }))
				);
				return;
			}

			// Broadcast to all subscribers — binary=false for text frames
			ws.publish(
				'room:' + dto.roomId,
				JSON.stringify(dto.serialize()),
				false
			);
		},

		open(ws) {
			ws.subscribe('room:general');
		},
	})
	.listen(9001, () => console.log('uWS listening on 9001'));
```

### Client

```typescript
const ws = new WebSocket('ws://localhost:9001/chat');

const msg = new ChatMessageDto({ ... });
ws.send(JSON.stringify(msg.serialize())); // Plain text frame

ws.onmessage = (evt) => {
	const dto = new ChatMessageDto(JSON.parse(evt.data));
	appendMessage(dto);
};
```

---

## STOMP over WebSocket

[STOMP](https://stomp.github.io/) (Simple Text Oriented Messaging Protocol) layers pub/sub semantics over WebSocket, commonly used with ActiveMQ, RabbitMQ, and Spring.

### With `@stomp/stompjs`

```typescript
import { Client } from '@stomp/stompjs';
import { qCheckRules } from 'quickmodel/forms';

const stompClient = new Client({
	brokerURL: 'ws://localhost:15674/ws',
	onConnect: () => {
		// Subscribe to a topic
		stompClient.subscribe('/topic/chat.general', (frame) => {
			const dto = new ChatMessageDto(JSON.parse(frame.body));
			const { valid } = qCheckRules(dto);
			if (valid) appendMessage(dto);
		});

		stompClient.subscribe('/topic/presence', (frame) => {
			const dto = new PresenceEventDto(JSON.parse(frame.body));
			updatePresence(dto);
		});
	},
});

stompClient.activate();

// Send a message
const msg = new ChatMessageDto({ ... });
stompClient.publish({
	destination: '/app/chat.general',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify(msg.serialize()),
});
```

### With SockJS fallback

```typescript
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const stompClient = new Client({
	webSocketFactory: () => new SockJS('/stomp'),
	onConnect: () => {
		stompClient.subscribe('/topic/chat.general', (frame) => {
			const dto = new ChatMessageDto(JSON.parse(frame.body));
			appendMessage(dto);
		});
	},
});
```

---

## Security Best Practices

### 1. Always use `unknownPropertyPolicy: 'strip'`

```typescript
@Quick(
	{ id: 'string', author: 'string', text: 'string' },
	{ unknownPropertyPolicy: 'strip' } // ← removes isAdmin, _token, etc.
)
class ChatMessageDto extends QModel<IChatMessage> { ... }
```

A malicious WebSocket payload like:

```json
{
	"id": "x1",
	"author": "Hacker",
	"text": "Normal message",
	"isAdmin": true,
	"_internalToken": "secret",
	"role": "superadmin"
}
```

is automatically sanitized — only declared fields survive reconstruction.

### 2. Validate every incoming message

```typescript
socket.on('message', (raw) => {
	let dto: ChatMessageDto;
	try {
		dto = new ChatMessageDto(JSON.parse(raw));
	} catch {
		socket.terminate(); // Malformed JSON
		return;
	}

	const { valid, errors } = qCheckRules(dto);
	if (!valid) {
		socket.send(JSON.stringify({ type: 'validation_error', errors }));
		return;
	}

	// Safe to process
});
```

### 3. Guard against DoS via oversized payloads

```typescript
@QRule((val: string) => val.length <= 4000, 'Message too long')
declare text: string;

@QRule((val: bigint) => val >= 0n && val <= BigInt(Number.MAX_SAFE_INTEGER), 'Volume out of range')
declare volume: bigint;
```

---

## Batch Events with `createMany()`

```typescript
// Server receives a burst of stock ticks
socket.on('stock:batch', (rawArray) => {
	const { instances, errors } = StockTickDto.createMany(rawArray);

	if (errors.length > 0) {
		console.warn('Skipped invalid ticks:', errors.length);
	}

	// instances → StockTickDto[], all with proper Date, BigInt, etc.
	for (const tick of instances) {
		updateOrderBook(tick);
	}
});

// Client sends a batch
const { instances } = StockTickDto.createMany(rawTicks);
socket.emit(
	'stock:batch',
	instances.map((dto) => dto.serialize())
);
```

---

## BigInt over the Wire

`BigInt` cannot be natively serialized by `JSON.stringify`. QuickModel handles this automatically:

```typescript
// Serialization: BigInt → string  (via serialize())
tick.serialize();
// { symbol: 'AAPL', volume: '987654321000', ... }

// Deserialization: string → BigInt  (via new Dto())
const reconstructed = new StockTickDto(serialized);
typeof reconstructed.volume; // 'bigint' ✓
```

> **Tip:** If you need to interop with clients that don't use QuickModel, document your wire format: `volume` is always a numeric string.

---

## Testing

The full integration test suite for WebSocket environments is at:

- `tests/integration/external/websocket-simulation.test.ts`

It covers all 5 environments described above (26 tests), including security attack vectors.

```bash
bun test tests/integration/external/websocket-simulation.test.ts
# 26 pass, 0 fail
```
````
