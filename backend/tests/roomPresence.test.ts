import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { initializeSocket } from '../src/sockets/socketManager.js';

describe('🌐 Live Rooms, Real-Time Presence & WebRTC Signaling Suite', () => {
  let server: http.Server;
  let port: number;
  const users: string[] = [];
  const sockets: ClientSocket[] = [];
  async function connect(username: string, roomId: string, id = randomUUID() as string, interaction = false) {
    await prisma.user.create({ data: { id, username, name: username } });
    users.push(id);
    await prisma.roomParticipant.create({ data: { userId: id, roomId } });
    if (interaction) {
      await prisma.interactionAuthorization.create({
        data: { userId: id, roomId, pointsSpent: 6, expiresAt: new Date(Date.now() + 60000) },
      });
    }
    const socket = Client(`http://localhost:${port}`, {
      transports: ['websocket'], reconnection: false, auth: { token: generateToken({ userId: id, username }) },
    });
    sockets.push(socket);
    await once(socket, 'connect');
    return socket;
  }

  before(async () => {
    server = http.createServer();
    initializeSocket(server);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          port = addr.port;
        }
        resolve();
      });
    });
  });

  after(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should synchronize room presence between multiple desktop peers', async () => {
    const creator = await prisma.user.create({ data: { username: 'presence-owner', name: 'Owner' } });
    users.push(creator.id);
    const room = await prisma.room.create({ data: { name: 'Live study', roomCode: 'TEST-PRESENCE', creatorId: creator.id } });
    const roomId = room.id;
    const client1 = await connect('alice', roomId, 'user-alice-uuid');
    const client2 = await connect('bob', roomId, 'user-bob-uuid');

    // Client 1 joins room
    const c1JoinPromise = new Promise<any>((resolve) => {
      client1.on('room_presence_list', (data) => {
        if (data.roomId === roomId && data.totalCount === 1) {
          resolve(data);
        }
      });
    });

    client1.emit('join_room', {
      roomId,
      userId: 'user-alice-uuid',
      name: 'Alice Scholar',
      username: 'alice',
      category: 'EDUCATION',
      activityType: 'Deep Work',
      cameraOn: true,
      micOn: false,
    });

    const c1Presence = await c1JoinPromise;
    assert.strictEqual(c1Presence.participants.length, 1);
    assert.strictEqual(c1Presence.participants[0].username, 'alice');

    // Client 2 joins the same room
    const c1UserJoinedPromise = new Promise<any>((resolve) => {
      client1.on('user_joined', (data) => resolve(data));
    });

    const c2PresencePromise = new Promise<any>((resolve) => {
      client2.on('room_presence_list', (data) => {
        if (data.roomId === roomId && data.totalCount === 2) {
          resolve(data);
        }
      });
    });

    client2.emit('join_room', {
      roomId,
      userId: 'user-bob-uuid',
      name: 'Bob Researcher',
      username: 'bob',
      category: 'EDUCATION',
      activityType: 'Deep Work',
      cameraOn: true,
      micOn: false,
    });

    const [c1UserJoinedEvent, c2Presence] = await Promise.all([
      c1UserJoinedPromise,
      c2PresencePromise,
    ]);

    assert.strictEqual(c1UserJoinedEvent.participant.username, 'bob');
    assert.strictEqual(c2Presence.totalCount, 2);

    // Verify media toggle propagation
    const c2MediaPromise = new Promise<any>((resolve) => {
      client2.on('participant_media_updated', (data) => {
        if (data.userId === 'user-alice-uuid') resolve(data);
      });
    });

    client1.emit('media_toggled', {
      roomId,
      cameraOn: false,
    });

    const mediaUpdate = await c2MediaPromise;
    assert.strictEqual(mediaUpdate.cameraOn, false);

    // Verify WebRTC Offer / Answer / ICE relay between peers
    const mockOfferSdp = { type: 'offer', sdp: 'v=0\r\no=alice 1234 1 IN IP4 127.0.0.1' };
    const mockAnswerSdp = { type: 'answer', sdp: 'v=0\r\no=bob 5678 1 IN IP4 127.0.0.1' };
    const mockCandidate = { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 };

    const c2OfferPromise = new Promise<any>((resolve) => {
      client2.on('webrtc_offer', (data) => resolve(data));
    });

    client1.emit('webrtc_offer', {
      toSocketId: client2.id,
      fromUserId: 'user-alice-uuid',
      offer: mockOfferSdp,
    });

    const receivedOffer = await c2OfferPromise;
    assert.strictEqual(receivedOffer.offer.type, 'offer');
    assert.strictEqual(receivedOffer.fromUserId, 'user-alice-uuid');

    const c1AnswerPromise = new Promise<any>((resolve) => {
      client1.on('webrtc_answer', (data) => resolve(data));
    });

    client2.emit('webrtc_answer', {
      toSocketId: client1.id,
      fromUserId: 'user-bob-uuid',
      answer: mockAnswerSdp,
    });

    const receivedAnswer = await c1AnswerPromise;
    assert.strictEqual(receivedAnswer.answer.type, 'answer');

    const c2CandidatePromise = new Promise<any>((resolve) => {
      client2.on('webrtc_ice_candidate', (data) => resolve(data));
    });

    client1.emit('webrtc_ice_candidate', {
      toSocketId: client2.id,
      candidate: mockCandidate,
    });

    const receivedCandidate = await c2CandidatePromise;
    assert.strictEqual(receivedCandidate.candidate.sdpMid, '0');

    // Clean disconnect test
    const c1UserLeftPromise = new Promise<any>((resolve) => {
      client1.on('user_left', (data) => resolve(data));
    });
    const reconnecting = once(client1, 'room_presence_list');

    client2.disconnect();
    const leftEvent = await c1UserLeftPromise;
    assert.strictEqual(leftEvent.userId, 'user-bob-uuid');
    const [duringDisconnect] = await reconnecting;
    assert.equal(duringDisconnect.totalCount, 2);
    assert.equal(duringDisconnect.participants.find((peer: { userId: string }) => peer.userId === leftEvent.userId).reconnecting, true);

    const client2Reconnected = Client(`http://localhost:${port}`, {
      transports: ['websocket'], reconnection: false,
      auth: { token: generateToken({ userId: leftEvent.userId, username: 'bob' }) },
    });
    sockets.push(client2Reconnected);
    await once(client2Reconnected, 'connect');
    const rejoined = once(client2Reconnected, 'room_presence_list');
    client2Reconnected.emit('join_room', { roomId });
    const [afterReconnect] = await rejoined;
    assert.equal(afterReconnect.totalCount, 2);
    assert.equal(afterReconnect.participants.find((peer: { userId: string }) => peer.userId === leftEvent.userId).reconnecting, false);

    client1.disconnect();
  });

  it('should enforce strict 6-participant hard limit for Interaction Rooms', async () => {
    const creator = await prisma.user.create({ data: { username: 'interaction-owner', name: 'Owner' } });
    users.push(creator.id);
    const room = await prisma.room.create({
      data: { name: 'Interaction', roomCode: 'TEST-INTERACTION', category: 'INTERACTION', creatorId: creator.id },
    });
    for (let i = 0; i < 6; i++) {
      const client = await connect(`interactor-${i}`, room.id, undefined, true);
      const presence = once(client, 'room_presence_list');
      client.emit('join_room', { roomId: room.id, category: 'EDUCATION' });
      assert.equal((await presence)[0].totalCount, i + 1);
    }

    const extra = await connect('interactor-extra', room.id, undefined, true);
    const error = once(extra, 'room_error');
    extra.emit('join_room', { roomId: room.id, category: 'EDUCATION' });
    assert.equal((await error)[0].code, 'ROOM_FULL');
  });

  it('rejects an anonymous socket', async () => {
    const socket = Client(`http://localhost:${port}`, { transports: ['websocket'], reconnection: false });
    sockets.push(socket);
    const [error] = await new Promise<[Error]>((resolve) => socket.once('connect_error', (err) => resolve([err])));
    assert.equal(error.message, 'UNAUTHORIZED');
  });
});
