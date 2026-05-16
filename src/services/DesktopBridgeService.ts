/**
 * DesktopBridgeService.ts
 *
 * Bridges the LuvLyrics mobile app with the LuvLyrics Desktop app.
 *
 * What this service does:
 *  1. Starts a WebSocket server on WiFi IP port 8765 — desktop connects here.
 *  2. Starts an HTTP file server on port 8766 — desktop fetches /audio, /cover, /ping.
 *  3. Broadcasts playerStore STATE on every change.
 *  4. Broadcasts downloadQueueStore DOWNLOAD_PROGRESS on every queue item change.
 *  5. Handles CMD messages from desktop (PLAY, PAUSE, NEXT, PREV, SEEK, SET_VOLUME, SET_SOURCE, DOWNLOAD).
 *  6. Advertises the service via Zeroconf/mDNS (_luvlyrics._tcp.local).
 *
 * Dependencies to install:
 *   npx expo install react-native-tcp-socket
 *   npx expo install react-native-zeroconf   (or react-native-mdns)
 *
 * Permissions (AndroidManifest.xml additions):
 *   <uses-permission android:name="android.permission.INTERNET" />
 *   <uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
 */

import { Platform } from 'react-native';
import Zeroconf, { ImplType } from 'react-native-zeroconf';
import { usePlayerStore } from '../store/playerStore';
import { useDownloadQueueStore, QueueItem } from '../store/downloadQueueStore';
import { useDesktopBridgeSettingsStore } from '../store/desktopBridgeSettingsStore';

// ── Types ────────────────────────────────────────────────────────────────────

interface WsClient {
  socket: any;
  handshaken: boolean;
  buffer: Buffer;
}

interface TcpSocketModule {
  createServer: (handler: (socket: any) => void) => any;
}

type ZeroconfImplType = (typeof ImplType)[keyof typeof ImplType];

// ── Constants ────────────────────────────────────────────────────────────────

const WS_PORT = 8765;
const HTTP_PORT = 8766;
const MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

let cachedTcpSocket: TcpSocketModule | null | undefined;

function loadTcpSocket(): TcpSocketModule | null {
  if (cachedTcpSocket !== undefined) {
    return cachedTcpSocket;
  }

  try {
    const moduleName = 'react-native-tcp-socket';
    const loaded = require(moduleName);
    cachedTcpSocket = loaded?.default ?? loaded;
  } catch (error) {
    console.warn(
      '[DesktopBridge] react-native-tcp-socket is not installed; desktop bridge is disabled.',
      error
    );
    cachedTcpSocket = null;
  }

  return cachedTcpSocket;
}

// ── WebSocket frame helpers ──────────────────────────────────────────────────

function encodeFrame(text: string): Buffer {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;

  let header: Buffer;
  if (len <= 125) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + opcode text
    header[1] = len;
  } else if (len <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    // Write 64-bit big-endian length (only lower 32 bits needed for reasonable payloads)
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(len, 6);
  }
  return Buffer.concat([header, payload]);
}

function decodeFrames(buf: Buffer): { messages: string[]; remaining: Buffer } {
  const messages: string[] = [];
  let offset = 0;

  while (offset + 2 <= buf.length) {
    const firstByte = buf[offset];
    const secondByte = buf[offset + 1];
    // const fin = (firstByte & 0x80) !== 0;
    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) !== 0;
    let payloadLen = secondByte & 0x7f;
    let headerLen = 2;

    if (payloadLen === 126) {
      if (offset + 4 > buf.length) break;
      payloadLen = buf.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buf.length) break;
      payloadLen = buf.readUInt32BE(offset + 6); // ignore upper 32 bits
      headerLen = 10;
    }

    const maskLen = masked ? 4 : 0;
    const frameLen = headerLen + maskLen + payloadLen;
    if (offset + frameLen > buf.length) break;

    if (opcode === 0x8) {
      // Connection close frame — caller handles
      messages.push('__CLOSE__');
      offset += frameLen;
      continue;
    }

    if (opcode === 0x1 || opcode === 0x0) {
      // Text or continuation
      const maskStart = offset + headerLen;
      const dataStart = maskStart + maskLen;
      const rawPayload = buf.slice(dataStart, dataStart + payloadLen);

      if (masked) {
        const mask = buf.slice(maskStart, maskStart + 4);
        for (let i = 0; i < rawPayload.length; i++) {
          rawPayload[i] ^= mask[i % 4];
        }
      }

      messages.push(rawPayload.toString('utf8'));
    }

    offset += frameLen;
  }

  return { messages, remaining: buf.slice(offset) };
}

