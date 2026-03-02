````markdown
# Integración con WebSocket y Sockets en Tiempo Real

QuickModel es una capa ideal de serialización y validación para **comunicaciones en tiempo real mediante sockets**. Garantiza que cada mensaje que cruza el canal esté correctamente tipado, validado y sin campos desconocidos — protegiendo tanto al cliente como al servidor de payloads malformados o maliciosos.

## Patrones Clave

| Preocupación                 | Solución QuickModel                            |
| ---------------------------- | ---------------------------------------------- |
| Serializar antes de enviar   | `dto.$qSerialize()` → objeto JSON-safe         |
| Reconstruir al recibir       | `new Dto(JSON.parse(raw))`                     |
| Tipos complejos por el canal | Roundtrip de `Date`, `Set`, `Map`, `BigInt`    |
| Eliminación de campos extra  | `unknownPropertyPolicy: 'strip'`               |
| Validar tras recibir         | `qCheckRules(dto)` / `qCheckRulesAsync(dto)`   |
| Propiedades computadas       | `@QComputed()` disponibles tras reconstrucción |
| Actualización incremental    | `existing.$qCopy(patch)` para deltas           |
| Eventos en lote              | `Dto.createMany(array).instances`              |

## Entornos Soportados

Esta guía cubre cinco entornos de sockets en tiempo real, todos verificados por la suite de tests de integración:

