# Socket.io Integration

Socket.io is the most widely used real-time bidirectional communication library. QuickModel gives
every incoming and outgoing message a typed DTO — coercion happens at the boundary so your event
handlers always receive clean, typed instances.

## Key patterns

| Use case                       | QuickModel solution                                |
| ------------------------------ | -------------------------------------------------- |
| Incoming event validation      | `new EventDto(data)` + `$qCheckRules()` on receive |
| Outgoing message serialization | `$qSerialize()` before `socket.emit()`             |
| Room/namespace typed payloads  | Per-event DTO per namespace                        |
| Bulk state sync on connect     | `createMany()` for initial state broadcast         |
| Optimistic update + rollback   | `$qCopy()` client-side, revert on ack error        |
| Acknowledgement validation     | DTO in ack callback                                |

## Defining Event DTOs

```typescript
// shared/dto/chat-message.dto.ts
// (importable on both server and browser — Socket.io supports shared types)
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

	@QField({ label: 'Message', required: true })
	@QRule((v: string) => v.trim().length > 0, 'Message cannot be empty')
	@QRule((v: string) => v.length <= 2000, 'Message too long (max 2000 chars)')
	declare content: string;

	declare createdAt: Date;

	@QComputed()
	get preview(): string {
		return this.content.slice(0, 60);
	}
}
```

## Server — Validating Incoming Events

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

		// Broadcast to room — $qSerialize() ensures clean plain object
		io.to(dto.roomId).emit('message:new', dto.$qSerialize());
		ack?.({ ok: true, id: dto.id });
	});

	socket.on('room:join', (data: unknown) => {
		const dto = new UserJoinDto(data as object);
		const { valid } = dto.$qCheckRules();
		if (!valid) {
			socket.emit('error', { message: 'Invalid join payload' });
			return;
		}
		socket.join(dto.roomId);
		socket.emit('room:joined', { roomId: dto.roomId });
	});
}
```

## Server — Initial State Broadcast on Connect

Send the current state on connect using `createMany()`:

```typescript
socket.on('connect', async () => {
	const raw: unknown[] = await db.messages.findMany({
		where: { roomId: socket.data.roomId },
		orderBy: { createdAt: 'asc' },
		take: 50,
	});

	const { instances } = ChatMessageDto.createMany(raw);

	// $qSerialize() on each — ensures Date → ISO string conversion for the wire
	socket.emit(
		'messages:history',
		instances.map((msg) => msg.$qSerialize())
	);
});
```

## Client — Emitting Typed Events

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
		id: '', // server assigns
		roomId,
		authorId: currentUserId(),
		content,
		createdAt: new Date(),
	});

	// Validate on the client before even sending
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
				else reject(new Error('Server rejected message'));
			}
		);
	});
}
```

## Client — Receiving and Hydrating Events

```typescript
import { ChatMessageDto } from '../shared/dto/chat-message.dto';

// Hydrate incoming messages into typed DTOs
socket.on('message:new', (raw: unknown) => {
	const msg = new ChatMessageDto(raw as object);
	// msg.createdAt is now a real Date (coerced by @Quick)
	// msg.preview is available (@QComputed)
	appendMessage(msg);
});

socket.on('messages:history', (rawMessages: unknown[]) => {
	const { instances } = ChatMessageDto.createMany(rawMessages);
	setMessages(instances); // full typed array
});
```

## Optimistic Update with `$qCopy()` + Rollback

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

		// Optimistically add to UI
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
							reject(new Error('Failed to send'));
						} else {
							// Replace temp with server-confirmed message
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
			// Rollback — remove optimistic message on failure
			set((state) => {
				const next = new Map(state.messages);
				next.delete(tempId);
				return { messages: next };
			});
		}
	},
}));
```

## Namespace-Based Event Typing

Use different DTOs for different namespaces:

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

// Broadcast to a specific user
export function notifyUser(io: Server, userId: string, payload: INotification) {
	const dto = new NotificationDto({ ...payload, sentAt: new Date() });
	io.of('/notifications')
		.to(`user:${userId}`)
		.emit('notification', dto.$qSerialize());
}
```

## Async Validation — Rate Limiting Check

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

		// Async rule: check rate limit per user
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

## Comparison: Socket.io + QuickModel vs Raw JSON

| Concern                   | Raw JSON (no QuickModel)       | With QuickModel                          |
| ------------------------- | ------------------------------ | ---------------------------------------- |
| Date fields from the wire | `string` — manual `new Date()` | Auto-coerced by `@Quick({ date: Date })` |
| Unknown field protection  | Manual spread/pick             | `unknownPropertyPolicy: 'strip'`         |
| Validation before emit    | Custom guard functions         | `$qCheckRules()` on DTO                  |
| Typed acknowledgements    | `as unknown as AckType`        | DTO with full type inference             |
| Rehydration on receive    | Cast + manual transform        | `new EventDto(raw)` — one line           |
| Optimistic rollback       | Clone object manually          | `$qCopy()` + Map replacement             |

## See Also

- [WebSocket Integration](./websocket-integration) — generic WebSocket patterns
- [Backend Integration](./backend-integration) — Express / Fastify server setup
- [Validation](/en/guide/validation) — `@QRule` decorators
