# WebSocket y SSE

QuickModel se integra de forma natural con transportes en tiempo real: WebSockets
y Server-Sent Events (SSE). Dado que `serialize()` y `deserialize()` son funciones
puras que operan sobre objetos planos, puedes **insertarlos en cualquier loop de
mensajes** sin adaptadores adicionales.

---

## WebSocket — servidor (Bun / Node.js)

### Enviar mensajes tipados

Cada mensaje saliente se serializa con `serialize()`, que convierte todos los
tipos complejos (`Date`, `bigint`, `Set`, `Map`, …) a primitivos seguros para JSON.

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

// Servidor WebSocket con Bun
Bun.serve({
	port: 3000,
	websocket: {
		message(ws, raw) {
			// Deserializar mensaje entrante
			const msg = new ChatMessage(JSON.parse(raw as string));
			console.log(msg.sentAt instanceof Date); // true

			// Serializar y emitir
			ws.send(JSON.stringify(msg.$qSerialize()));
		},
	},
});
```

### Recibir mensajes tipados (cliente)

```typescript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
	const msg = new ChatMessage(JSON.parse(event.data));
	// msg.sentAt ya es un objeto Date
	console.log(`[${msg.sentAt.toISOString()}] ${msg.text}`);
};

// Enviar un mensaje
const salida = new ChatMessage({
	id: crypto.randomUUID(),
	text: '¡Hola!',
	sentAt: new Date(),
});
ws.send(salida.toJSON());
```

---

## WebSocket — Next.js App Router (route handler)

Next.js todavía no soporta `GET` route handlers con upgrade nativo a WebSocket.
Usa un servidor personalizado o la librería `ws` en Node.js:

```typescript
// server.ts (Node.js + ws)
import { WebSocketServer } from 'ws';
import { ChatMessage } from './models';

const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', (socket) => {
	socket.on('message', (raw) => {
		const msg = new ChatMessage(JSON.parse(raw.toString()));
		console.log(msg.sentAt instanceof Date); // true

		// Echo con serialización
		socket.send(JSON.stringify(msg.$qSerialize()));
	});
});
```

---

## Server-Sent Events (SSE)

SSE es un canal unidireccional servidor → cliente. QuickModel encaja perfectamente
como capa de serialización para cada payload de evento.

### Handler SSE con Bun / Hono

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
				data: JSON.stringify(tick.$qSerialize()),
				event: 'tick',
				id: String(seq++),
			});

			await stream.sleep(1000);
		}
	})
);
```

### Ruta SSE con Next.js App Router

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
					payload: `mensaje-${idx}`,
					ts: new Date(),
				});

				const data = `data: ${JSON.stringify(event.$qSerialize())}\n\n`;
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

### Consumir SSE en el cliente

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

## Validación antes de enviar

Usa `isValid()` o `checkRules()` para proteger los mensajes salientes:

```typescript
ws.on('message', (raw) => {
	const msg = new ChatMessage(JSON.parse(raw.toString()));

	if (!msg.$qIsValid()) {
		const { rules } = msg.$qValidationReport();
		ws.send(JSON.stringify({ error: rules.errors }));
		return;
	}

	difundir(msg.$qSerialize());
});
```

---

## Consejos

| Escenario                                    | Recomendación                                                    |
| -------------------------------------------- | ---------------------------------------------------------------- |
| Ticks de alta frecuencia (>1 000/s)          | Usa `@Quick({}, { performance: { disableSafetyChecks: true } })` |
| Propiedades desconocidas de fuentes externas | Usa `unknownPropertyPolicy: 'keep'`                              |
| Payloads binarios grandes                    | Usa `toReadableStream()` + `pipeStream()` en lugar de JSON       |
| Variante de modelo por conexión              | Usa `QModel.configure()` con `static config` por clase           |