1. [WebSocket Nativo (browser + Node.js)](#websocket-nativo)
2. [Socket.IO](#socketio)
3. [Server-Sent Events (SSE)](#server-sent-events-sse)
4. [uWebSockets.js (binary ArrayBuffer)](#uwebsocketsjs)
5. [STOMP sobre WebSocket](#stomp-sobre-websocket)

---

## Definición de Modelos

Define tus modelos una sola vez. Funcionan de forma idéntica en todos los entornos de socket.

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
	@QRule((val: string) => val.length > 0, 'ID obligatorio')
	declare id: string;

	@QField({ label: 'Autor', required: true })
	@QRule((val: string) => val.length >= 2, 'Nombre demasiado corto')
	declare author: string;

	@QField({ label: 'Texto', required: true })
	@QRule(
		(val: string) => val.length > 0 && val.length <= 4000,
		'Longitud inválida'
	)
	declare text: string;

	@QField({ label: 'Enviado el' })
	declare sentAt: Date;

	@QField({ label: 'Menciones' })
	declare mentions: Set<string>;

	@QField({ label: 'Metadatos' })
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

## WebSocket Nativo

Compatible con la API `WebSocket` del navegador y con [`ws`](https://github.com/websockets/ws) / [`bun`](https://bun.sh/docs/api/websockets) en Node.js.

### Cliente — Envío

```typescript
const ws = new WebSocket('wss://example.com/chat');

const msg = new ChatMessageDto({
	id: crypto.randomUUID(),
	roomId: 'room-42',
	author: 'Alice',
	text: '¡Hola WebSocket!',
	sentAt: new Date(),
	mentions: new Set(['Bob']),
	metadata: new Map([['origen', 'web']]),
});

// $qSerialize() convierte Date → ISO string, Set → array, Map → objeto, BigInt → string
ws.send(JSON.stringify(msg.$qSerialize()));
```

### Servidor — Recepción (Node.js `ws`)

```typescript
import { WebSocketServer } from 'ws';
import { qCheckRules } from 'quickmodel/forms';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (socket) => {
	socket.on('message', (raw) => {
		const dto = new ChatMessageDto(JSON.parse(raw.toString()));
		const { valid, errors } = qCheckRules(dto);

		if (!valid) {
			socket.send(JSON.stringify({ tipo: 'error', errors }));
			return;
		}

		// dto.sentAt es un Date real, dto.mentions es un Set real ✓
		console.log(`[${dto.sentAt.toISOString()}] ${dto.author}: ${dto.text}`);
		console.log('Palabras:', dto.wordCount);

		// Broadcast a todos los clientes
		wss.clients.forEach((client) => {
			if (client.readyState === 1) {
				client.send(JSON.stringify(dto.$qSerialize()));
			}
		});
	});
});
```

### Bidireccional (servidor → cliente)

```typescript
// El servidor envía eventos de presencia
const presenceDto = new PresenceEventDto({
	userId: 'u-99',
	status: 'online',
	lastSeen: new Date(),
	activeRooms: new Set(['room-42']),
});
socket.send(JSON.stringify(presenceDto.$qSerialize()));

// El cliente recibe y reconstruye
ws.onmessage = (evt) => {
	const data = JSON.parse(evt.data);
	const presence = new PresenceEventDto(data);
	// presence.lastSeen es un Date real ✓
	// presence.activeRooms es un Set real ✓
	actualizarUI(presence);
};
```

---

## Socket.IO

QuickModel se integra con [Socket.IO](https://socket.io) como capa de payload tanto en cliente como en servidor, a través de namespaces y rooms.

### Configuración del Servidor

```typescript
import { Server } from 'socket.io';
import { qCheckRules } from 'quickmodel/forms';

const io = new Server(httpServer);

io.on('connection', (socket) => {
	// Reconstruir el modelo desde el payload del evento
	socket.on('chat:message', (raw, ack) => {
		const dto = new ChatMessageDto(raw);
		const validation = qCheckRules(dto);

		if (!validation.valid) {
			ack?.({ ok: false, errors: validation.errors });
			return;
		}

		// Emitir a la sala — $qSerialize() garantiza payload JSON-safe
		io.to(dto.roomId).emit('chat:message', dto.$qSerialize());
		ack?.({ ok: true, id: dto.id });
	});

	socket.on('user:presence', (raw, ack) => {
		const dto = new PresenceEventDto(raw);
		const result = qCheckRules(dto);
		ack?.(result);
		if (result.valid) {
			io.emit('presence:update', dto.$qSerialize());
		}
	});
});
```

### Configuración del Cliente

```typescript
import { io } from 'socket.io-client';

const socket = io('wss://example.com');

// Emitir con acuse de recibo
const msg = new ChatMessageDto({ ... });
socket.emit('chat:message', msg.$qSerialize(), (response) => {
	if (!response.ok) {
		console.error('Errores de validación:', response.errors);
	}
});

// Recibir y reconstruir
socket.on('chat:message', (raw) => {
	const dto = new ChatMessageDto(raw);
	// dto.sentAt → Date, dto.mentions → Set ✓
	agregarMensaje(dto);
});

socket.on('presence:update', (raw) => {
	const dto = new PresenceEventDto(raw);
	actualizarPresencia(dto);
});
```

### Actualizaciones Incrementales con `$qCopy()`

Usa `$qCopy()` para aplicar parches delta desde eventos de socket — crea una nueva instancia inmutable:

```typescript
let currentUser: PresenceEventDto | null = null;

socket.on('presence:patch', (patch) => {
	if (currentUser) {
		currentUser = currentUser.$qCopy(patch);
	} else {
		currentUser = new PresenceEventDto(patch);
	}
	renderPresence(currentUser);
});
```

---

## Server-Sent Events (SSE)

Para streams unidireccionales servidor → cliente (feeds en vivo, dashboards, notificaciones).

### Servidor — Express / Hono

```typescript
import express from 'express';

const app = express();

app.get('/eventos/stocks', (req, res) => {
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');

	const enviarTick = (tick: StockTickDto) => {
		res.write(`event: stock:tick\n`);
		res.write(`data: ${JSON.stringify(tick.$qSerialize())}\n\n`);
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
		enviarTick(tick);
	}, 1000);

	req.on('close', () => clearInterval(interval));
});
```

### Cliente — EventSource

```typescript
const eventSource = new EventSource('/eventos/stocks');

eventSource.addEventListener('stock:tick', (evt) => {
	const dto = new StockTickDto(JSON.parse(evt.data));
	// dto.timestamp → Date, dto.volume → BigInt ✓
	actualizarGrafico(dto);
});

// Múltiples tipos de evento (SSE multiplexado)
eventSource.addEventListener('chat:message', (evt) => {
	const dto = new ChatMessageDto(JSON.parse(evt.data));
	agregarMensaje(dto);
});

eventSource.addEventListener('user:presence', (evt) => {
	const dto = new PresenceEventDto(JSON.parse(evt.data));
	actualizarPresencia(dto);
});
```

---

## uWebSockets.js

[uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) ofrece el mayor rendimiento de WebSocket. Los mensajes llegan como `ArrayBuffer`. QuickModel encaja perfectamente vía `TextEncoder`/`TextDecoder`.

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
					encoder.encode(JSON.stringify({ tipo: 'error', errors }))
				);
				return;
			}

			// Broadcast a todos los suscriptores — binary=false para frames de texto
			ws.publish(
				'sala:' + dto.roomId,
				JSON.stringify(dto.$qSerialize()),
				false
			);
		},

		open(ws) {
			ws.subscribe('sala:general');
		},
	})
	.listen(9001, () => console.log('uWS escuchando en 9001'));
```

### Cliente

```typescript
const ws = new WebSocket('ws://localhost:9001/chat');

const msg = new ChatMessageDto({ ... });
ws.send(JSON.stringify(msg.$qSerialize())); // Frame de texto

ws.onmessage = (evt) => {
	const dto = new ChatMessageDto(JSON.parse(evt.data));
	agregarMensaje(dto);
};
```

---

## STOMP sobre WebSocket

[STOMP](https://stomp.github.io/) (Simple Text Oriented Messaging Protocol) añade semántica pub/sub sobre WebSocket, comúnmente utilizado con ActiveMQ, RabbitMQ y Spring.

### Con `@stomp/stompjs`

```typescript
import { Client } from '@stomp/stompjs';
import { qCheckRules } from 'quickmodel/forms';

const stompClient = new Client({
	brokerURL: 'ws://localhost:15674/ws',
	onConnect: () => {
		// Suscribirse a un topic
		stompClient.subscribe('/topic/chat.general', (frame) => {
			const dto = new ChatMessageDto(JSON.parse(frame.body));
			const { valid } = qCheckRules(dto);
			if (valid) agregarMensaje(dto);
		});

		stompClient.subscribe('/topic/presencia', (frame) => {
			const dto = new PresenceEventDto(JSON.parse(frame.body));
			actualizarPresencia(dto);
		});
	},
});

stompClient.activate();

// Enviar un mensaje
const msg = new ChatMessageDto({ ... });
stompClient.publish({
	destination: '/app/chat.general',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify(msg.$qSerialize()),
});
```

### Con fallback SockJS

```typescript
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const stompClient = new Client({
	webSocketFactory: () => new SockJS('/stomp'),
	onConnect: () => {
		stompClient.subscribe('/topic/chat.general', (frame) => {
			const dto = new ChatMessageDto(JSON.parse(frame.body));
			agregarMensaje(dto);
		});
	},
});
```

---

## Seguridad — Buenas Prácticas

### 1. Usar siempre `unknownPropertyPolicy: 'strip'`

```typescript
@Quick(
	{ id: 'string', author: 'string', text: 'string' },
	{ unknownPropertyPolicy: 'strip' } // ← elimina isAdmin, _token, etc.
)
class ChatMessageDto extends QModel<IChatMessage> { ... }
```

Un payload malicioso vía WebSocket como:

```json
{
	"id": "x1",
	"author": "Hacker",
	"text": "Mensaje normal",
	"isAdmin": true,
	"_internalToken": "secreto",
	"role": "superadmin"
}
```

es saneado automáticamente — solo sobreviven los campos declarados.

### 2. Validar cada mensaje entrante

```typescript
socket.on('message', (raw) => {
	let dto: ChatMessageDto;
	try {
		dto = new ChatMessageDto(JSON.parse(raw));
	} catch {
		socket.terminate(); // JSON malformado
		return;
	}

	const { valid, errors } = qCheckRules(dto);
	if (!valid) {
		socket.send(JSON.stringify({ tipo: 'error_validacion', errors }));
		return;
	}

	// Seguro para procesar
});
```

### 3. Protegerse contra DoS por payloads sobredimensionados

```typescript
@QRule((val: string) => val.length <= 4000, 'Mensaje demasiado largo')
declare text: string;

@QRule((val: bigint) => val >= 0n && val <= BigInt(Number.MAX_SAFE_INTEGER), 'Volumen fuera de rango')
declare volume: bigint;
```

---

## Eventos en Lote con `createMany()`

```typescript
// El servidor recibe una ráfaga de ticks bursátiles
socket.on('stock:batch', (rawArray) => {
	const { instances, errors } = StockTickDto.createMany(rawArray);

	if (errors.length > 0) {
		console.warn('Ticks inválidos omitidos:', errors.length);
	}

	// instances → StockTickDto[], todos con Date, BigInt correctos ✓
	for (const tick of instances) {
		actualizarLibroOrdenes(tick);
	}
});

// El cliente envía un lote
const { instances } = StockTickDto.createMany(rawTicks);
socket.emit(
	'stock:batch',
	instances.map((dto) => dto.$qSerialize())
);
```

---

## BigInt por el Canal

`BigInt` no es serializable nativamente por `JSON.stringify`. QuickModel lo gestiona automáticamente:

```typescript
// Serialización: BigInt → string  (vía $qSerialize())
tick.$qSerialize();
// { symbol: 'AAPL', volume: '987654321000', ... }

// Deserialización: string → BigInt  (vía new Dto())
const reconstructed = new StockTickDto(serialized);
typeof reconstructed.volume; // 'bigint' ✓
```

> **Consejo:** Si necesitas interoperar con clientes que no usan QuickModel, documenta tu formato wire: `volume` siempre es una cadena numérica.

---

## Tests

La suite completa de tests de integración para entornos WebSocket se encuentra en:

- `tests/integration/external/websocket-simulation.test.ts`

Cubre los 5 entornos descritos (26 tests), incluyendo vectores de ataque de seguridad.

```bash
bun test tests/integration/external/websocket-simulation.test.ts
# 26 pass, 0 fail
```
````
