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

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/webrtc',
})
export class WebrtcGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebrtcGateway.name);

  /** roomId → Set of userIds currently in the room */
  private rooms = new Map<string, Set<string>>();

  /** userId → socketId */
  private connectedUsers = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) {}

  /* ───────── Connection lifecycle ───────── */

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = client.handshake.auth.token?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      this.connectedUsers.set(payload.sub, client.id);

      this.logger.log(`WebRTC client connected: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (!client.userId) return;

    this.connectedUsers.delete(client.userId);

    // Remove user from any rooms they were in
    for (const [roomId, members] of this.rooms.entries()) {
      if (members.has(client.userId)) {
        members.delete(client.userId);
        // Notify remaining members that this user left
        client.to(`room:${roomId}`).emit('userLeft', {
          userId: client.userId,
        });
        if (members.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    }

    this.logger.log(`WebRTC client disconnected: ${client.userId}`);
  }

  /* ───────── Room management ───────── */

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ): void {
    const { roomId } = data;
    const userId = client.userId!;

    // Track room membership
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    const members = this.rooms.get(roomId)!;
    members.add(userId);

    // Join the Socket.io room
    client.join(`room:${roomId}`);

    // Tell the new user who is already in the room
    const existingMembers = [...members].filter((id) => id !== userId);
    client.emit('roomUsers', { roomId, users: existingMembers });

    // Tell existing members a new user joined
    client.to(`room:${roomId}`).emit('userJoined', { userId });

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
      if (members.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    client.to(`room:${roomId}`).emit('userLeft', { userId });

    this.logger.log(`User ${userId} left room ${roomId}`);
  }

  /* ───────── WebRTC signaling ───────── */

  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { roomId: string; targetUserId: string; sdp: RTCSessionDescriptionInit },
  ): void {
    const targetSocketId = this.connectedUsers.get(data.targetUserId);
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
    data: { roomId: string; targetUserId: string; sdp: RTCSessionDescriptionInit },
  ): void {
    const targetSocketId = this.connectedUsers.get(data.targetUserId);
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
    data: { roomId: string; targetUserId: string; candidate: RTCIceCandidateInit },
  ): void {
    const targetSocketId = this.connectedUsers.get(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('iceCandidate', {
        candidate: data.candidate,
        senderId: client.userId,
      });
    }
  }
}
