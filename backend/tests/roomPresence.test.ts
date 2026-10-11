import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { initializeSocket } from '../src/sockets/socketManager.js';

describe('🌐 Live Rooms, Real-Time Presence & WebRTC Signaling Suite', () => {
  let server: http.Server;
  let port: number;

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
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should synchronize room presence between multiple desktop peers', async () => {
    const client1: ClientSocket = Client(`http://localhost:${port}`, { transports: ['websocket'] });
    const client2: ClientSocket = Client(`http://localhost:${port}`, { transports: ['websocket'] });

    await Promise.all([
      new Promise<void>((resolve) => client1.on('connect', resolve)),
      new Promise<void>((resolve) => client2.on('connect', resolve)),
    ]);

    const roomId = 'live-study-room-101';

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

    client2.disconnect();
    const leftEvent = await c1UserLeftPromise;
    assert.strictEqual(leftEvent.userId, 'user-bob-uuid');

    client1.disconnect();
  });

  it('should enforce strict 6-participant hard limit for Interaction Rooms', async () => {
    const clients: ClientSocket[] = [];
    const roomId = 'interaction-strict-room-99';

    for (let i = 0; i < 6; i++) {
      const c = Client(`http://localhost:${port}`, { transports: ['websocket'] });
      clients.push(c);
      await new Promise<void>((resolve) => c.on('connect', resolve));
      c.emit('join_room', {
        roomId,
        userId: `user-interactor-${i}`,
        name: `User ${i}`,
        username: `user_${i}`,
        category: 'INTERACTION',
      });
    }

    // Wait a brief moment for all 6 to be registered
    await new Promise((r) => setTimeout(r, 100));

    // Attempt to join 7th participant
    const client7 = Client(`http://localhost:${port}`, { transports: ['websocket'] });
    await new Promise<void>((resolve) => client7.on('connect', resolve));

    const roomErrorPromise = new Promise<any>((resolve) => {
      client7.on('room_error', (err) => resolve(err));
    });

    client7.emit('join_room', {
      roomId,
      userId: 'user-interactor-7',
      name: 'User 7',
      username: 'user_7',
      category: 'INTERACTION',
    });

    const roomError = await roomErrorPromise;
    assert.strictEqual(roomError.code, 'ROOM_FULL');

    client7.disconnect();
    clients.forEach((c) => c.disconnect());
  });
});
