import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { ModerationService } from '../services/moderationService.js';

export interface ParticipantPresence {
  socketId: string;
  userId: string;
  name: string;
  username: string;
  avatarUrl: string;
  activityType: string;
  category?: string;
  focusStatus: 'FOCUSED' | 'IDLE' | 'DISTRACTED' | 'OFFLINE';
  focusStreakMinutes: number;
  cameraOn: boolean;
  micOn: boolean;
  speaking?: boolean;
  joinedAt: string;
  isSimulated?: boolean;
}

// In-memory active room presence map: roomId -> Map<socketId, ParticipantPresence>
const activeRooms = new Map<string, Map<string, ParticipantPresence>>();

// In-memory fast cache for room restrictions: "userId:roomId" -> expiresAt timestamp
const localRestrictions = new Map<string, number>();

export function setupRoomHandlers(io: SocketIOServer, socket: Socket) {
  const userId = socket.data.userId as string;
  let joinSequence = 0;
  const presenceIn = (roomId: string) => activeRooms.get(roomId)?.get(socket.id);
  const canSignal = (toSocketId: string) => [...socket.rooms].some((roomId) =>
    presenceIn(roomId) && activeRooms.get(roomId)?.has(toSocketId));

  socket.on('join_room', async (data: { roomId: string; cameraOn?: boolean; micOn?: boolean }) => {
    if (!data || typeof data.roomId !== 'string') return;
    const { roomId } = data;
    const sequence = ++joinSequence;
    try {
      const membership = await prisma.roomParticipant.findUnique({
        where: { roomId_userId: { roomId, userId } },
        include: { room: true, user: { select: { name: true, username: true, avatarUrl: true } } },
      });
      const restriction = await ModerationService.checkRoomRestriction(userId, roomId);
      const authorization = membership?.room.category === 'INTERACTION'
        ? await prisma.interactionAuthorization.findFirst({
            where: { roomId, userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
          })
        : null;
      if (!socket.connected || sequence !== joinSequence) return;
      if (membership?.status !== 'ACTIVE' || membership.room.status !== 'ACTIVE' ||
          restriction.isRestricted || (membership.room.category === 'INTERACTION' && !authorization)) {
        socket.emit('room_error', { code: 'ROOM_ACCESS_DENIED', message: 'This room admission is no longer valid.' });
        return;
      }

      for (const joinedRoom of socket.rooms) {
        if (joinedRoom !== roomId && joinedRoom !== socket.id) handleUserLeave(io, socket, joinedRoom);
      }
      const roomParticipants = activeRooms.get(roomId) ?? new Map<string, ParticipantPresence>();
      const previous = [...roomParticipants.values()].find((entry) => entry.userId === userId);
      const capacity = Math.min(membership.room.maxParticipants, membership.room.category === 'INTERACTION' ? 6 : 10);
      if (!previous && roomParticipants.size >= capacity) {
        socket.emit('room_error', { code: 'ROOM_FULL', message: 'This room is full.' });
        return;
      }
      if (previous && previous.socketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(previous.socketId);
        if (oldSocket) handleUserLeave(io, oldSocket, roomId);
        roomParticipants.delete(previous.socketId);
      }
      activeRooms.set(roomId, roomParticipants);
      const participant: ParticipantPresence = {
        socketId: socket.id, userId, name: membership.user.name, username: membership.user.username,
        avatarUrl: membership.user.avatarUrl || '', activityType: membership.room.activityType,
        category: membership.room.category, focusStatus: 'FOCUSED', focusStreakMinutes: 0,
        cameraOn: Boolean(data.cameraOn), micOn: membership.room.category === 'INTERACTION' && Boolean(data.micOn),
        speaking: false, joinedAt: new Date().toISOString(),
      };
      roomParticipants.set(socket.id, participant);
      await socket.join(roomId);
      if (!socket.connected || sequence !== joinSequence) {
        handleUserLeave(io, socket, roomId);
        return;
      }
      logger.info('socket.room_joined', { roomId, userId, count: roomParticipants.size });
      io.to(roomId).emit('room_presence_list', {
        roomId, participants: [...roomParticipants.values()], totalCount: roomParticipants.size,
      });
      socket.to(roomId).emit('user_joined', { participant });
    } catch (err) {
      logger.warn('socket.room_join_failed', { roomId, userId, errorType: err instanceof Error ? err.name : 'UnknownError' });
      socket.emit('room_error', { code: 'ROOM_JOIN_FAILED', message: 'Could not connect to the live room. Please retry.' });
    }
  });

  // Focus status transition (FOCUSED, IDLE, DISTRACTED)
  socket.on('focus_status_changed', (data: {
    roomId: string;
    userId: string;
    focusStatus: 'FOCUSED' | 'IDLE' | 'DISTRACTED' | 'OFFLINE';
    focusStreakMinutes?: number;
  }) => {
    const { roomId, focusStatus, focusStreakMinutes = 0 } = data;
    const room = activeRooms.get(roomId);
    if (room && room.has(socket.id)) {
      const p = room.get(socket.id)!;
      p.focusStatus = focusStatus;
      if (focusStreakMinutes !== undefined) {
        p.focusStreakMinutes = focusStreakMinutes;
      }
      room.set(socket.id, p);

      io.to(roomId).emit('participant_status_updated', {
        socketId: socket.id,
        userId,
        focusStatus,
        focusStreakMinutes: p.focusStreakMinutes,
      });
    }
  });

  // Media state toggle (Camera/Mic)
  socket.on('media_toggled', (data: {
    roomId: string;
    cameraOn?: boolean;
    micOn?: boolean;
  }) => {
    const { roomId, cameraOn, micOn } = data;
    const room = activeRooms.get(roomId);
    if (room && room.has(socket.id)) {
      const p = room.get(socket.id)!;
      if (cameraOn !== undefined) p.cameraOn = cameraOn;
      // Mic is strictly permitted ONLY if room category is INTERACTION
      if (micOn !== undefined) {
        p.micOn = p.category === 'INTERACTION' ? micOn : false;
      }
      room.set(socket.id, p);

      io.to(roomId).emit('participant_media_updated', {
        socketId: socket.id,
        userId: p.userId,
        cameraOn: p.cameraOn,
        micOn: p.micOn,
      });
    }
  });

  // Speaking indicator event
  socket.on('speaking_change', (data: {
    roomId: string;
    isSpeaking: boolean;
  }) => {
    const { roomId, isSpeaking } = data;
    const room = activeRooms.get(roomId);
    if (room && room.has(socket.id)) {
      const p = room.get(socket.id)!;
      // Voice & speaking are strictly restricted to INTERACTION rooms
      if (p.category !== 'INTERACTION') {
        p.speaking = false;
        return;
      }
      p.speaking = isSpeaking;
      room.set(socket.id, p);

      io.to(roomId).emit('participant_speaking', {
        socketId: socket.id,
        userId: p.userId,
        isSpeaking,
      });
    }
  });

  // ══════════════════════════════════════════════════════════
  // WEBRTC SIGNALING (MESH ARCHITECTURE)
  // ══════════════════════════════════════════════════════════

  socket.on('webrtc_offer', (data: {
    toSocketId: string;
    offer: any;
    fromUserId: string;
  }) => {
    if (!data || !canSignal(data.toSocketId)) return;
    io.to(data.toSocketId).emit('webrtc_offer', {
      fromSocketId: socket.id,
      fromUserId: userId,
      offer: data.offer,
    });
  });

  socket.on('webrtc_answer', (data: {
    toSocketId: string;
    answer: any;
    fromUserId: string;
  }) => {
    if (!data || !canSignal(data.toSocketId)) return;
    io.to(data.toSocketId).emit('webrtc_answer', {
      fromSocketId: socket.id,
      fromUserId: userId,
      answer: data.answer,
    });
  });

  socket.on('webrtc_ice_candidate', (data: {
    toSocketId: string;
    candidate: any;
  }) => {
    if (!data || !canSignal(data.toSocketId)) return;
    io.to(data.toSocketId).emit('webrtc_ice_candidate', {
      fromSocketId: socket.id,
      candidate: data.candidate,
    });
  });

  // Room chat / encouragement reaction
  socket.on('send_room_message', (data: {
    roomId: string;
    sender: { name: string; username: string; avatarUrl: string };
    message: string;
    type?: 'chat' | 'kudos' | 'warning_event';
  }) => {
    const { roomId, message, type = 'chat' } = data;
    const sender = presenceIn(roomId);
    if (!sender || typeof message !== 'string' || message.length > 2000) return;
    io.to(roomId).emit('room_chat_message', {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      roomId,
      sender,
      message,
      type,
      timestamp: new Date().toISOString(),
    });
  });

  // ══════════════════════════════════════════════════════════
  // COMMUNITY MODERATION SOCKET PROTOCOL
  // ══════════════════════════════════════════════════════════

  // Report participant inside active room
  socket.on('report_participant', async (data: {
    roomId: string;
    reporterId: string;
    accusedId: string;
    reason: string;
    details?: string;
  }) => {
    try {
      const { roomId, accusedId, reason, details } = data;
      if (!presenceIn(roomId)) return;
      const reporterId = userId;
      const incident = await ModerationService.createIncident({
        roomId,
        reporterId,
        accusedId,
        reason,
        details,
      });

      // Broadcast moderation ballot alert to all participants in the room
      io.to(roomId).emit('moderation_incident_started', {
        incidentId: incident.id,
        roomId: incident.roomId,
        accusedId: incident.accusedId,
        accusedName: incident.accused.name,
        reason: incident.reason,
        eligibleVoters: incident.eligibleVoters,
        requiredVotes: incident.requiredVotes,
        totalEligible: incident.totalVotersCount,
        votingExpiresAt: incident.votingExpiresAt,
      });
    } catch (err: any) {
      socket.emit('moderation_error', {
        message: err.message || 'Failed to submit report',
      });
    }
  });

  // Cast vote on active moderation ballot
  socket.on('cast_moderation_vote', async (data: {
    incidentId: string;
    voterId: string;
    decision: 'YES' | 'NO';
  }) => {
    try {
      const { incidentId, decision } = data;
      const incident = await prisma.moderationIncident.findUnique({ where: { id: incidentId } });
      if (!incident || !presenceIn(incident.roomId)) return;
      const voterId = userId;
      const resolution = await ModerationService.castVote({
        incidentId,
        voterId,
        decision,
      });

      // If ballot resolved with confirmed kick
      if (resolution.status === 'CONFIRMED' && resolution.kicked) {
        localRestrictions.set(`${resolution.accusedId}:${resolution.roomId}`, Date.now() + 30 * 60 * 1000);
        const room = activeRooms.get(resolution.roomId);
        if (room) {
          // Find accused socket
          for (const [sId, p] of room.entries()) {
            if (p.userId === resolution.accusedId) {
              const targetSocket = io.sockets.sockets.get(sId);
              if (targetSocket) {
                targetSocket.emit('participant_kicked', {
                  roomId: resolution.roomId,
                  reason: resolution.reason,
                  cooldownMinutes: 30,
                  message: `You have been removed from this room by community vote (${resolution.reason}).`,
                });
                handleUserLeave(io, targetSocket, resolution.roomId);
              }
              break;
            }
          }
        }

        // Notify remaining participants in the room
        io.to(resolution.roomId).emit('moderation_incident_resolved', {
          incidentId: resolution.incidentId,
          status: 'CONFIRMED',
          kickedUserId: resolution.accusedId,
          reason: resolution.reason,
        });
      } else if (resolution.status === 'REJECTED') {
        io.to(resolution.roomId).emit('moderation_incident_resolved', {
          incidentId: resolution.incidentId,
          status: 'REJECTED',
          reason: 'Insufficient votes to meet majority threshold.',
        });
      }
    } catch (err: any) {
      socket.emit('moderation_error', {
        message: err.message || 'Failed to record vote',
      });
    }
  });

  // Leave room
  socket.on('leave_room', (data: { roomId: string }) => {
    joinSequence++;
    handleUserLeave(io, socket, data.roomId);
  });

  // Disconnect
  socket.on('disconnect', () => {
    joinSequence++;
    for (const [roomId, participants] of activeRooms.entries()) {
      if (participants.has(socket.id)) {
        handleUserLeave(io, socket, roomId);
      }
    }
  });
}

function handleUserLeave(io: SocketIOServer, socket: Socket, roomId: string) {
  socket.leave(roomId);
  const room = activeRooms.get(roomId);
  if (room && room.has(socket.id)) {
    const leavingUser = room.get(socket.id);
    room.delete(socket.id);
    logger.info('socket.room_left', { roomId, userId: leavingUser?.userId });

    // If only simulated users or empty, clear
    const realUsers = Array.from(room.values()).filter((p) => !p.isSimulated);
    if (realUsers.length === 0) {
      activeRooms.delete(roomId);
    }

    const currentList = room ? Array.from(room.values()) : [];
    io.to(roomId).emit('room_presence_list', {
      roomId,
      participants: currentList,
      totalCount: currentList.length,
    });

    io.to(roomId).emit('user_left', {
      socketId: socket.id,
      userId: leavingUser?.userId,
      name: leavingUser?.name,
    });
  }
}
