import { Server as SocketIOServer, Socket } from 'socket.io';

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

export function setupRoomHandlers(io: SocketIOServer, socket: Socket) {
  // Join Room
  socket.on('join_room', (data: {
    roomId: string;
    userId: string;
    name: string;
    username: string;
    avatarUrl?: string;
    activityType?: string;
    category?: string;
    cameraOn?: boolean;
    micOn?: boolean;
    withSimulatedPeers?: boolean;
  }) => {
    const {
      roomId,
      userId,
      name,
      username,
      avatarUrl,
      activityType = 'Deep Focus',
      category = 'EDUCATION',
      cameraOn = true,
      micOn = false,
      withSimulatedPeers = false,
    } = data;

    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, new Map());
    }

    const roomParticipants = activeRooms.get(roomId)!;

    // Strict 6 participants enforcement for Interaction Rooms
    if (category === 'INTERACTION' && roomParticipants.size >= 6) {
      socket.emit('room_error', {
        code: 'ROOM_FULL',
        message: 'Interaction rooms have a strict maximum capacity of 6 participants.',
      });
      return;
    }

    socket.join(roomId);

    // Optional simulated peers only if explicitly enabled
    if (withSimulatedPeers && roomParticipants.size === 0) {
      const demoPeers: ParticipantPresence[] = [
        {
          socketId: `sim-alex-${roomId}`,
          userId: 'sim-alex',
          name: 'Alex Chen',
          username: 'alexchen',
          avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
          activityType: 'Coding',
          category: 'EDUCATION',
          focusStatus: 'FOCUSED',
          focusStreakMinutes: 34,
          cameraOn: true,
          micOn: false,
          speaking: false,
          joinedAt: new Date(Date.now() - 34 * 60000).toISOString(),
          isSimulated: true,
        },
      ];
      demoPeers.forEach((p) => roomParticipants.set(p.socketId, p));
    }

    const isInteraction = category === 'INTERACTION';

    const participant: ParticipantPresence = {
      socketId: socket.id,
      userId,
      name,
      username,
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      activityType,
      category,
      focusStatus: 'FOCUSED',
      focusStreakMinutes: 0,
      cameraOn,
      micOn: isInteraction ? Boolean(micOn) : false,
      speaking: false,
      joinedAt: new Date().toISOString(),
    };

    roomParticipants.set(socket.id, participant);

    // Broadcast updated participants list to everyone in room
    const currentList = Array.from(roomParticipants.values());
    io.to(roomId).emit('room_presence_list', {
      roomId,
      participants: currentList,
      totalCount: currentList.length,
    });

    socket.to(roomId).emit('user_joined', { participant });
  });

  // Focus status transition (FOCUSED, IDLE, DISTRACTED)
  socket.on('focus_status_changed', (data: {
    roomId: string;
    userId: string;
    focusStatus: 'FOCUSED' | 'IDLE' | 'DISTRACTED' | 'OFFLINE';
    focusStreakMinutes?: number;
  }) => {
    const { roomId, userId, focusStatus, focusStreakMinutes = 0 } = data;
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
    io.to(data.toSocketId).emit('webrtc_offer', {
      fromSocketId: socket.id,
      fromUserId: data.fromUserId,
      offer: data.offer,
    });
  });

  socket.on('webrtc_answer', (data: {
    toSocketId: string;
    answer: any;
    fromUserId: string;
  }) => {
    io.to(data.toSocketId).emit('webrtc_answer', {
      fromSocketId: socket.id,
      fromUserId: data.fromUserId,
      answer: data.answer,
    });
  });

  socket.on('webrtc_ice_candidate', (data: {
    toSocketId: string;
    candidate: any;
  }) => {
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
    const { roomId, sender, message, type = 'chat' } = data;
    io.to(roomId).emit('room_chat_message', {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      roomId,
      sender,
      message,
      type,
      timestamp: new Date().toISOString(),
    });
  });

  // Leave room
  socket.on('leave_room', (data: { roomId: string }) => {
    handleUserLeave(io, socket, data.roomId);
  });

  // Disconnect
  socket.on('disconnect', () => {
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
