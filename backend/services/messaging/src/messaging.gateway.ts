import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

@WebSocketGateway({
  namespace: '/messaging',
  cors: {
    origin: '*',
  },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private logger: Logger = new Logger('MessagingGateway');

  // ========== CONNECTION HANDLING ==========

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ========== JOIN ROOM ==========

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, payload: { conversationId: string; userId: string }) {
    const { conversationId, userId } = payload;
    client.join(`conversation:${conversationId}`);
    this.logger.log(`User ${userId} joined conversation room: ${conversationId}`);

    // Notify other participants
    client.to(`conversation:${conversationId}`).emit('userJoined', {
      userId,
      conversationId,
    });
  }

  // ========== LEAVE ROOM ==========

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, payload: { conversationId: string; userId: string }) {
    const { conversationId, userId } = payload;
    client.leave(`conversation:${conversationId}`);
    this.logger.log(`User ${userId} left conversation room: ${conversationId}`);

    // Notify other participants
    client.to(`conversation:${conversationId}`).emit('userLeft', {
      userId,
      conversationId,
    });
  }

  // ========== HANDLE MESSAGE ==========

  @SubscribeMessage('sendMessage')
  handleMessage(client: Socket, payload: { conversationId: string; message: any }) {
    const { conversationId, message } = payload;

    // Broadcast message to all participants in the room
    this.server.to(`conversation:${conversationId}`).emit('newMessage', {
      ...message,
      conversationId,
      createdAt: new Date(),
    });
  }

  // ========== HANDLE TYPING ==========

  @SubscribeMessage('typing')
  handleTyping(client: Socket, payload: TypingEvent) {
    const { conversationId, userId, isTyping } = payload;

    // Broadcast typing indicator to other participants
    client.to(`conversation:${conversationId}`).emit('userTyping', {
      conversationId,
      userId,
      isTyping,
    });
  }

  // ========== HANDLE STOP TYPING ==========

  @SubscribeMessage('stopTyping')
  handleStopTyping(client: Socket, payload: TypingEvent) {
    const { conversationId, userId } = payload;

    client.to(`conversation:${conversationId}`).emit('userStoppedTyping', {
      conversationId,
      userId,
    });
  }
}
