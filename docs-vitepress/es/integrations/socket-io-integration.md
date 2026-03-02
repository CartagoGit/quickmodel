# Integración con Socket.io

Socket.io es la librería de comunicación bidireccional en tiempo real más utilizada. QuickModel
asigna un DTO tipado a cada mensaje entrante y saliente — la coerción ocurre en el límite para que
tus manejadores de eventos reciban siempre instancias limpias y tipadas.

## Patrones clave

| Caso de uso                          | Solución QuickModel                                |
| ------------------------------------ | -------------------------------------------------- |
| Validación de evento entrante        | `new EventDto(data)` + `$qCheckRules()` al recibir |
| Serialización de mensaje saliente    | `$qSerialize()` antes de `socket.emit()`           |
| Payloads tipados por sala/namespace  | DTO por evento por namespace                       |
| Sincronización de estado al conectar | `createMany()` para broadcast del estado inicial   |
| Actualización optimista + rollback   | `$qCopy()` en el cliente, revertir en error de ack |
| Validación de acknowledgement        | DTO en el callback de ack                          |

## Definiendo DTOs de Eventos

```typescript
// shared/dto/chat-message.dto.ts
// (importable tanto en servidor como en navegador — Socket.io soporta tipos compartidos)
import { QModel, Quick, QField, QRule, QComputed } from 'quickmodel';

interface IChatMessage {
	id: string;
	roomId: string;
	authorId: string;
	content: string;
	createdAt: Date;
}

@Quick(
	{
		id: 'string',
		roomId: 'string',
		authorId: 'string',
		content: 'string',
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip' }
)
export class ChatMessageDto extends QModel<IChatMessage> {
	declare id: string;
	declare roomId: string;
	declare authorId: string;

	@QField({ label: 'Mensaje', required: true })
	@QRule(
		(v: string) => v.trim().length > 0,
		'El mensaje no puede estar vacío'
	)
	@QRule(
		(v: string) => v.length <= 2000,
		'Mensaje demasiado largo (máx. 2000 chars)'
	)
	declare content: string;

	declare createdAt: Date;

	@QComputed()
	get preview(): string {
		return this.content.slice(0, 60);
	}
}
```

## Servidor — Validar Eventos Entrantes

```typescript
// server/socket-handlers.ts
import { Server, Socket } from 'socket.io';
import { ChatMessageDto } from '../shared/dto/chat-message.dto';
import { UserJoinDto } from '../shared/dto/user-join.dto';

export function registerChatHandlers(io: Server, socket: Socket) {
	socket.on('message:send', (data: unknown, ack?: (res: object) => void) => {
		const dto = new ChatMessageDto({
			...(data as object),
			id: crypto.randomUUID(),
			createdAt: new Date(),
		});

		const { valid, errors } = dto.$qCheckRules();
		if (!valid) {
			ack?.({ ok: false, errors });
			return;
		}

		// Broadcast a la sala — $qSerialize() garantiza un objeto plano limpio
		io.to(dto.roomId).emit('message:new', dto.$qSerialize());
		ack?.({ ok: true, id: dto.id });
	});

	socket.on('room:join', (data: unknown) => {
		const dto = new UserJoinDto(data as object);
		const { valid } = dto.$qCheckRules();
		if (!valid) {
			socket.emit('error', { message: 'Payload de unión inválido' });
			return;
		}
		socket.join(dto.roomId);
		socket.emit('room:joined', { roomId: dto.roomId });
	});
}
```

## Servidor — Broadcast del Estado Inicial al Conectar

Envía el estado actual al conectar usando `createMany()`:

```typescript
socket.on('connect', async () => {
	const raw: unknown[] = await db.messages.findMany({
		where: { roomId: socket.data.roomId },
		orderBy: { createdAt: 'asc' },
		take: 50,
	});

	const { instances } = ChatMessageDto.createMany(raw);

	// $qSerialize() en cada uno — garantiza la conversión Date → ISO string para el wire
	socket.emit(
		'messages:history',
		instances.map((msg) => msg.$qSerialize())
	);
});
```

## Cliente — Emitir Eventos Tipados

```typescript
// client/chat.service.ts
import { io, Socket } from 'socket.io-client';
import { ChatMessageDto } from '../shared/dto/chat-message.dto';

const socket: Socket = io('wss://chat.example.com');

export async function sendMessage(
	roomId: string,
	content: string
): Promise<void> {
	const dto = new ChatMessageDto({
		id: '', // el servidor asigna
		roomId,
		authorId: currentUserId(),
		content,
		createdAt: new Date(),
	});

	// Validar en el cliente antes de enviar
	const { valid, errors } = dto.$qCheckRules();
	if (!valid) {
		throw new Error(errors.map((e) => e.message).join(', '));
	}

	return new Promise((resolve, reject) => {
		socket.emit(
			'message:send',
			dto.$qSerialize(),
			(ack: { ok: boolean; errors?: object[] }) => {
				if (ack.ok) resolve();
				else reject(new Error('El servidor rechazó el mensaje'));
			}
		);
	});
}
```

## Cliente — Recibir e Hidratar Eventos