// Inline SHA-1 for the WebSocket handshake (avoids native module requirement for crypto)
function sha1Base64(input: string): string {
  // Use the built-in global TextEncoder + SubtleCrypto if available,
  // otherwise fall back to a pure-JS SHA-1.
  // In React Native we use a pure-JS implementation.
  const bytes = strToBytes(input);
  const hash = sha1(bytes);
  return btoa(String.fromCharCode(...hash));
}

function strToBytes(str: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    out.push(str.charCodeAt(i) & 0xff);
  }
  return out;
}

// Pure-JS SHA-1 (RFC 3174)
function sha1(msg: number[]): number[] {
  // Pre-processing
  const bitLen = msg.length * 8;
  msg.push(0x80);
  while ((msg.length % 64) !== 56) msg.push(0x00);
  msg.push(0, 0, 0, 0); // high 32 bits of length (always 0)
  msg.push((bitLen >>> 24) & 0xff);
  msg.push((bitLen >>> 16) & 0xff);
  msg.push((bitLen >>> 8) & 0xff);
  msg.push(bitLen & 0xff);

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;

  for (let i = 0; i < msg.length; i += 64) {
    const w: number[] = [];
    for (let j = 0; j < 16; j++) {
      w[j] = (msg[i + j * 4] << 24) | (msg[i + j * 4 + 1] << 16) | (msg[i + j * 4 + 2] << 8) | msg[i + j * 4 + 3];
    }
    for (let j = 16; j < 80; j++) {
      const n = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = (n << 1) | (n >>> 31);
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4;

    for (let j = 0; j < 80; j++) {
      let f: number, k: number;
      if (j < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (j < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) >>> 0;
      e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = temp;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }

  return [
    (h0 >>> 24) & 0xff, (h0 >>> 16) & 0xff, (h0 >>> 8) & 0xff, h0 & 0xff,
    (h1 >>> 24) & 0xff, (h1 >>> 16) & 0xff, (h1 >>> 8) & 0xff, h1 & 0xff,
    (h2 >>> 24) & 0xff, (h2 >>> 16) & 0xff, (h2 >>> 8) & 0xff, h2 & 0xff,
    (h3 >>> 24) & 0xff, (h3 >>> 16) & 0xff, (h3 >>> 8) & 0xff, h3 & 0xff,
    (h4 >>> 24) & 0xff, (h4 >>> 16) & 0xff, (h4 >>> 8) & 0xff, h4 & 0xff,
  ];
}

// ── DesktopBridgeService class ────────────────────────────────────────────────

class DesktopBridgeService {
  private wsServer: any = null;
  private httpServer: any = null;
  private clients: Map<number, WsClient> = new Map();
  private clientCounter = 0;
  private playerUnsubscribe: (() => void) | null = null;
  private downloadUnsubscribe: (() => void) | null = null;
  private zeroconf: any = null;
  private running = false;

  async start(): Promise<void> {
    if (this.running) return;

    const tcpSocket = loadTcpSocket();
    if (!tcpSocket) {
      this.running = false;
      return;
    }

    this.running = true;

    console.log('[DesktopBridge] Starting…');

    this.startWsServer(tcpSocket);
    this.startHttpServer(tcpSocket);
    this.startMdns();
    this.subscribeToStores();

    console.log('[DesktopBridge] Started on ports', WS_PORT, HTTP_PORT);
  }

  stop(): void {
    this.running = false;
    this.playerUnsubscribe?.();
    this.playerUnsubscribe = null;
    this.downloadUnsubscribe?.();
    this.downloadUnsubscribe = null;
    this.wsServer?.close();
    this.wsServer = null;
    this.httpServer?.close();
    this.httpServer = null;
    if (this.zeroconf) {
      try {
        if (Platform.OS === 'android') {
          this.zeroconf.unpublishService('LuvLyrics', ImplType.DNSSD);
        } else {
          this.zeroconf.unpublishService('LuvLyrics');
        }
      } catch (error) {
        console.warn('[DesktopBridge] Failed to unpublish mDNS service:', error);
      }
      this.zeroconf.removeDeviceListeners?.();
      this.zeroconf = null;
    }
    this.clients.clear();
    console.log('[DesktopBridge] Stopped');
  }

  // ── WebSocket server ──────────────────────────────────────────────────────

  private startWsServer(tcpSocket: TcpSocketModule): void {
    this.wsServer = tcpSocket.createServer((socket: any) => {
      const id = ++this.clientCounter;
      const client: WsClient = { socket, handshaken: false, buffer: Buffer.alloc(0) };
      this.clients.set(id, client);
      console.log('[DesktopBridge] Client connected:', id);

      socket.on('data', (data: Buffer) => {
        client.buffer = Buffer.concat([client.buffer, data]);

        if (!client.handshaken) {
          this.tryHandshake(id, client);
        } else {
          const { messages, remaining } = decodeFrames(client.buffer);
          client.buffer = remaining;
          for (const msg of messages) {
            if (msg === '__CLOSE__') {
              this.clients.delete(id);
              socket.destroy();
              return;
            }
            this.handleMessage(msg);
          }
        }
      });

      socket.on('close', () => {
        this.clients.delete(id);
        console.log('[DesktopBridge] Client disconnected:', id);
      });

      socket.on('error', () => {
        this.clients.delete(id);
      });

    });

    this.wsServer.listen({ port: WS_PORT, host: '0.0.0.0' }, () => {
      console.log('[DesktopBridge] WS server listening on', WS_PORT);
    });

    this.wsServer.on('error', (err: Error) => {
      console.error('[DesktopBridge] WS server error:', err.message);
    });
  }

  private tryHandshake(id: number, client: WsClient): void {
    const str = client.buffer.toString('utf8');
    if (!str.includes('\r\n\r\n')) return; // not enough data yet

    const keyMatch = str.match(/Sec-WebSocket-Key: ([^\r\n]+)/);
    if (!keyMatch) {
      client.socket.destroy();
      this.clients.delete(id);
      return;
    }

    const key = keyMatch[1].trim();
    const acceptKey = sha1Base64(key + MAGIC);

    const response =
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${acceptKey}\r\n` +
      '\r\n';

    client.socket.write(Buffer.from(response, 'utf8'));
    client.handshaken = true;
    // Clear the HTTP request bytes from buffer
    client.buffer = Buffer.alloc(0);

    const state = usePlayerStore.getState();
    this.sendToClient(client, this.buildStateMessage(state));

    console.log('[DesktopBridge] Handshake complete for client', id);
  }

  private sendToClient(client: WsClient, msg: string): void {
    if (!client.handshaken) return;
    try {
      client.socket.write(encodeFrame(msg));
    } catch (e) {
      // socket may have closed
    }
  }

  private broadcast(msg: string): void {
    const frame = encodeFrame(msg);
    for (const client of this.clients.values()) {
      if (client.handshaken) {
        try {
          client.socket.write(frame);
        } catch {
          // ignore
        }
      }
    }
  }

  // ── HTTP file server ──────────────────────────────────────────────────────

  private startHttpServer(tcpSocket: TcpSocketModule): void {
    this.httpServer = tcpSocket.createServer((socket: any) => {
      let buf = Buffer.alloc(0);

      socket.on('data', (data: Buffer) => {
        buf = Buffer.concat([buf, data]);
        const str = buf.toString('utf8');
        if (!str.includes('\r\n\r\n')) return;

        const firstLine = str.split('\r\n')[0];
        const method = firstLine.split(' ')[0];
        const path = firstLine.split(' ')[1];

        if (method !== 'GET') {
          socket.write('HTTP/1.1 405 Method Not Allowed\r\n\r\n');
          socket.destroy();
          return;
        }

        if (path === '/ping') {
          socket.write('HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nAccess-Control-Allow-Origin: *\r\n\r\npong');
          socket.destroy();
          return;
        }

        const state = usePlayerStore.getState();

        if (path === '/audio') {
          const audioUri = state.currentSong?.audioUri;
          if (!audioUri) {
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
            return;
          }
          this.serveFile(socket, audioUri, 'audio/mpeg');
          return;
        }

        if (path === '/cover') {
          const coverUri = state.currentSong?.coverImageUri;
          if (!coverUri) {
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
            return;
          }
          this.serveFile(socket, coverUri, 'image/jpeg');
          return;
        }

        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
      });

      socket.on('error', () => socket.destroy());
    });

    this.httpServer.listen({ port: HTTP_PORT, host: '0.0.0.0' }, () => {
      console.log('[DesktopBridge] HTTP server listening on', HTTP_PORT);
    });

    this.httpServer.on('error', (err: Error) => {
      console.error('[DesktopBridge] HTTP server error:', err.message);
    });
  }

  private async serveFile(socket: any, fileUri: string, contentType: string): Promise<void> {
    try {
      const FileSystem = require('expo-file-system');
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = Buffer.from(base64, 'base64');

      const headers =
        `HTTP/1.1 200 OK\r\n` +
        `Content-Type: ${contentType}\r\n` +
        `Content-Length: ${bytes.length}\r\n` +
        `Access-Control-Allow-Origin: *\r\n` +
        `Cache-Control: no-cache\r\n` +
        `\r\n`;

      socket.write(Buffer.from(headers, 'utf8'));
      socket.write(bytes);
      socket.destroy();
    } catch (e) {
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  }

  // ── mDNS advertisement ───────────────────────────────────────────────────

  private startMdns(): void {
    try {
      this.zeroconf = new Zeroconf();
      this.zeroconf.on('published', (service: any) => {
        console.log('[DesktopBridge] mDNS published:', service);
      });
      this.zeroconf.on('error', (error: Error) => {
        console.error('[DesktopBridge] mDNS error:', error);
      });

      const implType: ZeroconfImplType | undefined =
        Platform.OS === 'android' ? ImplType.DNSSD : undefined;

      this.zeroconf.publishService(
        'luvlyrics',
        'tcp',
        'local.',
        'LuvLyrics',
        WS_PORT,
        {
          version: '1',
          wsPort: String(WS_PORT),
          httpPort: String(HTTP_PORT),
        },
        implType
      );
      console.log(
        '[DesktopBridge] Publishing mDNS service _luvlyrics._tcp.local on',
        Platform.OS === 'android' ? `Android via ${ImplType.DNSSD}` : Platform.OS
      );
    } catch (e) {
      console.warn('[DesktopBridge] mDNS not available (react-native-zeroconf not installed):', e);
    }
  }

  // ── Store subscriptions ──────────────────────────────────────────────────

  private subscribeToStores(): void {
    // Subscribe to player state changes
    this.playerUnsubscribe = usePlayerStore.subscribe((state) => {
      if (!this.running || this.clients.size === 0) return;
      const msg = this.buildStateMessage(state);
      this.broadcast(msg);
    });

    // Subscribe to download queue changes
    this.downloadUnsubscribe = useDownloadQueueStore.subscribe((state) => {
      if (!this.running || this.clients.size === 0) return;
      for (const item of state.queue) {
        const msg = JSON.stringify({
          type: 'DOWNLOAD_PROGRESS',
          id: item.id,
          progress: item.progress,
          status: item.status,
          stageStatus: item.stageStatus,
          error: item.error,
        });
        this.broadcast(msg);
      }
    });
  }

  private buildStateMessage(state: any): string {
    return JSON.stringify({
      type: 'STATE',
      payload: {
        currentSong: state.currentSong
          ? {
              id: state.currentSong.id,
              title: state.currentSong.title,
              artist: state.currentSong.artist ?? '',
              album: state.currentSong.album ?? '',
              gradientId: state.currentSong.gradientId,
              duration: state.currentSong.duration,
              coverImageUri: state.currentSong.coverImageUri,
            }
          : null,
        position: state.position,
        duration: state.duration,
        isPlaying: state.isPlaying,
        volume: 0.8, // phone volume exposed as fixed for now; actual volume comes from AVPlayer
        audioSource: 'phone',
        queue: (state.playlistQueue ?? []).slice(0, 20).map((s: any) => ({
          id: s.id,
          title: s.title,
          artist: s.artist ?? '',
          gradientId: s.gradientId,
          duration: s.duration,
        })),
        currentQueueIndex: state.currentQueueIndex,
        lyrics: (state.currentSong?.lyrics ?? []).map((l: any) => ({
          timestamp: l.timestamp,
          text: l.text,
          lineOrder: l.lineOrder,
        })),
      },
    });
  }

  // ── Command handler ──────────────────────────────────────────────────────

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw);
      if (msg.type !== 'CMD') return;

      const settings = useDesktopBridgeSettingsStore.getState();
      if (!settings.desktopConnectEnabled) return;

      const playerStore = usePlayerStore.getState();

      switch (msg.action) {
        case 'PLAY':
          playerStore.play();
          break;

        case 'PAUSE':
          playerStore.pause();
          break;

        case 'NEXT':
          playerStore.nextInPlaylist();
          break;

        case 'PREV':
          playerStore.previousInPlaylist();
          break;

        case 'SEEK':
          if (typeof msg.position === 'number') {
            playerStore.seekTo(msg.position);
          }
          break;

        case 'SET_VOLUME':
          // Volume control via AVPlayer is handled by the PlayerContext
          // Expose it through a new action if needed; for now ignore
          break;

        case 'SET_SOURCE':
          // 'desktop' = desktop is playing, phone should mute
          // 'phone'   = phone resumes playback
          // This is stored in a separate flag; the PlayerContext reads it
          if (msg.source === 'desktop') {
            playerStore.pause();
          } else {
            playerStore.play();
          }
          break;

        case 'DOWNLOAD':
          if (!settings.allowDesktopDownloads) return;
          if (msg.song) {
            useDownloadQueueStore.getState().addToQueue([msg.song]);
          }
          break;

        default:
          console.warn('[DesktopBridge] Unknown action:', msg.action);
      }
    } catch (e) {
      console.warn('[DesktopBridge] Failed to parse message:', e);
    }
  }
}

export const desktopBridgeService = new DesktopBridgeService();
