import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export class RoomController {
  public static async getRooms(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { activity, category, search } = req.query;

      const whereClause: any = {
        isPrivate: false,
      };

      if (category && category !== 'All') {
        whereClause.category = String(category);
      }

      if (activity && activity !== 'All') {
        whereClause.activityType = String(activity);
      }

      if (search) {
        whereClause.OR = [
          { name: { contains: String(search), mode: 'insensitive' } },
          { description: { contains: String(search), mode: 'insensitive' } },
          { roomCode: { contains: String(search), mode: 'insensitive' } },
          { topic: { contains: String(search), mode: 'insensitive' } },
        ];
      }

      const rooms = await prisma.room.findMany({
        where: whereClause,
        include: {
          creator: {
            select: { id: true, name: true, username: true, avatarUrl: true },
          },
          participants: {
            where: { status: 'ACTIVE' },
            include: {
              user: {
                select: { id: true, name: true, username: true, avatarUrl: true },
              },
            },
          },
          focusSessions: {
            where: { status: 'COMPLETED' },
            select: { focusScore: true },
            take: 20,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formattedRooms = rooms.map((room) => {
        const scores = room.focusSessions.map((s) => s.focusScore);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 85;

        return {
          id: room.id,
          name: room.name,
          description: room.description,
          category: room.category,
          topic: room.topic,
          activityType: room.activityType,
          atmosphere: room.atmosphere,
          isSharedAtmosphere: room.isSharedAtmosphere,
          roomCode: room.roomCode,
          isPrivate: room.isPrivate,
          maxParticipants: room.category === 'INTERACTION' ? 6 : Math.min(10, room.maxParticipants || 10),
          defaultDuration: room.defaultDuration,
          defaultCamera: room.defaultCamera,
          defaultMic: room.defaultMic,
          creator: room.creator,
          activeParticipantsCount: room.participants.length,
          participants: room.participants.map((p) => p.user),
          averageFocusScore: avgScore,
          createdAt: room.createdAt,
        };
      });

      res.json({ success: true, rooms: formattedRooms });
    } catch (error: any) {
      console.error('Error fetching rooms:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch rooms' });
    }
  }

  public static async getRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { idOrCode } = req.params;

      const room = await prisma.room.findFirst({
        where: {
          OR: [{ id: idOrCode }, { roomCode: idOrCode.toUpperCase() }],
        },
        include: {
          creator: {
            select: { id: true, name: true, username: true, avatarUrl: true },
          },
          participants: {
            where: { status: 'ACTIVE' },
            include: {
              user: {
                select: { id: true, name: true, username: true, avatarUrl: true },
              },
            },
          },
          focusSessions: {
            where: { status: 'COMPLETED' },
            select: { focusScore: true },
          },
        },
      });

      if (!room) {
        res.status(404).json({ success: false, error: 'Focus room not found' });
        return;
      }

      const scores = room.focusSessions.map((s) => s.focusScore);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 85;

      res.json({
        success: true,
        room: {
          ...room,
          maxParticipants: room.category === 'INTERACTION' ? 6 : Math.min(10, room.maxParticipants || 10),
          activeParticipantsCount: room.participants.length,
          averageFocusScore: avgScore,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch room' });
    }
  }

  public static async createRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const {
        name,
        description,
        category = 'EDUCATION',
        topic,
        activityType = 'Deep Focus',
        atmosphere = 'Rainy Window',
        isSharedAtmosphere = false,
        duration = 50,
        isPrivate = false,
        maxParticipants = 10,
        camera = true,
        mic = false,
      } = req.body;

      if (!name) {
        res.status(400).json({ success: false, error: 'Room name is required' });
        return;
      }

      // Hard enforcement: Interaction rooms CANNOT exceed 6 participants; Focus rooms CANNOT exceed 10
      const effectiveCap = category === 'INTERACTION' ? 6 : 10;
      const finalMaxParticipants = Math.min(effectiveCap, parseInt(maxParticipants, 10) || effectiveCap);

      // Generate room code like GRN-4821 or INT-1234
      const prefix = (category === 'INTERACTION' ? 'INT' : name.substring(0, 3)).toUpperCase();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const roomCode = `${prefix}-${randomNum}`;

      const room = await prisma.room.create({
        data: {
          name,
          description,
          category,
          topic: topic || null,
          activityType,
          atmosphere,
          isSharedAtmosphere: Boolean(isSharedAtmosphere),
          creatorId: userId,
          roomCode,
          isPrivate: Boolean(isPrivate),
          maxParticipants: finalMaxParticipants,
          defaultDuration: parseInt(duration, 10) || 50,
          defaultCamera: camera !== undefined ? Boolean(camera) : true,
          defaultMic: category === 'INTERACTION' ? true : mic !== undefined ? Boolean(mic) : false,
        },
        include: {
          creator: {
            select: { id: true, name: true, username: true, avatarUrl: true },
          },
        },
      });

      // Add host as participant
      await prisma.roomParticipant.create({
        data: {
          roomId: room.id,
          userId,
          role: 'HOST',
          status: 'ACTIVE',
        },
      });

      res.status(201).json({ success: true, room });
    } catch (error: any) {
      console.error('Error creating room:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to create room' });
    }
  }

  public static async joinRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { roomId } = req.params;

      const result = await prisma.$transaction(async (tx) => {
        // Concurrency protection: acquire transactional lock on roomId
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${roomId}))`;

        const room = await tx.room.findUnique({
          where: { id: roomId },
          include: { participants: { where: { status: 'ACTIVE' } } },
        });

        if (!room) {
          throw new Error('ROOM_NOT_FOUND');
        }

        // Check active moderation restriction (cooldown from kick)
        const activeRestriction = await tx.roomRestriction.findFirst({
          where: {
            userId,
            roomId,
            expiresAt: { gt: new Date() },
          },
        });

        if (activeRestriction) {
          const err: any = new Error(
            `You are temporarily restricted from joining this room until ${activeRestriction.expiresAt.toLocaleTimeString()} (${activeRestriction.reason})`
          );
          err.code = 'ROOM_RESTRICTED';
          throw err;
        }

        const isAlreadyActive = room.participants.some((p) => p.userId === userId);
        const effectiveCap = room.category === 'INTERACTION' ? 6 : Math.min(10, room.maxParticipants || 10);

        if (!isAlreadyActive && room.participants.length >= effectiveCap) {
          const err: any = new Error(
            room.category === 'INTERACTION'
              ? 'Interaction rooms have a strict maximum limit of 6 participants.'
              : 'Focus rooms have a strict maximum limit of 10 participants.'
          );
          err.code = 'ROOM_FULL';
          throw err;
        }

        const participant = await tx.roomParticipant.upsert({
          where: {
            roomId_userId: { roomId, userId },
          },
          update: {
            status: 'ACTIVE',
            leftAt: null,
            joinedAt: new Date(),
          },
          create: {
            roomId,
            userId,
            role: room.creatorId === userId ? 'HOST' : 'MEMBER',
            status: 'ACTIVE',
          },
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
          },
        });

        return { participant, room };
      });

      res.json({ success: true, participant: result.participant, room: result.room });
    } catch (error: any) {
      if (error.message === 'ROOM_NOT_FOUND') {
        res.status(404).json({ success: false, error: 'Room not found' });
      } else if (error.code === 'ROOM_RESTRICTED') {
        res.status(403).json({ success: false, error: error.message, restricted: true });
      } else if (error.code === 'ROOM_FULL') {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: error.message || 'Failed to join room' });
      }
    }
  }

  public static async allocateRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { category = 'EDUCATION', activityType = 'Deep Focus', atmosphere = 'Rainy Window' } = req.body;

      const upperCategory = String(category).toUpperCase();
      const effectiveCap = upperCategory === 'INTERACTION' ? 6 : 10;

      // Atomic allocation transaction
      const allocation = await prisma.$transaction(async (tx) => {
        // Concurrency protection: serialize category allocation atomically
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'alloc_' + upperCategory}))`;

        // 1. Check if user is already actively participating in an existing room of this category
        const activeMembership = await tx.roomParticipant.findFirst({
          where: {
            userId,
            status: 'ACTIVE',
            room: {
              category: upperCategory,
              status: 'ACTIVE',
            },
          },
          include: {
            room: {
              include: {
                participants: {
                  where: { status: 'ACTIVE' },
                  include: {
                    user: { select: { id: true, name: true, username: true, avatarUrl: true } },
                  },
                },
              },
            },
          },
        });

        // Idempotent recovery: if user is already active in a room of this category, return it immediately
        if (activeMembership && activeMembership.room) {
          return {
            room: {
              ...activeMembership.room,
              maxParticipants: effectiveCap,
              activeParticipantsCount: activeMembership.room.participants.length,
              participants: activeMembership.room.participants.map((p) => p.user),
            },
            participant: activeMembership,
            isNew: false,
            alreadyMember: true,
          };
        }

        // Leave any prior rooms in other categories to maintain single-room presence
        await tx.roomParticipant.updateMany({
          where: { userId, status: 'ACTIVE' },
          data: { status: 'LEFT', leftAt: new Date() },
        });

        // 2. Fetch candidate public rooms in this category with status ACTIVE
        const candidateRooms = await tx.room.findMany({
          where: {
            category: upperCategory,
            isPrivate: false,
            status: 'ACTIVE',
          },
          include: {
            participants: {
              where: { status: 'ACTIVE' },
              include: {
                user: { select: { id: true, name: true, username: true, avatarUrl: true } },
              },
            },
          },
        });

        // Query any active room restrictions for this user to avoid matching into restricted rooms
        const activeRestrictions = await tx.roomRestriction.findMany({
          where: {
            userId,
            expiresAt: { gt: new Date() },
          },
          select: { roomId: true },
        });
        const restrictedRoomIds = new Set(activeRestrictions.map((r) => r.roomId));

        // Prioritize rooms that already have occupants (< effectiveCap) first to fill existing capacity,
        // followed by empty rooms (0 occupants), excluding restricted rooms
        const eligibleRooms = candidateRooms
          .filter((r) => !restrictedRoomIds.has(r.id) && r.participants.length < effectiveCap)
          .sort((a, b) => {
            if (a.participants.length > 0 && b.participants.length === 0) return -1;
            if (a.participants.length === 0 && b.participants.length > 0) return 1;
            return b.participants.length - a.participants.length;
          });

        let selectedRoom: any = null;

        for (const candidate of eligibleRooms) {
          // Re-verify atomic count inside transaction to prevent concurrency overfill
          const currentCount = await tx.roomParticipant.count({
            where: { roomId: candidate.id, status: 'ACTIVE' },
          });

          if (currentCount < effectiveCap) {
            selectedRoom = candidate;
            break;
          }
        }

        // 3. If no candidate room has available capacity, dynamically create a new room!
        let isNew = false;
        if (!selectedRoom) {
          isNew = true;
          const roomPrefix = upperCategory === 'INTERACTION' ? 'INT' : upperCategory.substring(0, 3);
          const roomCount = await tx.room.count({ where: { category: upperCategory } });
          const roomNumber = roomCount + 1;
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const roomCode = `${roomPrefix}-${randomSuffix}`;
          const roomName = `${upperCategory === 'EDUCATION' ? 'SEM' : upperCategory} Room #${roomNumber}`;

          selectedRoom = await tx.room.create({
            data: {
              name: roomName,
              description: `Dynamic ${upperCategory.toLowerCase()} study room created for concurrent student collaboration.`,
              category: upperCategory,
              activityType,
              atmosphere,
              isPrivate: false,
              maxParticipants: effectiveCap,
              creatorId: userId,
              roomCode,
              status: 'ACTIVE',
              defaultDuration: 50,
              defaultCamera: true,
              defaultMic: upperCategory === 'INTERACTION',
            },
            include: {
              participants: { where: { status: 'ACTIVE' } },
            },
          });
        }

        // 4. Allocate user to the selected room
        const participant = await tx.roomParticipant.upsert({
          where: {
            roomId_userId: { roomId: selectedRoom.id, userId },
          },
          update: {
            status: 'ACTIVE',
            leftAt: null,
            joinedAt: new Date(),
          },
          create: {
            roomId: selectedRoom.id,
            userId,
            role: selectedRoom.creatorId === userId ? 'HOST' : 'MEMBER',
            status: 'ACTIVE',
          },
          include: {
            user: { select: { id: true, name: true, username: true, avatarUrl: true } },
          },
        });

        // Refetch active participants
        const activeParticipants = await tx.roomParticipant.findMany({
          where: { roomId: selectedRoom.id, status: 'ACTIVE' },
          include: {
            user: { select: { id: true, name: true, username: true, avatarUrl: true } },
          },
        });

        return {
          room: {
            ...selectedRoom,
            maxParticipants: effectiveCap,
            activeParticipantsCount: activeParticipants.length,
            participants: activeParticipants.map((p) => p.user),
          },
          participant,
          isNew,
          alreadyMember: false,
        };
      });

      res.json({
        success: true,
        room: allocation.room,
        participant: allocation.participant,
        isNew: allocation.isNew,
        alreadyMember: allocation.alreadyMember,
      });
    } catch (error: any) {
      console.error('Error in allocateRoom:', error);
      res.status(500).json({ success: false, error: error.message || 'Matchmaking allocation failed' });
    }
  }

  public static async leaveRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { roomId } = req.params;

      await prisma.$transaction(async (tx) => {
        await tx.roomParticipant.updateMany({
          where: { roomId, userId, status: 'ACTIVE' },
          data: { status: 'LEFT', leftAt: new Date() },
        });

        const remainingActive = await tx.roomParticipant.count({
          where: { roomId, status: 'ACTIVE' },
        });

        // When all participants have left, ensure room is marked ACTIVE & reusable for subsequent cohorts
        if (remainingActive === 0) {
          await tx.room.update({
            where: { id: roomId },
            data: { status: 'ACTIVE', updatedAt: new Date() },
          });
        }
      });

      res.json({ success: true, message: 'Left room successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to leave room' });
    }
  }
}
