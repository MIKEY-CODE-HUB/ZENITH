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
          maxParticipants: room.category === 'INTERACTION' ? 6 : room.maxParticipants,
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
        maxParticipants = 12,
        camera = true,
        mic = false,
      } = req.body;

      if (!name) {
        res.status(400).json({ success: false, error: 'Room name is required' });
        return;
      }

      // Hard enforcement: Interaction rooms CANNOT exceed 6 participants
      const finalMaxParticipants = category === 'INTERACTION' ? Math.min(6, parseInt(maxParticipants, 10) || 6) : parseInt(maxParticipants, 10) || 12;

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

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { participants: { where: { status: 'ACTIVE' } } },
      });

      if (!room) {
        res.status(404).json({ success: false, error: 'Room not found' });
        return;
      }

      // Hard enforcement of 6 participants maximum for interaction rooms
      const effectiveCap = room.category === 'INTERACTION' ? 6 : room.maxParticipants;
      if (room.participants.length >= effectiveCap) {
        res.status(400).json({
          success: false,
          error: room.category === 'INTERACTION'
            ? 'Interaction rooms have a strict maximum limit of 6 participants.'
            : 'Room is currently full.',
        });
        return;
      }

      const participant = await prisma.roomParticipant.upsert({
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

      res.json({ success: true, participant, room });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to join room' });
    }
  }

  public static async leaveRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { roomId } = req.params;

      await prisma.roomParticipant.updateMany({
        where: { roomId, userId, status: 'ACTIVE' },
        data: { status: 'LEFT', leftAt: new Date() },
      });

      res.json({ success: true, message: 'Left room successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to leave room' });
    }
  }
}
