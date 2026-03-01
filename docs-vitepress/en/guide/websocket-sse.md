# WebSocket & SSE

QuickModel integrates cleanly with real-time transports — WebSockets and
Server-Sent Events (SSE). Because `serialize()` and `deserialize()` are pure
functions that operate on plain objects, you can **drop them into any message
loop** without adapters.

---

## WebSocket — server (Bun / Node.js)

### Sending typed messages

Every outgoing message is serialized with `serialize()`, which converts all
complex types (`Date`, `bigint`, `Set`, `Map`, …) to JSON-safe primitives.

```typescript
import { Quick, QModel } from 'quickmodel';

interface IChatMessage {
	id: string;
	text: string;
	sentAt: string; // ISO string
}

@Quick({ sentAt: Date })
class ChatMessage extends QModel<IChatMessage> {
	declare id: string;
	declare text: string;
	declare sentAt: Date;
}

// Bun WebSocket server
Bun.serve({
	port: 3000,
	websocket: {
		message(ws, raw) {
			// Deserialize incoming message
			const msg = new ChatMessage(JSON.parse(raw as string));
			console.log(msg.sentAt instanceof Date); // true

			// Serialize and broadcast
			ws.send(JSON.stringify(msg.serialize()));
		},
	},
});
```

### Receiving typed messages (client)

```typescript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
	const msg = new ChatMessage(JSON.parse(event.data));
	// msg.sentAt is already a Date object
	console.log(`[${msg.sentAt.toISOString()}] ${msg.text}`);
};

// Send a message
const outgoing = new ChatMessage({
	id: crypto.randomUUID(),
	text: 'Hello!',
	sentAt: new Date(),
});
ws.send(outgoing.toJSON());
```

---

## WebSocket — Next.js App Router (route handler)

Next.js does not yet support `GET` route handlers with native WebSocket upgrades.
Use a custom server or a library like `ws` on Node.js instead:

```typescript
// server.ts (Node.js + ws)
import { WebSocketServer } from 'ws';
import { ChatMessage } from './models';

const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', (socket) => {
	socket.on('message', (raw) => {
		const msg = new ChatMessage(JSON.parse(raw.toString()));
		console.log(msg.sentAt instanceof Date); // true

		// Echo back serialized
		socket.send(JSON.stringify(msg.serialize()));
	});
});
```

---

## Server-Sent Events (SSE)

SSE is a one-way server → client push channel. QuickModel fits naturally as
the serialization layer for each event payload.

### Bun / Hono SSE handler

```typescript
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { Quick, QModel } from 'quickmodel';

interface IStockTick {
	symbol: string;
	price: number;
	ts: string;
}

@Quick({ ts: Date })
class StockTick extends QModel<IStockTick> {
	declare symbol: string;
	declare price: number;
	declare ts: Date;
}

const app = new Hono();

app.get('/stocks/:symbol', (ctx) =>
	streamSSE(ctx, async (stream) => {
		let seq = 0;
		while (true) {
			const tick = new StockTick({
				symbol: ctx.req.param('symbol'),
				price: 100 + Math.random(),
				ts: new Date(),
			});

			await stream.writeSSE({
				data: JSON.stringify(tick.serialize()),
				event: 'tick',
				id: String(seq++),
			});

			await stream.sleep(1000);
		}
	})
);
```

### Next.js App Router SSE route

```typescript
// app/api/events/route.ts
import { Quick, QModel } from 'quickmodel';

interface IEvent {
	type: string;
	payload: string;
	ts: string;
}

@Quick({ ts: Date })
class AppEvent extends QModel<IEvent> {
	declare type: string;
	declare payload: string;
	declare ts: Date;
}

export async function GET() {
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			for (let idx = 0; idx < 5; idx++) {
				const event = new AppEvent({
					type: 'ping',
					payload: `message-${idx}`,
					ts: new Date(),
				});

				const data = `data: ${JSON.stringify(event.serialize())}\n\n`;
				controller.enqueue(encoder.encode(data));
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
			controller.close();
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	});
}
```

### Consuming SSE on the client

```typescript
const source = new EventSource('/api/events');

source.addEventListener('tick', (event) => {
	const tick = new StockTick(JSON.parse(event.data));
	console.log(tick.ts instanceof Date); // true
	console.log(tick.price);
});

source.onerror = () => source.close();
```

---

## Validation before sending

Use `isValid()` or `checkRules()` to guard outgoing messages:

```typescript
ws.on('message', (raw) => {
	const msg = new ChatMessage(JSON.parse(raw.toString()));

	if (!msg.isValid()) {
		const { rules } = msg.validationReport();
		ws.send(JSON.stringify({ error: rules.errors }));
		return;
	}

	broadcast(msg.serialize());
});
```

---

## Tips

| Scenario                                 | Recommendation                                                   |
| ---------------------------------------- | ---------------------------------------------------------------- |
| High-frequency ticks (>1 000/s)          | Use `@Quick({}, { performance: { disableSafetyChecks: true } })` |
| Unknown properties from external sources | Use `unknownPropertyPolicy: 'keep'`                              |
| Large binary payloads                    | Use `toReadableStream()` + `pipeStream()` instead of JSON        |
| Per-connection model variant             | Use `QModel.configure()` static config per class                 |