```typescript
import { ChatMessageDto } from '../shared/dto/chat-message.dto';

// Hidratar mensajes entrantes en DTOs tipados
socket.on('message:new', (raw: unknown) => {
	const msg = new ChatMessageDto(raw as object);
	// msg.createdAt es ahora un Date real (coercionado por @Quick)
	// msg.preview está disponible (@QComputed)
	appendMessage(msg);
});

socket.on('messages:history', (rawMessages: unknown[]) => {
	const { instances } = ChatMessageDto.createMany(rawMessages);
	setMessages(instances); // array tipado completo
});
```

## Actualización Optimista con `$qCopy()` + Rollback

```typescript
// client/store/messages.store.ts
import { create } from 'zustand';
import { ChatMessageDto } from '../shared/dto/chat-message.dto';

interface IMessageStore {
	messages: Map<string, ChatMessageDto>;
	sendMessage: (content: string, roomId: string) => Promise<void>;
}

export const useMessageStore = create<IMessageStore>((set, get) => ({
	messages: new Map(),

	sendMessage: async (content, roomId) => {
		const tempId = `temp_${Date.now()}`;
		const optimistic = new ChatMessageDto({
			id: tempId,
			roomId,
			authorId: currentUserId(),
			content,
			createdAt: new Date(),
		});

		// Añadir optimistamente a la UI
		set((state) => {
			const next = new Map(state.messages);
			next.set(tempId, optimistic);
			return { messages: next };
		});

		try {
			await new Promise<void>((resolve, reject) => {
				socket.emit(
					'message:send',
					optimistic.$qSerialize(),
					(ack: { ok: boolean; id?: string }) => {
						if (!ack.ok) {
							reject(new Error('Falló el envío'));
						} else {
							// Reemplazar temp por el mensaje confirmado por el servidor
							set((state) => {
								const next = new Map(state.messages);
								next.delete(tempId);
								const confirmed = optimistic.$qCopy({
									id: ack.id!,
								}) as ChatMessageDto;
								next.set(ack.id!, confirmed);
								return { messages: next };
							});
							resolve();
						}
					}
				);
			});
		} catch {
			// Rollback — eliminar el mensaje optimista en caso de error
			set((state) => {
				const next = new Map(state.messages);
				next.delete(tempId);
				return { messages: next };
			});
		}
	},
}));
```

## Tipado Basado en Namespace

Usa DTOs diferentes para cada namespace:

```typescript
// server/namespaces/notifications.namespace.ts
import { Server } from 'socket.io';
import { NotificationDto } from '../shared/dto/notification.dto';
import { PushSubscriptionDto } from '../shared/dto/push-subscription.dto';

export function setupNotificationsNamespace(io: Server) {
	const ns = io.of('/notifications');

	ns.on('connection', (socket) => {
		socket.on('subscribe', (data: unknown) => {
			const dto = new PushSubscriptionDto(data as object);
			const { valid } = dto.$qCheckRules();
			if (!valid) return;

			socket.join(`user:${dto.userId}`);
		});
	});
}

// Broadcast a un usuario específico
export function notifyUser(io: Server, userId: string, payload: INotification) {
	const dto = new NotificationDto({ ...payload, sentAt: new Date() });
	io.of('/notifications')
		.to(`user:${userId}`)
		.emit('notification', dto.$qSerialize());
}
```

## Validación Asíncrona — Comprobación de Rate Limiting

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';
import { ChatMessageDto } from '../shared/dto/chat-message.dto';

socket.on(
	'message:send',
	async (data: unknown, ack?: (res: object) => void) => {
		const dto = new ChatMessageDto({
			...(data as object),
			id: crypto.randomUUID(),
			createdAt: new Date(),
		});

		// Regla asíncrona: comprobar rate limit por usuario
		const result = await qCheckRulesAsync(dto, { mode: 'serial' });
		if (!result.valid) {
			ack?.({ ok: false, errors: result.errors });
			return;
		}

		io.to(dto.roomId).emit('message:new', dto.$qSerialize());
		ack?.({ ok: true });
	}
);
```

## Comparativa: Socket.io + QuickModel vs JSON Sin Tipar

| Aspecto                        | JSON sin QuickModel            | Con QuickModel                                |
| ------------------------------ | ------------------------------ | --------------------------------------------- |
| Campos Date del wire           | `string` — `new Date()` manual | Auto-coercionado por `@Quick({ date: Date })` |
| Protección contra campos extra | Spread/pick manual             | `unknownPropertyPolicy: 'strip'`              |
| Validación antes de emitir     | Funciones guard personalizadas | `$qCheckRules()` sobre el DTO                 |
| Acknowledgements tipados       | `as unknown as AckType`        | DTO con inferencia de tipos completa          |
| Rehidratación al recibir       | Cast + transformación manual   | `new EventDto(raw)` — una línea               |
| Rollback optimista             | Clonar objeto manualmente      | `$qCopy()` + reemplazo en Map                 |

## Ver también

- [Integración con WebSocket](./websocket-integration) — patrones WebSocket genéricos
- [Integración con Backend](./backend-integration) — configuración de servidor Express / Fastify
- [Validación](/es/guide/validation) — decoradores `@QRule`
