import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

const rawCorsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const wsCorsOrigin =
  rawCorsOrigin === '*'
    ? true
    : rawCorsOrigin.split(',').map((origin) => origin.trim());

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

function getCandidateType(candidateLine?: string):
  | 'host'
  | 'srflx'
  | 'relay'
  | 'prflx'
  | 'unknown' {
  if (!candidateLine) return 'unknown';
  const match = candidateLine.match(/ typ (host|srflx|relay|prflx) /i);
  if (!match) return 'unknown';
  return match[1].toLowerCase() as 'host' | 'srflx' | 'relay' | 'prflx';
}

@WebSocketGateway({
  cors: {
    origin: wsCorsOrigin,
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers : Map<string,string>; // userId -> socketId
  private rooms = new Map<string, Set<string>>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {
    this.connectedUsers  = new Map<string, string>();
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const handshakeAuthToken =
        typeof client.handshake.auth?.token === 'string'
          ? client.handshake.auth.token
          : '';
      const queryToken =
        typeof client.handshake.query?.token === 'string'
          ? client.handshake.query.token
          : '';
      const headerAuth =
        typeof client.handshake.headers?.authorization === 'string'
          ? client.handshake.headers.authorization
          : '';

      const tokenSource = handshakeAuthToken || queryToken || headerAuth;
      const token = tokenSource.replace('Bearer ', '').trim();
      if (!token) {
        this.logger.warn('Socket connection rejected: missing token');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      this.connectedUsers.set(payload.sub, client.id);

      // Join user's own room for personal notifications
      client.join(`user:${payload.sub}`);

      this.logger.log(`Client connected: ${payload.sub}`);
    } catch {
      this.logger.warn('Socket connection rejected: invalid token');
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);

      for (const [roomId, members] of this.rooms.entries()) {
        if (!members.has(client.userId)) continue;

        members.delete(client.userId);
        client.to(`room:${roomId}`).emit('userLeft', { userId: client.userId });
        this.server.to(`room:${roomId}`).emit('roomState', {
          roomId,
          users: [...members],
        });

        if (members.size === 0) {
          this.rooms.delete(roomId);
        }
      }

      this.logger.log(`Client disconnected: ${client.userId}`);
    }
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    client.join(`conversation:${data.conversationId}`);
    await this.chatService.markAsRead(data.conversationId, client.userId!);
  }

  @SubscribeMessage('leaveConversation')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ): void {
    client.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { conversationId: string; content: string },
  ): Promise<void> {
    const message = await this.chatService.sendMessage(
      data.conversationId,
      client.userId!,
      data.content,
    );

    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('newMessage', message);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { conversationId: string; isTyping: boolean },
  ): void {
    client
      .to(`conversation:${data.conversationId}`)
      .emit('userTyping', {
        userId: client.userId,
        isTyping: data.isTyping,
      });
  }

  // Public method to send notifications to specific users
  sendToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ): void {
    const { roomId } = data;
    const userId = client.userId!;

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    const members = this.rooms.get(roomId)!;
    members.add(userId);

    client.join(`room:${roomId}`);

    const existingMembers = [...members].filter((id) => id !== userId);
    client.emit('roomUsers', { roomId, users: existingMembers });
    client.to(`room:${roomId}`).emit('userJoined', { userId });
    this.server.to(`room:${roomId}`).emit('roomState', {
      roomId,
      users: [...members],
    });

    this.logger.log(`User ${userId} joined room ${roomId}`);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ): void {
    const { roomId } = data;
    const userId = client.userId!;

    client.leave(`room:${roomId}`);

    const members = this.rooms.get(roomId);
    if (members) {
      members.delete(userId);
      this.server.to(`room:${roomId}`).emit('roomState', {
        roomId,
        users: [...members],
      });
      if (members.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    client.to(`room:${roomId}`).emit('userLeft', { userId });
    this.logger.log(`User ${userId} left room ${roomId}`);
  }

  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      roomId: string;
      targetUserId: string;
      sdp: RTCSessionDescriptionInit;
    },
  ): void {
    const targetSocketId = this.connectedUsers.get(data.targetUserId);
    this.logger.log(
      `offer ${client.userId} -> ${data.targetUserId} in room ${data.roomId}`,
    );
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('offer', {
        sdp: data.sdp,
        senderId: client.userId,
      });
    }
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      roomId: string;
      targetUserId: string;
      sdp: RTCSessionDescriptionInit;
    },
  ): void {
    const targetSocketId = this.connectedUsers.get(data.targetUserId);
    this.logger.log(
      `answer ${client.userId} -> ${data.targetUserId} in room ${data.roomId}`,
    );
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('answer', {
        sdp: data.sdp,
        senderId: client.userId,
      });
    }
  }

  @SubscribeMessage('iceCandidate')
  handleIceCandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      roomId: string;
      targetUserId: string;
      candidate: RTCIceCandidateInit;
    },
  ): void {
    const targetSocketId = this.connectedUsers.get(data.targetUserId);
    const type = getCandidateType(data.candidate?.candidate);
    this.logger.log(
      `iceCandidate(${type}) ${client.userId} -> ${data.targetUserId} in room ${data.roomId}`,
    );
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('iceCandidate', {
        candidate: data.candidate,
        senderId: client.userId,
      });
    }
  }

  @SubscribeMessage('screenShareStarted')
  handleScreenShareStarted(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ): void {
    client.to(`room:${data.roomId}`).emit('screenShareStarted', {
      userId: client.userId,
    });
  }

  @SubscribeMessage('screenShareStopped')
  handleScreenShareStopped(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ): void {
    client.to(`room:${data.roomId}`).emit('screenShareStopped', {
      userId: client.userId,
    });
  }
}
